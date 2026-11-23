#!/usr/bin/env node

/**
 * scripts/sync-projects.js
 *
 * Automated GitHub Project Sync for parnika0110 portfolio.
 *
 * Flow:
 *  1. Load data/projects-override.json  (never modified by this script)
 *  2. Fetch ALL public repos from GitHub API with full pagination
 *  3. Filter: owner repos, not forked, not archived, topic="portfolio"
 *  4. Merge: overrides take priority; newly discovered repos appended
 *  5. Write data/projects.json  (deterministic - no volatile timestamps)
 *  6. Patch index.html between stable sentinel comments
 *
 * Safety rules:
 *  - If GitHub API fails: exit non-zero, DO NOT touch any files.
 *  - projects-override.json is NEVER written by this script.
 *  - Output is deterministic so git detects zero diff when nothing changed.
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const GITHUB_USERNAME  = 'parnika0110';
const REQUIRED_TOPIC   = 'portfolio';
const OVERRIDES_FILE   = path.join(__dirname, '..', 'data', 'projects-override.json');
const OUTPUT_DATA_FILE = path.join(__dirname, '..', 'data', 'projects.json');
const INDEX_HTML_FILE  = path.join(__dirname, '..', 'index.html');

// Sentinel comments that bracket the auto-managed sections in index.html.
// Ensure index.html contains these exact strings.
const SENTINEL_FEATURED_START    = '<!-- SYNC:featured-start -->';
const SENTINEL_FEATURED_END      = '<!-- SYNC:featured-end -->';
const SENTINEL_EXPERIMENTS_START = '<!-- SYNC:experiments-start -->';
const SENTINEL_EXPERIMENTS_END   = '<!-- SYNC:experiments-end -->';

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

function httpsGet(urlPath, extraHeaders) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'portfolio-sync-script/2.0',
        // mercy-preview Accept header is required to receive topics[] in responses
        'Accept': 'application/vnd.github.mercy-preview+json',
        ...extraHeaders,
      },
    };
    const req = https.get(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(
            `GitHub API ${res.statusCode} for ${urlPath}: ${body.slice(0, 300)}`
          ));
        }
        try {
          resolve({ data: JSON.parse(body), headers: res.headers });
        } catch (e) {
          reject(new Error(`JSON parse error for ${urlPath}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Request timed out')));
  });
}

/** Fetch ALL pages of /users/:user/repos?type=owner via Link header. */
async function fetchAllRepos(username) {
  const token      = process.env.GITHUB_TOKEN;
  const authHeader = token ? { Authorization: `token ${token}` } : {};
  const allRepos   = [];
  let page = 1;

  while (true) {
    const urlPath = `/users/${username}/repos?per_page=100&type=owner&page=${page}`;
    console.log(`[Sync] Fetching page ${page}...`);
    const { data, headers } = await httpsGet(urlPath, authHeader);

    if (!Array.isArray(data)) {
      throw new Error(`Expected array from GitHub repos API, got: ${JSON.stringify(data).slice(0, 200)}`);
    }
    allRepos.push(...data);

    // Parse Link header for next page
    const link = headers['link'] || '';
    if (link.includes('rel="next"')) {
      page += 1;
    } else {
      break;
    }
  }
  return allRepos;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTitle(repoName) {
  return repoName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function deriveCategories(topics, language) {
  const cats  = new Set();
  const terms = [...(topics || []), language || ''].map(t => t.toLowerCase());
  const has   = k => terms.some(t => t.includes(k));

  if (has('ai') || has('ml') || has('machine-learning') || has('deep-learning') || has('neural') || has('nlp')) cats.add('ai-ml');
  if (has('full-stack') || has('fullstack') || has('mern') || has('crud') || has('rest-api')) cats.add('full-stack');
  if (has('web') || has('react') || has('nextjs') || has('vue') || has('html') || has('javascript') || has('typescript')) cats.add('web');
  if (has('computer-vision') || has('opencv') || has('mediapipe') || has('gesture')) cats.add('computer-vision');
  if (cats.size === 0) cats.add('web');
  return Array.from(cats);
}

function esc(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// HTML card builders
// ---------------------------------------------------------------------------

function buildFeaturedCard(p, fIdx, modalIdx) {
  const num  = String(fIdx + 1).padStart(2, '0');
  const cats = p.categories.join(' ');

  const eyebrowHtml = p.eyebrow
    ? `<p class="eyebrow${p.statusBadge ? '' : ' mb-2'}" style="color:${p.eyebrowColor || 'var(--blue-deep)'}">${esc(p.eyebrow)}</p>`
    : '';
  const badgeHtml = p.statusBadge
    ? `<span class="status-badge"><span class="dot"></span>${esc(p.statusBadge)}</span>`
    : '';
  const eyebrowWrapper = (p.eyebrow && p.statusBadge)
    ? `<div class="flex flex-wrap items-center gap-3 mb-2">\n${eyebrowHtml}\n${badgeHtml}\n</div>`
    : (p.eyebrow ? eyebrowHtml : '');

  const chips   = (p.chips || []).map(c => `<span class="chip">${esc(c)}</span>`).join('');
  const liveBtn = p.demoUrl
    ? `<a class="text-sm font-medium underline-hover whitespace-nowrap" href="${esc(p.demoUrl)}" rel="noopener noreferrer" target="_blank">Live Demo &#x2197;</a>`
    : '';

  return `<!-- Project ${fIdx + 1} \u2014 ${esc(p.title)} -->
<article class="reveal card${p.featured ? ' featured-card' : ''} lift p-7 sm:p-9 project-card" data-category="${cats}" data-project="${modalIdx}"><span aria-hidden="true" class="project-number">${num}</span>
<div class="grid sm:grid-cols-[1fr_auto] gap-6 items-start">
<div>
${eyebrowWrapper}
<h3 class="font-display text-2xl font-semibold mb-2">${esc(p.title)}</h3>
<p class="max-w-lg" style="color:var(--ink-soft)">${esc(p.description)}</p>
<div class="mt-5 flex flex-wrap gap-2">
${chips}
</div>
</div>
<div class="flex sm:flex-col gap-3 sm:items-end shrink-0">
<button aria-label="View project details" class="detail-btn" data-open-project="${modalIdx}">View Details</button>
${liveBtn}
<a class="text-sm font-medium underline-hover whitespace-nowrap" href="${esc(p.repositoryUrl)}" rel="noopener noreferrer" target="_blank">GitHub &#x2197;</a>
</div>
</div>
</article>`;
}

function buildExperimentCard(p, modalIdx) {
  return `<article class="card lift p-5">
<p class="font-display font-semibold">${esc(p.title)}</p>
<p class="mt-2 text-sm" style="color:var(--ink-soft)">${esc(p.subtitle || p.description)}</p>
<p class="mt-3 font-mono text-xs" style="color:var(--ink-soft)">${esc(p.tags || (p.chips || []).join(' \u00b7 '))}</p>
<div class="mt-5 flex gap-4 items-center">
<button aria-label="View ${esc(p.title)} details" class="detail-btn" data-open-project="${modalIdx}">View Details</button>
<a class="text-sm font-medium underline-hover" href="${esc(p.repositoryUrl)}" rel="noopener noreferrer" target="_blank">GitHub &#x2197;</a>
</div></article>`;
}

// ---------------------------------------------------------------------------
// HTML patching
// ---------------------------------------------------------------------------

function replaceBetweenSentinels(html, start, end, content) {
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si === -1) throw new Error(`Sentinel not found: ${start}`);
  if (ei === -1) throw new Error(`Sentinel not found: ${end}`);
  if (ei <= si)  throw new Error(`End sentinel before start: ${end}`);
  return html.slice(0, si + start.length) + '\n' + content + '\n' + html.slice(ei);
}

function replaceModalArray(html, modalProjects) {
  const pattern = /const projects = \[[\s\S]*?\];\s*const pm=/;
  if (!pattern.test(html)) {
    throw new Error(
      'Cannot locate `const projects` array in index.html. ' +
      'Ensure it is immediately followed by `const pm=` on the next line.'
    );
  }
  return html.replace(pattern, `const projects = ${JSON.stringify(modalProjects)};\n  const pm=`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function sync() {
  console.log(`[Sync] Starting for user '${GITHUB_USERNAME}'...`);

  // 1. Load overrides (hard fail if malformed)
  let overrides = {};
  if (fs.existsSync(OVERRIDES_FILE)) {
    try {
      overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
      console.log(`[Sync] Loaded ${Object.keys(overrides).length} override(s).`);
    } catch (e) {
      console.error(`[Sync] Fatal: Cannot parse ${OVERRIDES_FILE}: ${e.message}`);
      process.exit(1);
    }
  }

  // 2. Fetch repos (hard fail - no disk writes on error)
  let repos;
  try {
    repos = await fetchAllRepos(GITHUB_USERNAME);
    console.log(`[Sync] Fetched ${repos.length} total repos.`);
  } catch (err) {
    console.error(`[Sync] GitHub fetch failed: ${err.message}`);
    console.error('[Sync] Aborting - no files were modified.');
    process.exit(1);
  }

  // 3. Filter eligible repos
  const eligible = repos.filter(r =>
    !r.fork && !r.archived &&
    Array.isArray(r.topics) && r.topics.includes(REQUIRED_TOPIC)
  );
  console.log(`[Sync] ${eligible.length} repos tagged "${REQUIRED_TOPIC}".`);
  const eligibleMap = new Map(eligible.map(r => [r.name.toLowerCase(), r]));

  // 4. Merge: overrides always win; new GH repos appended
  const projectsMap = new Map();

  for (const [key, ov] of Object.entries(overrides)) {
    const lk    = key.toLowerCase();
    const gh    = eligibleMap.get(lk);

    projectsMap.set(lk, {
      id:           key,
      title:        ov.title        || normalizeTitle(key),
      section:      ov.section      || 'featured',
      displayOrder: ov.displayOrder != null ? ov.displayOrder : 99,
      featured:     ov.featured     != null ? ov.featured     : false,
      eyebrow:      ov.eyebrow      != null ? ov.eyebrow      : (gh ? gh.language || '' : ''),
      eyebrowColor: ov.eyebrowColor || 'var(--blue-deep)',
      statusBadge:  ov.statusBadge  != null ? ov.statusBadge  : '',
      subtitle:     ov.subtitle     || '',
      tags:         ov.tags         || '',
      category:     ov.category     || 'Featured Project',
      categories:   ov.categories && ov.categories.length
                      ? ov.categories
                      : deriveCategories(gh && gh.topics, gh && gh.language),
      description:  ov.description  || (gh && gh.description) || 'Project by parnika0110',
      overview:     ov.overview     || (gh && gh.description) || 'Project by parnika0110',
      features:     ov.features && ov.features.length
                      ? ov.features
                      : [(gh && gh.description) || 'Explore the repository.'],
      chips:        ov.chips && ov.chips.length
                      ? ov.chips
                      : (gh && gh.topics && gh.topics.length ? gh.topics.slice(0, 4) : [(gh && gh.language) || 'Code']),
      tech:         ov.tech && ov.tech.length
                      ? ov.tech
                      : (gh && gh.topics && gh.topics.length ? gh.topics : [(gh && gh.language) || 'Code']),
      repositoryUrl: ov.repositoryUrl || (gh && gh.html_url) || `https://github.com/${GITHUB_USERNAME}/${key}`,
      demoUrl:      ov.demoUrl != null ? ov.demoUrl : ((gh && gh.homepage) || ''),
      imageFolder:  ov.imageFolder || '',
    });
  }

  for (const repo of eligible) {
    const lk = repo.name.toLowerCase();
    if (projectsMap.has(lk)) continue;
    console.log(`[Sync] New project discovered: '${repo.name}'`);
    const chips = repo.topics && repo.topics.length
      ? repo.topics.filter(t => t !== REQUIRED_TOPIC).slice(0, 4)
      : [repo.language || 'Code'];
    projectsMap.set(lk, {
      id:           repo.name,
      title:        normalizeTitle(repo.name),
      section:      'featured',
      displayOrder: 20 + projectsMap.size,
      featured:     false,
      eyebrow:      repo.language || 'Software Project',
      eyebrowColor: 'var(--blue-deep)',
      statusBadge:  repo.homepage ? 'Live Demo' : '',
      subtitle:     '',
      tags:         chips.join(' \u00b7 '),
      category:     `${repo.language || 'Project'} \u00b7 GitHub Synchronized`,
      categories:   deriveCategories(repo.topics, repo.language),
      description:  repo.description || 'Open-source project on GitHub.',
      overview:     repo.description || 'Open-source project by parnika0110.',
      features: [
        repo.description || 'See the repository for details.',
        `Primary language: ${repo.language || 'Various'}`,
        `Topics: ${chips.join(', ') || 'software'}`,
      ],
      chips,
      tech:         repo.topics && repo.topics.length ? repo.topics.filter(t => t !== REQUIRED_TOPIC) : [repo.language || 'Code'],
      repositoryUrl: repo.html_url,
      demoUrl:      repo.homepage || '',
      imageFolder:  '',
    });
  }

  // 5. Sort deterministically
  const all = Array.from(projectsMap.values())
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99) || a.id.localeCompare(b.id));

  const featured     = all.filter(p => p.section !== 'experiments');
  const experiments  = all.filter(p => p.section === 'experiments');

  // 6. Write data/projects.json (no volatile timestamp - deterministic)
  const output = { totalCount: all.length, featuredCount: featured.length, experimentsCount: experiments.length, projects: all };
  fs.mkdirSync(path.dirname(OUTPUT_DATA_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_DATA_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`[Sync] Wrote ${OUTPUT_DATA_FILE}`);

  // 7. Patch index.html
  if (!fs.existsSync(INDEX_HTML_FILE)) {
    console.error(`[Sync] Fatal: ${INDEX_HTML_FILE} not found.`);
    process.exit(1);
  }
  let html = fs.readFileSync(INDEX_HTML_FILE, 'utf8');

  // Build modal array - indices must align with `all` order
  const modalProjects = all.map(p => {
    const item = { title: p.title, category: p.category, overview: p.overview, features: p.features, tech: p.tech, github: p.repositoryUrl, folder: p.imageFolder || '' };
    if (p.demoUrl) item.live = p.demoUrl;
    return item;
  });
  const idxMap = new Map(all.map((p, i) => [p.id.toLowerCase(), i]));

  const featuredHtml    = featured.map((p, i) => buildFeaturedCard(p, i, idxMap.get(p.id.toLowerCase()))).join('\n');
  const experimentsHtml = experiments.map(p => buildExperimentCard(p, idxMap.get(p.id.toLowerCase()))).join('');

  // Patch featured section (prefer sentinels, fall back to legacy)
  try {
    html = replaceBetweenSentinels(html, SENTINEL_FEATURED_START, SENTINEL_FEATURED_END, featuredHtml);
    console.log('[Sync] Patched featured section via sentinels.');
  } catch (e) {
    console.warn(`[Sync] Sentinel missing (${e.message}); trying legacy #projectList...`);
    const tag = '<div class="space-y-6" id="projectList">';
    const s   = html.indexOf(tag);
    const e2  = html.indexOf('<!-- More experiments -->');
    if (s !== -1 && e2 !== -1) {
      html = html.slice(0, s + tag.length) + '\n' + featuredHtml + '\n</div>\n' + html.slice(e2);
      console.log('[Sync] Patched #projectList via legacy fallback.');
    } else {
      console.error('[Sync] Cannot patch featured section - add sentinel comments to index.html.');
    }
  }

  try {
    html = replaceBetweenSentinels(html, SENTINEL_EXPERIMENTS_START, SENTINEL_EXPERIMENTS_END, experimentsHtml);
    console.log('[Sync] Patched experiments section via sentinels.');
  } catch (e) {
    console.warn(`[Sync] Sentinel missing (${e.message}); trying legacy experiments grid...`);
    const heading    = '<p class="eyebrow mb-5">more experiments</p>';
    const hIdx       = html.indexOf(heading);
    const gridTag    = '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">';
    const gridStart  = hIdx !== -1 ? html.indexOf(gridTag, hIdx) : -1;
    if (gridStart !== -1) {
      const gridEnd = html.indexOf('</div>', gridStart + gridTag.length);
      if (gridEnd !== -1) {
        html = html.slice(0, gridStart + gridTag.length) + experimentsHtml + html.slice(gridEnd);
        console.log('[Sync] Patched experiments via legacy fallback.');
      }
    }
  }

  try {
    html = replaceModalArray(html, modalProjects);
    console.log('[Sync] Patched modal `const projects` array.');
  } catch (e) {
    console.error(`[Sync] Fatal: ${e.message}`);
    process.exit(1);
  }

  fs.writeFileSync(INDEX_HTML_FILE, html, 'utf8');
  console.log(`[Sync] Done. ${featured.length} featured, ${experiments.length} experiments.`);
}

if (require.main === module) {
  sync().catch(err => {
    console.error('[Sync Fatal]', err);
    process.exit(1);
  });
}

module.exports = { sync };

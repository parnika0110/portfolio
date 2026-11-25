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
 *  6. Patch index.html:
 *       - the case-notes modal data in <script id="project-data" type="application/json">
 *       - the "Other builds" cards between the SYNC:experiments sentinels
 *     Featured case studies (section "featured") are hand-composed editorial
 *     layouts in index.html and are NOT regenerated; edit them by hand.
 *     Newly discovered repos are added to "Other builds" automatically.
 *
 * Usage:
 *   npm run sync                         fetch GitHub + patch files
 *   node scripts/sync-projects.js --offline   use overrides only (no network)
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
const OFFLINE          = process.argv.includes('--offline');

// Sentinel comments that bracket the auto-managed "Other builds" cards in index.html.
// Ensure index.html contains these exact strings.
const SENTINEL_EXPERIMENTS_START = '<!-- SYNC:experiments-start -->';
const SENTINEL_EXPERIMENTS_END   = '<!-- SYNC:experiments-end -->';
// The case-notes modal reads its data from this JSON block.
const PROJECT_DATA_PATTERN = /(<script id="project-data" type="application\/json">)[\s\S]*?(<\/script>)/;

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

// "Other builds" card \u2014 markup must match the .build component in src/input.css.
function buildExperimentCard(p, frameNo) {
  const fr   = String(frameNo).padStart(2, '0');
  const cats = (p.categories || []).join(' ');
  const live = p.demoUrl
    ? `<a class="link-btn ulink" href="${esc(p.demoUrl)}" rel="noopener noreferrer" target="_blank">Live <span aria-hidden="true" class="arrow">&#x2197;</span></a>`
    : '';
  return `<article class="build" data-category="${esc(cats)}">
<p class="build__fr">FR ${fr} \u00b7 experiment</p>
<h4>${esc(p.title)}</h4>
<p>${esc(p.subtitle || p.description)}</p>
<p class="build__tags">${esc(p.tags || (p.chips || []).join(' \u00b7 '))}</p>
<div class="build__links"><button aria-label="Open ${esc(p.title)} case notes" class="link-btn ulink" data-open-project="${esc(p.id)}" type="button">Case notes</button>${live}<a class="link-btn ulink" href="${esc(p.repositoryUrl)}" rel="noopener noreferrer" target="_blank">GitHub <span aria-hidden="true" class="arrow">&#x2197;</span></a></div>
</article>`;
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

function replaceProjectData(html, modalProjects) {
  if (!PROJECT_DATA_PATTERN.test(html)) {
    throw new Error(
      'Cannot locate <script id="project-data" type="application/json"> in index.html.'
    );
  }
  // Escape "<" so the JSON can never close the <script> element early.
  const json = JSON.stringify(modalProjects).replace(/</g, '\\u003c');
  return html.replace(PROJECT_DATA_PATTERN, (_, open, close) => `${open}${json}${close}`);
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
    if (OFFLINE) {
      repos = [];
      console.log('[Sync] --offline: skipping GitHub, using overrides only.');
    } else {
      repos = await fetchAllRepos(GITHUB_USERNAME);
      console.log(`[Sync] Fetched ${repos.length} total repos.`);
    }
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
      screenshots:  Array.isArray(ov.screenshots) ? ov.screenshots : [],
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
      // New repos land in "Other builds"; promote to a hand-written case study via overrides.
      section:      'experiments',
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
      screenshots:  [],
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

  // Case-notes modal data, looked up by project id (data-open-project="<id>").
  const modalProjects = all.map(p => {
    const item = { id: p.id, title: p.title, category: p.category, overview: p.overview, features: p.features, tech: p.tech, github: p.repositoryUrl, screenshots: p.screenshots || [] };
    if (p.demoUrl) item.live = p.demoUrl;
    return item;
  });
  const frameNo = new Map(all.map((p, i) => [p.id, i + 1]));
  const experimentsHtml = experiments.map(p => buildExperimentCard(p, frameNo.get(p.id))).join('\n');

  // Featured case studies are hand-composed; just flag any that are missing from the page.
  for (const p of featured) {
    if (!html.includes(`data-open-project="${p.id}"`)) {
      console.warn(`[Sync] Featured project '${p.id}' has no case study in index.html — add one by hand or set its section to "experiments".`);
    }
  }

  try {
    html = replaceBetweenSentinels(html, SENTINEL_EXPERIMENTS_START, SENTINEL_EXPERIMENTS_END, experimentsHtml);
    console.log('[Sync] Patched "Other builds" via sentinels.');
    html = replaceProjectData(html, modalProjects);
    console.log('[Sync] Patched case-notes modal data.');
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

// Regression tests for the hero proof line, the live build log, the ⌘K console commands and the
// night shift theme. Run with `npm test`. GitHub's API is replaced by fixtures, so no network is needed.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { serve, until } = require('./helpers');

let site; let browser;
before(async () => { site = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await site?.close(); });

const HOUR = 3600 * 1000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const REPOS = [
  { name: 'forked-thing', full_name: 'parnika0110/forked-thing', fork: true, archived: false, private: false, html_url: 'https://github.com/parnika0110/forked-thing' },
  { name: 'oppy', full_name: 'parnika0110/oppy', fork: false, archived: false, private: false, html_url: 'https://github.com/parnika0110/oppy' },
];
const COMMITS = [
  { html_url: 'https://github.com/parnika0110/oppy/commit/aaa', parents: [{}, {}], commit: { message: 'Merge pull request #9 from parnika0110/dev\n\nbody', committer: { date: iso(1 * HOUR) } } },
  { html_url: 'https://github.com/parnika0110/oppy/commit/bbb', parents: [{}], commit: { message: 'Dedupe listings by source URL\n\nLonger body text', committer: { date: iso(3 * 24 * HOUR) } } },
];

/** A page with GitHub mocked. `api`: 'ok' | 'error'. Returns the page, its errors and the API hit count. */
async function open({ theme, api = 'ok', ctx: ctxOpts = {}, clearCache = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...ctxOpts });
  const hits = { n: 0 };
  const reply = (body) => (route) => { hits.n++; return api === 'ok' ? route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }) : route.fulfill({ status: 503, body: 'unavailable' }); };
  await context.route('https://api.github.com/users/parnika0110/repos*', reply(REPOS));
  await context.route('https://api.github.com/repos/parnika0110/oppy/commits*', reply(COMMITS));
  await context.route('https://api.github.com/users/parnika0110', (r) => r.fulfill({ contentType: 'application/json', body: '{"public_repos":29}' }));
  await context.addInitScript(([t, clear]) => {
    try { if (t) localStorage.setItem('theme', t); if (clear) localStorage.removeItem('build-log-v1'); } catch { /* ignore */ }
    document.addEventListener('DOMContentLoaded', () => { window.__themeAtDCL = document.documentElement.dataset.theme || 'day'; });
  }, [theme, clearCache]);
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(site.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, hits, context, close: () => context.close() };
}

/* ------------------------------------------------------------------ hero proof line */
test('hero proof line: three verified facts, one line at 1366px, no overflow at 320px', async () => {
  const { page, errors, close, context } = await open();
  const items = await page.$$eval('.proof li', (l) => l.map((li) => ({ text: li.textContent.trim(), top: Math.round(li.getBoundingClientRect().top) })));
  assert.deepEqual(items.map((i) => i.text), ['Demoed OPPY at BLR Tech Week 2026', '1 of 52 builders from 300+ applicants', 'CGPA 9.32']);
  assert.equal(new Set(items.map((i) => i.top)).size, 1, 'all three on one line at 1366px');
  assert.equal(await page.$eval('.proof a', (a) => a.getAttribute('href')), '#dday', 'the demo links to the D-Day story');
  // the facts must match what the page states elsewhere
  const page2 = await page.evaluate(() => document.body.innerText);
  for (const fact of ['300+', '52', 'Bengaluru Tech Week 2026', '9.32']) assert.ok(page2.includes(fact), `${fact} is stated elsewhere on the page`);
  await page.setViewportSize({ width: 320, height: 640 }); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow at 320px');
  assert.deepEqual(errors, []);
  await close(); void context;
});

/* ------------------------------------------------------------------ live build log */
test('build log: latest commit of the most recently pushed own repo, merge noise skipped', async () => {
  const { page, errors, close } = await open();
  const log = await until(page, () => { const el = document.getElementById('buildLog'); const a = el.querySelector('.build-log__link');
    return { live: el.classList.contains('is-live'), k: el.querySelector('.build-log__k').textContent, time: el.querySelector('time')?.textContent, dt: el.querySelector('time')?.dateTime, text: a.textContent, href: a.href, target: a.target }; }, null, (v) => v.live);
  assert.ok(log.live);
  assert.equal(log.k, 'Last shipped');
  assert.equal(log.time, '3 days ago');
  assert.equal(log.text, 'oppy — “Dedupe listings by source URL”', 'fork skipped, auto "Merge pull request" skipped, first line only');
  assert.equal(log.href, 'https://github.com/parnika0110/oppy/commit/bbb');
  assert.equal(log.target, '_blank');
  assert.deepEqual(errors, []);
  await close();
});

test('build log: uses the 30-minute cache on the next visit', async () => {
  const first = await open();
  await until(first.page, () => document.getElementById('buildLog').classList.contains('is-live'));
  const stored = await first.page.evaluate(() => localStorage.getItem('build-log-v1'));
  await first.close();
  const second = await open({ clearCache: false });
  await second.page.evaluate((s) => localStorage.setItem('build-log-v1', s), stored);
  second.hits.n = 0;
  await second.page.reload({ waitUntil: 'networkidle' });
  const live = await until(second.page, () => document.getElementById('buildLog').classList.contains('is-live'));
  assert.ok(live, 'rendered from cache');
  assert.equal(second.hits.n, 0, 'no GitHub requests while the cache is fresh');
  await second.close();
});

test('build log: if GitHub is unavailable the static link stays and nothing breaks', async () => {
  const { page, errors, close } = await open({ api: 'error' });
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => { const el = document.getElementById('buildLog'); return { live: el.classList.contains('is-live'), text: el.textContent.replace(/\s+/g, ' ').trim(), href: el.querySelector('a').href }; });
  assert.equal(s.live, false);
  assert.equal(s.text, 'Build log Latest public commits on GitHub ↗');
  assert.equal(s.href, 'https://github.com/parnika0110');
  assert.deepEqual(errors, []);
  await close();
});

/* ------------------------------------------------------------------ ⌘K console */
async function palette(page, query) {
  if (await page.$eval('#cmdkOverlay', (m) => m.hidden)) await page.keyboard.press('Control+k');
  await page.fill('#cmdkInput', query);
  return page.$$eval('#cmdkList li', (l) => l.map((li) => ({ label: li.firstChild?.textContent || li.textContent, kind: li.querySelector('.k')?.textContent || '' })));
}

test('⌘K: "help" lists the console commands', async () => {
  const { page, errors, close } = await open();
  const items = await palette(page, 'help');
  const labels = items.map((i) => i.label);
  for (const c of ['open oppy', 'open mediassist', 'open gesture', 'open metro', 'theme night', 'resume', 'email', 'copy email', 'top', 'help']) assert.ok(labels.includes(c), `help lists "${c}"`);
  assert.ok(items.every((i) => i.kind === 'command'));
  const empty = await palette(page, 'zzz-nothing');
  assert.equal(empty[0].label, 'Nothing matches — type “help” for commands.');
  assert.deepEqual(errors, []);
  await close();
});

test('⌘K: "open oppy" jumps to the case study; "open metro" opens its case notes', async () => {
  const { page, errors, close } = await open({ ctx: { reducedMotion: 'reduce' } });
  await palette(page, 'open oppy'); await page.keyboard.press('Enter');
  const top = await until(page, () => Math.round(document.getElementById('case-oppy').getBoundingClientRect().top), null, (t) => t > -5 && t < 200);
  assert.ok(top > -5 && top < 200, `OPPY scrolled into view (top ${top}px)`);
  assert.equal(await page.$eval('#cmdkOverlay', (m) => m.hidden), true, 'palette closed');
  await palette(page, 'open metro'); await page.keyboard.press('Enter');
  assert.ok(await until(page, () => !!document.querySelector('#projectModalExtra [data-metro]')), 'Metro case notes open with the route search');
  assert.deepEqual(errors, []);
  await close();
});

test('⌘K: "theme night" switches theme; "copy email" copies and confirms', async () => {
  const { page, errors, close, context } = await open();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: site.url.replace(/\/$/, '') });
  const items = await palette(page, 'theme');
  assert.equal(items[0].label, 'theme night');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'night');
  assert.equal((await palette(page, 'theme'))[0].label, 'theme day', 'label flips to the other theme');
  await page.keyboard.press('Escape');
  await palette(page, 'copy email'); await page.keyboard.press('Enter');
  const note = await until(page, () => document.querySelector('#cmdkList [role="status"]')?.textContent || '', null, Boolean);
  assert.equal(note, 'Copied parnika.sm2005@gmail.com ✓');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'parnika.sm2005@gmail.com');
  assert.ok(await until(page, () => document.getElementById('cmdkOverlay').hidden, null, Boolean, 2500), 'palette closes after confirming');
  assert.deepEqual(errors, []);
  await close();
});

/* ------------------------------------------------------------------ night shift theme */
test('night shift: toggle, both buttons in sync, remembered, applied before first paint', async () => {
  const { page, errors, close } = await open();
  assert.equal(await page.evaluate(() => window.__themeAtDCL), 'day', 'day by default');
  await page.click('.nav__actions [data-theme-toggle]');
  await until(page, () => getComputedStyle(document.body).backgroundColor, null, (bg) => bg === 'rgb(21, 19, 28)', 2000);   // after the short cross-fade
  const s = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, pressed: [...document.querySelectorAll('[data-theme-toggle]')].map((b) => b.getAttribute('aria-pressed')), meta: document.querySelector('meta[name="theme-color"]').content, bg: getComputedStyle(document.body).backgroundColor, saved: localStorage.getItem('theme') }));
  assert.deepEqual(s, { theme: 'night', pressed: ['true', 'true'], meta: '#15131C', bg: 'rgb(21, 19, 28)', saved: 'night' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => window.__themeAtDCL), 'night', 'night is on before the page finishes parsing (no flash)');
  await page.click('.nav__actions [data-theme-toggle]');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme || 'day'), 'day', 'toggles back');
  assert.deepEqual(errors, []);
  await close();
});

test('night shift: mobile toggle sits beside the menu button and works by touch', async () => {
  const { page, errors, close } = await open({ ctx: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } });
  const btn = page.locator('.theme-btn--m');
  assert.ok(await btn.isVisible(), 'visible on mobile');
  const box = await btn.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44, 'touch target at least 44 × 44');
  await btn.tap();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'night');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
  assert.deepEqual(errors, []);
  await close();
});

test('night shift: the photo is pixel-identical to the day theme', async () => {
  const shots = [];
  for (const theme of ['day', 'night']) {
    const { page, close } = await open({ theme, ctx: { reducedMotion: 'reduce' } });
    await page.waitForFunction(() => { const i = document.querySelector('.portrait img'); return i.complete && i.naturalWidth > 0; });
    const s = await page.evaluate(() => { const i = document.querySelector('.portrait img'); return { src: i.currentSrc.split('/').pop(), filter: getComputedStyle(i).filter, mix: getComputedStyle(i).mixBlendMode }; });
    assert.deepEqual(s, { src: 'parnika-portrait.webp', filter: 'none', mix: 'normal' }, `${theme}: same file, no filter`);
    const r = await page.$eval('.portrait img', (i) => { const b = i.getBoundingClientRect(); return { x: b.left + 8, y: b.top + 70, width: b.width - 16, height: b.height - 80 }; });   // inside the photo, clear of the stamp
    shots.push(await page.screenshot({ clip: r }));
    await close();
  }
  assert.ok(shots[0].equals(shots[1]), 'photo pixels identical in day and night');
});

test('night shift: canvases and cursor still work, and no page errors', async () => {
  const { page, errors, close } = await open({ theme: 'night' });
  await page.mouse.move(700, 300, { steps: 4 });
  const field = await until(page, () => { const cv = document.querySelector('.dotfield'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let light = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20 && d[i] > 150) light++; return light; }, null, (n) => n > 100);
  assert.ok(field > 100, 'dot field draws light dots on the dark page');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('has-xcur')), true, 'custom cursor active');
  await page.evaluate(() => document.querySelector('#case-mediassist figure.sketch').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const inked = await until(page, () => { const c = document.querySelector('#case-mediassist .live canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; }, null, (n) => n > 1000);
  assert.ok(inked > 1000, 'MediAssist canvas draws');
  assert.deepEqual(errors, []);
  await close();
});

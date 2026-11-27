// Regression tests for the engineer's cursor, magnetic controls and hero dot field (js/interactive.js).
// Run with `npm test`. They cover pointer tracking, lock-on brackets, magnetic offsets, scrolling under a
// still mouse, modifier keys, keyboard navigation, Windows High Contrast (forced colours), touch and
// reduced motion. Desktop checks use Chromium at 1366×768 with a mouse.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { serve, until } = require('./helpers');

let site; let browser;
before(async () => { site = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await site?.close(); });

/** Open the page in a fresh context; returns the page and its collected page errors. */
async function open(ctx = {}, media = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...ctx });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (Object.keys(media).length) await page.emulateMedia(media);
  await page.goto(site.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);                        // hero entrance animation settles
  return { page, errors, close: () => context.close() };
}

const pad = (n) => String(Math.round(n)).padStart(4, '0');

/** Cursor state as seen from the page, for a pointer at viewport (x, y). */
const STATE = ([x, y]) => {
  const box = document.querySelector('.xlock'); const cur = document.querySelector('.xcur');
  const on = !!box && box.classList.contains('is-on'); const r = box && box.getBoundingClientRect();
  const x0 = cur && cur.querySelector('.xcur__x').getBoundingClientRect();
  return {
    systemCursorHidden: document.documentElement.classList.contains('has-xcur'),
    crosshair: !!cur && cur.classList.contains('is-on'),
    centre: x0 ? [x0.left + x0.width / 2, x0.top + x0.height / 2] : null,
    readout: cur ? cur.querySelector('.xcur__read').dataset.v || '' : '',
    brackets: on, around: on && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
    label: box ? box.querySelector('b').dataset.label || '' : '',
    pulled: [...document.querySelectorAll('.magnetic')].filter((m) => m.style.transform).map((m) => m.style.transform),
    scrollY,
  };
};
const state = (page, x = -1, y = -1) => page.evaluate(STATE, [x, y]);

/** Centre of an element (scrolled into view first when asked). */
async function centreOf(page, sel, scroll = false) {
  return page.evaluate(([s, sc]) => {
    const el = document.querySelector(s); if (sc) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [sel, scroll]);
}

/** Move onto (x, y) in a few steps, as a person would. */
async function hover(page, x, y) { await page.mouse.move(x - 24, y, { steps: 3 }); await page.mouse.move(x, y, { steps: 3 }); }

test('pointer tracking: the crosshair replaces the arrow, sits on the hotspot and shows page x/y', async () => {
  const { page, errors, close } = await open();
  await hover(page, 300, 560);
  const s = await until(page, STATE, [300, 560], (v) => v.crosshair);
  assert.ok(s.systemCursorHidden, 'system cursor hidden while the mouse is in use');
  assert.ok(Math.abs(s.centre[0] - 300) <= 1 && Math.abs(s.centre[1] - 560) <= 1, `crosshair centred on the pointer (${s.centre})`);
  assert.equal(s.readout, `x ${pad(300)}  y ${pad(560)}`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).cursor), 'none');
  assert.deepEqual(errors, []);
  await close();
});

test('lock-on brackets and magnetic offset on a button', async () => {
  const { page, errors, close } = await open();
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x + 20, c.y + 5);
  // the brackets glide into place (0.18 s), so wait until they have arrived
  const s = await until(page, STATE, [c.x + 20, c.y + 5], (v) => v.brackets && v.around && v.pulled.length);
  assert.ok(s.brackets && s.around, 'brackets drawn around the control under the pointer');
  assert.equal(s.label, 'Jump');
  assert.equal(s.pulled.length, 1, 'exactly one control pulled');
  const [dx, dy] = s.pulled[0].match(/-?[\d.]+/g).map(Number);
  assert.ok(dx > 0 && dx <= 6 && dy > 0 && dy <= 5, `pull leans toward the pointer and stays within 6 × 5 px (${s.pulled[0]})`);
  assert.deepEqual(errors, []);
  await close();
});

test('text cards (milestones, credentials) get the crosshair only: no brackets, no pull', async () => {
  const { page, errors, close } = await open();
  for (const sel of ['.ms', '.cred']) {
    const c = await centreOf(page, sel, true);
    await hover(page, c.x, c.y); await page.waitForTimeout(150);
    const s = await state(page, c.x, c.y);
    assert.ok(s.crosshair && !s.brackets && s.pulled.length === 0, `${sel}: crosshair only (${JSON.stringify(s)})`);
  }
  assert.deepEqual(errors, []);
  await close();
});

test('scrolling under a still mouse: brackets, pull and readout follow what is under the pointer', async () => {
  const { page, errors, close } = await open();
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x, c.y);
  await until(page, STATE, [c.x, c.y], (v) => v.brackets);
  await page.mouse.wheel(0, 240);
  let s = await until(page, STATE, [c.x, c.y], (v) => v.scrollY === 240 && !v.brackets);
  assert.ok(!s.brackets, 'brackets released once the control scrolls away');
  assert.equal(s.pulled.length, 0, 'magnetic offset reset');
  assert.equal(s.readout, `x ${pad(c.x)}  y ${pad(c.y + 240)}`, 'readout reports the new page position');
  // now scroll a different control under the still pointer
  const t = await centreOf(page, '#case-oppy .btn', true);
  await hover(page, t.x, t.y - 200);
  await until(page, STATE, [t.x, t.y - 200], (v) => !v.brackets);
  await page.mouse.wheel(0, 200);
  s = await until(page, STATE, [t.x, t.y - 200], (v) => v.brackets && v.around && v.pulled.length === 1);
  assert.ok(s.brackets && s.around, `brackets lock on to the control that scrolled under the pointer (${s.label})`);
  assert.equal(s.pulled.length, 1, 'and it gets the magnetic pull');
  assert.deepEqual(errors, []);
  await close();
});

test('modifier keys alone keep the crosshair (for ⌘-click, Ctrl-click, Shift-click)', async () => {
  const { page, errors, close } = await open();
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x, c.y);
  await until(page, STATE, [c.x, c.y], (v) => v.brackets);
  for (const key of ['Meta', 'Control', 'Shift', 'Alt']) {
    await page.keyboard.down(key); await page.keyboard.up(key);
    const s = await state(page, c.x, c.y);
    assert.ok(s.crosshair && s.systemCursorHidden && s.brackets, `${key} keeps the crosshair and lock-on`);
  }
  assert.deepEqual(errors, []);
  await close();
});

test('keyboard navigation: system cursor and focus ring return; keyboard scrolling keeps them', async () => {
  const { page, errors, close } = await open();
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x, c.y);
  await until(page, STATE, [c.x, c.y], (v) => v.pulled.length === 1);
  await page.keyboard.press('Tab');
  let s = await state(page, c.x, c.y);
  assert.ok(!s.systemCursorHidden && !s.crosshair && !s.brackets, 'Tab brings the system cursor back and hides the crosshair');
  assert.equal(s.pulled.length, 0, 'Tab resets the magnetic offset');
  const focus = await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el);
    return { visible: el.matches(':focus-visible'), outline: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }; });
  assert.ok(focus.visible && focus.outline !== 'none' && focus.width > 0, `focused control shows a visible focus ring (${JSON.stringify(focus)})`);
  await page.keyboard.press('PageDown'); await page.waitForTimeout(500);
  s = await state(page);
  assert.ok(!s.systemCursorHidden && !s.crosshair, 'keyboard scrolling does not bring the crosshair back');
  await hover(page, 400, 400);
  s = await until(page, STATE, [400, 400], (v) => v.crosshair);
  assert.ok(s.crosshair && s.systemCursorHidden, 'moving the mouse again restores the crosshair');
  assert.deepEqual(errors, []);
  await close();
});

test('hero dot field follows the pointer through a scroll and leaves nothing behind', async () => {
  const { page, errors, close } = await open();
  const CENTROID = () => { const cv = document.querySelector('.dotfield'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const k = cv.width / cv.getBoundingClientRect().width; const r = cv.getBoundingClientRect(); let sx = 0; let sy = 0; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40 && d[i + 2] > d[i] + 60) { const j = i / 4; sx += (j % cv.width) / k; sy += Math.floor(j / cv.width) / k; n++; }
    return n ? { x: sx / n + r.left, y: sy / n + r.top } : null; };
  const near = (v) => v && Math.hypot(v.x - 700, v.y - 300) < 40;
  await hover(page, 700, 300);
  assert.ok(near(await until(page, CENTROID, null, near)), 'highlight centred on the pointer');
  await page.mouse.wheel(0, 120);
  assert.equal(await until(page, () => scrollY, null, (y) => y === 120), 120, 'the wheel scroll has landed');
  await page.waitForTimeout(150);                         // a few frames for the field to redraw
  assert.ok(near(await until(page, CENTROID, null, near)), 'after a wheel scroll the highlight is still under the still pointer');
  await page.mouse.wheel(0, 700);
  assert.equal(await until(page, CENTROID, null, (v) => v === null), null, 'scrolled past the hero: no stray highlight');
  assert.deepEqual(errors, []);
  await close();
});

test('Windows High Contrast (forced colours): the user\'s own system cursor stays; no crosshair or pull', async () => {
  const { page, errors, close } = await open({}, { forcedColors: 'active' });
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x, c.y); await page.waitForTimeout(250);
  const s = await state(page, c.x, c.y);
  assert.ok(!s.systemCursorHidden && !s.crosshair && !s.brackets && s.pulled.length === 0, JSON.stringify(s));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.hero__actions .btn')).cursor), 'pointer');
  assert.deepEqual(errors, []);
  await close();
});

test('touch devices never get the custom cursor or the dot field', async () => {
  const { page, errors, close } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const c = await centreOf(page, '.hero__actions .btn');
  await page.touchscreen.tap(c.x, c.y + 60); await page.waitForTimeout(200);
  const s = await page.evaluate(() => ({ xcur: !!document.querySelector('.xcur'), field: !!document.querySelector('.dotfield'), hidden: document.documentElement.classList.contains('has-xcur') }));
  assert.deepEqual(s, { xcur: false, field: false, hidden: false });
  assert.deepEqual(errors, []);
  await close();
});

test('reduced motion: no magnetic pull and no dot field', async () => {
  const { page, errors, close } = await open({}, { reducedMotion: 'reduce' });
  const c = await centreOf(page, '.hero__actions .btn');
  await hover(page, c.x + 20, c.y); await page.waitForTimeout(250);
  const s = await state(page, c.x + 20, c.y);
  assert.equal(s.pulled.length, 0, 'no pull');
  assert.equal(await page.evaluate(() => !!document.querySelector('.dotfield')), false, 'no dot field');
  assert.deepEqual(errors, []);
  await close();
});

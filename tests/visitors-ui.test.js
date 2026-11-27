// Browser tests for the footer visitor counter. /api/visitors is intercepted, so no Upstash is needed.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { serve, until } = require('./helpers');

let site; let browser;
before(async () => { site = await serve(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await site?.close(); });

/** A context whose /api/visitors is answered by `reply(method)`; records every request method. */
async function context(reply, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...opts });
  const calls = [];
  await ctx.route('**/api/visitors', async (route) => {
    const method = route.request().method(); calls.push(method);
    const r = await reply(method);
    if (r === 'abort') return route.abort('failed');
    return route.fulfill({ status: r.status || 200, contentType: 'application/json', body: JSON.stringify(r.body) });
  });
  return { ctx, calls };
}
async function load(page) {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(site.url, { waitUntil: 'networkidle' });
  return errors;
}
const footer = (page) => page.evaluate(() => { const v = document.getElementById('visitCount'); return { hidden: v.hidden, display: getComputedStyle(v).display, text: v.textContent.replace(/\s+/g, ' ').trim() }; });
const shown = (page) => until(page, () => !document.getElementById('visitCount').hidden, null, Boolean, 5000);

test('counts once per browser session: POST on the first view, GET after a reload, POST in a new session', async () => {
  let total = 1233;
  const server = (m) => ({ body: m === 'POST' ? { count: ++total, counted: true } : { count: total } });
  const { ctx, calls } = await context(server);
  const page = await ctx.newPage();
  const errors = await load(page);
  assert.ok(await shown(page));
  assert.deepEqual(calls, ['POST']);
  assert.equal((await footer(page)).text, 'Total: 1,234 visitors');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('visit-counted')), '1');
  await page.reload({ waitUntil: 'networkidle' }); await shown(page);
  assert.deepEqual(calls, ['POST', 'GET'], 'a reload in the same session only reads the count');
  assert.equal((await footer(page)).text, 'Total: 1,234 visitors');
  await ctx.close();
  const second = await context(server);
  const p2 = await second.ctx.newPage(); await load(p2); await shown(p2);
  assert.deepEqual(second.calls, ['POST'], 'a new browser session counts again');
  assert.equal((await footer(p2)).text, 'Total: 1,235 visitors');
  await second.ctx.close();
  assert.deepEqual(errors, []);
});

test('retrieves and formats the count; one visitor reads "1 visitor"', async () => {
  for (const [count, text] of [[1, 'Total: 1 visitor'], [987654, 'Total: 987,654 visitors']]) {
    const { ctx } = await context(() => ({ body: { count, counted: true } }));
    const page = await ctx.newPage(); await load(page); await shown(page);
    assert.equal((await footer(page)).text, text);
    await ctx.close();
  }
});

test('API failures keep the counter hidden, show no number, and the page carries on', async () => {
  const failures = {
    '503 not configured': () => ({ status: 503, body: { error: 'counter not configured' } }),
    '500': () => ({ status: 500, body: {} }),
    'network error': () => 'abort',
    'not a number': () => ({ body: { count: 'lots' } }),
    'negative': () => ({ body: { count: -5 } }),
    'zero': () => ({ body: { count: 0 } }),
  };
  for (const [name, reply] of Object.entries(failures)) {
    const { ctx, calls } = await context(reply);
    const page = await ctx.newPage(); const errors = await load(page);
    await until(page, () => 0, null, () => false, 800);   // give the idle-time request time to finish
    const f = await footer(page);
    assert.equal(calls.length, 1, `${name}: one request`);
    assert.ok(f.hidden && f.display === 'none', `${name}: counter hidden`);
    assert.ok(!/\d/.test(f.text), `${name}: no number rendered`);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('visit-counted')), null, `${name}: a failed count is retried next time`);
    assert.ok(await page.$eval('.hero__actions .btn', (b) => !!b.offsetParent), `${name}: page still works`);
    assert.deepEqual(errors, [], `${name}: no page errors`);
    await ctx.close();
  }
});

test('accessible and responsive, in day and night themes', async () => {
  for (const theme of ['day', 'night']) {
    for (const [w, h] of [[1366, 768], [320, 640]]) {
      const { ctx } = await context(() => ({ body: { count: 1234, counted: true } }), { viewport: { width: w, height: h } });
      await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* ignore */ } }, theme);
      const page = await ctx.newPage(); await load(page); await shown(page);
      const s = await page.evaluate(() => { const v = document.getElementById('visitCount'); const r = v.getBoundingClientRect(); const eye = v.querySelector('svg');
        return { eyeHidden: eye.getAttribute('aria-hidden'), inView: r.left >= 0 && r.right <= innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, theme: document.documentElement.dataset.theme || 'day', color: getComputedStyle(v.querySelector('.visits__n')).color }; });
      assert.equal(s.eyeHidden, 'true', 'decorative icon hidden from screen readers');
      assert.equal(s.theme, theme);
      assert.ok(s.inView && !s.overflow, `${theme} @${w}px: fits without horizontal overflow`);
      assert.equal(s.color, theme === 'night' ? 'rgb(210, 202, 191)' : 'rgb(74, 68, 88)', `${theme}: uses the theme's text colour`);
      await ctx.close();
    }
  }
});

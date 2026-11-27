// Unit tests for the visitor-counter function (api/visitors.js). Upstash is replaced by an in-memory
// stand-in that follows the same commands, so these run offline with no credentials.
// tests/visitors-redis.test.js runs the real Lua script against a local Redis when REDIS_TEST_PORT is set.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/visitors.js');

const ENV = { UPSTASH_REDIS_REST_URL: 'https://example-upstash.test', UPSTASH_REDIS_REST_TOKEN: 'test-token' };
const NOW = new Date('2026-11-27T12:00:00Z');

/** In-memory Upstash: GET and the counting script (same rules as the Lua in api/visitors.js). */
function fakeUpstash() {
  const store = new Map(); const sent = [];
  const fetchImpl = async (url, opts) => {
    const cmd = JSON.parse(opts.body); sent.push({ url, auth: opts.headers.Authorization, cmd });
    let result;
    if (cmd[0] === 'GET') result = store.has(cmd[1]) ? String(store.get(cmd[1])) : null;
    else if (cmd[0] === 'EVAL') {
      const [, , , total, client, minute, , cap, hasClient] = cmd;
      const m = (store.get(minute) || 0) + 1; store.set(minute, m);
      const cur = Number(store.get(total) || 0);
      if (m > Number(cap) || (hasClient === '1' && store.has(client))) result = [cur, 0];
      else { if (hasClient === '1') store.set(client, '1'); store.set(total, cur + 1); result = [cur + 1, 1]; }
    } else throw new Error(`unexpected command ${cmd[0]}`);
    return { ok: true, status: 200, json: async () => ({ result }) };
  };
  return { store, sent, fetchImpl };
}

async function call(method, { headers = {}, env = ENV, fetchImpl, now = NOW } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = JSON.parse(b); } };
  const req = { method, headers: { host: 'parnika-sm.vercel.app', origin: 'https://parnika-sm.vercel.app', 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/140', 'x-forwarded-for': '203.0.113.7', ...headers } };
  await handler(req, res, { env, fetchImpl, now });
  return { status: res.statusCode, headers: res.headers, body: res.body };
}

test('GET returns the stored total (0 before any visit), cached briefly at the edge', async () => {
  const up = fakeUpstash();
  let r = await call('GET', { fetchImpl: up.fetchImpl });
  assert.deepEqual([r.status, r.body], [200, { count: 0 }]);
  up.store.set(handler.KEYS.TOTAL, 1234);
  r = await call('GET', { fetchImpl: up.fetchImpl });
  assert.deepEqual(r.body, { count: 1234 });
  assert.match(r.headers['cache-control'], /s-maxage=15/);
  assert.equal(up.sent[0].auth, 'Bearer test-token');
});

test('POST counts a visit once per client; another client counts too', async () => {
  const up = fakeUpstash();
  let r = await call('POST', { fetchImpl: up.fetchImpl });
  assert.deepEqual([r.status, r.body], [200, { count: 1, counted: true }]);
  r = await call('POST', { fetchImpl: up.fetchImpl });
  assert.deepEqual(r.body, { count: 1, counted: false }, 'same client again: not counted');
  r = await call('POST', { fetchImpl: up.fetchImpl, headers: { 'x-forwarded-for': '198.51.100.9' } });
  assert.deepEqual(r.body, { count: 2, counted: true });
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('no personal data leaves the function: the IP is only ever sent as a salted, daily hash', async () => {
  const up = fakeUpstash();
  await call('POST', { fetchImpl: up.fetchImpl });
  const all = JSON.stringify(up.sent.map((s) => s.cmd));
  assert.ok(!all.includes('203.0.113.7'), 'raw IP never sent to Upstash');
  const clientKey = up.sent[0].cmd[4];
  assert.match(clientKey, /^\{portfolio-visitors\}:seen:[0-9a-f]{32}$/);
  await call('POST', { fetchImpl: up.fetchImpl, now: new Date('2026-11-28T12:00:00Z') });
  assert.notEqual(up.sent[1].cmd[4], clientKey, 'the hash changes every day');
});

test('abuse protection: other sites, missing Origin, bots and other methods are refused or not counted', async () => {
  const up = fakeUpstash();
  assert.equal((await call('POST', { fetchImpl: up.fetchImpl, headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call('POST', { fetchImpl: up.fetchImpl, headers: { origin: '' } })).status, 403);
  for (const ua of ['Googlebot/2.1', 'Mozilla/5.0 HeadlessChrome/140', 'curl/8.0', '']) {
    const r = await call('POST', { fetchImpl: up.fetchImpl, headers: { 'user-agent': ua } });
    assert.deepEqual([r.status, r.body.counted], [200, false], `"${ua}" is not counted`);
  }
  const del = await call('DELETE', { fetchImpl: up.fetchImpl });
  assert.equal(del.status, 405); assert.equal(del.headers.allow, 'GET, POST');
  assert.equal(up.store.get(handler.KEYS.TOTAL), undefined, 'nothing was counted');
});

test('site-wide cap: at most 120 counted visits per minute', async () => {
  const up = fakeUpstash(); let counted = 0;
  for (let i = 0; i < 125; i++) if ((await call('POST', { fetchImpl: up.fetchImpl, headers: { 'x-forwarded-for': `192.0.2.${i}` } })).body.counted) counted++;
  assert.equal(counted, handler.LIMITS.GLOBAL_CAP);
});

test('failures answer 503 with no count: not configured, Upstash errors, timeouts, bad data', async () => {
  const cases = {
    'not configured': { env: {} },
    'Upstash HTTP 500': { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) },
    'Upstash error body': { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ error: 'WRONGPASS' }) }) },
    'network failure': { fetchImpl: async () => { throw new TypeError('fetch failed'); } },
    'timeout': { fetchImpl: async () => { throw new DOMException('timed out', 'TimeoutError'); } },
    'garbage value': { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ result: 'not-a-number' }) }) },
  };
  for (const [name, opts] of Object.entries(cases)) {
    for (const method of ['GET', 'POST']) {
      const r = await call(method, opts);
      assert.equal(r.status, 503, `${name} (${method})`);
      assert.equal(r.body.count, undefined, `${name} (${method}): no count in the reply`);
      assert.ok(!JSON.stringify(r.body).includes('WRONGPASS'), 'upstream details are not leaked');
    }
  }
});

test('also reads the KV_REST_API_* names that Vercel’s Upstash integration adds', async () => {
  const up = fakeUpstash();
  const r = await call('GET', { env: { KV_REST_API_URL: 'https://kv.example.test', KV_REST_API_TOKEN: 'kv-token' }, fetchImpl: up.fetchImpl });
  assert.equal(r.status, 200);
  assert.equal(up.sent[0].url, 'https://kv.example.test');
  assert.equal(up.sent[0].auth, 'Bearer kv-token');
});

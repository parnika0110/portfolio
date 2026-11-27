// Optional: runs api/visitors.js and its Lua script against a real Redis, through a stand-in for
// Upstash's REST API. Skipped unless REDIS_TEST_PORT points at a throwaway local Redis, e.g.
//   redis-server --port 6390 --save "" --daemonize yes && REDIS_TEST_PORT=6390 npm test
// It empties that Redis database, so never point it at real data.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const handler = require('../api/visitors.js');

const PORT = Number(process.env.REDIS_TEST_PORT || 0);
const skip = PORT ? false : 'set REDIS_TEST_PORT to run against a local Redis';
let sock; let buf = Buffer.alloc(0); const waiting = [];

function parse(b, i) {
  if (i >= b.length) return null;
  const t = String.fromCharCode(b[i]); const nl = b.indexOf('\r\n', i); if (nl < 0) return null; const line = b.toString('utf8', i + 1, nl);
  if (t === '+') return { v: line, end: nl + 2 };
  if (t === '-') return { v: new Error(line), end: nl + 2 };
  if (t === ':') return { v: Number(line), end: nl + 2 };
  if (t === '$') { const n = Number(line); if (n < 0) return { v: null, end: nl + 2 }; if (b.length < nl + 4 + n) return null; return { v: b.toString('utf8', nl + 2, nl + 2 + n), end: nl + 4 + n }; }
  if (t === '*') { const n = Number(line); if (n < 0) return { v: null, end: nl + 2 }; const out = []; let j = nl + 2; for (let k = 0; k < n; k++) { const r = parse(b, j); if (!r) return null; out.push(r.v); j = r.end; } return { v: out, end: j }; }
  return null;
}
const cmd = (args) => new Promise((ok) => { waiting.push(ok); sock.write(`*${args.length}\r\n${args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join('')}`); });
const upstash = async (url, opts) => { const r = await cmd(JSON.parse(opts.body)); return { ok: true, status: 200, json: async () => (r instanceof Error ? { error: r.message } : { result: r }) }; };
async function call(method, headers = {}, now = new Date('2026-11-27T12:00:00Z')) {
  const res = { setHeader() {}, end(b) { this.body = JSON.parse(b); } };
  await handler({ method, headers: { host: 'site.test', origin: 'https://site.test', 'user-agent': 'Mozilla/5.0 Chrome/140', 'x-forwarded-for': '203.0.113.7', ...headers } }, res,
    { env: { UPSTASH_REDIS_REST_URL: 'https://shim.test', UPSTASH_REDIS_REST_TOKEN: 't' }, fetchImpl: upstash, now });
  return { status: res.statusCode, ...res.body };
}

before(async () => {
  if (!PORT) return;
  sock = net.createConnection(PORT);
  sock.on('data', (d) => { buf = Buffer.concat([buf, d]); for (;;) { const r = parse(buf, 0); if (!r) break; buf = buf.subarray(r.end); waiting.shift()(r.v); } });
  await new Promise((ok, fail) => { sock.once('connect', ok); sock.once('error', fail); });
  await cmd(['FLUSHDB']);
});
after(() => sock?.end());

test('real Redis: counts once per client, hashes expire in 30 min, no IP stored, cap of 120 a minute', { skip }, async () => {
  assert.deepEqual(await call('POST'), { status: 200, count: 1, counted: true });
  assert.deepEqual(await call('POST'), { status: 200, count: 1, counted: false });
  assert.deepEqual(await call('POST', { 'x-forwarded-for': '198.51.100.9' }), { status: 200, count: 2, counted: true });
  assert.deepEqual(await call('GET'), { status: 200, count: 2 });
  const keys = await cmd(['KEYS', '*']);
  assert.ok(!keys.some((k) => k.includes('203.0.113') || k.includes('198.51')), 'no IP in any key');
  for (const k of keys.filter((x) => x.includes(':seen:'))) { const ttl = await cmd(['TTL', k]); assert.ok(ttl > 1790 && ttl <= 1800, `TTL ${ttl}`); }
  await cmd(['FLUSHDB']);
  let counted = 0; const t = new Date('2026-11-27T13:00:10Z');
  for (let i = 0; i < 125; i++) if ((await call('POST', { 'x-forwarded-for': `192.0.2.${i}` }, t)).counted) counted++;
  assert.equal(counted, 120);
});

/* Visitor counter: a Vercel serverless function backed by Upstash Redis (REST API; no SDK needed).

   GET  /api/visitors  → { count }            read the total
   POST /api/visitors  → { count, counted }   count this visit, then return the total

   The browser POSTs once per session (sessionStorage) and GETs afterwards. Abuse protection, all
   server-side and without storing anything that identifies a visitor:
   - POST must come from the site itself (its Origin host must match the request host).
   - Known bots, crawlers and link previewers are never counted.
   - Each anonymous client counts at most once per 30 minutes. The client is a salted SHA-256 hash of
     the IP address and the current day, so the hash changes daily. Only the hash is kept, and only
     for 30 minutes; the IP itself is never stored.
   - At most 120 visits per minute are counted site-wide.
   When Upstash isn't configured or can't be reached, the function answers 503 and the page hides the counter.

   Environment: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN,
   as added by Vercel's Upstash integration). Optional: VISITOR_HASH_SALT. See README → Visitor counter. */
const crypto = require('node:crypto');

const NS = '{portfolio-visitors}';            // one hash slot for every key the script touches
const TOTAL = `${NS}:total`;
const CLIENT_TTL = 30 * 60;                     // seconds a client is remembered (as a hash) for throttling
const GLOBAL_CAP = 120;                         // counted visits per minute, site-wide
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless|curl|wget|python-requests|httpclient|scrapy/i;

// KEYS: total, client, minute · ARGV: client TTL, global cap, whether a client key exists ('1' / '0')
const COUNT_SCRIPT = `
local m = redis.call('INCR', KEYS[3])
if m == 1 then redis.call('EXPIRE', KEYS[3], 120) end
local total = tonumber(redis.call('GET', KEYS[1]) or '0')
if m > tonumber(ARGV[2]) then return {total, 0} end
if ARGV[3] == '1' and not redis.call('SET', KEYS[2], '1', 'NX', 'EX', tonumber(ARGV[1])) then return {total, 0} end
return {redis.call('INCR', KEYS[1]), 1}
`.trim();

const REQUIRED = [['UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'], ['UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN']];
const missingNames = (env) => REQUIRED.filter(([name, alt]) => !env[name] && !env[alt]).map(([name]) => name);

function config(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token, salt: env.VISITOR_HASH_SALT || token };
}

async function redis(cfg, command, fetchImpl) {
  const r = await fetchImpl(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error(`Upstash HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error('Upstash error');
  return data.result;
}

function send(res, status, body, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

const header = (req, name) => String(req.headers[name] || '').split(',')[0].trim();

function fromThisSite(req) {
  const origin = header(req, 'origin');
  if (!origin) return false;
  try { return new URL(origin).host === (header(req, 'x-forwarded-host') || header(req, 'host')); } catch { return false; }
}

/** Anonymous throttle key: salted hash of IP + day (never the IP itself), or null without an IP. */
function clientKey(req, salt, now) {
  const ip = header(req, 'x-forwarded-for') || header(req, 'x-real-ip');
  if (!ip) return null;
  const day = now.toISOString().slice(0, 10);
  return `${NS}:seen:${crypto.createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex').slice(0, 32)}`;
}

const toCount = (v) => { const n = Number(v ?? 0); if (!Number.isSafeInteger(n) || n < 0) throw new Error('bad count'); return n; };

async function handler(req, res, { env = process.env, fetchImpl = fetch, now = new Date() } = {}) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'method not allowed' });
  }
  const cfg = config(env);
  if (!cfg) {
    // Names only, never values: says which variables this deployment's runtime lacks, and (in Vercel →
    // Logs) which deployment answered, so a misconfigured environment is easy to pin down.
    const missing = missingNames(env);
    const related = Object.keys(env).filter((k) => /UPSTASH|REDIS|^KV_/i.test(k)).sort();
    console.warn(`[visitors] not configured: missing ${missing.join(', ')} · environment=${env.VERCEL_ENV || 'unknown'} branch=${env.VERCEL_GIT_COMMIT_REF || 'unknown'} deployment=${env.VERCEL_URL || 'unknown'} · similar variable names present: ${JSON.stringify(related)}`);
    return send(res, 503, { error: 'counter not configured', missing });
  }
  try {
    if (req.method === 'GET') {
      return send(res, 200, { count: toCount(await redis(cfg, ['GET', TOTAL], fetchImpl)) }, 'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
    }
    if (!fromThisSite(req)) return send(res, 403, { error: 'forbidden' });
    const ua = header(req, 'user-agent');
    if (!ua || BOT.test(ua)) return send(res, 200, { count: toCount(await redis(cfg, ['GET', TOTAL], fetchImpl)), counted: false });
    const client = clientKey(req, cfg.salt, now);
    const minute = `${NS}:minute:${Math.floor(now.getTime() / 60000)}`;
    const [count, counted] = await redis(cfg, ['EVAL', COUNT_SCRIPT, '3', TOTAL, client || `${NS}:seen:none`, minute, String(CLIENT_TTL), String(GLOBAL_CAP), client ? '1' : '0'], fetchImpl);
    return send(res, 200, { count: toCount(count), counted: Number(counted) === 1 });
  } catch {
    return send(res, 503, { error: 'counter unavailable' });
  }
}

module.exports = handler;
module.exports.handler = handler;
module.exports.COUNT_SCRIPT = COUNT_SCRIPT;
module.exports.KEYS = { NS, TOTAL };
module.exports.LIMITS = { CLIENT_TTL, GLOBAL_CAP };

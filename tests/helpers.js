// Shared helpers for the browser tests: a dependency-free static server for the site and a
// polling wait, so checks follow the page's animation frames instead of fixed sleeps.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

/** Serve the repository root on a free local port. Resolves to { url, close }. */
function serve() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) });
  }));
}

/** Re-run `fn` in the page until `ok(result)` holds or the timeout passes; returns the last result. */
async function until(page, fn, arg, ok = Boolean, timeout = 3000) {
  const end = Date.now() + timeout; let v;
  do { v = await page.evaluate(fn, arg); if (ok(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end);
  return v;
}

module.exports = { serve, until };

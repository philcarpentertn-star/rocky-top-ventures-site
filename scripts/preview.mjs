// Local-only preview. Uses the production handler with a separate disk-backed store.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHandler } from '../netlify/lib/leaderboard.mjs';
const root = resolve('dist');
const file = '.netlify/arcade-preview.json';
await mkdir('.netlify', { recursive: true });
let data = {};
try { data = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let writes = Promise.resolve();
const store = {
  async get(key, options) { return data[key] ? structuredClone(data[key].data) : null; },
  async getWithMetadata(key) { return data[key] ? structuredClone(data[key]) : null; },
  set(key, value, options) { return this.setJSON(key, value, options); },
  async setJSON(key, value, options) {
    const operation = writes.then(async () => {
      const previous = data[key];
      if (options?.onlyIfNew && previous || options?.onlyIfMatch && options.onlyIfMatch !== previous?.etag) return { modified: false };
      data[key] = { data: structuredClone(value), etag: crypto.randomUUID() };
      await writeFile(file, JSON.stringify(data), { mode: 0o600 });
      return { modified: true };
    });
    writes = operation.catch(() => {});
    return operation;
  }
};
const handler = createHandler(() => store);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const origin = 'http://127.0.0.1:8001';
    const url = new URL(req.url, origin);
    if (url.pathname === '/.netlify/functions/leaderboard') {
      let bytes = 0; const parts = [];
      for await (const part of req) { bytes += part.length; if (bytes > 8192) { res.writeHead(413).end(); return; } parts.push(part); }
      const response = await handler(new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: Buffer.concat(parts) } : {}) }));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let content = await readFile(path);
    if (extname(path) === '.html') content = Buffer.from(content.toString().replace('<body>', '<body><div style="padding:10px;text-align:center;background:#25382d;color:#fff;font:14px Arial">Local preview · These scores stay on this computer.</div>'));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(content);
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Preview unavailable.'); }
});
server.listen(8001, '127.0.0.1', () => console.log('Arcade preview: http://127.0.0.1:8001/basketball/?team=texas'));

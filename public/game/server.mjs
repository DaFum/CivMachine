import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent((req.url || '/').split('?')[0]));
    let target = join(root, path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
    if (!target.startsWith(root)) throw new Error('Forbidden');
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = join(target, 'index.html');
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream', 'cache-control':'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => console.log(`Reality Consumption Engine: http://localhost:${port}`));

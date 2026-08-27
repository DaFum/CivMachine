import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved once, so the containment check below compares real paths on both sides.
const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 8080);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };
const within = target => target === root || target.startsWith(root + sep);
createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent((req.url || '/').split('?')[0]));
    let target = join(root, path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
    if (!within(target)) throw new Error('Forbidden');
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = join(target, 'index.html');
    // A lexical check cannot see through a symlink, so the file that is actually about to be read has
    // to clear the same boundary: a link inside the tree pointing out of it is Forbidden too.
    target = await realpath(target);
    if (!within(target)) throw new Error('Forbidden');
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream', 'cache-control':'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => console.log(`Reality Consumption Engine: http://localhost:${port}`));

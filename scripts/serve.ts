import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteBase } from '../site.config.mjs';

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

export async function startServer(root = path.resolve('dist'), port = 0) {
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const pathname = decodeURIComponent(url.pathname);
        if (!pathname.startsWith(siteBase))
          throw new Error('Outside site base');
        const relative = '/' + pathname.slice(siteBase.length);
        const filename = path.resolve(root, `.${relative}`);
        if (filename !== root && !filename.startsWith(`${root}${path.sep}`))
          throw new Error('Invalid path');
        const target = (await stat(filename)).isDirectory()
          ? path.join(filename, 'index.html')
          : filename;
        const bytes = await readFile(target);
        response.writeHead(200, {
          'Content-Type':
            types[path.extname(target)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        response.end(bytes);
      } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('Not found');
      }
    })();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing server port');
  return {
    url: `http://127.0.0.1:${String(address.port)}${siteBase}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        server.closeAllConnections();
      }),
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
  const app = await startServer(root, Number(process.env['PORT'] ?? 0));
  console.log(`QR Scanner is running at ${app.url}`);
  process.once('SIGINT', () => {
    void app.close();
  });
  process.once('SIGTERM', () => {
    void app.close();
  });
}

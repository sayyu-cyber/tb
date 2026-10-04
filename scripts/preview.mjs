import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(process.env.THAASBAI_BUILD_DIR || 'out');
function parsePort(args, environmentPort) {
  let value = environmentPort || '3002';
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '-p' || argument === '--port') {
      value = args[++index];
    } else if (argument.startsWith('--port=')) {
      value = argument.slice('--port='.length);
    } else {
      throw new Error(`Unknown preview argument: ${argument}. Use -p PORT or --port PORT.`);
    }
    if (!value || !/^\d+$/.test(value)) throw new Error('Preview port must be an integer from 1 to 65535.');
  }
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('Preview port must be an integer from 1 to 65535.');
  }
  return Number(value);
}
const port = parsePort(process.argv.slice(2), process.env.PORT);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

await stat(resolve(root, 'index.html')).catch(() => {
  console.error('Build the app with npm run build before starting the preview.');
  process.exit(1);
});

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': pathname.startsWith('/_next/static/')
        ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Production preview: http://127.0.0.1:${port}`);
});

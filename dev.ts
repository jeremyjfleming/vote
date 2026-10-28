// Local development server: `npm run dev`. Uses the same handler as Netlify,
// with data stored as JSON files in ./.data instead of Netlify Blobs.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { createHandler } from './lib/app.ts';
import type { Store } from './lib/types.ts';

const DATA_DIR = path.join(import.meta.dirname, '.data');
const PUBLIC_DIR = path.join(import.meta.dirname, 'public');
const PORT = Number(process.env.PORT) || 8888;
const TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Each key is a JSON file: .data/<store>/<key>.json (keys contain slashes, so they nest).
function fileStore(name: string): Store {
  const root = path.join(DATA_DIR, name);
  const file = (key: string) => path.join(root, `${key}.json`);
  return {
    async get(key) {
      try {
        return JSON.parse(await fs.readFile(file(key), 'utf8'));
      } catch {
        return null;
      }
    },
    async set(key, value, options) {
      await fs.mkdir(path.dirname(file(key)), { recursive: true });
      try {
        await fs.writeFile(file(key), JSON.stringify(value), { flag: options?.onlyIfNew ? 'wx' : 'w' });
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw err;
      }
    },
    async list(prefix) {
      const files = await fs.readdir(root, { recursive: true }).catch(() => [] as string[]);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.slice(0, -'.json'.length).split(path.sep).join('/'))
        .filter((key) => key.startsWith(prefix));
    },
  };
}

const env = { ...process.env };
if (!env.ADMIN_PASSWORD) {
  env.ADMIN_PASSWORD = crypto.randomBytes(6).toString('base64url');
  console.warn(`ADMIN_PASSWORD not set; using temporary password: ${env.ADMIN_PASSWORD}`);
}
const handler = createHandler({ stores: { responses: fileStore('responses'), giveaway: fileStore('giveaway') }, env });

async function serveStatic(pathname: string, res: http.ServerResponse): Promise<boolean> {
  const file = path.join(PUBLIC_DIR, path.normalize(pathname));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return false;
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (req.method === 'GET' && (await serveStatic(url.pathname, res))) return;

    const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET');
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
      duplex: 'half',
    } as RequestInit);
    const response = await handler(request);

    const headers: http.OutgoingHttpHeaders = {};
    response.headers.forEach((v, k) => {
      if (k !== 'set-cookie') headers[k] = v;
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies;
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(PORT, () => console.log(`Forms running at http://localhost:${PORT}`));

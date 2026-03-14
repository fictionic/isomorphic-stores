import { AsyncLocalStorage } from 'node:async_hooks';
import { setCacheProvider, setBaseUrl, type CacheEntry } from './fake-react-server/fetchAgent';
import { renderPage } from './fake-react-server/renderPage';
import { buildClientBundle } from './fake-react-server/buildClientBundle';
import DemoPage from './DemoPage';

const als = new AsyncLocalStorage<Map<string, CacheEntry>>();

type Latencies = { users: number; theme: number; activity: number };
const latencyAls = new AsyncLocalStorage<Latencies>();

// 1. Build client bundle at startup
const clientJs = await buildClientBundle(import.meta.dir + '/DemoPage.tsx');
console.log(`[build] client bundle: ${(clientJs.length / 1024).toFixed(1)} KB`);

// 2. Wire up ALS-backed cache provider
setCacheProvider(() => als.getStore() ?? null);

// API data
const NAMES: Record<number, string> = {
  1: 'Alice',
  2: 'Bob',
  3: 'Charlie',
  4: 'Dana',
  5: 'Eve',
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  }
  return cookies;
}

function getLatencies(req: Request): Latencies {
  const c = parseCookies(req);
  return {
    users: Number(c.latency_users) || 500,
    theme: Number(c.latency_theme) || 500,
    activity: Number(c.latency_activity) || 1000,
  };
}

// 3. Start server
const server = Bun.serve({
  routes: {
    '/api/users/:id': {
      GET: async (req) => {
        const id = Number((req.params as any).id);
        const lat = latencyAls.getStore();
        await delay(lat?.users ?? 500);
        return Response.json({ username: NAMES[id] ?? `User${id}`, email: `user${id}@example.com` });
      },
    },
    '/api/theme/:userId': {
      GET: async (req) => {
        const userId = Number((req.params as any).userId);
        const lat = latencyAls.getStore();
        await delay(lat?.theme ?? 400);
        return Response.json({
          theme: userId % 2 === 0 ? 'light' : 'dark',
          accent: '#6366f1',
        });
      },
    },
    '/api/activity': {
      GET: async () => {
        const lat = latencyAls.getStore();
        await delay(lat?.activity ?? 1500);
        return Response.json({
          items: [
            'Edited profile settings',
            'Uploaded a photo',
            'Sent a message to Bob',
            'Updated notification preferences',
            'Joined #general channel',
          ],
        });
      },
    },
    '/client.js': {
      GET: () => new Response(clientJs, { headers: { 'Content-Type': 'application/javascript' } }),
    },
  },
  fetch: handleSSR,
});

// 4. Set base URL for server-side fetch (after server starts so we have the URL)
setBaseUrl(server.url.href.replace(/\/$/, ''));

console.log(`isomorphic-stores demo running at ${server.url}`);

// 5. SSR handler
async function handleSSR(req: Request): Promise<Response> {
  const cache = new Map<string, CacheEntry>();
  const latencies = getLatencies(req);
  return als.run(cache, () =>
    latencyAls.run(latencies, async () => {
      const page = new DemoPage();
      page.latencies = latencies;
      page.createStores();

      return new Response(renderPage(page.getElements(), cache, '/client.js'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }),
  );
}

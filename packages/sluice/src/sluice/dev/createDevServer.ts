import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { createRouter, type SiteConfig } from '../server/router';
import { sluiceVitePlugin } from './sluiceVitePlugin';
import { getDevRouteAssets } from './devRouteAssets';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDLE_ROUTE_PATH = path.resolve(__dirname, '../server/handleRoute.ts');

interface DevServerConfig {
  siteConfigPath: string;
  urlPrefix?: string;
  port?: number;
}

export async function createDevServer(config: DevServerConfig) {
  const siteConfigPath = config.siteConfigPath;

  // Site config is loaded after Vite creation via ssrLoadModule (it may
  // import .tsx middleware). The plugin reads routes lazily through a getter
  // since virtual module load() hooks only fire after the server is up.
  let site: SiteConfig;

  const vite = await createViteServer({
    configFile: false,
    server: { middlewareMode: true },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    ssr: {
      noExternal: ['sluice', 'sluice-store-adapters'],
    },
    define: {
      IS_SERVER: 'true',
    },
    environments: {
      client: {
        define: {
          IS_SERVER: 'false',
        },
      },
    },
    plugins: [
      sluiceVitePlugin(() => site.routes, siteConfigPath),
    ],
  });

  site = await ssrLoadDefault<SiteConfig>(vite, siteConfigPath);
  const router = createRouter(site.routes);

  const port = config.port ?? 3000;
  const urlPrefix = config.urlPrefix ?? `http://localhost:${port}`;

  const server = http.createServer(async (nodeReq, nodeRes) => {
    try {
      const url = new URL(nodeReq.url ?? '/', urlPrefix);
      const routeMatch = router.matchRoute(url.pathname, nodeReq.method ?? 'GET');

      if (routeMatch) {
        const handler = await ssrLoadDefault(vite, resolveHandler(siteConfigPath, routeMatch.handler));
        const { handleRoute } = await vite.ssrLoadModule(HANDLE_ROUTE_PATH);
        const request = toWebRequest(nodeReq, url);
        const response = await handleRoute(
          handler.type,
          request,
          handler,
          routeMatch.params,
          site.middleware ?? [],
          {
            routeAssets: getDevRouteAssets(routeMatch.routeName),
            urlPrefix,
          },
        );
        await sendWebResponse(nodeRes, response);
      } else {
        // Fall through to Vite for client modules, HMR websocket, static assets
        vite.middlewares(nodeReq, nodeRes);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error('[sluice]', e);
      nodeRes.statusCode = 500;
      nodeRes.end();
    }
  });

  server.listen(port, () => {
    console.log(`[sluice] Dev server running at ${urlPrefix}`);
  });

  return { server, vite };
}

async function ssrLoadDefault<T>(vite: ViteDevServer, modulePath: string): Promise<T> {
  const mod = await vite.ssrLoadModule(modulePath);
  return (mod.default ?? mod) as T;
}

function resolveHandler(siteConfigPath: string, handlerPath: string): string {
  const routesDir = path.dirname(siteConfigPath);
  return path.resolve(routesDir, handlerPath);
}

function toWebRequest(nodeReq: http.IncomingMessage, url: URL): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeReq.headers)) {
    if (value) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        headers.append(key, v);
      }
    }
  }
  return new Request(url, {
    method: nodeReq.method,
    headers,
    body: nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD' ? nodeReq as any : undefined,
    // @ts-expect-error duplex is needed for streaming request bodies
    duplex: 'half',
  });
}

async function sendWebResponse(nodeRes: http.ServerResponse, response: Response) {
  nodeRes.statusCode = response.status;
  response.headers.forEach((value, key) => {
    nodeRes.setHeader(key, value);
  });

  if (!response.body) {
    nodeRes.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      nodeRes.write(value);
    }
  } finally {
    nodeRes.end();
  }
}

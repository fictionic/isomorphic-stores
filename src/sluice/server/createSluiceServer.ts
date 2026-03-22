import path from 'node:path';
import type {BundleResult} from "../bundle";
import {handlePage} from "./handlePage";
import {createRouter, type SluiceRoutes} from "./router";
import type {Endpoint, Page} from '../Page';
import {handleEndpoint} from './handleEndpoint';

interface SluiceServerConfig {
  routesPath: string;
  bundleResult: BundleResult;
  urlPrefix: string;
  renderTimeout?: number;
}

interface SluiceServer {
  routes: Record<string, { GET: () => Response }>; // client bundles
  serve: (req: Request) => Promise<Response>; // ssr handler
}

export async function createSluiceServer(config: SluiceServerConfig): Promise<SluiceServer> {
  const clientBundleRoutes = Object.assign({}, ...Object.entries(config.bundleResult.bundleContents).map(([bundlePath, contents]) => {
    const isCss = bundlePath.endsWith('.css');
    return {
      [`/${bundlePath}`]: {
        GET: () => new Response(contents, { headers: { 'Content-Type': isCss ? 'text/css' : 'application/javascript' } }),
      },
    };
  }));
  const routes: SluiceRoutes = (await import(config.routesPath)).default;
  const router = createRouter(routes);
  const routesDir = path.dirname(config.routesPath);
  const pageClassesByRoute: Record<string, new () => Page> = {};
  const endpointClassesByRoute: Record<string, new () => Endpoint> = {};
  await Promise.all(Object.entries(routes).map(async ([routeName, routeConfig]) => {
    if ('page' in routeConfig) {
      const { page } = routeConfig;
      pageClassesByRoute[routeName] = (await import(path.resolve(routesDir, page))).default;
    } else if ('endpoint' in routeConfig) {
      const { endpoint } = routeConfig;
      endpointClassesByRoute[routeName] = (await import(path.resolve(routesDir, endpoint))).default;
    } else {
      routeConfig satisfies never;
    }
  }));
  return {
    routes: clientBundleRoutes,
    serve: (req: Request) => {
      const result = router.matchRoute(new URL(req.url).pathname, req.method);
      if (!result) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      switch (result.type) {
        case 'page': {
          const { routeName, params: routeParams } = result;
          const PageClass = pageClassesByRoute[routeName]!;
          return handlePage(req, PageClass, routeParams, {
            routeAssets: config.bundleResult.manifest[routeName]!,
            urlPrefix: config.urlPrefix,
          });
        }
        case 'endpoint': {
          const { routeName, params: routeParams } = result;
          const EndpointClass = endpointClassesByRoute[routeName]!;
          return handleEndpoint(req, EndpointClass, routeParams, {
            urlPrefix: config.urlPrefix,
          });
        }
        default:
          throw new Error(`Unknown route type: ${result.type satisfies never}`);
      }
    }
  };
}

import {match, type ParamData} from "path-to-regexp";
import {ensureArray} from "../util/array";

interface PageRoute {
  page: string;
};

interface EndpointRoute {
  endpoint: string;
  method?: string | string[];
};

export type SluiceRoutes = {
  [routeName: string]: {
    path: string;
  } & (
    PageRoute | EndpointRoute
  );
};

export interface RouteMatch {
  routeName: string;
  params: ParamData;
  type: 'page' | 'endpoint';
  page: string | null;
  endpoint: string | null;
  method: string;
};

export function createRouter(routes: SluiceRoutes) {
  const compiled = Object.entries(routes).map(([routeName, routeConfig]) => {
    const { path } = routeConfig;
    const page = 'page' in routeConfig ? routeConfig.page : null;
    const endpoint = 'endpoint' in routeConfig ? routeConfig.endpoint : null;
    const methods = page
      ? ['GET'] // pages are always GET
      : (
        ('method' in routeConfig && !!routeConfig.method)
          ? ensureArray(routeConfig.method).map(m => m.toUpperCase())
          : ['GET'] // endpoints default to GET
      );
    return {
      routeName,
      matchFn: match(path),
      methods,
      page,
      endpoint,
    };
  });
  return {
    matchRoute: (path: string, method: string): RouteMatch | null => {
      for (const { routeName, matchFn, methods, page, endpoint } of compiled) {
        if (!methods.includes(method.toUpperCase())) {
          continue;
        }
        const result = matchFn(path);
        if (result) {
          return {
            routeName,
            params: result.params,
            method,
            type: !!page ? 'page' : 'endpoint',
            page: page ?? null,
            endpoint: endpoint ?? null,
          };
        }
      }
      return null;
    },
  };
}

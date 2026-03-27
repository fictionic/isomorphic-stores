import type { RouteAssets } from '../bundle';
import { virtualModuleId } from './sluiceVitePlugin';

export function getDevRouteAssets(routeName: string): RouteAssets {
  const moduleId = virtualModuleId(routeName);
  return {
    scripts: [`/@id/__x00__${moduleId}`],
    stylesheets: [], // Vite injects CSS via JS in dev mode
  };
}

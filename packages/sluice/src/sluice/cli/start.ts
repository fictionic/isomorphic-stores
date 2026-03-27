import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import type { SluiceConfig } from '../config';
import { resolveOutDir } from '../config';
import type { BundleManifest, BundleResult } from '../bundle';
import type { SiteConfig } from '../server/router';
import type { RouteHandlerDefinition } from '../RouteHandler';
import { createSluiceServer } from '../server/createSluiceServer';

async function loadBundleResult(outDir: string, siteConfigPath: string): Promise<BundleResult> {
  const manifestPath = path.resolve(outDir, 'manifest.json');
  const manifest: BundleManifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

  // Read all bundle files from disk
  const bundlesDir = path.resolve(outDir, 'bundles');
  const files = await readdir(bundlesDir);
  const bundleContents: Record<string, string> = {};
  await Promise.all(
    files.map(async (file) => {
      const bundlePath = `bundles/${file}`;
      bundleContents[bundlePath] = await readFile(path.resolve(outDir, bundlePath), 'utf-8');
    })
  );

  // Import handler modules from the site config
  const site: SiteConfig = (await import(siteConfigPath)).default;
  const rootDir = path.dirname(siteConfigPath);
  const handlersByRoute: Record<string, RouteHandlerDefinition<any, any, any>> = {};
  await Promise.all(
    Object.entries(site.routes).map(async ([routeName, routeConfig]) => {
      const handler = (await import(path.resolve(rootDir, routeConfig.handler))).default;
      handlersByRoute[routeName] = handler;
    })
  );

  return { manifest, bundleContents, handlersByRoute };
}

export async function runStart(config: SluiceConfig) {
  const routesPath = path.resolve(process.cwd(), config.routes);
  const outDir = resolveOutDir(config);

  const bundleResult = await loadBundleResult(outDir, routesPath);

  const sluiceServer = await createSluiceServer({
    siteConfigPath: routesPath,
    bundleResult,
    urlPrefix: config.server?.urlPrefix,
    renderTimeout: config.server?.renderTimeout,
  });

  Bun.serve({
    routes: sluiceServer.routes,
    fetch: sluiceServer.serve,
  });

  console.log('[sluice] Server started');
}

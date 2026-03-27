import { createSluiceServer } from 'sluice/server';
import { bundle } from 'sluice/bundler';

const routesPath = import.meta.dir + '/routes';
const bundleResult = await bundle(routesPath);

const sluiceServer = await createSluiceServer({
  siteConfigPath: routesPath,
  bundleResult,
  urlPrefix: 'http://localhost:3000',
});

Bun.serve({
  routes: sluiceServer.routes,
  fetch: sluiceServer.serve,
});

console.log("started server");

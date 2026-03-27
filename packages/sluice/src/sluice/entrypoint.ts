import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bootstrapPath = path.resolve(__dirname, 'client/bootstrap.ts');

export function makeEntrypoint(handler: string, routePath: string, routesDir: string, siteConfigPath: string) {
  const q = (s: string) => JSON.stringify(s);
  const absolutePagePath = path.resolve(routesDir, handler);
  return (
`import siteConfig from ${q(siteConfigPath)};
import Page from ${q(absolutePagePath)};
import { bootstrap } from ${q(bootstrapPath)};
bootstrap(Page, ${q(routePath)}, siteConfig.middleware ?? []);`
  );
}

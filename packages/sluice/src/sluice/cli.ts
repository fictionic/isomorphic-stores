import path from 'node:path';
import type { SluiceConfig } from './config';
import { importModule } from './util/importModule';

const SLUICE_CONFIG_FILE = 'sluice.config.ts';

async function loadConfig(): Promise<SluiceConfig> {
  const configPath = path.resolve(process.cwd(), SLUICE_CONFIG_FILE);
  return importModule<SluiceConfig>(configPath);
}

const command = process.argv[2];

switch (command) {
  case 'build': {
    const { runBuild } = await import('./cli/build');
    const config = await loadConfig();
    await runBuild(config);
    break;
  }
  case 'start': {
    const { runStart } = await import('./cli/start');
    const config = await loadConfig();
    await runStart(config);
    break;
  }
  case 'dev': {
    const { runDev } = await import('./cli/dev');
    const config = await loadConfig();
    await runDev(config);
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: sluice <build|start|dev>');
    process.exit(1);
}

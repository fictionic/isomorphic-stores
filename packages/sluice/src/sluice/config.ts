export interface SluiceConfig {
  routes: string;
  server?: {
    urlPrefix?: string;
    renderTimeout?: number;
  };
  build?: {
    outDir?: string;
    cdnPrefix?: string;
  };
}

const DEFAULT_OUT_DIR = 'dist';

export function resolveOutDir(config: SluiceConfig): string {
  return config.build?.outDir ?? DEFAULT_OUT_DIR;
}

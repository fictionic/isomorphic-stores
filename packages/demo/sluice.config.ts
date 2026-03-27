import type { SluiceConfig } from 'sluice/config';

export default {
  routes: './src/routes.ts',
  server: {
    urlPrefix: 'http://localhost:3000',
  },
} satisfies SluiceConfig;

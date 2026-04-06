import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    IS_SERVER: 'true',
    IS_DEV: 'false',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

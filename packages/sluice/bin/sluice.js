#!/usr/bin/env node
import { createJiti } from 'jiti';
const jiti = createJiti(import.meta.url, { jsx: true });
await jiti.import('../src/sluice/cli.ts');

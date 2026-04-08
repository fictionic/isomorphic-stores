import { test as base, expect } from '@playwright/test';
import { versoFixtures } from '@verso-js/playwright';

type TestFixtures = {
  consoleErrors: string[];
};

export const test = base.extend<TestFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      errors.push(`pageerror: ${err.message}`);
    });
    await use(errors);
    expect(errors, 'Expected no browser errors').toEqual([]);
  },

  page: async ({ page }, use) => {
    // Set all latency cookies to 10ms before each test
    await page.context().addCookies([
      { name: 'latency_users', value: '10', domain: 'localhost', path: '/' },
      { name: 'latency_theme', value: '10', domain: 'localhost', path: '/' },
      { name: 'latency_activity', value: '10', domain: 'localhost', path: '/' },
    ]);
    // Apply verso hydration-aware page fixture
    await versoFixtures.page({ page }, async (patchedPage) => {
      // Forward browser console and errors for debugging
      patchedPage.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`));
      patchedPage.on('pageerror', err => console.error(`[browser:pageerror]`, err));
      await use(patchedPage);
    });
  },
});

export { expect };

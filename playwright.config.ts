const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.25,
    },
  },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  },
  snapshotDir: './tests/visual-diff.spec.ts-snapshots',
  reporter: [['html', { open: 'never' }]],
});

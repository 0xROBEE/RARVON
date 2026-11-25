import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Rarvon for desktop: the built site served by the real Rarvon Engine (without
// opening a window), so the tools run their video and audio jobs in FFmpeg.
// `npm run test:desktop` builds both first.
// The app's settings file goes in a fresh temporary folder, never your real one.
const dataDir = mkdtempSync(join(tmpdir(), 'rarvon-test-data-'));
const exe = join('desktop', 'rarvon-engine', 'target', 'release', process.platform === 'win32' ? 'rarvon-engine.exe' : 'rarvon-engine');

export default defineConfig({
  testDir: 'desktop/e2e',
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:47821',
    acceptDownloads: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `"${exe}"`,
    url: 'http://127.0.0.1:47821',
    env: { BENCH_NO_WINDOW: '1', BENCH_DATA_DIR: dataDir },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

// Photographs Rarvon's screens for the design map: `npm run design:capture`.
// Three servers: the built website, the website with a pretend app download
// link (to show the download buttons), and Rarvon for desktop's engine.
const engine = join('desktop', 'rarvon-engine', 'target', 'release', process.platform === 'win32' ? 'rarvon-engine.exe' : 'rarvon-engine');

export default defineConfig<{ theme: 'light' | 'dark' }>({
  testDir: 'design/capture',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: { acceptDownloads: true, serviceWorkers: 'block' },
  // Every screen in both themes: light first, then dark.
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'], theme: 'light' } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], theme: 'dark' } },
  ],
  webServer: [
    { command: 'npx vite preview --port 4321 --strictPort', url: 'http://localhost:4321', reuseExistingServer: false, timeout: 60_000 },
    {
      command: 'npx vite --port 5180 --strictPort',
      url: 'http://localhost:5180',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        VITE_APP_VERSION: '0.1.0',
        VITE_APP_WINDOWS_URL: 'https://github.com/0xROBEE/RARVON/releases/download/v0.1.0/Rarvon-setup-0.1.0.exe',
        VITE_APP_LINUX_DEB_URL: 'https://github.com/0xROBEE/RARVON/releases/download/v0.1.0/rarvon_0.1.0_amd64.deb',
        VITE_APP_LINUX_RPM_URL: 'https://github.com/0xROBEE/RARVON/releases/download/v0.1.0/rarvon-0.1.0-1.x86_64.rpm',
        VITE_APP_LINUX_TAR_URL: 'https://github.com/0xROBEE/RARVON/releases/download/v0.1.0/rarvon-0.1.0-linux-x86_64.tar.gz',
      },
    },
    { command: `"${engine}"`, url: 'http://127.0.0.1:47821', env: { BENCH_NO_WINDOW: '1' }, reuseExistingServer: false, timeout: 30_000 },
  ],
});

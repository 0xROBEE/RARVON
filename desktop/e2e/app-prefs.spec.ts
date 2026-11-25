import type { Page } from '@playwright/test';
import { test, expect } from '../../e2e/helpers';

/**
 * Rarvon for desktop: favourite tools and the update notice, with the real
 * Rarvon Engine saving them in its data folder (a temporary one for tests,
 * see playwright.desktop.config.ts). GitHub is replaced by a fake answer.
 */

const appKey = (page: Page) => page.evaluate(() => window.__BENCH_APP__!.key);

async function setPrefs(page: Page, prefs: object) {
  const key = await appKey(page);
  const res = await page.evaluate(async ([k, body]) => (await fetch('/__bench/prefs', { method: 'PUT', headers: { 'X-Rarvon-Key': k, 'Content-Type': 'application/json' }, body })).status, [key, JSON.stringify(prefs)] as const);
  expect(res).toBe(200);
}

/** GitHub answers that a much newer Rarvon exists. */
async function fakeNewRelease(page: Page) {
  await page.route('https://api.github.com/**', (route) =>
    // Like the real GitHub API, it allows any website to read the answer.
    route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: [{ tag_name: 'v9.9.9', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v9.9.9', draft: false, body: '## What’s new\n\n- **Faster PDF tools.** They open in half the time.\n- A new `Split` button.\n\n## Fixed\n\n- Something else.' }] }),
  );
}

test.describe('Rarvon for desktop: favourites and updates', () => {
  test('the settings file needs the secret key, and keeps what is saved', async ({ page }) => {
    await page.goto('/');
    expect((await page.request.get('/__bench/prefs')).status()).toBe(403);
    await setPrefs(page, { favorites: ['pdf/merge'], updateCheck: false });
    const key = await appKey(page);
    const saved = await (await page.request.get('/__bench/prefs', { headers: { 'X-Rarvon-Key': key } })).json();
    expect(saved).toEqual({ favorites: ['pdf/merge'], updateCheck: false });
    // Not a JSON object: refused, and the saved file is untouched.
    const bad = await page.request.put('/__bench/prefs', { headers: { 'X-Rarvon-Key': key, 'Content-Type': 'application/json' }, data: '[1,2]' });
    expect(bad.status()).toBe(400);
  });

  test('a starred tool shows under "Favourite tools" and stays after reopening', async ({ page }) => {
    await page.goto('/');
    await setPrefs(page, { favorites: [], updateCheck: false });
    await page.goto('/tools/pdf/compress');
    const star = page.getByTestId('favorite-star');
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600); // saved shortly after the click
    await page.goto('/');
    const favs = page.getByTestId('favorite-tools');
    await expect(favs.getByRole('link', { name: 'Compress PDF' })).toBeVisible();
    // Favourites come above "Recently used".
    const order = await page.evaluate(() => {
      const f = document.getElementById('favorites-heading')!.getBoundingClientRect().top;
      const r = document.getElementById('recent-heading')?.getBoundingClientRect().top ?? Infinity;
      return f < r;
    });
    expect(order).toBe(true);
    // A fresh page (like reopening the app) reads them back from the engine's file.
    const fresh = await page.context().newPage();
    await fresh.goto('/');
    await expect(fresh.getByTestId('favorite-tools').getByRole('link', { name: 'Compress PDF' })).toBeVisible();
    await fresh.getByRole('button', { name: 'Remove Compress PDF from favourites' }).click();
    await expect(fresh.getByTestId('favorite-tools')).toContainText('Press ★ on any tool');
  });

  test('a newer release shows a bar on home and a card elsewhere, which can be snoozed or switched off', async ({ page }) => {
    await fakeNewRelease(page);
    await page.goto('/');
    await setPrefs(page, { favorites: [], updateCheck: true });
    await page.reload();
    const bar = page.getByTestId('update-notice');
    await expect(bar).toContainText('Rarvon 9.9.9 is ready');
    await expect(bar.getByRole('link', { name: 'Update now' })).toHaveAttribute('href', 'https://github.com/0xROBEE/RARVON/releases/tag/v9.9.9');
    await expect(page.getByTestId('update-card')).toHaveCount(0);

    // Other pages show the card, with the release's first points as "what's new".
    await page.goto('/privacy#updates');
    const card = page.getByTestId('update-card');
    await expect(card).toContainText('Rarvon 9.9.9 is here');
    await expect(card).toContainText('Faster PDF tools');
    await expect(card).toContainText('A new Split button');
    await expect(card).not.toContainText('Something else');

    // Later hides it for an hour, even after reopening.
    await card.getByRole('button', { name: 'Later' }).click();
    await expect(card).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByTestId('update-card')).toHaveCount(0);
    expect((await (await page.request.get('/__bench/prefs', { headers: { 'X-Rarvon-Key': await appKey(page) } })).json()).snoozeUntil).toBeGreaterThan(Date.now() + 50 * 60 * 1000);

    // The ⋯ menu silences it for a week.
    await setPrefs(page, { favorites: [], updateCheck: true });
    await page.goto('/');
    await page.getByTestId('update-notice').getByTestId('update-more').click();
    await page.getByRole('menuitem', { name: 'Silence for 1 week' }).click();
    await expect(page.getByTestId('update-notice')).toHaveCount(0);
    await page.waitForTimeout(500);
    const saved = await (await page.request.get('/__bench/prefs', { headers: { 'X-Rarvon-Key': await appKey(page) } })).json();
    expect(saved.snoozeUntil).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);

    // Turned off on the Privacy page: no notice, and no more requests to GitHub.
    await setPrefs(page, { favorites: [], updateCheck: true });
    await page.goto('/privacy#updates');
    await expect(page.getByTestId('update-card')).toBeVisible();
    await page.getByTestId('update-switch').uncheck();
    await expect(page.getByTestId('update-card')).toHaveCount(0);
    let asked = 0;
    await page.unrouteAll();
    await page.route('https://api.github.com/**', (route) => { asked++; return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: [] }); });
    await page.waitForTimeout(600);
    await page.reload();
    await page.waitForTimeout(800);
    expect(asked).toBe(0);
  });

  test('an old answer is checked again after a few hours, and the highest version wins', async ({ page }) => {
    // GitHub lists releases in any order; a pre-release never counts.
    await page.route('https://api.github.com/**', (route) =>
      route.fulfill({
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: [
          { tag_name: 'v1.0.0', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v1.0.0', draft: false },
          { tag_name: 'v9.9.9', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v9.9.9', draft: false },
          { tag_name: 'v10.0.0', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v10.0.0', draft: false, prerelease: true },
          { tag_name: 'v0.3.0', html_url: 'https://github.com/0xROBEE/RARVON/releases/tag/v0.3.0', draft: false },
        ],
      }),
    );
    await page.goto('/');
    // Like on the owner's computer: four hours ago GitHub briefly said the newest was 0.3.0.
    await setPrefs(page, { favorites: [], updateCheck: true, lastUpdateCheck: Date.now() - 4 * 60 * 60 * 1000, latestVersion: '0.3.0' });
    await page.reload();
    const notice = page.getByTestId('update-notice');
    await expect(notice).toContainText('Rarvon 9.9.9 is ready');
    await expect(notice.getByRole('link', { name: 'Update now' })).toHaveAttribute('href', 'https://github.com/0xROBEE/RARVON/releases/tag/v9.9.9');
  });

  test('the Privacy page can show a test notice', async ({ page }) => {
    await page.goto('/');
    await setPrefs(page, { favorites: [], updateCheck: false });
    await page.goto('/privacy#updates');
    await page.getByTestId('update-test-notice').click();
    const card = page.getByTestId('update-card');
    await expect(card).toContainText('This is a test notice');
    await card.getByRole('button', { name: 'Later' }).click();
    await expect(card).toHaveCount(0);
    // A test never snoozes real notices.
    await page.waitForTimeout(400);
    const saved = await (await page.request.get('/__bench/prefs', { headers: { 'X-Rarvon-Key': await appKey(page) } })).json();
    expect(saved.snoozeUntil).toBeUndefined();
  });
});

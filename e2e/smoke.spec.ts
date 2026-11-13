import { test, expect } from './helpers';
import { tools, categories } from '../src/lib/toolRegistry';

test.describe('every page renders without errors', () => {
  test('home, static pages, categories and action pages', async ({ page }) => {
    for (const path of ['/', '/about', '/privacy', '/compress', '/convert', ...categories.map((c) => `/tools/${c.slug}`)]) {
      await page.goto(path);
      await expect(page.locator('h1').first(), path).toBeVisible();
    }
  });

  for (const tool of tools) {
    test(`tool page: ${tool.category}/${tool.slug}`, async ({ page }) => {
      await page.goto(`/tools/${tool.category}/${tool.slug}`);
      await expect(page.locator('h1').first()).toHaveText(tool.name);
      await expect(page.getByText('Loading tool…')).toHaveCount(0);
      if (tool.status === 'coming-soon') return;
      // The lazy chunk must actually mount something interactive.
      await expect(page.locator('main').locator('input, textarea, button, canvas').first()).toBeVisible();
    });
  }

  test('search finds a tool and navigates to it', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const box = page.getByRole('dialog', { name: 'Search tools' }).getByRole('textbox');
    await expect(box).toBeFocused();
    await box.fill('merge pdf');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tools\/pdf\/merge/);
  });

  test('theme toggle switches to dark', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('bench-theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

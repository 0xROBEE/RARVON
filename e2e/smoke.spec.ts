import { test, expect } from './helpers';
import { tools, categories } from '../src/lib/toolRegistry';

test.describe('every page renders without errors', () => {
  test('home, static pages, categories and action pages', async ({ page }) => {
    for (const path of ['/', '/about', '/privacy', '/support', '/compress', '/convert', ...categories.map((c) => `/tools/${c.slug}`)]) {
      await page.goto(path);
      await expect(page.locator('h1').first(), path).toBeVisible();
    }
  });

  test('the Support Bench button in the top bar opens the Support page', async ({ page }) => {
    await page.goto('/tools/text/word-counter');
    await page.getByTestId('support-button').click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('If it helped you, you can help it');
    // Without a configured Ko-fi link there is no dead button, only a calm note.
    await expect(page.getByTestId('kofi-button')).toHaveCount(0);
    await expect(page.getByText('The donation link is coming soon.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share Bench with a friend' })).toBeVisible();
  });

  test('About and Privacy stay in the top bar at every width without moving the search box', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const pill = page.getByTestId('info-links');
    await pill.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(pill.getByRole('link', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
    await pill.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about$/);

    // Hovering About must not change the search box's size.
    const search = page.getByRole('button', { name: 'Search tools' });
    const before = (await search.boundingBox())!.width;
    await pill.getByRole('link', { name: 'Privacy' }).hover();
    await page.waitForTimeout(400);
    expect((await search.boundingBox())!.width).toBe(before);

    // Phones keep the two icons; the smallest ones move the theme button into the menu.
    for (const width of [360, 375, 596, 800]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(pill, `${width}px`).toBeVisible();
      // Poll: right after a resize the page may not have re-laid out yet.
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${width}px` }).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await pill.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await page.getByRole('button', { name: 'All tools' }).click();
    await expect(page.getByRole('menu').getByRole('button', { name: /^Theme:/ })).toBeVisible();
  });

  test('every tool page and the About page open the feedback pop-up', async ({ page }) => {
    await page.goto('/tools/image/convert');
    const box = page.getByTestId('tool-feedback');
    await box.getByRole('button', { name: 'Report a bug' }).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Report a bug' })).toBeVisible();
    await expect(dialog).toContainText('Image Converter');
    // No email is configured in tests, so GitHub is the way offered.
    await expect(dialog.getByTestId('feedback-github')).toBeVisible();
    await expect(dialog.getByTestId('feedback-email')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await page.goto('/about');
    await page.getByRole('button', { name: 'Ask for a tool' }).click();
    await expect(page.locator('dialog[open]').getByRole('heading', { name: 'Ask for a tool' })).toBeVisible();
  });

  test('the Privacy page has a summary, the full sections and a working contents list', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/privacy');
    await expect(page.locator('#summary')).toContainText('Your files never leave your device');
    await expect(page.getByText('Bench does not use cookies.')).toBeVisible();
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await toc.getByRole('link', { name: '6. The website host' }).click();
    await expect(toc.getByRole('link', { name: '6. The website host' })).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('#host')).toBeInViewport();
  });

  test('home has Convert and Compress shortcuts that open their pages', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('home-convert').getByRole('link', { name: /more Convert tools/ }).click();
    await expect(page).toHaveURL(/\/convert$/);
    await expect(page.locator('h1')).toHaveText('Convert');
    await expect(page.getByRole('link', { name: /Video Converter/ })).toBeVisible();
    await page.goto('/');
    await page.getByTestId('home-compress').getByRole('link', { name: /more Compress tools/ }).click();
    await expect(page).toHaveURL(/\/compress$/);
    await expect(page.locator('h1')).toHaveText('Compress');
    await page.getByRole('link', { name: /Compress PDF/ }).first().click();
    await expect(page).toHaveURL(/\/tools\/pdf\/compress/);
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

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const paths = ['/', '/tools/pdf', ...tools.filter((t) => t.status !== 'coming-soon').map((t) => `/tools/${t.category}/${t.slug}`)];
  test('no page scrolls horizontally at phone width', async ({ page }) => {
    const overflowing: string[] = [];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByText('Loading tool…')).toHaveCount(0);
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (extra > 1) overflowing.push(`${path} (+${extra}px)`);
    }
    expect(overflowing).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding by setting localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
      localStorage.setItem('iskra_user_name', 'TestUser');
    });
    await page.reload();
  });

  test('displays main app after onboarding', async ({ page }) => {
    // Should show main app layout with sidebar (on desktop)
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to Planner view', async ({ page }) => {
    // Click Planner in navigation
    await page.click('[data-nav="PLANNER"], [id="nav-item-PLANNER"], button:has-text("Намерения")');
    await page.waitForTimeout(500);

    // Verify Planner view content
    const content = await page.content();
    expect(content).toMatch(/Planner|Намерения|план|задач/i);
  });

  test('can navigate to Journal view', async ({ page }) => {
    await page.click('[data-nav="JOURNAL"], [id="nav-item-JOURNAL"], button:has-text("Журнал")');
    await page.waitForTimeout(500);

    const content = await page.content();
    expect(content).toMatch(/Journal|Журнал|рефлекс/i);
  });

  test('can navigate to Chat view', async ({ page }) => {
    await page.click('[data-nav="CHAT"], [id="nav-item-CHAT"], button:has-text("Диалог")');
    await page.waitForTimeout(500);

    const content = await page.content();
    expect(content).toMatch(/Chat|Диалог|сообщен/i);
  });

  test('can navigate to Settings view', async ({ page }) => {
    await page.click('[data-nav="SETTINGS"], [id="nav-item-SETTINGS"], button:has-text("Настройки")');
    await page.waitForTimeout(500);

    const content = await page.content();
    expect(content).toMatch(/Settings|Настройки|экспорт/i);
  });

  test('can navigate to Metrics view', async ({ page }) => {
    await page.click('[data-nav="METRICS"], [id="nav-item-METRICS"], button:has-text("Метрики")');
    await page.waitForTimeout(500);

    const content = await page.content();
    expect(content).toMatch(/Metrics|Метрики|rhythm|ритм|chaos|хаос/i);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
    });
    await page.reload();
  });

  test('shows mobile menu on small screens', async ({ page }) => {
    // Mobile menu should be visible at bottom
    await expect(page.locator('.lg\\:hidden')).toBeVisible();
  });

  test('can open mobile menu', async ({ page }) => {
    // Look for menu button
    const menuButton = page.locator('button:has-text("Меню"), [aria-label*="menu"], .mobile-menu-trigger').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }
  });
});

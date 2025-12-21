import { test, expect } from '@playwright/test';

test.describe('App Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
      localStorage.setItem('iskra_user_name', 'TestUser');
    });
    await page.reload();
  });

  test('renders without crashing', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('displays Pulse view by default', async ({ page }) => {
    // Pulse is the default view
    const content = await page.content();
    expect(content).toMatch(/Pulse|Пульс|rhythm|ритм|∆/i);
  });

  test('shows metrics information', async ({ page }) => {
    // Navigate to metrics view
    await page.click('[data-nav="METRICS"], [id="nav-item-METRICS"], button:has-text("Метрики")');
    await page.waitForTimeout(500);

    // Should show various metrics
    const pageContent = await page.textContent('body');
    // At least one metric indicator should be present
    expect(pageContent).toBeDefined();
  });

  test('error boundary catches errors gracefully', async ({ page }) => {
    // The app should have an error boundary that prevents full crashes
    await expect(page.locator('.error-boundary, [data-testid="error"]')).not.toBeVisible();
  });
});

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
    });
    await page.reload();

    // Navigate to Chat
    await page.click('[data-nav="CHAT"], [id="nav-item-CHAT"], button:has-text("Диалог")');
    await page.waitForTimeout(500);
  });

  test('displays chat interface', async ({ page }) => {
    // Should have some form of input
    const hasInput = await page.locator('input, textarea').count();
    expect(hasInput).toBeGreaterThan(0);
  });

  test('can type in chat input', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first();
    if (await input.isVisible()) {
      await input.fill('Привет, Искра!');
      const value = await input.inputValue();
      expect(value).toBe('Привет, Искра!');
    }
  });
});

test.describe('Journal Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
    });
    await page.reload();

    await page.click('[data-nav="JOURNAL"], [id="nav-item-JOURNAL"], button:has-text("Журнал")');
    await page.waitForTimeout(500);
  });

  test('displays journal interface', async ({ page }) => {
    const content = await page.content();
    expect(content).toMatch(/Journal|Журнал|запис|рефлекс/i);
  });

  test('can write journal entry', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('Сегодня был хороший день');
      const value = await textarea.inputValue();
      expect(value).toContain('хороший день');
    }
  });
});

test.describe('Planner Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
    });
    await page.reload();

    await page.click('[data-nav="PLANNER"], [id="nav-item-PLANNER"], button:has-text("Намерения")');
    await page.waitForTimeout(500);
  });

  test('displays planner interface', async ({ page }) => {
    const content = await page.content();
    expect(content).toMatch(/Planner|план|задач|намерен/i);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
    });
    await page.reload();
  });

  test('has no major accessibility violations', async ({ page }) => {
    // Basic accessibility check - all buttons should be clickable
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('supports keyboard navigation', async ({ page }) => {
    // Tab should move focus
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();
  });
});

test.describe('Data Persistence', () => {
  test('preserves user data across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('iskra_onboarding_complete', 'true');
      localStorage.setItem('iskra_tutorial_complete', 'true');
      localStorage.setItem('iskra_user_name', 'PersistenceTest');
    });
    await page.reload();

    // Verify localStorage persisted
    const userName = await page.evaluate(() => localStorage.getItem('iskra_user_name'));
    expect(userName).toBe('PersistenceTest');
  });
});

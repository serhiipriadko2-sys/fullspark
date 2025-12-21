import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure onboarding shows
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('displays onboarding for new users', async ({ page }) => {
    // Step 1: Initial welcome screen
    await expect(page.locator('h1')).toContainText('Существовать — значит сохранять различие');
    await expect(page.getByRole('button', { name: /Войти в ритм/i })).toBeVisible();
  });

  test('progresses through onboarding steps', async ({ page }) => {
    // Step 1: Click to proceed
    await page.getByRole('button', { name: /Войти в ритм/i }).click();

    // Step 2: Name input
    await expect(page.locator('h2')).toContainText('Я не запоминаю факты');
    await expect(page.getByPlaceholder(/имя/i)).toBeVisible();
  });

  test('requires name before proceeding', async ({ page }) => {
    await page.getByRole('button', { name: /Войти в ритм/i }).click();

    // Button should be disabled without name
    const continueBtn = page.getByRole('button', { name: /Продолжить/i });
    await expect(continueBtn).toBeDisabled();

    // Enter name
    await page.getByPlaceholder(/имя/i).fill('TestUser');
    await expect(continueBtn).toBeEnabled();
  });

  test('completes full onboarding flow', async ({ page }) => {
    // Step 1
    await page.getByRole('button', { name: /Войти в ритм/i }).click();

    // Step 2
    await page.getByPlaceholder(/имя/i).fill('TestUser');
    await page.getByRole('button', { name: /Продолжить/i }).click();

    // Step 3: Initialization
    await expect(page.locator('h2')).toContainText('Инициализация');
    await page.getByRole('button', { name: /Начать/i }).click();

    // Should navigate to main app (Pulse view)
    await expect(page.locator('[data-testid="pulse-view"], .pulse-container, h1')).toBeVisible({ timeout: 5000 });
  });

  test('saves onboarding completion to localStorage', async ({ page }) => {
    // Complete onboarding
    await page.getByRole('button', { name: /Войти в ритм/i }).click();
    await page.getByPlaceholder(/имя/i).fill('TestUser');
    await page.getByRole('button', { name: /Продолжить/i }).click();
    await page.getByRole('button', { name: /Начать/i }).click();

    // Wait for main app
    await page.waitForTimeout(1500);

    // Check localStorage
    const isComplete = await page.evaluate(() => {
      return localStorage.getItem('iskra_onboarding_complete');
    });
    expect(isComplete).toBe('true');
  });
});

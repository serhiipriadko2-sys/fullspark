
import { test, expect } from '@playwright/test';

test.describe('Voice Engine - SIBYL Activation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('iskra-onboarding-complete', 'true');
      localStorage.setItem('iskra-tutorial-seen', 'true');
    });
    await page.reload();

    // Navigate to Chat
    await page.click('[data-nav="CHAT"], [id="nav-item-CHAT"], button:has-text("Диалог")');
    await page.waitForTimeout(500);
  });

  test('activates SIBYL voice when echo metric is high', async ({ page }) => {
    // Ensure we are in AUTO mode (default)
    const voiceSelect = page.locator('select');
    if (await voiceSelect.isVisible()) {
        await expect(voiceSelect).toHaveValue('AUTO');
    }

    // Initial voice should likely be ISKRA or AUTO
    // We check the "Активен: ..." badge
    // Note: The badge might be hidden on small screens, so we might need to force viewport or check specific element

    // Type keywords that trigger 'echo' metric
    // echo base is 0.4. Each match adds 0.2. Need > 0.6.
    // "эхо эхо" -> 0.4 + 0.4 = 0.8
    // Clarity base is 0.65, which is within 0.4-0.8 range for SIBYL.
    // ISKRA has inertia (+0.3) + base (1.0) + bonus (0.5) = 1.8.
    // SIBYL needs > 1.8. With echo 0.8 -> 1.6. With echo 1.0 -> 2.0.
    // So we need 3 matches (0.4 base + 0.6 = 1.0).

    const input = page.locator('textarea[placeholder*="Отправь сигнал"]');
    await input.fill('эхо эхо эхо слышу слышу');

    // We need to trigger the metric update.
    // In ChatView, onQuery calls onUserInput immediately.
    // Hitting Enter or clicking Send usually triggers it.
    await page.keyboard.press('Enter');

    // Wait for voice update (state change)
    // The "Активен: SIBYL" badge should appear.
    // Using a regex to be safe about case or spacing
    await expect(page.locator('body')).toContainText(/Активен: SIBYL/i);

    // Optionally check if the voice aura color changed (violet/purple)
    // SIBYL color class: border-violet-400/30
    // But text check is more robust.
  });
});

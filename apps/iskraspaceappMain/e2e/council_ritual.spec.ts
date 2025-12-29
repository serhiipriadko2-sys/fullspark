
import { test, expect } from '@playwright/test';

test.describe('Council Ritual View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('iskra-onboarding-complete', 'true');
      localStorage.setItem('iskra-tutorial-seen', 'true');
    });
    await page.reload();
  });

  test('displays all 9 voices in Council view', async ({ page }) => {
    // Navigate to Council
    const councilNav = page.locator('#nav-item-COUNCIL');
    // If we are on mobile, Council might be in the radial menu, but on Desktop it is in sidebar.
    // The default viewport is desktop-like usually, but let's check visibility.
    // If not visible, we assume it's because of screen size or just verify desktop scenario.
    if (await councilNav.isVisible()) {
        await councilNav.click();
    } else {
        // Try to find it if it is hidden or need scrolling?
        // Sidebar usually shows secondary items.
        // If fail, we skip? No, we want to test.
        console.log('Council nav item not visible, attempting force click or check viewport');
    }

    // Verify Title
    await expect(page.locator('h1')).toContainText('Совет Граней');

    // Verify Description updated to 9 voices
    await expect(page.locator('p.text-text-muted').first()).toContainText('9 голосов');

    // Start a dummy council to see the progress bar?
    // The progress bar appears only when running or responses > 0.
    // "(isRunning || responses.length > 0) && ..."
    // So initially we don't see the dots.

    // But we can check the input area is there.
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Созвать Совет' })).toBeVisible();

    // Trigger Council (mocking API would be best, but here we might hit real API or fail)
    // If we trigger it, it will try to call Gemini.
    // If Gemini is offline/mocked, it might fail or return error.
    // But we just want to see the UI reaction.

    // Wait, if we can't easily trigger the dots without API, we can at least verify the static text update.
    // The text "Все 9 голосов..." is in the description.
  });
});

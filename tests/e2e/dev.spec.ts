import { expect, test } from '@playwright/test';

/**
 * Dev mode (?dev) — Implementation Plan, Sprint 2: stepping the rules
 * engine through a full hand reaches a hand result and changes the score.
 */
test.describe('dev panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?dev&seed=7');
    await expect(page.getByRole('complementary', { name: 'Dev panel' })).toBeVisible();
  });

  test('steps through a full hand to a scored result', async ({ page }, testInfo) => {
    const status = page.getByRole('status');
    const step = page.getByRole('button', { name: 'Step' });
    // The first two values are Us and Them; Trump and Tricks follow once trump is set.
    const score = page.getByLabel('Score').locator('dd').filter({ hasText: /^\d+$/ });
    await expect(score).toHaveText(['0', '0']);

    for (let i = 0; i < 40 && (await step.isEnabled()); i++) {
      await step.click();
      if (i === 8) {
        await page.screenshot({
          path: testInfo.outputPath(`dev-mid-hand-${testInfo.project.name}.png`),
        });
      }
    }

    await expect(status).toContainText('Hand complete');
    const log = page.getByRole('list', { name: 'Event log' });
    await expect(log).toContainText(/takes trick 5\./);
    await expect(log.locator('li').last()).toContainText(/point|redealt/);
    const [us, them] = (await score.allTextContents()).map(Number);
    const total = us! + them!;
    expect(total).toBeGreaterThan(0);
  });

  test('deals the next hand after finishing one', async ({ page }) => {
    await page.getByRole('button', { name: 'Finish hand' }).click();
    await expect(page.getByRole('status')).toContainText('Hand complete');
    await page.getByRole('button', { name: 'Next hand' }).click();
    await expect(page.getByRole('status')).toContainText('Hand 2');
    await expect(page.getByRole('region', { name: 'Your hand' }).getByRole('img')).toHaveCount(5);
  });

  test('reveals every hand', async ({ page }) => {
    const partner = page.getByRole('region', { name: 'Partner' });
    await expect(partner.getByRole('img', { name: 'Face-down card' })).toHaveCount(5);
    await page.getByLabel('Reveal hands').check();
    await expect(partner.locator('[data-card]')).toHaveCount(5);
  });
});

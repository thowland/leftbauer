import { expect, test, type Page } from '@playwright/test';

async function handCards(page: Page): Promise<string[]> {
  const cards = page.getByRole('region', { name: 'Your hand' }).getByRole('img');
  return (await cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-card')))).filter(
    (c): c is string => c !== null
  );
}

test.describe('first visible table', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('main', { name: 'Euchre table' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('deals five face-up cards to the human and turns up a card', async ({ page }) => {
    const hand = page.getByRole('region', { name: 'Your hand' });
    await expect(hand.getByRole('img')).toHaveCount(5);
    for (const card of await hand.getByRole('img').all()) {
      await expect(card).toBeVisible();
    }
    const kitty = page.getByRole('region', { name: 'Kitty' });
    await expect(kitty.locator('[data-card]')).toHaveCount(1);
    await expect(kitty.locator('[data-card]')).toBeVisible();
  });

  test('shows three face-down hands and one dealer', async ({ page }) => {
    for (const name of ['Partner (top)', 'Opponent (left)', 'Opponent (right)']) {
      const seat = page.getByRole('region', { name });
      await expect(seat).toBeVisible();
      await expect(seat.getByRole('img', { name: 'Face-down card' })).toHaveCount(5);
    }
    await expect(page.getByTitle('Dealer')).toHaveCount(1);
  });

  test('deals again on request and passes the deal', async ({ page }) => {
    const before = await handCards(page);
    const dealerBefore = await page
      .getByTitle('Dealer')
      .locator('xpath=ancestor::section')
      .getAttribute('aria-label');

    await page.getByRole('button', { name: 'Deal again' }).click();

    await expect.poll(() => handCards(page)).not.toEqual(before);
    const dealerAfter = await page
      .getByTitle('Dealer')
      .locator('xpath=ancestor::section')
      .getAttribute('aria-label');
    expect(dealerAfter).not.toBe(dealerBefore);
  });

  test('fits the viewport with no scrolling', async ({ page }, testInfo) => {
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.x).toBeLessThanOrEqual(0);
    expect(overflow.y).toBeLessThanOrEqual(0);

    // Every card in the human's hand lies fully inside the viewport.
    const viewport = page.viewportSize()!;
    for (const card of await page
      .getByRole('region', { name: 'Your hand' })
      .getByRole('img')
      .all()) {
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }

    await page.screenshot({ path: testInfo.outputPath(`table-${testInfo.project.name}.png`) });
  });
});

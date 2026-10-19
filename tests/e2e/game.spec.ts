import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Playing a game — Implementation Plan, Sprint 3. `?e2e` removes pacing;
 * `?seed=N` makes the deal reproducible.
 */

async function startGame(page: Page, seed: number): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?seed=${seed}&e2e`);
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByRole('main', { name: 'Euchre table' })).toBeVisible();
  expect(errors).toEqual([]);
}

/** Take the human's turns until a dialog (hand summary or game over) appears. */
async function playUntilDialog(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog');
  const bid = page.getByRole('group', { name: 'Your bid' });
  const cards = page.getByRole('region', { name: 'Your hand' }).getByRole('button');
  for (let i = 0; i < 300; i++) {
    await expect(dialog.or(bid).or(cards.first())).toBeVisible();
    if (await dialog.isVisible()) return dialog;
    if (await bid.isVisible()) {
      await bid.getByRole('button').first().click();
    } else if (await cards.first().isVisible()) {
      const card = cards.first();
      await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
      await card.click();
    }
  }
  throw new Error('No dialog appeared');
}

test.describe('playing a game', () => {
  test('opens on the home screen and deals a table in one tap', async ({ page }, testInfo) => {
    await startGame(page, 11);
    const hand = page.getByRole('region', { name: 'Your hand' });
    await expect(hand.getByRole('img')).toHaveCount(5);
    for (const name of ['Partner', 'Left opponent', 'Right opponent']) {
      await expect(page.getByRole('region', { name })).toBeVisible();
    }
    await expect(page.getByTitle('Dealer')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`table-${testInfo.project.name}.png`) });
  });

  test('fits the viewport with no scrolling while bidding', async ({ page }) => {
    await startGame(page, 11);
    await expect(page.getByRole('group', { name: 'Your bid' }).or(page.getByRole('dialog')))
      .toBeVisible({
        timeout: 5000,
      })
      .catch(() => undefined);
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.x).toBeLessThanOrEqual(0);
    expect(overflow.y).toBeLessThanOrEqual(0);
    const viewport = page.viewportSize()!;
    for (const card of await page
      .getByRole('region', { name: 'Your hand' })
      .getByRole('img')
      .all()) {
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('bids, plays cards and reaches the hand summary', async ({ page }, testInfo) => {
    await startGame(page, 12);
    const summary = await playUntilDialog(page);
    await expect(summary).toHaveAccessibleName('Hand 1');
    await expect(summary).toContainText(/point|redealt/);
    await page.screenshot({ path: testInfo.outputPath(`summary-${testInfo.project.name}.png`) });

    await summary.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Your hand' }).getByRole('img')).toHaveCount(5);
  });

  test('plays a seeded game to the end and starts another', async ({ page }) => {
    test.setTimeout(120_000);
    await startGame(page, 13);
    let dialog = await playUntilDialog(page);
    while (
      (await dialog.getAttribute('aria-labelledby')) &&
      /^Hand \d+/.test((await dialog.innerText()).trim())
    ) {
      await dialog.getByRole('button', { name: 'Continue' }).click();
      dialog = await playUntilDialog(page);
    }
    await expect(dialog).toHaveAccessibleName(/We win!|They win/);
    await expect(dialog).toContainText(/Final score: us \d+, them \d+/);

    await dialog.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel('Score').locator('dd').first()).toHaveText('0');
  });
});

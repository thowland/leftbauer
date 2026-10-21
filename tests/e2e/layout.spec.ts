import { expect, test, type Page } from '@playwright/test';

/**
 * A stable table (VP-1): the seats, the center and the action bar keep
 * their place for a whole hand, from the deal until the last card leaves
 * the hand. Seed 127 takes the human through both bidding rounds.
 */

const PARTS = [
  '.center',
  '.seat-top',
  '.seat-left',
  '.seat-right',
  '.seat-bottom',
  '.action-bar',
  '.score > div:nth-child(1)',
  '.score > div:nth-child(2)',
  '.score > div:nth-child(3)',
  '.score > div:nth-child(4)',
];

const boxes = (page: Page) =>
  page.evaluate((parts) => {
    const rects = parts.map((part) => {
      const r = document.querySelector(part)!.getBoundingClientRect();
      return `${part} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    return rects;
  }, PARTS);

test('nothing on the table moves during a hand', async ({ page }) => {
  await page.goto('/?seed=127&e2e');
  await page.getByRole('button', { name: 'New game' }).click();
  const cards = page.getByRole('region', { name: 'Your hand' }).getByRole('button');
  const bid = page.getByRole('group', { name: 'Your bid' });
  const summary = page.getByRole('dialog', { name: 'Hand 1' });

  const first = await boxes(page);
  // Hint comes and goes with the turn, but always appears in the same place.
  const hint = page.getByRole('button', { name: 'Hint' });
  const hints = new Set<string>();
  const recordHint = async () => {
    const box = (await hint.isVisible()) ? await hint.boundingBox() : null;
    if (box !== null) hints.add([box.x, box.y, box.width, box.height].map(Math.round).join(','));
  };
  for (let i = 0; i < 200 && !(await summary.isVisible()); i++) {
    await expect(bid.or(cards.first()).or(summary)).toBeVisible();
    expect(await boxes(page)).toEqual(first);
    await recordHint();
    if (await summary.isVisible()) break;
    if (await bid.isVisible()) {
      const pass = bid.getByRole('button', { name: 'Pass' });
      await ((await pass.isVisible()) ? pass : bid.getByRole('button').first()).click();
    } else {
      await cards.first().click();
      await cards.first().click();
    }
  }
  // The hand is over and every card has left it: still the same table.
  await expect(summary).toBeVisible();
  await expect(cards).toHaveCount(0);
  expect(await boxes(page)).toEqual(first);
  expect(hints.size).toBe(1);
});

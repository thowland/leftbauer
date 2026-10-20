import { expect, test, type Page } from '@playwright/test';

/**
 * The coach and the reading screens — Implementation Plan, Sprint 8.
 * `?e2e` removes pacing and animation; `?seed=N` fixes the deals.
 */

const hand = (page: Page) => page.getByRole('region', { name: 'Your hand' });
const bid = (page: Page) => page.getByRole('group', { name: 'Your bid' });
const hintLine = (page: Page) => page.getByText(/^Hint: .{10,}/);

/** Ask for a hint and check it shows a reason and highlights exactly one choice. */
async function checkHint(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(hintLine(page)).toBeVisible();
  await expect(page.locator('.hinted').first()).toBeVisible();
}

/**
 * Take the human's turns until `done` holds. Bids pass, except that the
 * dealer always picks up, so the human eventually has to discard.
 */
async function playUntil(page: Page, done: () => Promise<boolean>): Promise<void> {
  const cards = hand(page).getByRole('button');
  const summary = page.getByRole('dialog', { name: /^Hand \d+$/ });
  for (let i = 0; i < 2000; i++) {
    if (await done()) return;
    await expect(bid(page).or(cards.first()).or(page.getByRole('dialog'))).toBeVisible();
    if (await done()) return;
    if (await summary.isVisible()) {
      await summary.getByRole('button', { name: 'Continue' }).click();
    } else if (await bid(page).isVisible()) {
      const pickUp = bid(page).getByRole('button', { name: 'Pick it up' });
      await ((await pickUp.isVisible()) ? pickUp : bid(page).getByRole('button').last()).click();
    } else if (await cards.first().isVisible()) {
      await cards.first().click();
      await cards.first().click();
    }
  }
  throw new Error('Never reached the expected state');
}

test('hints in bidding, the discard and card play (CO-1, CO-2)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=51&e2e');
  await page.getByRole('button', { name: 'New game' }).click();

  await expect(bid(page)).toBeVisible();
  await checkHint(page);
  await expect(bid(page).locator('.hinted')).toHaveCount(1);

  // The human discards as dealer: six cards in hand to choose from.
  await playUntil(page, async () => (await hand(page).getByRole('button').count()) === 6);
  await checkHint(page);
  await expect(hand(page).locator('.hinted')).toHaveCount(1);
  await hand(page).locator('.hinted').click();
  await hand(page).locator('.hinted').click();

  await playUntil(
    page,
    async () =>
      (await hand(page).getByRole('button').count()) > 0 &&
      (await page.getByText('Dealer is discarding').count()) === 0
  );
  await checkHint(page);
  await expect(hand(page).locator('.hinted')).toHaveCount(1);
  // Playing on clears the hint.
  await hand(page).locator('.hinted').click();
  await hand(page).locator('.hinted').click();
  await expect(hintLine(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('every reading screen opens from home (UI-2, UI-3, UI-6)', async ({ page }, testInfo) => {
  await page.goto('/?e2e');
  for (const [link, check] of [
    ['How to play', /right bower/],
    ['How your partner plays', /leads trump back to you/],
    ['Stats', /By opponent difficulty/],
    ['About', /Version \d/],
  ] as const) {
    await page.getByRole('button', { name: link }).click();
    await expect(page.getByRole('main', { name: link })).toBeVisible();
    await expect(page.getByText(check).first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${link.replace(/ /g, '-')}-${testInfo.project.name}.png`),
    });
    await page.getByRole('button', { name: 'Done' }).click();
  }
});

test('stats count a finished game, survive a reload and reset (PE-2, UI-5)', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?seed=52&e2e');
  await page.getByRole('button', { name: 'New game' }).click();
  const over = page.getByRole('dialog', { name: /win/ });
  await playUntil(page, () => over.isVisible());
  await over.getByRole('button', { name: 'Home' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Stats' }).click();
  const played = page.getByRole('row', { name: /^Games played/ }).getByRole('cell');
  // Standard opponents, and the total.
  await expect(played.nth(1)).toHaveText('1');
  await expect(played.nth(3)).toHaveText('1');
  const hands = page.getByRole('row', { name: /^Hands played/ }).getByRole('cell');
  expect(Number(await hands.nth(1).textContent())).toBeGreaterThan(2);

  await page.getByRole('button', { name: 'Reset stats' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();
  await expect(played.nth(3)).toHaveText('0');
  await page.reload();
  await page.getByRole('button', { name: 'Stats' }).click();
  await expect(played.nth(3)).toHaveText('0');
});

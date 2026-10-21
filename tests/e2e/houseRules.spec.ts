import { expect, test, type Page } from '@playwright/test';

/**
 * House rules and the four-color deck — Implementation Plan, Sprint 9.
 * `?e2e` removes pacing and animation; `?seed=N` fixes the deals. Each
 * seed below was chosen so the rule comes up in the first hand while
 * the human passes every bid.
 */

const hand = (page: Page) => page.getByRole('region', { name: 'Your hand' });
const bid = (page: Page) => page.getByRole('group', { name: 'Your bid' });

/** Open Settings from home, change them, and start a new game. */
async function newGameWith(page: Page, url: string, change: () => Promise<void>): Promise<void> {
  await page.goto(url);
  await page.getByRole('button', { name: 'Settings' }).click();
  await change();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByRole('main', { name: 'Euchre table' })).toBeVisible();
}

/** Pass every bid, and play the first legal card, until `done` holds. */
async function passUntil(page: Page, done: () => Promise<boolean>): Promise<void> {
  const cards = hand(page).getByRole('button');
  const summary = page.getByRole('dialog', { name: /^Hand \d+$/ });
  for (let i = 0; i < 3000; i++) {
    if (await done()) return;
    const panel = page.getByRole('region', { name: 'Your turn' }).getByRole('group');
    await expect(panel.or(cards.first()).or(page.getByRole('dialog'))).toBeVisible();
    if (await done()) return;
    if (await summary.isVisible()) {
      await summary.getByRole('button', { name: 'Continue' }).click();
    } else if (await bid(page).isVisible()) {
      const pass = bid(page).getByRole('button', { name: 'Pass' });
      await ((await pass.isVisible()) ? pass : bid(page).getByRole('button').first()).click();
    } else if (await cards.first().isVisible()) {
      await cards.first().click();
      await cards.first().click();
    }
  }
  throw new Error('Never reached the expected state');
}

test('stick the dealer: the dealer cannot pass in round two (RU-10)', async ({ page }) => {
  // The seed's deal needs these two opponents' bids to reach a stuck dealer.
  await newGameWith(page, '/?seed=127&e2e', async () => {
    await page.getByLabel('Left opponent').selectOption('soopy');
    await page.getByLabel('Right opponent').selectOption('smooth');
    await page.getByRole('checkbox', { name: /Stick the dealer/ }).check();
  });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('button', { name: 'House rules · to 10' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the game' }).click();
  const stuck = page.getByText('Stick the dealer: you must name trump.');
  await passUntil(page, () => stuck.isVisible());
  await expect(bid(page).getByRole('button', { name: 'Pass' })).toHaveCount(0);
  await bid(page).getByRole('button').first().click();
  await expect(bid(page)).toBeHidden();
});

test('a game to 5 ends at 5 (RU-11)', async ({ page }) => {
  test.setTimeout(120_000);
  await newGameWith(page, '/?seed=3&e2e', async () => {
    await page.getByLabel('Game to').selectOption('5');
  });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Rules · to 5' }).click();
  await expect(page.getByRole('dialog')).toContainText('The first team to 5 points wins.');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Back to the game' }).click();

  const over = page.getByRole('dialog', { name: /We win!|They win/ });
  await passUntil(page, () => over.isVisible());
  const score = page.getByRole('definition');
  const [us, them] = (await score.allTextContents()).slice(0, 2).map(Number);
  expect(Math.max(us!, them!)).toBeGreaterThanOrEqual(5);
  expect(Math.max(us!, them!)).toBeLessThan(10);
});

test('the four-color deck (VP-3)', async ({ page }) => {
  const ink = {
    S: 'var(--suit-black)',
    H: 'var(--suit-red)',
    D: 'var(--suit-blue)',
    C: 'var(--suit-green)',
  };
  await newGameWith(page, '/?seed=4&e2e', async () => {
    await page.getByRole('radio', { name: /Four-color deck/ }).check();
    await expect(
      page.locator('.deck-preview [data-card="AC"] [data-suit]').first()
    ).toHaveAttribute('fill', ink.C);
  });
  const cards = hand(page).locator('[data-card]');
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    const id = (await card.getAttribute('data-card'))!;
    await expect(card.locator('[data-suit]').first()).toHaveAttribute(
      'fill',
      ink[id[1] as keyof typeof ink]
    );
  }
});

test("a farmer's hand swaps three cards for the kitty (RU-15)", async ({ page }) => {
  await newGameWith(page, '/?seed=222&e2e', () =>
    page.getByRole('checkbox', { name: /Farmer’s hand/ }).check()
  );
  await expect(page.getByText(/A farmer’s hand!/)).toBeVisible();
  const cards = hand(page).locator('[data-card]');
  const before = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  expect(before.every((c) => c![0] === '9' || c![0] === 'T')).toBe(true);

  await page.getByRole('button', { name: 'Hint' }).click();
  const hinted = hand(page).locator('.hinted');
  await expect(hinted).toHaveCount(3);
  const given = await hinted
    .locator('[data-card]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  for (const pick of await hinted.all()) await pick.click();
  await page.getByRole('button', { name: 'Swap these three' }).click();

  // Bidding opens at once, so the hand may already hold a picked-up upcard as well.
  await expect(page.getByText(/A farmer’s hand!/)).toBeHidden();
  const after = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  expect(after.length).toBeGreaterThanOrEqual(5);
  expect(after.filter((c) => before.includes(c))).toHaveLength(2);
  expect(after.some((c) => given.includes(c))).toBe(false);
});

test('defending alone (RU-13)', async ({ page }) => {
  await newGameWith(page, '/?seed=2&e2e', () =>
    page.getByRole('checkbox', { name: /Defending alone/ }).check()
  );
  const defend = page.getByRole('button', { name: 'Defend alone' });
  await passUntil(page, () => defend.isVisible());
  await defend.click();
  await expect(
    page.getByRole('region', { name: 'Partner' }).getByText('Sitting out')
  ).toBeVisible();
  const summary = page.getByRole('dialog', { name: 'Hand 1' });
  await passUntil(page, () => summary.isVisible());
  await expect(summary).toContainText('You defended alone.');
});

import { expect, test, type Page } from '@playwright/test';

/**
 * Persistence, settings and table controls — Implementation Plan,
 * Sprint 5. `?e2e` removes pacing; `?seed=N` makes the deal reproducible.
 */

const hand = (page: Page) => page.getByRole('region', { name: 'Your hand' });
const center = (page: Page) => page.getByRole('region', { name: 'Table center' });

const cardsOf = async (page: Page, region: 'Your hand' | 'Table center') =>
  (region === 'Your hand' ? hand(page) : center(page))
    .getByRole('img')
    .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-card')));

/** Take the human's turns until `done` holds. Bids take the first option; cards are tapped twice. */
async function playUntil(page: Page, done: () => Promise<boolean>, oneTap = false): Promise<void> {
  const bid = page.getByRole('group', { name: 'Your bid' });
  const cards = hand(page).getByRole('button');
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 300; i++) {
    if (await done()) return;
    await expect(bid.or(cards.first()).or(dialog)).toBeVisible();
    if (await done()) return;
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Continue' }).click();
    } else if (await bid.isVisible()) {
      await bid.getByRole('button').first().click();
    } else {
      const card = cards.first();
      await card.click();
      if (!oneTap) await card.click();
    }
  }
  throw new Error('Never reached the expected state');
}

async function open(page: Page, seed: number): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?seed=${seed}&e2e`);
  return errors;
}

test.describe('resuming a game (PE-1)', () => {
  test('reload mid-trick and continue from exactly the same state', async ({ page }) => {
    const errors = await open(page, 21);
    await page.getByRole('button', { name: 'New game' }).click();
    // Mid-trick: the human holds fewer than five cards and a trick is on the table.
    await playUntil(
      page,
      async () =>
        (await hand(page).getByRole('button').count()) > 0 &&
        (await hand(page).getByRole('img').count()) < 5 &&
        (await center(page).getByRole('img').count()) > 0
    );
    const before = {
      hand: await cardsOf(page, 'Your hand'),
      trick: await cardsOf(page, 'Table center'),
      score: await page.getByLabel('Score').innerText(),
      seats: await page.getByRole('region', { name: 'Left opponent' }).innerText(),
    };

    await page.reload();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(hand(page).getByRole('button').first()).toBeVisible();
    expect(await cardsOf(page, 'Your hand')).toEqual(before.hand);
    expect(await cardsOf(page, 'Table center')).toEqual(before.trick);
    expect(await page.getByLabel('Score').innerText()).toBe(before.score);
    expect(await page.getByRole('region', { name: 'Left opponent' }).innerText()).toBe(
      before.seats
    );
    expect(errors).toEqual([]);
  });

  test('concede from the menu, after confirming', async ({ page }, testInfo) => {
    await open(page, 22);
    await page.getByRole('button', { name: 'New game' }).click();
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.screenshot({ path: testInfo.outputPath(`menu-${testInfo.project.name}.png`) });
    await page.getByRole('dialog').getByRole('button', { name: 'Concede' }).click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Concede this game?');
    await page.getByRole('dialog').getByRole('button', { name: 'Concede' }).click();
    await expect(page.getByRole('main', { name: 'Home' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  });
});

test.describe('settings (UI-1, PE-3)', () => {
  test('choose opponents and difficulty, and keep them across a reload', async ({
    page,
  }, testInfo) => {
    await open(page, 23);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Left opponent').selectOption('rusty');
    await page.getByLabel('Right opponent').selectOption('soopy');
    await page.getByRole('radio', { name: /Casual/ }).check();
    await page.screenshot({
      path: testInfo.outputPath(`settings-${testInfo.project.name}.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.getByRole('region', { name: 'Left opponent' })).toContainText('Rusty');
    await expect(page.getByRole('region', { name: 'Right opponent' })).toContainText('Soopy');

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByLabel('Left opponent')).toHaveValue('rusty');
    await expect(page.getByLabel('Right opponent')).toHaveValue('soopy');
    await expect(page.getByRole('radio', { name: /Casual/ })).toBeChecked();
  });

  test('play with one-tap play on, and peek at the last trick', async ({ page }, testInfo) => {
    await open(page, 24);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('checkbox', { name: /One-tap play/ }).check();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'New game' }).click();

    // One tap plays the card: the hand shrinks without a second tap.
    await playUntil(page, () => hand(page).getByRole('button').first().isVisible(), true);
    const count = await hand(page).getByRole('img').count();
    await hand(page).getByRole('button').first().click();
    await expect(hand(page).getByRole('img')).toHaveCount(count - 1);

    const peek = page.getByRole('button', { name: 'Last trick' });
    await playUntil(page, async () => (await peek.count()) > 0 && (await peek.isEnabled()), true);
    await peek.click();
    const dialog = page.getByRole('dialog', { name: 'Trick 1' });
    // Three plays if someone went alone, four otherwise.
    expect(await dialog.getByRole('listitem').count()).toBeGreaterThanOrEqual(3);
    await expect(dialog.getByText('Took it')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`peek-${testInfo.project.name}.png`) });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

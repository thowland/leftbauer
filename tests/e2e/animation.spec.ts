import { expect, test, type Page } from '@playwright/test';

/**
 * Animation and sound — Implementation Plan, Sprint 6. `?e2e` removes the
 * pauses between bot actions, and `?motion` keeps the animations it would
 * otherwise turn off.
 */

const hand = (page: Page) => page.getByRole('region', { name: 'Your hand' });

async function open(page: Page, seed: number): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?seed=${seed}&e2e&motion`);
  return errors;
}

/** Take the human's turns until `done` holds: first bid, cards tapped twice. */
async function playUntil(page: Page, done: () => Promise<boolean>): Promise<void> {
  const bid = page.getByRole('group', { name: 'Your bid' });
  const cards = hand(page).getByRole('button');
  for (let i = 0; i < 300; i++) {
    if (await done()) return;
    await expect(bid.or(cards.first()).or(page.getByRole('dialog'))).toBeVisible();
    if (await done()) return;
    if (await bid.isVisible()) {
      await bid.getByRole('button').first().click();
    } else {
      const card = cards.first();
      await card.click();
      await card.click();
    }
  }
  throw new Error('Never reached the expected state');
}

test.describe('animation (SA-1)', () => {
  test('deals with animation, and the game plays on to the hand summary', async ({
    page,
  }, testInfo) => {
    const errors = await open(page, 31);
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.locator('.fly-in').first()).toBeAttached();
    await page.screenshot({ path: testInfo.outputPath(`deal-${testInfo.project.name}.png`) });

    // Cards land, and nothing is still moving when the human is asked to act.
    await expect(page.locator('.fly-in')).toHaveCount(0);
    await playUntil(page, () => page.getByRole('dialog', { name: 'Hand 1' }).isVisible());
    await expect(page.locator('.fly-in, .fly-out, .flip')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('flies each card to the trick', async ({ page }, testInfo) => {
    const errors = await open(page, 32);
    await page.getByRole('button', { name: 'New game' }).click();
    const flying = page.locator('.trick .fly-in');
    await playUntil(page, async () => (await flying.count()) > 0);
    await page.screenshot({ path: testInfo.outputPath(`trick-${testInfo.project.name}.png`) });
    await expect(flying).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('never scrolls while cards are in flight', async ({ page }) => {
    await open(page, 33);
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.locator('.fly-in').first()).toBeAttached();
    const { scrollX, scrollY } = await page.evaluate(() => ({
      scrollX: document.scrollingElement!.scrollLeft,
      scrollY: document.scrollingElement!.scrollTop,
    }));
    expect({ scrollX, scrollY }).toEqual({ scrollX: 0, scrollY: 0 });
  });
});

test.describe('sound (SA-3)', () => {
  test('tests stay silent: no sound is loaded under ?e2e', async ({ page }) => {
    const sounds: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/sounds/')) sounds.push(r.url());
    });
    await open(page, 35);
    await page.getByRole('button', { name: 'New game' }).click();
    // Taps are what would unlock and load audio.
    await playUntil(page, async () => (await page.locator('.trick').count()) > 0);
    expect(sounds).toEqual([]);
  });

  test('the mute control on the table persists across a reload', async ({ page }) => {
    const errors = await open(page, 34);
    await page.getByRole('button', { name: 'New game' }).click();
    // Portrait phones keep Sound in the menu; elsewhere it is in the score bar.
    const sound = page.getByRole('button', { name: 'Sound' });
    const reach = async () => {
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
      if ((await sound.count()) === 0) await page.getByRole('button', { name: 'Menu' }).click();
    };
    await reach();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await page.getByRole('button', { name: 'Continue' }).click();
    await reach();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });
});

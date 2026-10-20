import { expect, test, type Page } from '@playwright/test';

/**
 * The Sharp level and the bot Web Worker — Implementation Plan, Sprint 7.
 * `?e2e` removes pacing, so bots act as fast as they can decide.
 */

const hand = (page: Page) => page.getByRole('region', { name: 'Your hand' });

/** Take the human's turns until `done` holds: first bid, cards tapped twice, Continue. */
async function playUntil(page: Page, done: () => Promise<boolean>): Promise<void> {
  const bid = page.getByRole('group', { name: 'Your bid' });
  const cards = hand(page).getByRole('button');
  const summary = page.getByRole('dialog', { name: /^Hand \d+$/ });
  for (let i = 0; i < 2000; i++) {
    if (await done()) return;
    await expect(bid.or(cards.first()).or(page.getByRole('dialog'))).toBeVisible();
    if (await done()) return;
    if (await summary.isVisible()) {
      await summary.getByRole('button', { name: 'Continue' }).click();
    } else if (await bid.isVisible()) {
      await bid.getByRole('button').first().click();
    } else if (await cards.first().isVisible()) {
      const card = cards.first();
      await card.click();
      await card.click();
    }
  }
  throw new Error('Never reached the expected state');
}

test('a Sharp game plays to the end in the worker, and the page stays responsive', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const workers: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));

  await page.goto('/?seed=41&e2e');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: /Sharp/ }).check();
  await page.getByRole('button', { name: 'Done' }).click();

  // Watch for the main thread stalling: the longest gap between frames.
  await page.evaluate(() => {
    const w = window as unknown as { longestFrameGap: number };
    w.longestFrameGap = 0;
    let last = performance.now();
    const tick = (now: number) => {
      w.longestFrameGap = Math.max(w.longestFrameGap, now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.getByRole('button', { name: 'New game' }).click();
  await playUntil(page, () => page.getByRole('dialog', { name: /win/ }).isVisible());

  expect(workers.some((url) => url.includes('bot.worker'))).toBe(true);
  const gap = await page.evaluate(
    () => (window as unknown as { longestFrameGap: number }).longestFrameGap
  );
  // Sharp thinks off the main thread, so no frame waits on a bot.
  expect(gap).toBeLessThan(250);
  expect(errors).toEqual([]);
});

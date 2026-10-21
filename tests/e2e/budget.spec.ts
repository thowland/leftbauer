import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * Performance budgets, on Chrome only: they measure the build, not a device.
 * 60 fps (NF-3) is checked by eye on an iPhone and iPad.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome DevTools only');

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]
  );

test('the code is under 500 KB gzipped, without art and audio (NF-4)', () => {
  const code = files('dist').filter((file) => /\.(js|css|html|webmanifest)$/.test(file));
  const bytes = code.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
  console.log(`bundle: ${(bytes / 1024).toFixed(1)} KB gzipped in ${code.length} files`);
  expect(bytes).toBeLessThan(500 * 1024);
});

test('a cold launch reaches a dealt hand in 3 s on a slowed CPU (NF-1)', async ({ page }) => {
  // A 4× slower CPU stands in roughly for a 2021 iPhone; the check on the
  // phone itself is part of the beta.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const start = Date.now();
  await page.goto('/?seed=7&e2e');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(
    page.getByRole('region', { name: 'Your hand' }).getByRole('button').first()
  ).toBeVisible();
  const elapsed = Date.now() - start;
  console.log(`cold launch to a dealt hand: ${elapsed} ms`);
  expect(elapsed).toBeLessThan(3000);
});

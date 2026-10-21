import { expect, test } from '@playwright/test';

/**
 * Johnny Blue plays as another opponent, drawn each game, and the table
 * never says which one.
 */
test('Johnny Blue sits down under his own name, and keeps it after a reload', async ({ page }) => {
  await page.goto('/?seed=31&e2e');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Left opponent').selectOption('johnny');
  await expect(page.getByText(/Plays like one of the others/)).toBeVisible();
  await page.getByLabel('Right opponent').selectOption('rusty');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'New game' }).click();
  const johnny = page.getByRole('region', { name: 'Left opponent' });
  await expect(johnny).toContainText('Johnny Blue');
  const others = /Soopy|Shrubs|Smooth/;
  await expect(page.locator('main')).not.toContainText(others);

  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(johnny).toContainText('Johnny Blue');
  await expect(page.locator('main')).not.toContainText(others);
});

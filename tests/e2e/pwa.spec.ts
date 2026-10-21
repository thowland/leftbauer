import { expect, test } from '@playwright/test';

/**
 * The installable, offline app (NF-5, ADR-0006). The preview server serves
 * the production build, service worker included.
 */

test.describe('the installed app', () => {
  test.use({ serviceWorkers: 'allow' });

  test('the manifest and every icon it or the page names load', async ({ page, request }) => {
    await page.goto('/?e2e');
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest).toMatchObject({ name: 'Left Bauer', display: 'standalone', start_url: '/' });
    expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose).sort()).toEqual([
      'any',
      'any',
      'maskable',
    ]);

    const linked = await page
      .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
    expect(linked).toEqual(['/icon.svg', '/favicon.png', '/apple-touch-icon.png']);
    for (const href of [
      ...linked,
      ...manifest.icons.map((icon: { src: string }) => `/${icon.src}`),
    ]) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect(res.headers()['content-type'], href).toMatch(/^image\//);
    }
  });

  test('after one visit, a game deals with no network', async ({ page, context, browserName }) => {
    // Playwright's WebKit fails any offline reload with an internal error,
    // service worker or not; Safari itself serves the cache (gammon's ADR-0017).
    test.skip(browserName === 'webkit', 'Playwright WebKit cannot reload offline');
    await page.goto('/?seed=7&e2e');
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active!;
      if (worker.state !== 'activated') {
        await new Promise((resolve) => worker.addEventListener('statechange', resolve));
      }
      return worker.state;
    });
    expect(state).toBe('activated');

    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(
      page.getByRole('region', { name: 'Your hand' }).getByRole('button').first()
    ).toBeVisible();
    await context.setOffline(false);
  });

  test('the production security policy blocks nothing the game uses', async ({ page }) => {
    // The preview server sends CloudFront's headers (infra/security-headers.json).
    const csp = (await page.request.get('/')).headers()['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { cspViolations: string[] }).cspViolations = seen;
      document.addEventListener('securitypolicyviolation', (event) =>
        seen.push(`${event.violatedDirective} ${event.blockedURI}`)
      );
    });
    await page.goto('/?seed=7&e2e');
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(
      page.getByRole('region', { name: 'Your hand' }).getByRole('button').first()
    ).toBeVisible();
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Back to the game' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)
    ).toEqual([]);
  });
});

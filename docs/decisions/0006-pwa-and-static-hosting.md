# ADR-0006: The installable app and its hosting

**Status:** Accepted
**Date:** 2026-10-21
**Sprint:** 10

## Context

NF-5 asks for an app that installs from a link and works with no network after the first load. Gammon solved the same problem (its ADR-0017) with `vite-plugin-pwa` and an S3 and CloudFront stack, and Technical Spec §13 says Left Bauer copies that setup. Implementation Plan §3 left the domain and hosting account open until Sprint 10.

## Decisions

1. **The site is `leftbauer.beta-site.us`**, in gammon's existing `beta-site.us` Route 53 zone, deployed with the `wdog_developer` AWS profile. (Decided by the product owner, 2026-10-21.)
2. **`vite-plugin-pwa` precaches the whole build**, sounds included (about 475 KiB), with `registerType: 'autoUpdate'`. A new release takes over on the next launch without a prompt; the game is saved after every action, so a swap loses nothing. Unknown paths fall back to `index.html`.
3. **The icon is the corner of the jack of diamonds on the felt** (decided by the product owner, 2026-10-21). The J is the card face's own rank glyph, so it never depends on a font. `public/icon.svg` is the source and the browser-tab icon; `npm run icons` renders the 32, 180, 192 and 512 px PNGs and a maskable 512 with the artwork inside the 80% safe zone. The Apple and maskable icons are full-bleed felt, since iOS fills transparency with black and rounds the corners itself.
4. **The stack is gammon's, with four changes:**
   - **One cache policy that honours each object's `Cache-Control`.** Gammon's default behaviour pins a year at the edge whatever the object says. The deploy marks the hashed files in `/assets` immutable for a year and everything else `no-cache`, and invalidates `/*`.
   - **A response headers policy** (CSP, HSTS, nosniff, frame and referrer policy). The same headers live in `infra/security-headers.json`, which the preview server sends, so the E2E run tests the CSP. A unit test keeps the file and the template in step.
   - **Old object versions expire after 30 days**, and an AAAA alias joins the A alias.
   - **The deploy deletes last.** The new build is uploaded first, and only then are files it no longer has deleted, so a page mid-load never loses one. The deploy runs `npm run verify` first unless `SKIP_VERIFY=1`.
5. **E2E tests block service workers** except in `pwa.spec.ts`, so no test is served a cached build. Playwright's WebKit cannot reload offline at all, so the offline test runs on Chrome, as in gammon.

## Consequences

- Deployed 2026-10-21 as stack `left-bauer` in us-east-1 (account ACCOUNT_ID): bucket `left-bauer-ACCOUNT_ID`, CloudFront distribution `DISTRIBUTION_ID`.
- `npm run infra:deploy` creates the stack once (the certificate and CloudFront take 15 minutes or more). `npm run deploy` publishes each release. Both read the gitignored `deploy.env`.
- A friend who installed the app gets a new release the second time they open it after a deploy: the first launch fetches the new service worker, and the next one runs it.
- The CSP allows inline styles (React's `style` attributes and the theme's custom properties) but no inline scripts. A future inline script must move to a file, or the policy changes in both places.

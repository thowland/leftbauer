# ADR-0001: Tooling choices

**Status:** Accepted
**Date:** 2026-10-19
**Sprint:** 1

## Context

Left Bauer is a sibling of gammon and should be maintainable with the same habits. The requirements call for an installable static PWA with strict quality gates (Implementation Plan §2.2).

## Decision

Mirror gammon's stack and conventions:

- **Build and app:** Vite 8, React 19, TypeScript with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **Quality:** ESLint 9 flat config with React, hooks and jsx-a11y rules; Prettier with gammon's settings; husky and lint-staged.
- **Layer boundaries:** a `LAYERS` table in `eslint.config.js` lists, for each folder in Technical Spec §3.1, which other layers it may import. Pure layers additionally may not import React or use `window`, `document` or `localStorage`.
- **Tests:** Vitest with jsdom and Testing Library; v8 coverage with 80% thresholds on lines, statements, functions and branches across all of `src/`. The only exclusions are `src/main.tsx` (DOM bootstrap, covered by E2E) and type declarations.
- **E2E:** Playwright on four projects: iPhone 14 and iPhone 14 landscape (WebKit), iPad gen 7 (WebKit) and Desktop Chrome, against a production build served by `vite preview`.
- **Gate:** `npm run verify` runs lint, typecheck, coverage and E2E in order. A husky `pre-merge-commit` hook runs it for every `--no-ff` sprint merge, since the repository has no CI.
- **License:** GPL-3.0-or-later, as gammon.

### Departures from gammon

- `assets/` may import engine types (it maps `Suit` and `Rank` to presentation data).
- No version-bump-on-commit hook yet; versioning is decided when the PWA ships (Sprint 10).
- Build and test tooling is newer than gammon's (see the amendment below).

## Consequences

Contributors who know gammon can work here immediately. Layer violations fail lint rather than review. The merge hook makes the exit criteria mechanical, at the cost of a slower merge (a production build plus four browser projects).

## Amendment (2026-10-19, after Sprint 1)

Starting from gammon's dependency ranges left `npm audit` reporting advisories in dev-only tooling: tinypool (critical) and @vitest/mocker via Vitest 2, esbuild via Vite 5, and braces (high) via lint-staged 15. None of them reach the shipped bundle, but they affect the dev server and test runner on the developer's machine.

Upgraded to current majors, with a clean reinstall:

| Package | From | To |
|---|---|---|
| vite | 5.4 | 8.3 |
| @vitejs/plugin-react | 4.7 | 6.1 |
| vitest, @vitest/coverage-v8 | 2.1 | 5.0 |
| lint-staged | 15.2 | 17.6 |
| jsdom | 25 | 30 |

`npm audit` reports zero vulnerabilities. No configuration changes were needed. The full gate passed unchanged, and a deliberate 101% threshold run confirmed Vitest 5 still enforces the coverage thresholds. Gammon still uses the older versions; this project now leads it.

# Changelog

All notable changes to this project are recorded here, one section per sprint.

## Dependency security upgrade

### Changed

- Upgraded Vite to 8, @vitejs/plugin-react to 6, Vitest and coverage to 5, lint-staged to 17 and jsdom to 30, clearing every `npm audit` advisory (one critical, one high, two moderate) in dev tooling. See the ADR-0001 amendment.

## Sprint 1 — Foundations and first visible table

### Added

- Project tooling mirroring gammon: Vite, React 19, strict TypeScript, ESLint with layer-boundary rules, Prettier, Vitest with 80% coverage thresholds on all four metrics, Playwright on four device projects, husky hooks, and `npm run verify` as the sprint gate (ADR-0001).
- `util/rng`: crypto-backed and seeded RNGs, and `hashSeed`.
- `engine/cards`: suits, ranks, the left bower, trick ranking and hand sorting (RU-6, UI-4).
- `engine/seats`: seats, teams and clockwise order.
- `engine/deal`: Fisher–Yates shuffle and the 3-2 / 2-3 deal (RU-1, RU-2).
- Code-drawn SVG card faces and backs, driven by an asset manifest with standard and four-color variants.
- The card-room theme as CSS variables (VP-4, first pass).
- A responsive table showing a live deal on iPhone, iPad and laptop, with **Deal again** (VP-1, first pass).

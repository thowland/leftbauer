# Changelog

All notable changes to this project are recorded here, one section per sprint.

## Sprint 3 — Playable game

### Added

- `session/`: the `TableDriver` game loop, human and bot seat controllers, an inline bot runner, real-time and immediate schedulers, and event sinks (Technical Spec §8; ADR-0002). Stopping and restarting the driver is safe even when React StrictMode does it.
- `bots/`: the `Bot` interface, `createBot`, and a temporary `PlaceholderBot` that picks a random legal action, seeded from its view so it is deterministic (PB-3).
- A home screen with **New game** (GF-1).
- Interactive play: legal bids as large buttons with a **Go alone** option (GF-3); tap a card to raise it and tap again to play or discard, with illegal cards dimmed (GF-2); bower badges and trump-first sorting (UI-4); a prompt saying whose turn it is.
- Score bar with trump and a tricks tally; bot pacing (GF-4, first pass).
- Hand summary after every hand (GF-6) and a game-over screen with highlights, **Play again** and **Home** (GF-7).
- `?e2e` launch option for unpaced end-to-end runs.

### Changed

- The `?dev` panel moved to its own `DevApp`; normal play starts at the home screen.

## Sprint 2 — Rules engine

### Added

- The complete standard rules as a pure engine: both bidding rounds, ordering up and picking up, loners, redeals, the dealer's discard, following suit with the left bower, trick resolution and scoring to the target (RU-3 to RU-9).
- The dealer sits out a partner's loner without picking up the upcard (RU-5, ADR-0004).
- Stick the dealer, loners on or off, target score and loner sweep value as rule settings (RU-10 to RU-12, RU-16). Defending alone and the dealer's partner having to go alone are rejected until Sprint 9.
- `PlayerView` and public-only `GameEvent`s.
- Property-based tests (fast-check) over random legal games under random rule sets: cards are conserved, scores only rise, hand sizes match play, and no view or event ever exposes a hidden card.
- The table now renders from the human's `PlayerView`: live score, trump, bids and contract chips, the seat to act, the current or last trick, and the seat sitting out.
- Dev mode (`?dev`, `&seed=N`): step, finish or deal hands, reveal every hand, read an event log.

### Changed

- The layer-boundary lint rule now matches only cross-layer imports (`../state/...`), so files inside a layer may share a layer's name (`engine/state.ts`).

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

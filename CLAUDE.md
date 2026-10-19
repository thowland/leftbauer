# Left Bauer — notes for Claude

Read `docs/TECHNICAL_SPEC.md` and `docs/IMPLEMENTATION_PLAN.md` before changing code.

## Invariants

1. Pure layers stay pure: no React, DOM or `localStorage` in `util`, `engine`, `bots`, `coach`, `session`, `state`, `assets`, `themes` or `workers`. ESLint enforces this.
2. Bots cannot cheat: they receive a `PlayerView` and legal actions, never `GameState`.
3. All randomness goes through an injected `Rng`. Production shuffles use `cryptoRng`.
4. Only `engine/cards.ts` decides a card's effective suit (the left bower).
5. Nothing below `ui/` assumes the human sits in seat 0.

## Sprint workflow

- One branch per sprint, `sprint/NN-name`, merged to `master` with `--no-ff` and tagged `sprint-NN`.
- Exit gate: `npm run verify` (lint, typecheck, 80% coverage on all four metrics across all code, all tests, Playwright E2E). The `pre-merge-commit` hook runs it.
- Stop for review after each sprint. The repository is local only: never push.

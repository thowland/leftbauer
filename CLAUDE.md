# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Left Bauer is a single-player Euchre PWA (React 19, strict TypeScript, Vite; no backend). Read `docs/TECHNICAL_SPEC.md` and `docs/IMPLEMENTATION_PLAN.md` before changing code. Decisions are recorded as ADRs in `docs/decisions/`.

## Commands

```bash
npm run dev -- --host            # dev server on :5173, reachable from a phone on the LAN
npm run verify                   # the exit gate: lint → typecheck → test:coverage → test:e2e
npm run lint                     # ESLint (with layer rules) + Prettier check; lint:fix to fix
npm run typecheck                # tsc -b
npx vitest run tests/unit/bots/simulate          # one file or folder
npx vitest run -t "sweeps the last trick"        # tests whose name matches
npx playwright test tests/e2e/sharp.spec.ts --project=desktop-chrome   # one spec, one device
npm run tournament -- --games=10000 --seed=7 --jobs=10 --out=docs/tournaments/sprint-NN.md
```

- Vitest covers `tests/unit`, `tests/component` and `tests/integration` (jsdom). Coverage must stay at 80% or more on all four metrics across all of `src/`. Exclusions are allowed only for code that cannot run under Vitest, and each needs its reason in `vitest.config.ts`.
- Playwright runs four projects: `iphone`, `iphone-landscape` and `ipad` on WebKit, plus `desktop-chrome`. It tests the production build (`vite preview` on :4173) and **reuses any server already listening on :4173**. A leftover preview server therefore means testing a stale build; kill it first.
- The tournament runs each match across child processes. It is CPU-heavy: a match with a Sharp team takes about 0.4 s of CPU per game.

### Launch options (query string, `src/ui/launchOptions.ts`)

- `?seed=N`: reproducible deals.
- `?dev`: the engine-stepping dev panel.
- `?e2e`: no bot pacing, no animation, **no audio**.
- `?motion` and `?sound` turn animation or audio back on under `?e2e`.

Every E2E test uses `?e2e`. Test runs must stay silent; only a test explicitly about sound may add `?sound`.

## Architecture

Layers live in `src/<layer>/`, and imports between them are enforced by `eslint.config.js` (`LAYERS`). Every layer except `ui` and `audio` is pure: no React, `window`, `document` or `localStorage`.

| Layer | May import |
|---|---|
| `engine` | `util` |
| `bots` | `engine`, `util` |
| `session` | `engine`, `bots`, `util` |
| `state` | `engine`, `bots`, `session`, `util` |
| `workers` | `bots`, `engine`, `util` |
| `coach` | `bots`, `engine`, `util` |
| `audio` | `engine`, `assets`, `util` |
| `assets` | `engine` |
| `themes` | nothing |

Code is shared across a boundary by placing it in a lower layer: `bots/protocol.ts` is used by both `session` and `workers`. Where a type would cross an illegal boundary, the code matches it structurally; `audio/AudioSink` satisfies the session `EventSink` without importing it.

How a game runs:

1. **The engine** (`engine/game.ts`) is pure and immutable. `applyAction(state, seat, action)` returns the new `GameState` plus `GameEvent[]`. `GameState` is plain JSON, which is what gets saved. `toPlayerView(state, seat)` is everything a seat may see.
2. **`session/TableDriver`** runs the game loop outside React. It asks each seat's `SeatController` for an action, applies it, publishes a snapshot, then awaits each `EventSink` in order before pacing the next bot turn.
   - Controllers are `HumanSeatController` or `BotSeatController`.
   - The sinks are wired in `ui/game/createTable.ts`, in this order: `PersistenceSink` (saves after every action), `StatsSink` (counts scored hands and games), then `AudioSink`, then `Presenter`. The `Presenter` holds the driver until animations finish.
   - Every wait goes through an `AbortSignal`, so `stop()` and a StrictMode remount are safe. `hurry()` cuts the current pause short.
   - Failures are recoverable only where the app opts in: `DriverDeps.onError` (a failing sink is skipped; anything else ends the run with status `error`, resumable by `start()`) and `BotSeatController`'s `onFailure` (play the first legal action). Tests and the tournament leave them out, so a failure rejects `start()`. `ui/ErrorBoundary.tsx` catches render failures.
3. **The UI** reads the driver with `useSyncExternalStore(driver.subscribe, driver.snapshot)` and sends the human's moves through `HumanSeatController.submit`; it never calls `applyAction`.
   - `GameScreen` starts the driver in a microtask, so React StrictMode's mount, unmount and remount presents the first deal once.
   - The `Presenter` publishes a single animation `Cue`. `ui/motion.ts` maps that cue to CSS classes plus `--dx`/`--dy` vectors.
   - Durations live in `themes/motion.ts`; the same values reach CSS as custom properties.
4. **Bots** are built only through `bots/factory.ts` `createBot(spec)` from a serializable `BotSpec` (role, persona, skill), and they see only a `PlayerView`.
   - A bot is a `PolicyBot`: one policy each for bidding, loners, the discard and card play, plus a `Selector`. Casual's noisy selector produces its mistakes.
   - A persona (`personas.ts`) sets style numbers. A skill level (`skills.ts`) selects strategies and holds every tuning number.
   - Each decision gets an RNG seeded from the view, so the same view gives the same decision (PB-3).
   - Sharp's card play (`bots/simulate/`) samples hidden deals that fit what the seat knows, rolls each one out with the conventional policy for every seat, and averages the hand's points.
   - The partner is always Sharp (`PARTNER_SPEC`).
5. **Bot runners**:
   - In the app, decisions go through `session/WorkerBotRunner` to `workers/bot.worker.ts` (logic in `workers/botHost.ts`). If the worker fails, decisions fall back to running inline.
   - Tests and the tournament use `InlineBotRunner`.
   - `session/tournament.ts` `runMatch` drives the real `TableDriver` headless. `firstGame` plus `mergeReports` let `scripts/tournament.ts` split a match across processes.
6. **Persistence** (`state/`): `persistence.ts` provides versioned stores with a migration chain over an injected `StorageLike`. Every call is guarded, and an invalid value is discarded rather than loaded. The store keys are `leftbauer:game` (a `SavedGame`, validated structurally and then by the engine), `leftbauer:settings` and `leftbauer:stats`.

## Invariants

1. Pure layers stay pure (see above). ESLint enforces this.
2. Bots cannot cheat: they receive a `PlayerView` and the legal actions, never `GameState`. Simulation samples only cards that are unseen from the view.
3. All randomness goes through an injected `Rng`. Production shuffles use `cryptoRng`; bots, tests and tournaments use `seededRng`/`hashSeed`.
4. Only `engine/cards.ts` decides a card's effective suit (the left bower).
5. Nothing below `ui/` assumes the human sits in seat 0. `ui/layout.ts` `screenPosition` is the only seat-to-screen mapping.
6. Tests never make sound (see Launch options). Unit and component tests use fake audio players.
7. House rules never change mid-game: a `GameState` carries its own `RuleSet`, and `Settings.pendingRules` applies only to the next new game. The alone house rules are off while loners are off (`defendAloneActive`, `dealerPartnerMustGoAloneActive`).

## Sprint workflow

- One branch per sprint, `sprint/NN-name`, merged to `master` with `git merge --no-ff` and tagged `sprint-NN`. Fixes between sprints get their own `fix/...` branch, merged the same way.
- The exit gate is `npm run verify`. The husky `pre-merge-commit` hook runs it, so a failing branch cannot be merged. `pre-commit` runs lint-staged and the typecheck.
- At the end of a sprint, update `CHANGELOG.md` and the as-built notes in `docs/TECHNICAL_SPEC.md`, then stop for review: run the dev server with `--host`, share the LAN URL and screenshots, and wait for approval before starting the next sprint.
- The remote is github.com/thowland/leftbauer (public, GPL-3.0-or-later). Push only when Tim asks; push `master` and the tags, never a rewritten history. There is no CI: the husky hooks are the gate.
- Commit messages end with the `Co-Authored-By` line only; no `Claude-Session` links. Never commit AWS account or resource IDs or the AWS profile name; they belong in the gitignored `deploy.env`.

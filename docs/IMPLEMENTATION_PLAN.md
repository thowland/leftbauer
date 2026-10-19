# Left Bauer — Implementation Plan

**Status:** Draft v1
**Last updated:** 2026-10-19
**Builds on:** [Requirements](./REQUIREMENTS.md) · [Technical Specification](./TECHNICAL_SPEC.md)

## 1. Approach

The plan puts something visible in front of you after the first sprint and a playable game after the third. Every sprint after that adds one coherent capability on top of a working game. Each sprint ends with a build you can open in a browser and on your phone.

| Milestone | Reached at | What you can do |
|---|---|---|
| **First visible table** | Sprint 1 | See a freshly dealt table on iPhone, iPad and laptop |
| **First playable** | Sprint 3 | Play a full game to 10 against placeholder bots |
| **Real Euchre** | Sprint 4 | Play against conventional bots: your partner and the four named opponents |
| **Feels like a table** | Sprint 6 | Animation, sound, resume and settings |
| **v1 feature-complete** | Sprint 9 | All Must and Should requirements |
| **Friends beta** | Sprint 10 | Installed PWA on a public URL |

## 2. Working agreement

### 2.1 Branching and merging

- Each sprint runs on its own branch from `master`, named `sprint/NN-short-name` (for example, `sprint/01-foundations`).
- Commits within a sprint are small and use conventional-commit messages, as in gammon.
- A sprint closes only when every exit criterion in §2.2 passes on the sprint branch.
- The sprint is merged with `git switch master && git merge --no-ff sprint/NN-short-name`, so every sprint appears as a merge commit in the history. The merged `master` is then tagged `sprint-NN`.
- The repository is local only for now. No pushes, and no CI. The exit criteria are run locally with one command (§2.3).

### 2.2 Exit criteria (every sprint)

In addition to completing the sprint's development work:

1. **Lint passes.** ESLint and the Prettier check pass on every file in the repository, with no warnings suppressed for the occasion.
2. **Coverage of at least 80%.** Lines, statements, functions and branches are each at 80% or above, measured across **all** source code, not just the sprint's changes. This is enforced as Vitest coverage thresholds, so the test run fails below them.
3. **All tests pass.** That means the whole suite, not just the sprint's new tests. Obsolete tests may be deleted, but the overall coverage thresholds must still be met afterward.
4. **End-to-end tests.** You've set MVP as the first visible table, so Playwright E2E tests are required **from Sprint 1 onward**. Every sprint adds or updates E2E tests for the user-facing behavior it introduces, on three projects: iPhone (WebKit), iPad (WebKit) and Desktop Chrome.

Also:

- **Typecheck** (`tsc -b`) passes. This is implied by the build, and checked explicitly.
- **Coverage exclusions** are limited to code that cannot run under Vitest: the `main.tsx` bootstrap, the Web Worker entry shim, type declarations and config files. Each exclusion is listed with its reason in `vitest.config.ts`. Exclusions are not used to reach the threshold.
- **Playwright E2E runs do not count toward coverage.** Coverage comes from unit, component and integration tests.

### 2.3 Sprint-close procedure

1. `npm run verify` runs, in order: `lint` → `typecheck` → `test:coverage` (thresholds enforced) → `test:e2e`. It must exit 0.
2. Update `CHANGELOG.md` and the module READMEs touched in the sprint, and record any decisions as ADRs in `docs/decisions/`.
3. Merge `--no-ff` to `master` and tag it.
4. Run `npm run verify` again on `master` after the merge.
5. **Stop for review.** Start the dev server with `npm run dev -- --host`, share the LAN URL for your phone and iPad, and attach Playwright screenshots at the three viewport sizes. The next sprint starts only after you approve.

### 2.4 Test-first

Within each sprint, pure modules (engine, bots, coach, state) are written test-first. UI components get React Testing Library tests alongside them. E2E tests are written once a user-facing flow exists in the sprint, and before the sprint closes.

## 3. Decisions needed before specific sprints

| Decision | Needed before | Notes |
|---|---|---|
| ~~When the dealer's partner goes alone, does the dealer still exchange with the upcard?~~ | Sprint 2 | **Decided:** no. The dealer lays down their hand, the upcard is turned over, and there is no discard. Recorded in ADR-0004. |
| Card art: code-drawn SVG faces, or an open-licensed deck | Sprint 6 | Sprint 1 starts with code-drawn faces. Keeping them would also make the four-color deck and licensing trivial. |
| Sound sources (specific CC0 or open-licensed packs) | Sprint 6 | |
| Farmer's hand mechanics | Sprint 9 | Off by default. It can slip to 1.1 if it stays undecided. |
| Domain and hosting account | Sprint 10 | |

## 4. Sprints

### Sprint 0 — Planning documents

**Goal:** the planning documents are in version control.

- Commit `TECHNICAL_SPEC.md` and this plan on `sprint/00-planning`, then merge `--no-ff`.
- There is no code yet, so the exit criteria do not apply.

### Sprint 1 — Foundations and first visible table

**Goal:** the project builds, every quality gate is in place, and you can see a dealt table on your phone.

**Tooling** (mirroring gammon, ADR-0001):
- Vite, React 19 and strict TypeScript; ESLint and Prettier, including **layer-boundary rules** for every folder in Technical Spec §3.1; husky and lint-staged.
- Vitest with v8 coverage and **80% thresholds on all four metrics**; React Testing Library.
- Playwright with iPhone, iPad and Desktop Chrome projects, plus screenshot capture.
- `npm run verify` (§2.3), wired into a husky `pre-merge-commit` hook so a `--no-ff` merge fails if the gate fails, plus `CHANGELOG.md`, a `README.md`, `docs/decisions/` and the GPL-3.0-or-later `LICENSE`.

**Code:**
- `util/rng.ts`: `cryptoRng`, `seededRng`, `hashSeed`.
- `engine/cards.ts`: suits, ranks, `CardId`, colors, `effectiveSuit`, bowers and `trickRank`, tested exhaustively.
- `engine/deal.ts`: the Fisher–Yates shuffle and the deal, with a uniformity test (RU-1, RU-2).
- `ui/Card.tsx`: code-drawn SVG card faces and backs, behind a minimal `AssetManifest`.
- `ui/TableScreen.tsx`: a static layout of a real deal. Your five cards face up, card backs for the three other seats, the upcard on the kitty, the dealer marker and a placeholder score bar. A **Deal again** button. The layout is responsive across the three device classes (VP-1, first pass).
- A `themes/` card-room palette as CSS variables (VP-4, first pass).

**E2E:** the app loads, the table renders with five face-up cards and an upcard, **Deal again** produces a new deal, and nothing scrolls horizontally on any of the three projects.

**Review:** open the LAN URL on your iPhone and iPad and deal a few hands.

### Sprint 2 — Rules engine

**Goal:** the complete standard rules of Euchre run as pure, fully tested code, which you can watch play out.

**Code:**
- `engine/bidding.ts`: both rounds, ordering up and picking up, loners, redeal on four passes in round two (stick the dealer is off by default), and the dealer's discard (RU-3, RU-4, RU-5).
- `engine/play.ts`: leading, following suit with the left bower as trump, trick resolution and leads around a seat sitting out (RU-6, RU-7).
- `engine/scoring.ts`: `HandResult` and game end (RU-8, RU-9).
- `engine/game.ts`: `newGame`, `dealNextHand`, `currentActor`, `legalActions` and `applyAction`.
- `engine/view.ts` (`PlayerView`) and `engine/events.ts` (`GameEvent`).
- `engine/rules.ts`: the `RuleSet` type and `STANDARD_RULES`. Only the standard rules are implemented now. The other `RuleSet` fields exist but are fixed to their defaults.
- **Property-based tests** (adding `fast-check`): random legal games run to completion, with assertions that the 24 cards are conserved, scores only go up, play stays legal, and no hidden card ever appears in another seat's view or in any event.
- **Dev panel** (`?dev` in the URL): a "Step" button that applies the first legal action and re-renders the table from engine state, plus a toggle that reveals all four hands. It is kept behind the flag for debugging bots later.

**E2E:** in dev mode, stepping through a full hand reaches a hand summary, and the score changes.

**Review:** use `?dev` to step through hands and watch bidding, tricks and scoring follow the rules.

### Sprint 3 — Playable game (first-playable milestone)

**Goal:** you can play a full game to 10 against placeholder bots.

**Code:**
- `session/`: `TableDriver`, `HumanSeatController`, `BotSeatController`, `Scheduler`, the `EventSink` fan-out and `InlineBotRunner` (Technical Spec §8; ADR-0002).
- `bots/bot.ts` and `bots/factory.ts`, with a temporary `PlaceholderBot` that chooses a legal action at random from a seeded RNG. It is replaced in Sprint 4.
- UI: `HomeScreen` with **New game** (GF-1), `BidPanel` showing only legal options (GF-3), `PlayerHand` with tap-to-raise and tap-to-play and dimming of illegal cards (GF-2), `TrickArea`, a live `ScoreBar`, the trump indicator and bower badges with hands sorted by effective suit (UI-4), `HandSummary` (GF-6), `GameOver` with **Play again** (GF-7), and a fixed bot pacing delay (GF-4, first pass).
- Integration tests: `TableDriver` with scripted controllers plays full games, and stopping during a pending action is safe.

**E2E:** start a new game, bid, play a card, finish a hand and see the summary. A seeded game played to completion reaches the game-over screen.

**Review:** play complete games on your phone. This is the first point where the game is in your hands.

### Sprint 4 — Conventional bots and the partner

**Goal:** the bots play real Euchre, with a partner you can learn to read and four opponents with distinct personalities.

**Code** (Technical Spec §6; ADR-0003):
- `PolicyBot`, the policy interfaces, `ScoredOption`, `DecisionContext`, `BestSelector` and `NoisySelector`.
- `CardKnowledge` and `HeuristicEvaluator`.
- The convention rule chains for bidding, loners, discards and card play, covering every PB-4 convention, with score awareness (PB-5). There are fixture tests for every rule and its `ReasonCode`.
- `personas.ts`: `partner`, `soopy`, `shrubs`, `rusty` and `smooth`. `skills.ts`: `casual` and `standard` (`sharp` follows in Sprint 7, and the partner uses `standard` until then).
- A determinism test: the same view and spec always give the same decision (PB-3).
- Remove `PlaceholderBot`.
- `scripts/tournament.ts`: the headless harness (Technical Spec §11.3), plus a small fixed-seed tournament test checking that Standard beats Casual.
- UI: `SeatBadge` with persona monograms and names (OP-4). Opponents are picked at random for now.

**E2E:** opponent names and monograms appear, and a seeded game against conventional bots plays to completion.

**Review:** play against the real bots, and read a tournament report comparing personas and skill levels.

### Sprint 5 — Persistence, settings and table controls

**Goal:** the game remembers where you were, and the main settings are in place.

**Code:**
- `state/persistence.ts`: three schema-versioned keys, `StorageLike` injection, a migration chain and `PersistenceSink` (PE-1, PE-3).
- `state/settings.ts` and `SettingsScreen`: opponent choice (named or random), opponent difficulty, pacing, one-tap play and the sound toggle (wired up in Sprint 6). Hints and house-rule entries are added in Sprints 8 and 9 (UI-1, first pass).
- **Continue** on the home screen. Concede or start a new game with confirmation (GF-8).
- `LastTrickPeek` (GF-5), and tapping the table to speed up a trick (GF-4).

**E2E:** reload mid-hand and continue from exactly the same state, change opponents and difficulty in settings, and play with one-tap play on.

**Review:** close the app mid-trick and reopen it, and try the settings.

### Sprint 6 — Animation and sound

**Goal:** the game feels like a real table.

**Prerequisite:** the decisions on card art and sound sources (§3).

**Code:**
- `ui/Presenter`: an event-driven animation queue for the deal, playing a card, sweeping a trick, picking up the upcard and the dealer's discard. Card elements keep a stable identity and animate with CSS transforms, and the driver waits for each animation to settle (SA-1).
- `audio/`: a pure `soundMap`, `AudioEngine` with the iOS unlock on first gesture, `AudioSink`, and a mute control on the table that persists (SA-2, SA-3).
- Final card art in the `AssetManifest`, plus `CREDITS.md` (VP-2).

**E2E:** animations finish and play continues, the mute control persists across a reload, and screenshots are taken mid-deal and mid-trick.

**Review:** play with sound on, on your phone.

### Sprint 7 — Sharp level and the Web Worker

**Goal:** the strongest level plays well without making the animation stutter.

**Code:**
- `simulate/`: `DealSampler`, `Rollout` and `SimulatedCardPlay` with the sample and time budgets.
- `skills.sharp`. The partner moves to Sharp (PB-2).
- `WorkerBotRunner` and `workers/bot.worker.ts`, with an inline fallback (Technical Spec §9.4).
- Performance tests: Sharp decisions fit the budget from NF-2.
- The tournament gate in the test suite: Sharp > Standard > Casual, and a partner team at Sharp beats Standard opponents.
- Difficulty setting: all three levels.

**E2E:** a Sharp game plays to completion with the worker active, and the table stays responsive while bots think.

**Review:** play at Sharp, and read the full tournament report.

### Sprint 8 — Coach and supporting screens

**Goal:** newcomers can learn, and experienced players can see how the partner thinks.

**Code:**
- `coach/`: `hintFor`, the `renderReason` catalog (with a test that every `ReasonCode` has text), and `partnerConventions()`.
- `HintControl` with an in-place highlight and a one-line reason (CO-1, CO-2), and the hints toggle (CO-3).
- `RulesScreen` reflecting the active rules (UI-2), `AboutScreen` with the Bauer story, credits and the version (UI-3), and `PartnerConventionsScreen` (UI-6).
- `state/stats.ts`, `StatsSink` and `StatsScreen`, bucketed by difficulty, with a reset option (PE-2, UI-5).

**E2E:** request a hint in each phase, open every screen, and check that stats update after a game and can be reset.

**Review:** play a game with hints on, as a newcomer would.

### Sprint 9 — House rules and the four-color deck (v1 feature-complete)

**Goal:** every family's version of the game is available.

**Code:**
- Engine support and settings for stick the dealer, target score, loner sweep value, defending alone, the dealer's partner having to go alone, and turning loners off (RU-10 to RU-14, RU-16). Each rule gets engine tests, bot-awareness tests and property tests under random rule sets.
- Farmer's hand (RU-15), if its mechanics are decided. Otherwise it is deferred to 1.1.
- Pending rules take effect at the next game, and `RulesChip` shows the active rules on the table.
- The four-color deck setting (VP-3).

**E2E:** turn on stick the dealer and confirm the dealer cannot pass in round two, start a game with a target of 5, and switch to the four-color deck.

**Review:** try your group's rules. This is v1 feature-complete.

### Sprint 10 — PWA, deployment and friends beta

**Goal:** friends can install it from a link.

**Code and infrastructure:**
- `vite-plugin-pwa`: precaching, the offline shell, the manifest, icons and the iOS install flow (NF-5, ADR from gammon's ADR-0017).
- The AWS S3 and CloudFront stack adapted from gammon's `infra/`, plus `scripts/deploy.sh`.
- Performance checks: cold launch to a dealt hand (NF-1), bundle size (NF-4), 60 fps on device (NF-3).
- Release `0.1.0`. A short beta guide for friends: how to install, plus the questions you want answered.

**E2E:** the app works offline after the first load (Playwright's `context.setOffline`), the manifest and service worker are valid, and a full regression run passes.

**Review:** install it from the public URL on your phone, then share it with the first friends. The partner review in PB-6 happens here.

## 5. After v1

These are recorded so they stay out of v1:

- **1.1:** whatever was cut (the requirements' §7 lists the cut line), plus fixes from the beta.
- **Phase 2:** after-hand explanations (CO-4), reduce motion and animation speed, keyboard play, the illustrated Bauer deck, and more personas and themes.
- **Phase 3:** multiplayer, which needs its own requirements and plan.

## 6. Risks to the plan

- **Sprint 4 is the largest and the most judgment-heavy.** Tuning conventions takes play-testing. If it runs long, split it into 4a (bidding and discards) and 4b (card play and personas).
- **Coverage on UI and animation code.** The 80% branch threshold across all code includes React components and the presenter. Keeping the timing logic in pure, testable modules (the presenter's queue and `soundMap`) is what makes this achievable.
- **WebKit E2E flakiness.** Animations make E2E timing fragile. Tests use a `?e2e` flag that sets pacing and animation durations to zero, and assert on state rather than timing.
- **Local-only verification.** With no CI, the exit criteria depend on running `npm run verify` before every merge. To make that automatic, Sprint 1 adds a husky `pre-merge-commit` hook that runs `npm run verify`. Git runs this hook for every `--no-ff` merge, so a sprint cannot merge to `master` with a failing gate.

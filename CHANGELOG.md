# Changelog

This file records every notable change to the project, one section per sprint or fix. The first release is 0.1.0.

## Unreleased

### Johnny Blue

#### Added

- **Johnny Blue**, a fifth opponent. Each game he plays as one of the other four (Soopy, Shrubs, Rusty or Smooth), and the game never says which. You can choose him in Settings, or a random seat may draw him, and a saved game keeps his disguise.

#### Fixed

- The score bar no longer moves a pixel when trump is named on an iPhone in landscape, because the Trump slot is now as wide as its widest value.

### Home without a tagline

#### Removed

- The tagline under the title on Home.

## 0.1.0 — Sprint 10, the installable app (2026-10-21)

The first release, deployed to https://leftbauer.beta-site.us.

### Added

- **Install and play offline.** Left Bauer is a PWA (progressive web app): added to the home screen, it runs full screen and needs no network after the first visit. A new release takes over on the next launch (ADR-0006).
- **An icon**, the corner of the jack of diamonds on the felt, used as the browser-tab favicon, the iPhone and iPad home-screen icon, and Android's maskable icon.
- **Hosting** at `leftbauer.beta-site.us`: `infra/left-bauer.yaml` (S3, CloudFront, the certificate and DNS), `npm run infra:deploy` and `npm run deploy`, with security headers that include a strict Content-Security-Policy.
- The [beta guide](docs/BETA.md) for friends, covering how to install and what to report.
- E2E tests for the manifest and icons, offline play, the security policy, the bundle budget (NF-4) and a cold launch to a dealt hand (NF-1).

## Fix — A steady table, and the layout guide

### Changed

- **Layout pass** from `docs/design/layout-improvements.md`: one spacing scale (`--space-*`, plus relationship tokens such as `--gap-controls`) across the stylesheet, wider screen gutters, 6–12 px between hand cards, and a full 44 px tap area on every compact button.
- **Game menu** grouped as This game (Sound on portrait phones, the game's Rules, How to play), Leave (Settings, Home) and End the game (New game, Concede). Rules moved off the felt into the menu, and the score bar shows "Game to 10" where it fits. How to play, opened from a game, describes that game's rules and leads back to it.
- **Score bar:** Trump and Tricks hold their places with a dash from the deal. On portrait phones Sound moves into the menu, leaving the score and Menu.
- **Dialogs** scroll when they are taller than the screen, close on Escape (except the hand summary and game over), keep Tab inside, and return the focus when they close. On portrait phones the hand summary rises from the bottom, so the last trick stays in view.
- **Home** groups Settings with the other destinations; in landscape the title sits beside the buttons, and the page scrolls if it has to.
- **Settings and reading pages:** the header, with Done, stays on screen while scrolling; dropdowns are a full 44 px on iOS; groups and rows have more room, and the loner-sweep row is indented under Loners.
- **iPad and desktop** get larger cards, text and controls, and on a wide window the table is capped at 1040 px so the seats stay near the trick.
- The dealer's disc moved off the cards, next to the dealer's name.

### Fixed

- Nothing on the table moves during a hand any more. Before this fix, the center and the trick jumped when the last cards left the hands, when a "Called…" or "Pass" chip appeared, and when the bid buttons came and went.
- On phones in portrait, round-two bids fit on one row (the suit buttons show only the suit), and the trick no longer overlaps the prompt or the Last trick button.
- On an iPhone in landscape, the kitty and the trick now fit, in Safari too: the partner's name and yours sit beside the cards, the kitty's label sits beside the kitty, and the trick is a little smaller.
- The score and the Hint button no longer move during a hand, and the layout test now checks both.
- In Safari in landscape with a saved game, Home's title was clipped and About could not be reached.
- The redeal summary no longer shows a stray "Lead" behind it.
- Card ranks are drawn as strokes instead of set in a font, because some phones painted the font blank; they now show in the corners on every phone.
- On iPad, cards you couldn't play could vanish from the hand, because iOS Safari sometimes failed to paint a faded card's drop shadow; a faded card no longer carries one.

## Sprint 9 — House rules and the four-color deck

### Added

- **House rules** in Settings, applied from the next game (RU-10 to RU-16): the target score (5, 7, 10 or 11), stick the dealer, loners on or off, a loner sweep worth 4 or 5, defending alone, the dealer's partner having to go alone, and the farmer's hand. "Back to standard rules" resets them. A game keeps the rules it started with, and Settings says so when the two differ.
- **Farmer's hand** (RU-15): a player dealt five 9s and 10s may, before bidding, swap any three of them for the three face-down kitty cards, sight unseen. Tap three cards and then Swap these three, or choose Keep my hand.
- **Defending alone** (RU-13), against any contract: once trump is set, each defender in turn may play alone, and a lone euchre scores 4.
- **The dealer's partner must go alone** (RU-14): in round one, the dealer's partner may order the dealer up only by going alone.
- A **Rules chip** on the table shows the game's rules ("Rules · to 10", or "House rules" when any are on) and opens a summary. How to play describes the house rules in play.
- **Four-color deck** (VP-3): spades black, hearts red, diamonds blue and clubs green, with a preview in Settings.
- The bots play every house rule. They always take a farmer's swap (giving up the lowest three), defend alone only on a hand that can stop the makers, judge a forced order-up as a loner, and go alone a little more readily when a sweep is worth 5. The coach gives hints for each, and How your partner plays has a House rules section.

### Changed

- Settings move to schema version 3 and saved games to version 2, each with a migration, so saved settings and a game in progress carry over.
- ADR-0004 records the farmer's hand and defending alone as decided, and every rule in the engine is now implemented.

## Sprint 8 — Coach and supporting screens

### Added

- **Hints** (CO-1, CO-2): on your turn, a Hint button shows what your partner would do in your seat, highlighted in place (the card, the discard or the bid, including going alone), with a one-line reason in place of the prompt. Hints can be turned off in Settings (CO-3); settings move to schema version 2, with a migration that turns hints on.
- **How to play** (UI-2), written from the active rules; **How your partner plays** (UI-6), generated from the partner's own rule lists in the order it applies them; and **About** (UI-3), with the Bauer story, the sound credits and the version. All three are linked from the home screen.
- **Stats** (PE-2, UI-5): games, wins, hands, trump you named and made, euchres given and taken, marches and loners, by opponent difficulty and in total, with a confirmed reset. A game left unfinished, by conceding or by starting a new one, counts as a loss.

### Fixed

- A dealer's six-card hand now fits on a phone.
- On phones, the prompt line reserves two lines, so a long prompt or hint never moves the table.

## Sprint 7 — Sharp level and the Web Worker

### Added

- **Sharp** (OP-2), with card play by simulation. Each legal card is scored over 80 deals of the unseen cards that fit everything the seat knows (hand sizes, voids, the dealer's upcard); each deal is played out by the conventions, and the card with the best average points is chosen. Bidding is unchanged. The partner plays at Sharp (PB-2), and Settings now offer all three levels.
- A bot **Web Worker**, so every bot decision runs off the main thread, falling back to the main thread if the worker cannot start or fails (NF-2, NF-3).
- **Tournament:** `npm run tournament` splits each match across processes (`--jobs`), reports a 95% confidence interval, and writes the report with `--out`. Over 10,000 games per match, Sharp beats Standard 66.3%, Standard beats Casual 66.3%, Sharp beats Casual 78.0%, and the partner at Sharp beats every Standard opponent by 66.8% to 72.6%. The full report is in `docs/tournaments/sprint-07.md`.
- Gates in the suite: the partner at Sharp beats Standard at a fixed seed; Sharp decisions fit the 300 ms budget (NF-2); and a full Sharp game plays in the worker in E2E with no stalled frames.

### Fixed

- The deal sampler no longer gives a dealer with no cards left the upcard they discarded.

## Sprint 6 — Animation and sound

### Added

- Animation (SA-1): the deal flies from the dealer to each seat in turn, the upcard is picked up into the dealer's hand or turned down, the dealer's discard is laid face down, each card flies from its seat to the trick, and leading a new trick sweeps the last one to its winner. The Presenter holds the game until the cards land, and the durations are theme tokens shared by the code and the CSS.
- Sound (SA-2): shuffle, card, deal and sweep sounds, a trump call, a sting when a team is euchred and a flourish for a march or loner sweep, all from Kenney's CC0 packs (`CREDITS.md`, ADR-0005).
- A Sound toggle on the table beside Menu (SA-3), saved with the settings. Audio starts on the first tap, as iOS requires.
- Court cards now carry emblems (a crown for kings, a coronet for queens and the Bauer's hat for jacks), and the 9 and 10 have tighter pip columns.
- `?motion` keeps animation on under `?e2e`, for the animation tests. Animation is off when the device asks for reduced motion.
- The tests are silent. Under `?e2e` the app creates no audio engine, so no sound is loaded or played, and `?sound` turns it back on for a test that needs it. Playwright's Chrome also runs with `--mute-audio`, and unit and component tests only ever use a fake player.

### Fixed

- In development, where React's StrictMode restarts the table, the first deal of a game is now presented in full.
- Cards in flight can no longer scroll the page; the score bar fits on phones with the new control; and on phones the Last trick button sits above the trick instead of over it.

## Sprint 5 — Persistence, settings and table controls

### Added

- The game is saved after every action and survives closing the app (PE-1), and **Continue** on the home screen picks it up exactly where it was (GF-1). Saves are schema-versioned with a forward-migration chain, and a corrupt or unreadable save is discarded rather than loaded.
- Settings, saved separately (UI-1 first pass, PE-3): the left and right opponent (named or random, never the same one twice), opponent difficulty (Casual or Standard), pace of play (Relaxed, Normal, Brisk), one-tap play, and a sound toggle that Sprint 6 wires up.
- An in-game **Menu** with Settings, Home (the game stays saved), New game and Concede; the last two ask for confirmation with the safe choice focused (GF-8). Starting a new game from home while one is saved also asks first.
- **Last trick** (GF-5), a button pinned to the corner of the table center that shows the previous trick, who played each card and who took it.
- Tap the table to hurry (GF-4): the current pause ends, and the rest of the trick plays without pauses.
- One-tap play (GF-2).

### Fixed

- The hand's last trick now stays on the table for the usual trick pause before the hand summary appears, whoever plays the last card.

### Changed

- `state/` may import `bots` types and personas (Technical Spec §3).
- Tables are built from a `SavedGame` (`newTable`, `resumeTable`), whether new or resumed.

## Sprint 4 — Conventional bots and the partner

### Added

- Real Euchre bots (ADR-0003): a composite `PolicyBot` built from bidding, loner, discard and card-play policies, card knowledge (cards seen, voids, boss cards) and a heuristic hand evaluator. Every decision carries a reason code for the coach.
- The partner's conventions (PB-4): it calls with enough expected tricks for the seat, favors "next" left of the dealer, leads the boss trump as maker, leads trump back to a partner who called, cashes off-suit aces, never overtakes a winning partner, wins as cheaply as it can, discards to make a void and never throws a bower. Calling is score-aware (PB-5).
- Four named opponents (OP-3): Soopy (cautious defender), Shrubs (loner hunter), Rusty (bold caller) and Smooth (by the book), shown with colored monograms; two are picked at random each game (OP-4).
- Casual and Standard skill levels (OP-2); the partner always plays at full strength (PB-2).
- `npm run tournament`, a headless harness over the same `TableDriver` that reports wins, calls, made, marches, euchres and loners. A fixed-seed test keeps Standard ahead of Casual. The report is in `docs/tournaments/sprint-04.md`.

### Changed

- The dealer is marked by a round **D** button pinned to the dealer's cards, and seat statuses sit in a reserved row, so neither shifts the seat labels any more.
- The placeholder random bot is gone.

## Sprint 3 — Playable game

### Added

- `session/`: the `TableDriver` game loop, human and bot seat controllers, an inline bot runner, real-time and immediate schedulers, and event sinks (Technical Spec §8; ADR-0002). Stopping and restarting the driver is safe, even when React StrictMode does it.
- `bots/`: the `Bot` interface, `createBot`, and a temporary `PlaceholderBot` that picks a random legal action, seeded from its view so that it is deterministic (PB-3).
- A home screen with **New game** (GF-1).
- Interactive play: legal bids as large buttons with a **Go alone** option (GF-3); tap a card to raise it and tap again to play or discard it, with illegal cards dimmed (GF-2); bower badges and trump-first sorting (UI-4); and a prompt saying whose turn it is.
- A score bar with trump and a tricks tally, and bot pacing (GF-4, first pass).
- A hand summary after every hand (GF-6), and a game-over screen with highlights, **Play again** and **Home** (GF-7).
- The `?e2e` launch option, for unpaced end-to-end runs.

### Changed

- The `?dev` panel moved to its own `DevApp`, and normal play starts at the home screen.

## Sprint 2 — Rules engine

### Added

- The complete standard rules as a pure engine: both bidding rounds, ordering up and picking up, loners, redeals, the dealer's discard, following suit with the left bower, trick resolution and scoring to the target (RU-3 to RU-9).
- The dealer sits out a partner's loner without picking up the upcard (RU-5, ADR-0004).
- Stick the dealer, loners on or off, the target score and the loner sweep value as rule settings (RU-10 to RU-12, RU-16). Defending alone and the dealer's partner having to go alone are rejected until Sprint 9.
- `PlayerView` and public-only `GameEvent`s.
- Property-based tests (fast-check) over random legal games under random rule sets, checking that cards are conserved, scores only rise, hand sizes match play, and no view or event ever exposes a hidden card.
- The table now renders from the human's `PlayerView`: the live score, trump, bid and contract chips, the seat to act, the current or last trick, and the seat sitting out.
- Dev mode (`?dev`, `&seed=N`), which can step, finish or deal hands, reveal every hand and show an event log.

### Changed

- The layer-boundary lint rule now matches only cross-layer imports (`../state/...`), so files inside a layer may share a layer's name (`engine/state.ts`).

## Dependency security upgrade

### Changed

- Upgraded Vite to 8, @vitejs/plugin-react to 6, Vitest and coverage to 5, lint-staged to 17 and jsdom to 30, which cleared every `npm audit` advisory in the dev tooling (one critical, one high, two moderate). See the ADR-0001 amendment.

## Sprint 1 — Foundations and first visible table

### Added

- Project tooling mirroring gammon: Vite, React 19, strict TypeScript, ESLint with layer-boundary rules, Prettier, Vitest with 80% coverage thresholds on all four metrics, Playwright on four device projects, husky hooks, and `npm run verify` as the sprint gate (ADR-0001).
- `util/rng`: crypto-backed and seeded RNGs, and `hashSeed`.
- `engine/cards`: suits, ranks, the left bower, trick ranking and hand sorting (RU-6, UI-4).
- `engine/seats`: seats, teams and clockwise order.
- `engine/deal`: the Fisher–Yates shuffle and the 3-2 / 2-3 deal (RU-1, RU-2).
- Code-drawn SVG card faces and backs, driven by an asset manifest with standard and four-color variants.
- The card-room theme as CSS variables (VP-4, first pass).
- A responsive table showing a live deal on iPhone, iPad and laptop, with **Deal again** (VP-1, first pass).

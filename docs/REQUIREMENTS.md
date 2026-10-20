# Left Bauer — Requirements

**Status:** Draft v1
**Last updated:** 2026-10-19
**Companion to:** [Left Bauer Vision](./Left%20Bauer%20Vision.md)

## 1. Overview

Left Bauer is an installable, browser-based Euchre game for one human player at a table with three computer players: one partner and two opponents. It ships as a static single-page PWA with no backend and no accounts, works offline once installed, and keeps all state on the device.

The goal for v1 is a polished solo game that can be shared with a group of friends this fall. v1 centers on a computer partner that experienced players trust. It also includes a small cast of opponents with distinct personalities, sound and animation that give it the feel of a real table, and house rules exposed as settings. Multiplayer is a later phase. v1 does not build it, but it must not rule it out (see §5.6).

Requirement priorities use **Must** (required for v1), **Should** (in v1 unless it threatens the release), and **Later** (a named future phase).

## 2. Decisions recorded

These decisions were settled while drafting this document and resolve several of the vision's open questions.

| Topic | Decision |
|---|---|
| First release | Solo play only. Friends each install it and play against bots. Multiplayer is Phase 3. |
| Schedule | No firm date. "This fall" is a goal. Quality over a deadline. |
| Default rules | Standard rules: 24-card deck, game to 10, loner sweep scores 4. Every optional rule, including stick the dealer and farmer's hand, is off by default and configurable. |
| Reneging | Blocked. Only legal cards can be played. |
| Difficulty | Applies to opponents only. The partner always plays its strongest honest game. |
| Opponent personas | Four in v1: Soopy (cautious defender), Shrubs (loner hunter), Rusty (bold caller), Smooth (by the book). Monogram avatars. More will be added later. |
| Coach | v1 includes in-hand hints only. After-hand explanations are Phase 2. |
| Bot method | Rule-based strategy for bidding and conventions, with simulation layered on for card play at higher opponent levels. |
| Stack | Mirror gammon: React 19, strict TypeScript, Vite, vite-plugin-pwa, Vitest, Playwright, GPL-3.0-or-later, AWS static hosting. Patterns are copied, not extracted into a shared library. |
| Devices | Responsive across iPhone, iPad and laptop, as equal first-class targets. |
| Persistence | Resume a game in progress, plus lifetime stats, stored on the device. |
| Accessibility (v1) | Optional four-color deck. |
| Art and sound | Open-licensed assets for v1, behind a swappable asset layer. Illustrated Bauer art comes later. |
| Feedback | No in-app feedback or analytics. The author asks friends directly. |
| Newcomers | Rules reference screen plus coach hints. No guided tutorial. |

## 3. Target users and devices

- **Primary audience:** players who grew up with Euchre and want a quick hand without gathering three people. The v1 launch group is the author's college friends.
- **Secondary audience:** newcomers learning the game. They are served by the rules reference and the coach hints, not a tutorial.
- **Devices:** iPhone (portrait and landscape), iPad (both orientations) and laptop browsers. The minimum supported viewport is 375 px wide (iPhone SE and mini). The layout respects iOS safe areas.
- **Browsers:** the latest two major versions of Safari (iOS, iPadOS, macOS), Chrome, Firefox and Edge. iOS Safari is the most constrained target (audio unlock, install flow, storage) and is the reference platform for testing.

## 4. Functional requirements

### 4.1 Rules engine

The rules engine is the single source of truth for legality and scoring. The UI never offers an illegal action, and the bots choose only from actions the engine enumerates.

**Must**

- **RU-1 Deck and deal.** 24 cards (9 through Ace in four suits). Four players in fixed partnerships sitting across from each other. Each player gets five cards, dealt in the conventional 3-2 / 2-3 pattern (animation only; it does not affect randomness). Four cards form the kitty, and its top card is turned up. The deal rotates clockwise.
- **RU-2 Shuffle fairness.** Shuffles use a Fisher–Yates shuffle over `crypto.getRandomValues` in production and a seedable PRNG in tests. A statistical test in CI checks card-position uniformity.
- **RU-3 Bidding, round one.** Starting left of the dealer, each player may order up the turned card or pass. The dealer may pick it up or turn it down. When the card is ordered up or picked up, the dealer takes it and discards one card face down.
- **RU-4 Bidding, round two.** Starting left of the dealer, each player may name any suit except the turned-down suit, or pass. With stick the dealer on, the dealer may not pass. With it off, four passes cause a redeal by the next dealer.
- **RU-5 Going alone.** The player who makes trump may declare a loner, and their partner sits out the hand. The engine handles the lead when the sitting-out player would otherwise lead. If the dealer's partner orders up alone in round one, the dealer lays down their hand and does not pick up the upcard. The upcard is turned over, its suit is still trump, and there is no discard.
- **RU-6 Trump ranking.** Right bower (jack of trump), left bower (other jack of the same color), then A, K, Q, 10, 9 of trump. The left bower belongs to the trump suit for every purpose, including following suit. This is the rule newcomers most often get wrong, so the UI must make it visible (see UI-4).
- **RU-7 Play.** The player left of the dealer leads the first trick, and each trick's winner leads the next. Players must follow the led suit when able, with the left bower counting as trump. A trick goes to the highest trump, or to the highest card of the led suit if no trump was played.
- **RU-8 Scoring.**

  | Outcome | Points |
  |---|---|
  | Makers take 3 or 4 tricks | 1 to makers |
  | Makers take all 5 (march) | 2 to makers |
  | Lone maker takes 3 or 4 | 1 to maker's team |
  | Lone maker takes all 5 | 4 to maker's team |
  | Makers take fewer than 3 (euchred) | 2 to defenders |

- **RU-9 Game end.** The first team to reach the target score (default 10) wins. Score is shown in the conventional "points" form, and the UI may also show it as a traditional 6-and-4 card count.

**Should: house-rule settings.** Every optional rule is off by default and can be turned on in settings.

- **RU-10 Stick the dealer.** When on, the dealer must name trump in round two. When off (the default), four passes in round two cause a redeal.
- **RU-11 Target score:** 5, 7, 10 or 11.
- **RU-12 Loner sweep value:** 4 (default) or 5.
- **RU-13 Defending alone:** a defender may play alone against the makers, whatever the contract (decided 2026-10-20), and euchring the makers alone scores 4.
- **RU-14 Dealer's partner must go alone** when ordering the dealer up. Regional names for this rule vary, and the setting label must describe the rule rather than rely on a name.
- **RU-15 Farmer's hand:** a player dealt five 9s and 10s may, before bidding, swap any three of them for the three face-down kitty cards, sight unseen (decided 2026-10-20; ADR-0004).
- **RU-16 Loners allowed:** on by default. Off removes the loner option entirely.

House-rule settings take effect at the start of the next game, never mid-hand. The active rule set is visible from the table (for example, a "Rules" chip that opens a summary).

### 4.2 Partner bot

The partner is the most important feature in the product. Its job is to play sound, conventional Euchre the same way every time, so the human can learn to read it and trust it.

**Must**

- **PB-1 Honesty.** The partner sees only what a human in its seat would see: its own hand, the turned card, the bidding, the cards played, and its own discard when it deals. This is enforced architecturally (§5.4), not by convention.
- **PB-2 Strength.** The partner always plays at the strongest available level, whatever opponent difficulty is chosen.
- **PB-3 Consistency.** Given the same seat, score, hand and history, the partner makes the same decision. Any randomness used in simulation is seeded from the game state, so a replayed hand produces the same choices.
- **PB-4 Documented conventions.** The partner follows a written convention set that is also shown to players on a "How your partner plays" screen (UI-6). The initial set covers at least:
  - ordering up and calling only with a strong enough hand, adjusted for seat (dealer side vs. non-dealer side) and score;
  - "calling next" (the suit of the same color as the turned-down card) from the seat left of the dealer in round two;
  - leading trump when its partner made trump;
  - not trumping a trick its partner is already winning unless that is needed to win the hand;
  - leading off-suit aces;
  - supporting a partner's loner, and declaring loners only on hands that justify them;
  - the dealer's discard: shorten a suit, never discard a bower.
- **PB-5 Score awareness.** Bidding and loner decisions take the game score into account (for example, more aggressive defending when the opponents are at 9).

**Should**

- **PB-6 Validation by experienced players.** Before release, at least two experienced players review the convention set and play a session with it. Their objections are either resolved or recorded as accepted differences.

### 4.3 Opponents: difficulty and personas

**Must**

- **OP-1 Honesty.** The same information limits as PB-1 apply.
- **OP-2 Difficulty levels.** Three opponent levels, which change skill, not style:

  | Level | Behavior |
  |---|---|
  | **Casual** | Rule-based strategy with noticeable mistakes: a looser calling threshold, and sometimes the second-best card. |
  | **Standard** | Rule-based strategy played correctly. |
  | **Sharp** | Rule-based bidding with simulation-assisted card play (sampling deals consistent with what is known), matching the partner's strength. |

  Mistake rates and thresholds are configuration values, not constants.

- **OP-3 Personas.** Four named opponents in v1. Each is defined as adjustments to the shared strategy: calling aggressiveness, loner threshold, defensive caution, and willingness to "stick" an opponent dealer. Personas set style and difficulty sets skill, and the two combine independently. The persona list is data-driven, so more opponents can be added without code changes.

  | Opponent | Style | Tendencies |
  |---|---|---|
  | **Soopy** | Cautious defender | Calls trump only on a strong hand. Patient on defense, and hard to euchre. |
  | **Shrubs** | Loner hunter | Goes alone whenever the hand is close. Plays for big swings. |
  | **Rusty** | Bold caller | Orders up and names trump on thin hands. Makes trump often, and is euchred often. |
  | **Smooth** | By the book | Plays textbook conventional Euchre with no strong lean, closest to the partner's conventions. |

- **OP-4 Persona presentation.** Each persona has a name, a short one-line description of its tendencies, and a monogram avatar: a colored circle with the initial, in the card-room palette, replaceable by illustrated art later. The player can choose the opponents or let the game pick at random.

**Later**

- More personas, persona-specific partners, and difficulty levels beyond Sharp.

### 4.4 Coach

**Should**

- **CO-1 Hints.** An optional "Hint" control during bidding, the dealer's discard, and card play. It shows the action the top-level strategy would take, highlighted in place.
- **CO-2 Hint reason.** Each hint carries a one-line reason drawn from the rule that produced it (for example, "Lead trump: your partner called it"). This comes almost for free with rule-based strategy and is the seed of the Phase 2 explanations.
- **CO-3 Coach toggle.** Hints can be turned off completely in settings, which hides the control. Hint use is not counted against stats.

**Later (Phase 2)**

- **CO-4 After-hand explanations.** A hand review that walks through each trick and explains why the partner and opponents bid and played as they did.

### 4.5 Game flow and controls

**Must**

- **GF-1 One tap to play.** The home screen offers **Continue** (when a game is in progress) and **New game**. New game starts with the last-used settings and goes straight to the deal.
- **GF-2 Card input.** Tap a card to raise it and tap again to play it. A "one-tap play" setting plays on the first tap. Illegal cards are dimmed and cannot be played. Input uses pointer events (no HTML5 drag-and-drop, following gammon).
- **GF-3 Bidding input.** Bidding actions (Order up / Pick up / Pass / Name suit / Go alone) are large, clearly labeled buttons. Only legal options appear.
- **GF-4 Pacing.** Bot actions are paced so the human can follow them (a default delay per bot action, adjustable in settings). Tapping the table speeds up the current trick.
- **GF-5 Last trick.** The player can review the previous trick at any time during a hand.
- **GF-6 Hand summary.** At the end of each hand, a short summary shows who made trump, tricks per team, points scored and the running score, then continues on tap.
- **GF-7 Game end.** A game-over screen shows the result, notable events (marches, loners, euchres) and a **Play again** button.

**Should**

- **GF-8 Concede/new game.** The player can abandon the current game from the menu, with confirmation.

### 4.6 Supporting screens

**Must**

- **UI-1 Settings.** House rules (§4.1), opponent difficulty and personas, pacing, one-tap play, sound, hints, and the four-color deck.
- **UI-2 Rules reference.** A concise, illustrated rules screen covering the deal, the two bidding rounds, the bowers, following suit, loners and scoring. It reflects the active house rules.
- **UI-3 About.** Explains the name: the left bower, the German *Bauer*, and the Pennsylvania German lineage. It is reachable within two taps from home. It also includes open-source credits, asset licenses and the version number.
- **UI-4 Bower visibility.** Once trump is set, the trump suit is shown persistently, and both bowers in the player's hand are marked (for example, a small badge) and sorted with trump.

**Should**

- **UI-5 Stats screen.** See PE-2.
- **UI-6 "How your partner plays."** A plain-language page listing the partner's conventions (PB-4).

### 4.7 Sound and animation

**Must**

- **SA-1 Animations.** Shuffle and deal, playing a card to the trick, collecting a won trick, the turn-up card being picked up or turned down, and the dealer's discard.
- **SA-2 Sound effects.** Shuffle, card snap, trump call, a sting when a team is euchred, and a flourish for a loner sweep or march.
- **SA-3 Mute.** A mute control is reachable from the table screen, and the setting persists. Sound is on by default, and audio starts only after the first user gesture, as iOS requires.

**Later**

- Reduce motion (respecting `prefers-reduced-motion`) and an animation speed setting beyond GF-4's pacing.

### 4.8 Persistence and stats

**Must**

- **PE-1 Resume.** The full game state is saved to `localStorage` after every committed action (bid, discard, card played). The schema is versioned with a forward-migration path, so app updates do not wipe a game in progress.
- **PE-2 Lifetime stats** (Should, stored on the device): games played and won; hands played; times making trump and the make success rate; euchres given and taken; marches; loners attempted and made. Stats are broken down by opponent difficulty, and the player can reset them.
- **PE-3 Settings persistence.** All settings persist separately from game state.

### 4.9 Visual presentation

**Must**

- **VP-1 Table layout.** Four seats: the human at the bottom, the partner at the top, and the opponents on the left and right. Shown alongside are the score, a trump indicator, the dealer marker and a tricks-won tally per team. The layout adapts across iPhone portrait and landscape, iPad and laptop without horizontal scrolling.
- **VP-2 Card rendering.** SVG cards, crisp at any DPI. The art comes from open-licensed sources whose licenses are compatible with GPL-3.0 and are recorded in the About screen and a `CREDITS.md`.
- **VP-3 Four-color deck.** An optional setting that gives each suit a distinct color (for example, spades black, hearts red, diamonds blue, clubs green). The rest of the UI must not encode suit by color alone.
- **VP-4 Theme.** A single v1 theme in the warm card-room direction of the vision: felt, worn card stock and folk-inflected type. Colors are CSS variables so further themes can be added later.

**Later**

- An illustrated Bauer jack and custom deck, branded app icon art, and more themes.

## 5. Non-functional requirements

- **NF-1 Time to first hand.** An installed PWA launched cold reaches a dealt hand in ≤ 3 s on a 2021-class iPhone, with one tap for Continue or New game.
- **NF-2 Bot latency.** Each bot decision takes ≤ 300 ms of compute on a 2021-class iPhone at the Sharp level. This is separate from the deliberate pacing in GF-4. Simulation runs off the main thread (a Web Worker) when its budget exceeds one frame.
- **NF-3 Frame rate.** Animations hold 60 fps on iPhone and iPad.
- **NF-4 Bundle size.** < 500 KB gzipped, excluding card art and audio. Assets are precached for offline play.
- **NF-5 Offline.** After the first load, the app is fully functional with no network. It makes no remote calls of any kind, including analytics, fonts and assets.
- **NF-6 Privacy.** No accounts, no tracking and no data leaving the device.
- **NF-7 Determinism.** The engine and bots accept an injected RNG, so every test and tournament run is reproducible from a seed.
- **NF-8 Quality gates.** Strict TypeScript, ESLint and Prettier, and Vitest unit tests for the engine and bots, plus Playwright smoke tests on iPhone, iPad and desktop viewports. All of them run in CI on every push, following gammon.

## 6. Architecture

### 6.1 Stack

TypeScript (strict), React 19, Vite, vite-plugin-pwa (Workbox), Vitest with React Testing Library, and Playwright. Cards and the table render as SVG driven by React. Deployment is a static build to AWS (S3 + CloudFront via CloudFormation), following gammon's `infra/` and `scripts/deploy.sh` patterns. The license is GPL-3.0-or-later.

### 6.2 Module layout (proposed)

```
src/
  engine/       pure rules engine — no React, no DOM, no storage
    cards.ts      Card, suit, rank; effective suit (left bower)
    deal.ts       Shuffle and deal over an injected RNG
    bidding.ts    Round one/two, loners, stick the dealer, house rules
    play.ts       Legal plays, trick resolution
    scoring.ts    Hand and game scoring
    rules.ts      RuleSet type and presets
    view.ts       PlayerView: the information visible from one seat
  bots/         strategies behind a common interface
    strategy.ts   Strategy interface
    conventions/  rule-based bidding, discard, lead, follow
    simulate.ts   Deal sampling consistent with a PlayerView
    personas.ts   Persona parameter sets
    difficulty.ts Casual / Standard / Sharp configuration
    explain.ts    Reason strings for hints (and Phase 2 explanations)
  state/        game store, persistence, settings, stats
  audio/        sound loading, iOS unlock, mute
  ui/           React components: Table, Hand, Trick, BidPanel, Score, screens
  themes/       CSS-variable palettes
  assets/       card faces and sounds behind a manifest
```

`engine/` and `bots/` are pure and form the tested core.

### 6.3 Engine

The game state is an immutable value: seats, hands, kitty, turned card, bidding history, trump, maker, loner, tricks and score. Pure functions apply actions (`bid`, `discard`, `play`) and return the next state or a typed rejection. The engine exposes `legalActions(state, seat)`, which drives the UI's dimming, the bots' choices and the coach.

### 6.4 Bot interface

```ts
interface Strategy {
  readonly id: string;
  decide(view: PlayerView, rules: RuleSet, ctx: BotContext): Decision;
}

interface Decision {
  action: Action;     // one of legalActions(view)
  reason?: Reason;    // structured; rendered by explain.ts for hints
}
```

A bot receives a `PlayerView`, never the full game state, so it structurally cannot see hidden cards. This applies to the partner and opponents alike. The simulation in `simulate.ts` samples hidden hands that are consistent with the view (known voids, the turned card, the dealer's pickup) and evaluates candidate plays across those samples.

### 6.5 Tournament harness

A headless driver plays bot teams against each other over seeded deals and reports win rate, euchre rate, make rate and loner success, as gammon's harness does. It is used to:

- tune convention thresholds and persona parameters;
- confirm the difficulty ordering (Sharp > Standard > Casual, by a meaningful margin over ≥ 10,000 games);
- catch strength regressions in CI on a smaller fixed seed set.

### 6.6 Multiplayer readiness

Multiplayer is out of scope until Phase 3, but v1 must keep it possible without a rewrite:

- the engine is pure and serializable, and actions are small, serializable messages;
- every seat is driven through the same seat-controller interface (human UI or bot), so a remote player or a bot replacing a dropped player is just another controller;
- nothing in the engine assumes the human sits in seat 0.

No networking code, server or hosting decision is part of v1.

## 7. Phased rollout

### Phase 1 — v1, the fall release to friends

All **Must** requirements and as many **Should** requirements as possible. Suggested build order:

1. Engine with exhaustive tests (RU-1 to RU-9), plus the tournament harness skeleton.
2. A playable table with a Standard bot in all three seats. Get this onto real phones early.
3. Partner conventions (PB-4), tuned in the harness and reviewed by experienced players.
4. Sharp simulation, then Casual, then personas.
5. Sound, animation, persistence, stats and the supporting screens.
6. Coach hints, house-rule settings and the four-color deck.
7. PWA install and offline polish, AWS deployment, and a friends-and-family beta.

**Cut line if needed:** personas beyond a single default style (OP-3, OP-4), stats (PE-2) and hints (CO-1 to CO-3) can trail into a 1.1 release without changing what the game is.

### Phase 2 — The full coach and polish

After-hand explanations (CO-4), reduce motion and animation speed, keyboard play, an illustrated Bauer deck and branding, more personas and themes.

### Phase 3 — Playing together

A shared-link table for up to three friends, with bots in empty seats and bots taking over dropped seats. This phase requires a hosting decision (home server vs. a small cloud service) and its own requirements document.

## 8. Out of scope

Matchmaking with strangers, rankings and leaderboards; accounts; advertising and monetization; native App Store builds; other card games (the engine and bot framework may later support Five Hundred or Pinochle, but v1 makes no allowance for them); in-app analytics or feedback collection.

## 9. Acceptance criteria for v1

- A full game to 10 can be played on iPhone, iPad and a laptop with every rule in RU-1 to RU-9 enforced, and the game survives closing and reopening at any point.
- Every Must requirement in §4 is implemented and covered by tests.
- The engine test suite covers every bower and follow-suit edge case. In particular, a hand holding the left bower must follow trump, not the left bower's printed suit.
- The tournament harness shows the difficulty ordering holding by a meaningful margin, and the partner team at Sharp beats the Standard opponents.
- At least two experienced players complete several games each and report that the partner's play is sound and that they rarely blame it for a loss (the vision's primary success measure, gathered by asking them).
- A newcomer finishes a first game with hints on.
- Cold launch to a dealt hand meets NF-1, and the installed app plays a full game in airplane mode.

## 10. Open questions and risks

- [x] **Default rules.** Decided: standard rules, with every optional rule (including stick the dealer and farmer's hand) off by default and configurable.
- [x] **Farmer's hand details.** Decided: off by default; strict (five 9s and 10s only); the holder may swap any three for the face-down kitty cards before bidding.
- [ ] **Bauer spelling.** Is the About screen enough, or should the explanation appear on first launch?
- [x] **Persona names.** Decided: Soopy, Shrubs, Rusty and Smooth.
- [x] **Persona tendencies and avatars.** Decided: Soopy is the cautious defender, Shrubs the loner hunter, Rusty the bold caller and Smooth plays by the book. Avatars are monogram badges in v1.
- [ ] **Sound default.** On by default (as specified here) vs. off by default (as in gammon). Revisit after the beta.
- [ ] **Asset licenses.** Choose specific open-licensed card and sound sources, and confirm their licenses are compatible with GPL-3.0 and that the card art supports the four-color variant. Drawing the faces in SVG in-house may be simpler.
- [ ] **Domain.** Choose the public URL for sharing.
- **Risk: simulation cost on phones.** If Sharp-level simulation cannot meet NF-2, reduce the sample count or limit simulation to the later tricks of a hand.
- **Risk: iOS storage eviction.** Safari can clear storage for sites that haven't been visited recently. Installed home-screen apps are generally exempt, so the app should encourage installation, and the README should note the risk.
- **Risk: convention disagreements.** Experienced players may disagree with specific conventions. The "How your partner plays" screen turns these into a documented choice rather than a perceived bug.

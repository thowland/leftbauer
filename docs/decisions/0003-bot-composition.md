# ADR-0003: Bot composition, personas and skill

**Status:** Accepted
**Date:** 2026-10-19
**Sprint:** 4

## Context

The requirements call for a partner that plays consistent, documented conventions (PB-1 to PB-6), four opponents with recognizable styles (OP-3, OP-4) and three difficulty levels that change skill, not style (OP-2). Four personas times three skills would be twelve strategy classes if each combination were its own class.

## Decision

- **One composite bot.** `PolicyBot` implements `Bot` and holds a `PolicySet` (bidding, loner, discard, card play), a `StyleProfile`, a `Selector` and a `HandEvaluator`. It routes each phase to one policy and lets the selector choose. It contains no Euchre strategy.
- **Policies score; selectors choose.** Every policy returns ranked `ScoredOption`s with a `Reason`. `bestSelector` takes the top; `noisySelector(rate, drop)` occasionally takes the next one or two. Difficulty adds mistakes without touching strategy code.
- **Personas are data.** A persona is a `StyleProfile` of threshold offsets plus presentation (name, tagline, monogram color). Adding an opponent is a registry entry. A persona that thinks differently, rather than with a different appetite, would supply policy overrides.
- **Skill selects strategies.** `SKILLS` maps Casual, Standard and Sharp to a card-play policy, a selector and evaluation noise. Sharp plays as Standard until simulation arrives in Sprint 7. The partner is always built at Sharp (PB-2).
- **Card play and discards are rule chains.** Each convention is one `ConventionRule` returning a choice or `null`; the first that applies decides, and the rest of the cards are ranked behind it cheapest-first, so a Casual slip is the next most natural play.
- **Bidding and loners are threshold scores, not rule chains** (a departure from Technical Spec §6.7). A call is scored as the hand's expected tricks plus a partner allowance, minus a threshold that moves with persona, seat and score; each option still carries a reason code (`bid-strong-hand`, `bid-call-next`, `bid-stuck`, …). This is a better fit for a continuous judgment than an ordered list of rules.
- **Going alone is decided after the call, always with the best selector.** A Casual bot's loner mistakes come from misjudging its hand (evaluation noise), never from a random slip; random slips sent Casual alone a quarter of the time.
- **Determinism.** Each decision's RNG is seeded from a hash of the view and the spec (PB-3).

## Tuning (tournament harness, `docs/tournaments/sprint-04.md`)

| Setting | Value | Evidence (1,000-game matches) |
|---|---|---|
| Call threshold | 3.1 expected tricks, including 0.9 for partner | Tighter (Soopy, +0.35) and looser (Rusty, −0.35) both lose to it, 46% and 45% |
| Loner threshold | 3.6 expected tricks alone | Swept 3.3–4.2: at 3.6 the baseline plays at its best and a −0.8 loner hunter breaks even (49.5%) |
| Casual | 8% slip rate, ±0.3 tricks noise | Standard wins 64%: a clear gap, but Casual still wins a third of its games |

## Consequences

- The four v1 opponents are four registry entries. Each plays measurably differently (Soopy calls least and makes 90% of its calls; Rusty calls most and is euchred most; Shrubs attempts four times the loners) while staying within a few points of the baseline.
- A fixed-seed tournament test (`tests/integration/tournament.test.ts`) fails if Standard stops beating Casual by a clear margin.
- The rule list is the source for the "How your partner plays" page in Sprint 8.

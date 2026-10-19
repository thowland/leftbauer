# ADR-0004: Rules edge cases

**Status:** Accepted (partially; open items noted)
**Date:** 2026-10-19
**Sprint:** 2

## Context

Euchre is played many ways, and the engine needs exactly one answer for each situation the standard rules leave to local custom. Requirements RU-3 to RU-9 set the defaults; this ADR records the decisions the engine embodies.

## Decisions

1. **The dealer sits out a partner's loner without the upcard.** If the dealer's partner orders up alone in round one, the dealer lays down their hand and does not pick up the upcard. It is turned over (`upcardStatus: 'setAside'`), its suit is still trump, and the hand goes straight to play with no discard. (Decided by the product owner, 2026-10-19.)
2. **Anyone else's order-up is a normal pickup.** When an opponent of the dealer goes alone, or the dealer orders it up alone themselves, the dealer still picks up and discards.
3. **The lead passes over a seat sitting out.** The seat left of the dealer leads; if that seat is sitting out, the next active seat clockwise leads.
4. **A redeal passes the deal to the left**, exactly as a normal hand does, and scores nothing. Redeals are recorded in `completedHands` so stats can count them.
5. **The kitty is a record of the deal.** `HandState.kitty` never changes; a picked-up upcard is also in the dealer's hand. This keeps "what was dealt" and "who holds what" separate.
6. **Unimplemented house rules fail loudly.** `newGame` throws `UnsupportedRuleError` for `defendAlone` and `dealerPartnerMustGoAlone` until Sprint 9, rather than silently playing standard rules.

## Open

- **Defending alone and the lead** (RU-13): who leads when a defender also goes alone. Needed for Sprint 9.
- **Farmer's hand mechanics** (RU-15): thresholds and exchange. Off by default; may slip to 1.1.

## Consequences

Each decision is covered by a named test in `tests/unit/engine/bidding.test.ts` or `game.test.ts`, and the property tests run every rule combination the engine accepts.

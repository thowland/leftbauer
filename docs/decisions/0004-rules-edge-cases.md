# ADR-0004: Rules edge cases

**Status:** Accepted
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
6. ~~**Unimplemented house rules fail loudly.**~~ Superseded in Sprint 9: every rule in `RuleSet` is implemented, and `UnsupportedRuleError` is gone. `isRuleSet` checks a stored rule set's shape instead.
7. **The farmer's hand is strict** (RU-15). Only a hand of five 9s and 10s qualifies. Before bidding, its holder may swap any three of the cards for the three face-down kitty cards, sight unseen, or keep the hand. The three swapped cards go face down under the upcard, out of play, and only their owner knows them (`PlayerView.myFarmerSwap`). The swap itself is public (`farmerSwapped`); keeping the hand emits nothing. At most one seat can qualify, since there are eight 9s and 10s. `HandState.kitty` still records the deal; `HandState.farmerSwap` records the swap. (Decided by the product owner, 2026-10-20.)
8. **Defending alone is allowed against any contract** (RU-13), not only against a loner. Once trump is set and any discard made, each defender in turn, starting left of the maker, may play alone; the first to accept does, and their partner sits out. Against a lone maker this is one against one. A lone defender who euchres the makers scores 4, whether or not the maker was alone; makers who take three or more score as usual. (Decided by the product owner, 2026-10-20.)
9. **The lead skips every seat sitting out.** Decision 3 extends to two empty seats: the seat left of the dealer leads, or the next seat clockwise that is playing.
10. **The dealer's partner must go alone only to order up** (RU-14). In round one the dealer's partner may order up only alone (and the dealer then sits out, as in decision 1). Round two calls are unaffected.
11. **Loners off turns off the alone house rules** (RU-16). With loners off, defending alone and the dealer's partner having to go alone have no effect, so "no loners" means nobody ever plays alone. Settings disables those two switches while loners are off.

## Consequences

Each decision is covered by a named test in `tests/unit/engine/bidding.test.ts`, `game.test.ts` or `houseRules.test.ts`. The property tests run random rule sets over every rule, and a quarter of their games open with a farmer's hand.

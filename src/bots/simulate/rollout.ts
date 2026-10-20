/**
 * Rollouts — Technical Spec §6.4.
 *
 * Plays a sampled deal to the end of the hand with the engine's own play
 * functions, so a simulated hand obeys exactly the real rules, and
 * scores it for the seat that asked.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { CardId } from '../../engine/cards';
import type { Hands } from '../../engine/deal';
import { applyPlay, legalPlays } from '../../engine/play';
import { teamOf, type Seat } from '../../engine/seats';
import type { HandState } from '../../engine/state';
import type { PlayerView } from '../../engine/view';

/** Chooses a card for `view.seat` from `legal` (two or more cards). */
export type RolloutPolicy = (view: PlayerView, legal: readonly CardId[]) => CardId;

/** Points are what count; tricks only break ties between equal outcomes. */
const TRICK_WEIGHT = 0.01;

/**
 * The value to `view.seat` of playing `card` now, if the hidden hands are
 * `hands` and everyone then plays by `policy`: the hand's points to its
 * team (negative when they go to the other team), plus a sliver for each
 * trick it takes.
 */
export function rollout(
  view: PlayerView,
  hands: Hands,
  card: CardId,
  policy: RolloutPolicy
): number {
  const contract = view.contract!;
  let hand: HandState = {
    dealer: view.dealer,
    phase: { kind: 'play', toAct: view.seat },
    hands,
    kitty: [view.upcard],
    upcardStatus: view.upcardStatus,
    bids: view.bids,
    contract,
    discard: null,
    tricks: view.tricks,
    currentTrick: view.currentTrick,
  };
  hand = applyPlay(hand, view.seat, card, view.rules).hand;

  while (hand.phase.kind === 'play') {
    const seat = hand.phase.toAct;
    const legal = legalPlays(hand.hands[seat], hand.currentTrick, contract.trump);
    const chosen = legal.length === 1 ? legal[0]! : policy(viewOf(view, hand, seat), legal);
    hand = applyPlay(hand, seat, chosen, view.rules).hand;
  }

  const result = hand.phase.kind === 'complete' ? hand.phase.result : null;
  /* v8 ignore next -- a hand in play always ends scored */
  if (result === null || result.kind !== 'scored') return 0;
  const us = teamOf(view.seat);
  const points = result.pointsTo === us ? result.points : -result.points;
  return points + TRICK_WEIGHT * result.tricksWon[us];
}

/** What `seat` would see at this point of the simulated hand. */
function viewOf(base: PlayerView, hand: HandState, seat: Seat): PlayerView {
  return {
    ...base,
    seat,
    phase: 'play',
    toAct: seat,
    myHand: hand.hands[seat],
    myDiscard: null,
    handSizes: [
      hand.hands[0].length,
      hand.hands[1].length,
      hand.hands[2].length,
      hand.hands[3].length,
    ],
    tricks: hand.tricks,
    currentTrick: hand.currentTrick,
  };
}

/**
 * The per-decision context shared by every policy — Technical Spec §6.2.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from '../engine/actions';
import { effectiveSuit, type CardId, type Suit } from '../engine/cards';
import { partnerOf, teamOf } from '../engine/seats';
import type { PlayerView } from '../engine/view';
import type { Rng } from '../util/rng';
import type { HandEvaluator, UpcardTaker } from './evaluate';
import type { CardKnowledge } from './knowledge';
import type { StyleProfile } from './personas';

export interface DecisionContext {
  readonly view: PlayerView;
  readonly legal: readonly Action[];
  readonly knowledge: CardKnowledge;
  readonly evaluator: HandEvaluator;
  readonly style: StyleProfile;
  readonly rng: Rng;
}

/** Small questions every policy asks about the seat and the score. */
export const seatFacts = (view: PlayerView) => {
  const me = view.seat;
  const partner = partnerOf(me);
  const us = teamOf(me);
  return {
    me,
    partner,
    us,
    them: us === 0 ? 1 : 0,
    isDealer: view.dealer === me,
    partnerIsDealer: view.dealer === partner,
    isMaker: view.contract?.maker === me,
    partnerIsMaker: view.contract?.maker === partner,
    weAreMakers: view.contract !== null && teamOf(view.contract.maker) === us,
  } as const;
};

/** The cards in `hand` that play as `suit` with the given trump. */
export function cardsOfSuit(hand: readonly CardId[], suit: Suit, trump: Suit | null): CardId[] {
  return hand.filter((c) => effectiveSuit(c, trump) === suit);
}

/** Who takes the upcard if its suit becomes trump in round one. */
export function upcardTaker(ctx: DecisionContext): UpcardTaker {
  const f = seatFacts(ctx.view);
  return f.isDealer ? 'me' : f.partnerIsDealer ? 'partner' : 'opponent';
}

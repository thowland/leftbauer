/**
 * The dealer's discard — PB-4: shorten a suit, never discard a bower.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { effectiveSuit, type CardId, type Suit } from '../../engine/cards';
import { cardsOfSuit, type DecisionContext } from '../context';
import type { DiscardPolicy } from '../policies';
import { cheapestFirst, isAce, rankByRules, type ConventionRule } from './rule';

const trumpOf = (ctx: DecisionContext): Suit => ctx.view.contract!.trump;

/** Throw a lone off-suit card (not an ace) to leave a void you can trump. */
const makeVoid: ConventionRule<CardId> = {
  id: 'discard-make-void',
  choose(ctx) {
    const trump = trumpOf(ctx);
    const hand = ctx.view.myHand;
    const singletons = hand.filter(
      (c) =>
        effectiveSuit(c, trump) !== trump &&
        !isAce(c) &&
        cardsOfSuit(hand, effectiveSuit(c, trump), trump).length === 1
    );
    return cheapestFirst(singletons, hand, trump)[0] ?? null;
  },
};

/** Otherwise the cheapest card: plain before trump, so a bower is never thrown. */
const discardLowest: ConventionRule<CardId> = {
  id: 'discard-lowest',
  choose: (ctx) => cheapestFirst(ctx.view.myHand, ctx.view.myHand, trumpOf(ctx))[0]!,
};

export const DISCARD_RULES: readonly ConventionRule<CardId>[] = [makeVoid, discardLowest];

export const conventionalDiscard: DiscardPolicy = {
  discard(ctx) {
    const hand = ctx.view.myHand;
    return rankByRules(
      ctx,
      DISCARD_RULES,
      cheapestFirst(hand, hand, trumpOf(ctx)),
      'discard-lowest'
    );
  },
};

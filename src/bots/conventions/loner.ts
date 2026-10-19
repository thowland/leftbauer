/**
 * Going alone — PB-4: declare loners only on hands that justify them.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { seatFacts } from '../context';
import type { LonerPolicy } from '../policies';
import { upcardTaker } from './bidding';

/** Expected tricks, without a partner, needed to go alone. */
export const BASE_LONER_THRESHOLD = 3.6;

export const conventionalLoner: LonerPolicy = {
  goAlone(ctx, trump) {
    const { view, evaluator, style } = ctx;
    // If my partner deals and I go alone, the upcard is set aside: nobody gets it.
    const taker =
      view.phase === 'bidRound1' && !seatFacts(view).partnerIsDealer ? upcardTaker(ctx) : null;
    const own = evaluator.expectedTricks(view.myHand, trump, {
      upcard: taker === null ? null : view.upcard,
      taker,
    });
    return [
      {
        value: true,
        score: own - (BASE_LONER_THRESHOLD + style.lonerThreshold),
        reason: { code: 'loner-strong', params: { tricks: Math.round(own * 100) / 100 } },
      },
      { value: false, score: 0, reason: { code: 'loner-not-strong-enough' } },
    ];
  },
};

/**
 * Going alone, and defending alone — PB-4: play alone only on hands that
 * justify it.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { seatFacts, upcardTaker, type DecisionContext } from '../context';
import type { UpcardTaker } from '../evaluate';
import type { LonerPolicy } from '../policies';

/** Expected tricks, without a partner, needed to go alone. */
export const BASE_LONER_THRESHOLD = 3.6;
/** A loner sweep worth 5 rather than 4 (RU-12) is worth a little more risk. */
export const FIVE_POINT_SWEEP_BONUS = 0.15;
/**
 * Expected tricks, without a partner, needed to defend alone (RU-13). It
 * is the makers who chose trump, so even a strong hand rarely gets there.
 */
export const BASE_LONE_DEFENCE_THRESHOLD = 3.3;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The expected tricks a hand needs before this bot goes alone. */
export function lonerThreshold(ctx: DecisionContext): number {
  const bonus = ctx.view.rules.lonerSweepPoints === 5 ? FIVE_POINT_SWEEP_BONUS : 0;
  return BASE_LONER_THRESHOLD + ctx.style.lonerThreshold - bonus;
}

export const conventionalLoner: LonerPolicy = {
  goAlone(ctx, trump) {
    const { view, evaluator } = ctx;
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
        score: own - lonerThreshold(ctx),
        reason: { code: 'loner-strong', params: { tricks: round2(own) } },
      },
      { value: false, score: 0, reason: { code: 'loner-not-strong-enough' } },
    ];
  },

  defendAlone(ctx) {
    const { view, evaluator, style } = ctx;
    const contract = view.contract!;
    const f = seatFacts(view);
    // A picked-up upcard sits in the maker's side's hand, or in mine as dealer.
    const makersDealt = view.dealer !== f.me && view.dealer !== f.partner;
    const taker: UpcardTaker = view.upcardStatus === 'pickedUp' && makersDealt ? 'opponent' : null;
    const own = evaluator.expectedTricks(view.myHand, contract.trump, {
      upcard: taker === null ? null : view.upcard,
      taker,
    });
    return [
      {
        value: true,
        score: own - (BASE_LONE_DEFENCE_THRESHOLD + style.lonerThreshold),
        reason: { code: 'defend-alone-strong', params: { tricks: round2(own) } },
      },
      { value: false, score: 0, reason: { code: 'defend-alone-not-strong-enough' } },
    ];
  },
};

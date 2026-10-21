// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Conventional bidding — PB-4, PB-5.
 *
 * A call is worth making when the hand's expected tricks, plus what a
 * partner usually contributes, clear a threshold. The threshold moves
 * with the persona's appetite, the seat and the score. Where a house rule
 * allows ordering up only alone (RU-14), the call is judged as a loner.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BidAction } from '../../engine/actions';
import { sisterSuit, suitOf, type Suit } from '../../engine/cards';
import { leftOf } from '../../engine/seats';
import { seatFacts, upcardTaker, type DecisionContext } from '../context';
import type { BiddingPolicy, ScoredOption } from '../policies';
import { lonerThreshold } from './loner';

/** Expected tricks a side needs before calling (three wins the hand). */
export const BASE_CALL_THRESHOLD = 3.1;
/** What a partner is assumed to contribute. */
export const PARTNER_SUPPORT = 0.9;
/** Seat left of the dealer favors "next": the suit of the same color as the turned-down card. */
export const CALL_NEXT_BONUS = 0.3;
/** Opponents one point from winning: contest the call. */
export const SCORE_PRESSURE = 0.35;
/** Far behind: take more chances. */
export const CATCH_UP = 0.2;
/** With stick the dealer, passing forces an opposing dealer to call. */
export const STICK_PENALTY = 0.5;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function callThreshold(ctx: DecisionContext, round: 1 | 2): number {
  const { view, style } = ctx;
  const f = seatFacts(view);
  let threshold = BASE_CALL_THRESHOLD + style.callThreshold;
  if (view.score[f.them] >= view.rules.targetScore - 1) {
    threshold -= SCORE_PRESSURE * style.scoreAwareness;
  }
  if (view.score[f.them] - view.score[f.us] >= 6) threshold -= CATCH_UP * style.scoreAwareness;
  if (round === 2 && view.rules.stickTheDealer && !f.isDealer && !f.partnerIsDealer) {
    threshold += STICK_PENALTY * style.stickAggression;
  }
  return threshold;
}

function teamTricks(ctx: DecisionContext, trump: Suit, round: 1 | 2): number {
  const { view, evaluator } = ctx;
  const context =
    round === 1 ? { upcard: view.upcard, taker: upcardTaker(ctx) } : { upcard: null, taker: null };
  return evaluator.expectedTricks(view.myHand, trump, context) + PARTNER_SUPPORT;
}

function passOption(ctx: DecisionContext): ScoredOption<BidAction>[] {
  return ctx.legal.some((a) => a.type === 'pass')
    ? [{ value: { type: 'pass' }, score: 0, reason: { code: 'bid-pass-weak' } }]
    : [];
}

export const conventionalBidding: BiddingPolicy = {
  round1(ctx) {
    const options = passOption(ctx);
    const plainOrder = ctx.legal.some((a) => a.type === 'orderUp' && !a.alone);
    if (!plainOrder && ctx.legal.some((a) => a.type === 'orderUp')) {
      // RU-14: the dealer's partner may order up only alone, and the upcard is then set aside.
      const own = ctx.evaluator.expectedTricks(ctx.view.myHand, suitOf(ctx.view.upcard), {
        upcard: null,
        taker: null,
      });
      options.unshift({
        value: { type: 'orderUp', alone: true },
        score: own - lonerThreshold(ctx),
        reason: { code: 'bid-forced-alone', params: { tricks: round2(own) } },
      });
    } else if (plainOrder) {
      const tricks = teamTricks(ctx, suitOf(ctx.view.upcard), 1);
      options.unshift({
        value: { type: 'orderUp', alone: false },
        score: tricks - callThreshold(ctx, 1),
        reason: { code: 'bid-strong-hand', params: { tricks: round2(tricks) } },
      });
    }
    return options;
  },

  round2(ctx) {
    const { view } = ctx;
    const pass = passOption(ctx);
    const stuck = pass.length === 0;
    const next = sisterSuit(suitOf(view.upcard));
    const leftOfDealer = leftOf(view.dealer) === view.seat;
    const threshold = callThreshold(ctx, 2);
    const suits = [
      ...new Set(ctx.legal.flatMap((a) => (a.type === 'callTrump' && !a.alone ? [a.suit] : []))),
    ];
    const calls = suits.map((suit): ScoredOption<BidAction> => {
      const tricks = teamTricks(ctx, suit, 2);
      const isNext = leftOfDealer && suit === next;
      const code = stuck ? 'bid-stuck' : isNext ? 'bid-call-next' : 'bid-best-suit';
      return {
        value: { type: 'callTrump', suit, alone: false },
        score: tricks - threshold + (isNext ? CALL_NEXT_BONUS : 0),
        reason: { code, params: { tricks: round2(tricks) } },
      };
    });
    return [...calls, ...pass];
  },
};

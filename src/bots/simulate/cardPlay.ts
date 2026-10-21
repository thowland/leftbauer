// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Simulated card play: the Sharp level — OP-2, PB-2; Technical Spec §6.4.
 *
 * Scores each legal card by dealing the unseen cards many ways that fit
 * what the seat knows, playing each deal out with conventional play for
 * every seat, and averaging what the hand is worth. Every card is tried
 * against the same deals, so the comparison is fair. A forced play skips
 * the simulation.
 *
 * The sample count decides; the time budget only guards a slow device.
 * Deals come from the decision's seeded RNG, so the same view gets the
 * same choice (PB-3) whenever the budget is not hit.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { CardId } from '../../engine/cards';
import type { DecisionContext } from '../context';
import { conventionalCardPlay } from '../conventions/cardPlay';
import { buildKnowledge } from '../knowledge';
import { BY_THE_BOOK } from '../personas';
import type { CardPlayPolicy, ScoredOption } from '../policies';
import { bestSelector } from '../selectors';
import { rollout, type RolloutPolicy } from './rollout';
import { sampleDeal } from './sampler';

export interface SimulationBudget {
  /** Deals to sample per decision. */
  readonly samples: number;
  /** Stop sampling after this long, whatever the count (NF-2). */
  readonly timeBudgetMs: number;
}

/** Below this, the conventional ranking breaks ties between equal averages. */
const TIE_BREAK = 1e-6;

/** Every seat in a rollout plays the partner's conventions. */
const conventionalRollout: RolloutPolicy = (view, legal) => {
  const ctx: DecisionContext = {
    view,
    legal: legal.map((card) => ({ type: 'play', card })),
    knowledge: buildKnowledge(view),
    evaluator: NO_EVALUATOR,
    style: BY_THE_BOOK,
    rng: NO_RNG,
  };
  return bestSelector.select(conventionalCardPlay.play(ctx), NO_RNG).value;
};

/** Card play never estimates tricks or draws randomness; these guard that it stays so. */
const NO_EVALUATOR: DecisionContext['evaluator'] = {
  expectedTricks: () => {
    throw new Error('Card play does not evaluate hands');
  },
};
const NO_RNG: DecisionContext['rng'] = {
  nextInt: () => {
    throw new Error('Conventional card play is deterministic');
  },
};

export function simulatedCardPlay(
  budget: SimulationBudget,
  now: () => number = () => Date.now()
): CardPlayPolicy {
  return {
    play(ctx) {
      const conventional = conventionalCardPlay.play(ctx);
      if (conventional.length === 1) return conventional;

      const totals = new Map<CardId, number>(conventional.map((o) => [o.value, 0]));
      const deadline = now() + budget.timeBudgetMs;
      let samples = 0;
      while (samples < budget.samples && (samples === 0 || now() < deadline)) {
        const hands = sampleDeal(ctx.view, ctx.knowledge, ctx.rng);
        for (const card of totals.keys()) {
          totals.set(card, totals.get(card)! + rollout(ctx.view, hands, card, conventionalRollout));
        }
        samples++;
      }

      return conventional.map((option): ScoredOption<CardId> => {
        const value = totals.get(option.value)! / samples;
        return {
          value: option.value,
          score: value + TIE_BREAK * option.score,
          reason:
            option === best(conventional)
              ? option.reason
              : { code: 'play-simulated', params: { samples, value: round(value) } },
        };
      });
    },
  };
}

const best = (options: readonly ScoredOption<CardId>[]) => bestSelector.select(options, NO_RNG);

const round = (n: number) => Math.round(n * 100) / 100;

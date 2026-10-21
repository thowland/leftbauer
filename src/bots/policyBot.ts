// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The composite bot — Technical Spec §6.3.
 *
 * Routes each phase to the right policy and lets the selector choose.
 * It contains no Euchre strategy of its own.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { sameAction, type Action, type BidAction } from '../engine/actions';
import { suitOf, type Suit } from '../engine/cards';
import type { PlayerView } from '../engine/view';
import { hashSeed, seededRng, type Rng } from '../util/rng';
import { specKey, type Bot, type BotSpec, type Decision } from './bot';
import type { DecisionContext } from './context';
import { NoisyEvaluator, type HandEvaluator } from './evaluate';
import { buildKnowledge } from './knowledge';
import type { StyleProfile } from './personas';
import type { PolicySet, ScoredOption } from './policies';
import { bestSelector, type Selector } from './selectors';

export interface PolicyBotConfig {
  readonly spec: BotSpec;
  readonly policies: PolicySet;
  readonly style: StyleProfile;
  readonly selector: Selector;
  readonly evaluator: HandEvaluator;
  /** Casual play: ± this many tricks of jitter on every estimate. */
  readonly evaluationNoise: number;
}

export class PolicyBot implements Bot {
  readonly spec: BotSpec;

  constructor(private readonly config: PolicyBotConfig) {
    this.spec = config.spec;
  }

  decide(view: PlayerView, legal: readonly Action[]): Decision {
    if (legal.length === 0) throw new Error('A bot was asked to act with no legal actions');
    const ctx = this.context(view, legal);
    const { policies, selector } = this.config;

    switch (view.phase) {
      case 'bidRound1':
      case 'bidRound2': {
        const options =
          view.phase === 'bidRound1' ? policies.bidding.round1(ctx) : policies.bidding.round2(ctx);
        return this.bid(ctx, selector.select(options, ctx.rng));
      }
      case 'farmer': {
        const chosen = selector.select(policies.farmer.exchange(ctx), ctx.rng);
        return this.legalDecision(legal, { type: 'farmerExchange', cards: chosen.value }, chosen);
      }
      case 'dealerDiscard': {
        const chosen = selector.select(policies.discard.discard(ctx), ctx.rng);
        return this.legalDecision(legal, { type: 'discard', card: chosen.value }, chosen);
      }
      case 'defendAlone': {
        // Like going alone, this follows the evaluation, never a random slip.
        const chosen = bestSelector.select(policies.loner.defendAlone(ctx), ctx.rng);
        return this.legalDecision(legal, { type: 'defendAlone', accept: chosen.value }, chosen);
      }
      default: {
        const chosen = selector.select(policies.cardPlay.play(ctx), ctx.rng);
        return this.legalDecision(legal, { type: 'play', card: chosen.value }, chosen);
      }
    }
  }

  /** A chosen call, then the separate decision whether to go alone. */
  private bid(ctx: DecisionContext, chosen: ScoredOption<BidAction>): Decision {
    const bid = chosen.value;
    // A pass, or a call that can only be made alone (RU-14), needs no loner decision.
    if (bid.type === 'pass' || bid.alone) return this.legalDecision(ctx.legal, bid, chosen);
    const trump: Suit = bid.type === 'orderUp' ? suitOf(ctx.view.upcard) : bid.suit;
    const alone = { ...bid, alone: true };
    if (ctx.legal.some((a) => sameAction(a, alone))) {
      // Going alone follows the (possibly blurred) evaluation, never a random slip:
      // a Casual bot's mistakes come from misjudging the hand, not from coin flips.
      const loner = bestSelector.select(this.config.policies.loner.goAlone(ctx, trump), ctx.rng);
      if (loner.value) return { action: alone, reason: loner.reason };
    }
    return this.legalDecision(ctx.legal, bid, chosen);
  }

  private legalDecision<T>(
    legal: readonly Action[],
    action: Action,
    chosen: ScoredOption<T>
  ): Decision {
    if (!legal.some((a) => sameAction(a, action))) {
      throw new Error(`Policy chose an illegal action: ${JSON.stringify(action)}`);
    }
    return { action, reason: chosen.reason };
  }

  private context(view: PlayerView, legal: readonly Action[]): DecisionContext {
    // Seeded from what the bot can see, so the same situation always gets the same answer (PB-3).
    const rng: Rng = seededRng(hashSeed(JSON.stringify(view), specKey(this.spec)));
    const { evaluator, evaluationNoise, style } = this.config;
    return {
      view,
      legal,
      knowledge: buildKnowledge(view),
      evaluator:
        evaluationNoise > 0 ? new NoisyEvaluator(evaluator, evaluationNoise, rng) : evaluator,
      style,
      rng,
    };
  }
}

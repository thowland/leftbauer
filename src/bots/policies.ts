// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Decision-level strategies — Technical Spec §6.2.
 *
 * Each kind of Euchre decision has its own policy. A policy scores the
 * options it is asked about; it never chooses among them (a `Selector`
 * does that), which is how difficulty adds mistakes without touching
 * any strategy.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BidAction } from '../engine/actions';
import type { CardId, Suit } from '../engine/cards';
import type { Reason } from './bot';
import type { DecisionContext } from './context';

export interface ScoredOption<T> {
  readonly value: T;
  /** Higher is better; units are policy-defined. */
  readonly score: number;
  readonly reason: Reason;
}

/** Bids are scored without `alone`; the loner decision is separate. */
export interface BiddingPolicy {
  round1(ctx: DecisionContext): ScoredOption<BidAction>[];
  round2(ctx: DecisionContext): ScoredOption<BidAction>[];
}

export interface LonerPolicy {
  goAlone(ctx: DecisionContext, trump: Suit): ScoredOption<boolean>[];
  /** Whether to defend alone against the makers (RU-13). */
  defendAlone(ctx: DecisionContext): ScoredOption<boolean>[];
}

/** A farmer's hand (RU-15): the three cards to swap, or none to keep the hand. */
export interface FarmerPolicy {
  exchange(ctx: DecisionContext): ScoredOption<readonly CardId[]>[];
}

export interface DiscardPolicy {
  discard(ctx: DecisionContext): ScoredOption<CardId>[];
}

export interface CardPlayPolicy {
  play(ctx: DecisionContext): ScoredOption<CardId>[];
}

export interface PolicySet {
  readonly bidding: BiddingPolicy;
  readonly loner: LonerPolicy;
  readonly farmer: FarmerPolicy;
  readonly discard: DiscardPolicy;
  readonly cardPlay: CardPlayPolicy;
}

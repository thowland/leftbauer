// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The farmer's hand — RU-15; ADR-0004.
 *
 * With the rule on, a player dealt five 9s and 10s may, before bidding,
 * swap any three of them for the three face-down kitty cards, sight
 * unseen. The three go face down under the upcard and are out of play.
 * Only the swap is public; the cards stay hidden. At most one seat can
 * hold a farmer's hand, since there are only eight 9s and 10s.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from './actions';
import { rankOf, type CardId } from './cards';
import type { Hands } from './deal';
import type { GameEvent, HandStep } from './events';
import type { RuleSet } from './rules';
import { seatsFrom, leftOf, type Seat } from './seats';
import { withSeatCards, type HandState } from './state';

/** Cards swapped for the kitty's three face-down cards. */
export const FARMER_SWAP_SIZE = 3;

export function isFarmersHand(cards: readonly CardId[]): boolean {
  return cards.length === 5 && cards.every((c) => rankOf(c) === '9' || rankOf(c) === 'T');
}

/** The seat holding a farmer's hand, if the rule is on and anyone does. */
export function farmerSeat(hands: Hands, dealer: Seat, rules: RuleSet): Seat | null {
  if (!rules.farmersHand) return null;
  return seatsFrom(leftOf(dealer)).find((seat) => isFarmersHand(hands[seat])) ?? null;
}

/** Every way to choose `k` of `cards`, in hand order. */
function choose(cards: readonly CardId[], k: number): CardId[][] {
  if (k === 0) return [[]];
  return cards.flatMap((card, i) =>
    choose(cards.slice(i + 1), k - 1).map((rest) => [card, ...rest])
  );
}

/** Each set of three cards the farmer may swap, then keeping the hand. */
export function farmerLegalActions(hand: HandState, seat: Seat): Action[] {
  if (hand.phase.kind !== 'farmer' || hand.phase.seat !== seat) return [];
  return [
    ...choose(hand.hands[seat], FARMER_SWAP_SIZE).map((cards): Action => ({
      type: 'farmerExchange',
      cards,
    })),
    { type: 'farmerExchange', cards: [] },
  ];
}

/** Apply the farmer's choice, already checked as legal, and open bidding. */
export function applyFarmerExchange(
  hand: HandState,
  seat: Seat,
  cards: readonly CardId[]
): HandStep {
  const bidding: HandState['phase'] = { kind: 'bidRound1', toAct: leftOf(hand.dealer) };
  if (cards.length === 0) return { hand: { ...hand, phase: bidding }, events: [] };
  const kept = hand.hands[seat].filter((c) => !cards.includes(c));
  const events: GameEvent[] = [{ type: 'farmerSwapped', seat }];
  return {
    hand: {
      ...hand,
      hands: withSeatCards(hand.hands, seat, [...kept, ...hand.kitty.slice(1)]),
      farmerSwap: { seat, gave: [...cards] },
      phase: bidding,
    },
    events,
  };
}

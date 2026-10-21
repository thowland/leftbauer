// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Trick play — RU-5, RU-6, RU-7.
 *
 * Leading, following suit (the left bower counts as trump), resolving
 * tricks, and leading around the seats that sit out a loner or a lone
 * defence.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from './actions';
import { effectiveSuit, trickRank, type CardId, type Suit } from './cards';
import type { GameEvent, HandStep } from './events';
import type { RuleSet } from './rules';
import { scoreHand } from './scoring';
import { leftOf, partnerOf, type Seat } from './seats';
import { withSeatCards, type Contract, type HandState, type Trick } from './state';

export const TRICKS_PER_HAND = 5;

/**
 * The seats sitting out this hand: the partner of a lone maker, and the
 * partner of a lone defender (RU-13).
 */
export function sittingOut(contract: Contract | null): Seat[] {
  if (contract === null) return [];
  const out: Seat[] = [];
  if (contract.alone) out.push(partnerOf(contract.maker));
  if (contract.loneDefender !== null) out.push(partnerOf(contract.loneDefender));
  return out;
}

export function activeSeatCount(contract: Contract | null): number {
  return 4 - sittingOut(contract).length;
}

/** `seat` itself if it is playing this hand, otherwise the next active seat clockwise. */
export function firstActiveFrom(seat: Seat, contract: Contract | null): Seat {
  const out = sittingOut(contract);
  let s = seat;
  while (out.includes(s)) s = leftOf(s);
  return s;
}

/** The next seat clockwise after `seat` that is playing this hand. */
export function nextActiveSeat(seat: Seat, contract: Contract | null): Seat {
  return firstActiveFrom(leftOf(seat), contract);
}

/** The effective suit led to a trick, or `null` before the lead. */
export function ledSuit(trick: Trick | null, trump: Suit): Suit | null {
  const lead = trick?.plays[0];
  return lead === undefined ? null : effectiveSuit(lead.card, trump);
}

/** Cards that may legally be played: follow the led suit if able. */
export function legalPlays(cards: readonly CardId[], trick: Trick | null, trump: Suit): CardId[] {
  const led = ledSuit(trick, trump);
  if (led === null) return [...cards];
  const following = cards.filter((c) => effectiveSuit(c, trump) === led);
  return following.length > 0 ? following : [...cards];
}

export function trickWinner(trick: Trick, trump: Suit): Seat {
  const led = ledSuit(trick, trump)!;
  let best = trick.plays[0]!;
  for (const play of trick.plays.slice(1)) {
    if (trickRank(play.card, led, trump) > trickRank(best.card, led, trump)) best = play;
  }
  return best.seat;
}

/** Begin trick play once trump is set and any discard is made. */
export function startPlay(hand: HandState): HandState {
  const leader = firstActiveFrom(leftOf(hand.dealer), hand.contract);
  return { ...hand, phase: { kind: 'play', toAct: leader }, currentTrick: null };
}

export function playLegalActions(hand: HandState, seat: Seat): Action[] {
  if (hand.phase.kind !== 'play' || hand.phase.toAct !== seat || hand.contract === null) return [];
  return legalPlays(hand.hands[seat], hand.currentTrick, hand.contract.trump).map((card) => ({
    type: 'play',
    card,
  }));
}

/** Play a card already checked as legal. Scores the hand after the fifth trick. */
export function applyPlay(hand: HandState, seat: Seat, card: CardId, rules: RuleSet): HandStep {
  const contract = hand.contract!;
  const trickIndex = hand.tricks.length;
  const trick: Trick = {
    leader: hand.currentTrick?.leader ?? seat,
    plays: [...(hand.currentTrick?.plays ?? []), { seat, card }],
    winner: null,
  };
  const hands = withSeatCards(
    hand.hands,
    seat,
    hand.hands[seat].filter((c) => c !== card)
  );
  const events: GameEvent[] = [{ type: 'cardPlayed', seat, card, trickIndex }];

  if (trick.plays.length < activeSeatCount(contract)) {
    return {
      hand: {
        ...hand,
        hands,
        currentTrick: trick,
        phase: { kind: 'play', toAct: nextActiveSeat(seat, contract) },
      },
      events,
    };
  }

  const winner = trickWinner(trick, contract.trump);
  const tricks = [...hand.tricks, { ...trick, winner }];
  events.push({ type: 'trickWon', seat: winner, trickIndex });
  const phase: HandState['phase'] =
    tricks.length === TRICKS_PER_HAND
      ? { kind: 'complete', result: scoreHand(contract, tricks, rules) }
      : { kind: 'play', toAct: winner };
  return { hand: { ...hand, hands, tricks, currentTrick: null, phase }, events };
}

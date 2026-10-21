// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The engine's public API — Technical Spec §4.5.
 *
 * `applyAction` checks every action against `legalActions` before
 * applying it, so there is no unchecked path for humans or bots. Hand
 * transitions are delegated to `bidding` and `play`; this module owns
 * dealing, the running score and the end of the game.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { sameAction, type Action } from './actions';
import { applyBid, applyDefendAlone, applyDiscard, biddingLegalActions } from './bidding';
import { deal, type Deal } from './deal';
import type { GameEvent, HandStep } from './events';
import { applyFarmerExchange, farmerLegalActions, farmerSeat } from './farmer';
import { applyPlay, playLegalActions } from './play';
import type { RuleSet } from './rules';
import { addResult, gameWinner } from './scoring';
import { leftOf, type Seat } from './seats';
import type { GameState, HandState } from './state';
import type { Rng } from '../util/rng';

export interface Applied {
  readonly ok: true;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export type RejectionReason = 'notYourTurn' | 'illegal' | 'gameOver';

export interface Rejection {
  readonly ok: false;
  readonly reason: RejectionReason;
}

function dealHand(dealer: Seat, rng: Rng, rules: RuleSet): HandState {
  return handFromDeal(deal(rng, dealer), dealer, rules);
}

/** A freshly dealt hand: bidding opens, unless a farmer's hand is offered its swap first. */
export function handFromDeal(
  { hands, kitty }: Pick<Deal, 'hands' | 'kitty'>,
  dealer: Seat,
  rules: RuleSet
): HandState {
  const farmer = farmerSeat(hands, dealer, rules);
  return {
    dealer,
    phase:
      farmer === null
        ? { kind: 'bidRound1', toAct: leftOf(dealer) }
        : { kind: 'farmer', seat: farmer },
    hands,
    kitty,
    farmerSwap: null,
    upcardStatus: 'faceUp',
    bids: [],
    contract: null,
    discard: null,
    tricks: [],
    currentTrick: null,
  };
}

function dealtEvent(state: GameState): GameEvent {
  return {
    type: 'handDealt',
    dealer: state.dealer,
    handNumber: state.handNumber,
    upcard: state.hand.kitty[0]!,
  };
}

export function newGame(rules: RuleSet, firstDealer: Seat, rng: Rng): Applied {
  const state: GameState = {
    rules,
    score: [0, 0],
    dealer: firstDealer,
    handNumber: 1,
    hand: dealHand(firstDealer, rng, rules),
    completedHands: [],
    winner: null,
  };
  return { ok: true, state, events: [dealtEvent(state)] };
}

/** Deal the next hand, passing the deal to the left. The current hand must be complete. */
export function dealNextHand(state: GameState, rng: Rng): Applied {
  if (state.hand.phase.kind !== 'complete') {
    throw new Error('Cannot deal the next hand before the current one is complete');
  }
  if (state.winner !== null) {
    throw new Error('Cannot deal after the game is over');
  }
  const dealer = leftOf(state.dealer);
  const next: GameState = {
    ...state,
    dealer,
    handNumber: state.handNumber + 1,
    hand: dealHand(dealer, rng, state.rules),
  };
  return { ok: true, state: next, events: [dealtEvent(next)] };
}

/** The seat that must act next, or `null` when the hand is complete. */
export function currentActor(state: GameState): Seat | null {
  const { phase } = state.hand;
  switch (phase.kind) {
    case 'farmer':
      return phase.seat;
    case 'bidRound1':
    case 'bidRound2':
    case 'defendAlone':
    case 'play':
      return phase.toAct;
    case 'dealerDiscard':
      return state.hand.dealer;
    case 'complete':
      return null;
  }
}

export function legalActions(state: GameState, seat: Seat): readonly Action[] {
  if (state.winner !== null) return [];
  switch (state.hand.phase.kind) {
    case 'farmer':
      return farmerLegalActions(state.hand, seat);
    case 'play':
      return playLegalActions(state.hand, seat);
    default:
      return biddingLegalActions(state.hand, state.rules, seat);
  }
}

export function applyAction(state: GameState, seat: Seat, action: Action): Applied | Rejection {
  if (state.winner !== null) return { ok: false, reason: 'gameOver' };
  if (currentActor(state) !== seat) return { ok: false, reason: 'notYourTurn' };
  if (!legalActions(state, seat).some((legal) => sameAction(legal, action))) {
    return { ok: false, reason: 'illegal' };
  }

  const step = stepHand(state, seat, action);
  return finishStep(state, step);
}

function stepHand(state: GameState, seat: Seat, action: Action): HandStep {
  switch (action.type) {
    case 'play':
      return applyPlay(state.hand, seat, action.card, state.rules);
    case 'discard':
      return applyDiscard(state.hand, action.card, state.rules);
    case 'farmerExchange':
      return applyFarmerExchange(state.hand, seat, action.cards);
    case 'defendAlone':
      return applyDefendAlone(state.hand, seat, action.accept);
    default:
      return applyBid(state.hand, seat, action, state.rules);
  }
}

/** Fold a completed hand into the score and detect the end of the game. */
function finishStep(state: GameState, step: HandStep): Applied {
  const { hand } = step;
  if (hand.phase.kind !== 'complete') {
    return { ok: true, state: { ...state, hand }, events: step.events };
  }
  const result = hand.phase.result;
  const score = addResult(state.score, result);
  const winner = gameWinner(score, state.rules);
  const events: GameEvent[] = [...step.events];
  if (result.kind === 'redeal') {
    events.push({ type: 'redeal', nextDealer: leftOf(state.dealer) });
  } else {
    events.push({ type: 'handScored', result, score });
  }
  if (winner !== null) events.push({ type: 'gameOver', winner, score });
  return {
    ok: true,
    state: {
      ...state,
      hand,
      score,
      winner,
      completedHands: [...state.completedHands, result],
    },
    events,
  };
}

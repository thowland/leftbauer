// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Bidding and the dealer's discard — RU-3, RU-4, RU-5.
 *
 * Round one: each seat from the dealer's left may order up the upcard
 * or pass. Round two: each seat may name any other suit or pass; four
 * passes cause a redeal unless stick the dealer is on.
 *
 * If the dealer's partner orders up alone, the dealer sits out: the
 * upcard is set aside rather than picked up, and there is no discard
 * (ADR-0004). With RU-14 on, going alone is the only way the dealer's
 * partner may order up.
 *
 * Once trump is set (and any discard made), defending alone (RU-13)
 * offers each defender in turn, from the maker's left, the chance to
 * play alone against the makers.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action, BidAction } from './actions';
import { SUITS, suitOf, type CardId } from './cards';
import type { GameEvent, HandStep } from './events';
import { startPlay } from './play';
import { dealerPartnerMustGoAloneActive, defendAloneActive, type RuleSet } from './rules';
import { leftOf, partnerOf, type Seat } from './seats';
import { upcardOf, withSeatCards, type Contract, type HandState } from './state';

function withLoners(rules: RuleSet, make: (alone: boolean) => BidAction): BidAction[] {
  return rules.lonersAllowed ? [make(false), make(true)] : [make(false)];
}

export function biddingLegalActions(hand: HandState, rules: RuleSet, seat: Seat): Action[] {
  const { phase } = hand;
  if (phase.kind === 'bidRound1' && phase.toAct === seat) {
    const orders = withLoners(rules, (alone) => ({ type: 'orderUp', alone }));
    const mustGoAlone = dealerPartnerMustGoAloneActive(rules) && seat === partnerOf(hand.dealer);
    return [...(mustGoAlone ? orders.filter((a) => a.type !== 'pass' && a.alone) : orders), PASS];
  }
  if (phase.kind === 'bidRound2' && phase.toAct === seat) {
    const refused = suitOf(upcardOf(hand));
    const calls = SUITS.filter((s) => s !== refused).flatMap((suit) =>
      withLoners(rules, (alone) => ({ type: 'callTrump', suit, alone }))
    );
    const stuck = rules.stickTheDealer && seat === hand.dealer;
    return stuck ? calls : [...calls, PASS];
  }
  if (phase.kind === 'dealerDiscard' && seat === hand.dealer) {
    return hand.hands[seat].map((card) => ({ type: 'discard', card }));
  }
  if (phase.kind === 'defendAlone' && phase.toAct === seat) {
    return [
      { type: 'defendAlone', accept: true },
      { type: 'defendAlone', accept: false },
    ];
  }
  return [];
}

const PASS: BidAction = { type: 'pass' };

/**
 * Trump is set and any discard made: ask the defenders about defending
 * alone if that rule is in play, otherwise begin play.
 */
function afterContract(hand: HandState, rules: RuleSet): HandState {
  if (!defendAloneActive(rules)) return startPlay(hand);
  return { ...hand, phase: { kind: 'defendAlone', toAct: leftOf(hand.contract!.maker) } };
}

/** Apply a defender's answer, already checked as legal (RU-13). */
export function applyDefendAlone(hand: HandState, seat: Seat, accept: boolean): HandStep {
  const events: GameEvent[] = [{ type: 'defendAloneChosen', seat, accept }];
  const contract = hand.contract!;
  if (accept) {
    return { hand: startPlay({ ...hand, contract: { ...contract, loneDefender: seat } }), events };
  }
  // The second defender is the one across from the first, to the maker's right.
  const second = partnerOf(leftOf(contract.maker));
  if (seat !== second) {
    return { hand: { ...hand, phase: { kind: 'defendAlone', toAct: second } }, events };
  }
  return { hand: startPlay(hand), events };
}

/** Apply a bid already checked as legal. */
export function applyBid(hand: HandState, seat: Seat, action: BidAction, rules: RuleSet): HandStep {
  const round = hand.phase.kind === 'bidRound1' ? 1 : 2;
  const bids = [...hand.bids, { seat, round, action } as const];
  const events: GameEvent[] = [{ type: 'bidMade', seat, round, action }];
  const next = { ...hand, bids };

  if (action.type === 'pass') {
    if (seat !== hand.dealer) {
      const kind = round === 1 ? 'bidRound1' : 'bidRound2';
      return { hand: { ...next, phase: { kind, toAct: leftOf(seat) } }, events };
    }
    if (round === 1) {
      events.push({ type: 'upcardTurnedDown', dealer: hand.dealer });
      return {
        hand: {
          ...next,
          upcardStatus: 'turnedDown',
          phase: { kind: 'bidRound2', toAct: leftOf(hand.dealer) },
        },
        events,
      };
    }
    return { hand: { ...next, phase: { kind: 'complete', result: { kind: 'redeal' } } }, events };
  }

  const trump = action.type === 'orderUp' ? suitOf(upcardOf(hand)) : action.suit;
  const contract: Contract = {
    trump,
    maker: seat,
    round,
    alone: action.alone,
    loneDefender: null,
  };
  events.push({ type: 'trumpSet', contract });
  const withContract = { ...next, contract };

  if (action.type === 'callTrump') {
    return { hand: afterContract(withContract, rules), events };
  }
  if (contract.alone && seat === partnerOf(hand.dealer)) {
    events.push({ type: 'upcardSetAside', dealer: hand.dealer });
    return { hand: afterContract({ ...withContract, upcardStatus: 'setAside' }, rules), events };
  }
  events.push({ type: 'upcardPickedUp', dealer: hand.dealer });
  const hands = withSeatCards(hand.hands, hand.dealer, [
    ...hand.hands[hand.dealer],
    upcardOf(hand),
  ]);
  return {
    hand: { ...withContract, hands, upcardStatus: 'pickedUp', phase: { kind: 'dealerDiscard' } },
    events,
  };
}

/** Apply the dealer's discard, already checked as legal, and move on towards play. */
export function applyDiscard(hand: HandState, card: CardId, rules: RuleSet): HandStep {
  const dealerCards = hand.hands[hand.dealer].filter((c) => c !== card);
  const hands = withSeatCards(hand.hands, hand.dealer, dealerCards);
  return {
    hand: afterContract({ ...hand, hands, discard: card }, rules),
    events: [{ type: 'dealerDiscarded', dealer: hand.dealer }],
  };
}

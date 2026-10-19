/**
 * Bidding and the dealer's discard — RU-3, RU-4, RU-5.
 *
 * Round one: each seat from the dealer's left may order up the upcard
 * or pass. Round two: each seat may name any other suit or pass; four
 * passes cause a redeal unless stick the dealer is on.
 *
 * If the dealer's partner orders up alone, the dealer sits out: the
 * upcard is set aside rather than picked up, and there is no discard
 * (ADR-0004).
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action, BidAction } from './actions';
import { SUITS, suitOf, type CardId } from './cards';
import type { GameEvent, HandStep } from './events';
import { startPlay } from './play';
import type { RuleSet } from './rules';
import { leftOf, partnerOf, type Seat } from './seats';
import { upcardOf, withSeatCards, type Contract, type HandState } from './state';

function withLoners(rules: RuleSet, make: (alone: boolean) => BidAction): BidAction[] {
  return rules.lonersAllowed ? [make(false), make(true)] : [make(false)];
}

export function biddingLegalActions(hand: HandState, rules: RuleSet, seat: Seat): Action[] {
  const { phase } = hand;
  if (phase.kind === 'bidRound1' && phase.toAct === seat) {
    return [...withLoners(rules, (alone) => ({ type: 'orderUp', alone })), { type: 'pass' }];
  }
  if (phase.kind === 'bidRound2' && phase.toAct === seat) {
    const refused = suitOf(upcardOf(hand));
    const calls = SUITS.filter((s) => s !== refused).flatMap((suit) =>
      withLoners(rules, (alone) => ({ type: 'callTrump', suit, alone }))
    );
    const stuck = rules.stickTheDealer && seat === hand.dealer;
    return stuck ? calls : [...calls, { type: 'pass' }];
  }
  if (phase.kind === 'dealerDiscard' && seat === hand.dealer) {
    return hand.hands[seat].map((card) => ({ type: 'discard', card }));
  }
  return [];
}

/** Apply a bid already checked as legal. */
export function applyBid(hand: HandState, seat: Seat, action: BidAction): HandStep {
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
  const contract: Contract = { trump, maker: seat, round, alone: action.alone };
  events.push({ type: 'trumpSet', contract });
  const withContract = { ...next, contract };

  if (action.type === 'callTrump') {
    return { hand: startPlay(withContract), events };
  }
  if (contract.alone && seat === partnerOf(hand.dealer)) {
    events.push({ type: 'upcardSetAside', dealer: hand.dealer });
    return { hand: startPlay({ ...withContract, upcardStatus: 'setAside' }), events };
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

/** Apply the dealer's discard, already checked as legal, and begin play. */
export function applyDiscard(hand: HandState, card: CardId): HandStep {
  const dealerCards = hand.hands[hand.dealer].filter((c) => c !== card);
  const hands = withSeatCards(hand.hands, hand.dealer, dealerCards);
  return {
    hand: startPlay({ ...hand, hands, discard: card }),
    events: [{ type: 'dealerDiscarded', dealer: hand.dealer }],
  };
}

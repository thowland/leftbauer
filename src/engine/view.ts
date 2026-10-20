/**
 * Player views — Technical Spec §4.6.
 *
 * The information visible from one seat. It is the only input a bot or
 * the coach ever receives, and what the UI renders for the human. It
 * never contains another seat's cards, the unseen kitty, (except to the
 * dealer) the dealer's discard, or (except to the farmer) the cards
 * swapped for a farmer's hand.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { CardId } from './cards';
import { currentActor } from './game';
import { sittingOut } from './play';
import type { RuleSet } from './rules';
import type { Seat } from './seats';
import {
  upcardOf,
  type BidEntry,
  type Contract,
  type GameState,
  type HandPhase,
  type HandResult,
  type Score,
  type Trick,
  type UpcardStatus,
} from './state';

export interface PlayerView {
  readonly seat: Seat;
  readonly rules: RuleSet;
  readonly score: Score;
  readonly dealer: Seat;
  readonly handNumber: number;
  readonly phase: HandPhase['kind'];
  readonly toAct: Seat | null;
  readonly myHand: readonly CardId[];
  /** Public: it was turned face up for everyone to see. */
  readonly upcard: CardId;
  readonly upcardStatus: UpcardStatus;
  /** Only when this seat is the dealer and has discarded. */
  readonly myDiscard: CardId | null;
  readonly handSizes: readonly [number, number, number, number];
  readonly bids: readonly BidEntry[];
  readonly contract: Contract | null;
  readonly tricks: readonly Trick[];
  readonly currentTrick: Trick | null;
  /** The partners of a lone maker and of a lone defender. */
  readonly sittingOut: readonly Seat[];
  /** Only when this seat swapped a farmer's hand: the three cards it gave up. */
  readonly myFarmerSwap: readonly CardId[] | null;
  /** Set once the hand is over. */
  readonly result: HandResult | null;
  readonly gameWinner: GameState['winner'];
}

export function toPlayerView(state: GameState, seat: Seat): PlayerView {
  const { hand } = state;
  return {
    seat,
    rules: state.rules,
    score: state.score,
    dealer: hand.dealer,
    handNumber: state.handNumber,
    phase: hand.phase.kind,
    toAct: currentActor(state),
    myHand: hand.hands[seat],
    upcard: upcardOf(hand),
    upcardStatus: hand.upcardStatus,
    myDiscard: seat === hand.dealer ? hand.discard : null,
    handSizes: [
      hand.hands[0].length,
      hand.hands[1].length,
      hand.hands[2].length,
      hand.hands[3].length,
    ],
    bids: hand.bids,
    contract: hand.contract,
    tricks: hand.tricks,
    currentTrick: hand.currentTrick,
    sittingOut: sittingOut(hand.contract),
    myFarmerSwap: hand.farmerSwap?.seat === seat ? hand.farmerSwap.gave : null,
    result: hand.phase.kind === 'complete' ? hand.phase.result : null,
    gameWinner: state.winner,
  };
}

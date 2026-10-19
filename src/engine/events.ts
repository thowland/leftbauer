/**
 * Game events — Technical Spec §4.7.
 *
 * Emitted by the engine as it applies actions. Events carry only public
 * information, so they are safe to show to every seat.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BidAction } from './actions';
import type { CardId } from './cards';
import type { Seat, Team } from './seats';
import type { Contract, HandResult, HandState, Score } from './state';

export type GameEvent =
  | {
      readonly type: 'handDealt';
      readonly dealer: Seat;
      readonly handNumber: number;
      readonly upcard: CardId;
    }
  | {
      readonly type: 'bidMade';
      readonly seat: Seat;
      readonly round: 1 | 2;
      readonly action: BidAction;
    }
  | { readonly type: 'trumpSet'; readonly contract: Contract }
  | { readonly type: 'upcardPickedUp'; readonly dealer: Seat }
  | { readonly type: 'upcardTurnedDown'; readonly dealer: Seat }
  | { readonly type: 'upcardSetAside'; readonly dealer: Seat }
  | { readonly type: 'dealerDiscarded'; readonly dealer: Seat }
  | {
      readonly type: 'cardPlayed';
      readonly seat: Seat;
      readonly card: CardId;
      readonly trickIndex: number;
    }
  | { readonly type: 'trickWon'; readonly seat: Seat; readonly trickIndex: number }
  | { readonly type: 'handScored'; readonly result: HandResult; readonly score: Score }
  | { readonly type: 'redeal'; readonly nextDealer: Seat }
  | { readonly type: 'gameOver'; readonly winner: Team; readonly score: Score };

/** The result of applying one action to a hand. */
export interface HandStep {
  readonly hand: HandState;
  readonly events: readonly GameEvent[];
}

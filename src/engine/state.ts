/**
 * Game and hand state — Technical Spec §4.3.
 *
 * Immutable, JSON-serializable values. Only engine functions construct
 * or transform them.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BidAction } from './actions';
import type { CardId, Suit } from './cards';
import type { Hands } from './deal';
import type { RuleSet } from './rules';
import type { Seat, Team } from './seats';

export type Score = readonly [number, number];

export type UpcardStatus =
  /** Round one: still on offer. */
  | 'faceUp'
  /** Ordered up; the dealer took it into their hand. */
  | 'pickedUp'
  /** Refused in round one; its suit cannot be named in round two. */
  | 'turnedDown'
  /** Ordered up by the dealer's partner going alone: the dealer sits out and never takes it. */
  | 'setAside';

export interface BidEntry {
  readonly seat: Seat;
  readonly round: 1 | 2;
  readonly action: BidAction;
}

export interface Contract {
  readonly trump: Suit;
  readonly maker: Seat;
  readonly round: 1 | 2;
  readonly alone: boolean;
}

export interface TrickPlay {
  readonly seat: Seat;
  readonly card: CardId;
}

export interface Trick {
  readonly leader: Seat;
  readonly plays: readonly TrickPlay[];
  /** Set once every active seat has played. */
  readonly winner: Seat | null;
}

export type HandOutcome =
  'made' | 'march' | 'lonerMade' | 'lonerSweep' | 'euchred' | 'euchredAlone';

export type HandResult =
  | {
      readonly kind: 'scored';
      readonly makers: Team;
      readonly tricksWon: Score;
      readonly outcome: HandOutcome;
      readonly points: number;
      readonly pointsTo: Team;
    }
  | { readonly kind: 'redeal' };

export type HandPhase =
  | { readonly kind: 'bidRound1'; readonly toAct: Seat }
  | { readonly kind: 'dealerDiscard' }
  | { readonly kind: 'bidRound2'; readonly toAct: Seat }
  | { readonly kind: 'play'; readonly toAct: Seat }
  | { readonly kind: 'complete'; readonly result: HandResult };

export interface HandState {
  readonly dealer: Seat;
  readonly phase: HandPhase;
  readonly hands: Hands;
  /**
   * The four undealt cards as dealt; `kitty[0]` is the upcard. Never
   * changes: a picked-up upcard is also in the dealer's hand.
   */
  readonly kitty: readonly CardId[];
  readonly upcardStatus: UpcardStatus;
  readonly bids: readonly BidEntry[];
  readonly contract: Contract | null;
  /** The dealer's discard, hidden from every other seat. */
  readonly discard: CardId | null;
  readonly tricks: readonly Trick[];
  readonly currentTrick: Trick | null;
}

export interface GameState {
  readonly rules: RuleSet;
  readonly score: Score;
  readonly dealer: Seat;
  readonly handNumber: number;
  readonly hand: HandState;
  readonly completedHands: readonly HandResult[];
  readonly winner: Team | null;
}

/** The upcard: the first card of the kitty as dealt. */
export function upcardOf(hand: HandState): CardId {
  return hand.kitty[0]!;
}

/** A copy of `hands` with one seat's cards replaced. */
export function withSeatCards(hands: Hands, seat: Seat, cards: readonly CardId[]): Hands {
  return [0, 1, 2, 3].map((s) => (s === seat ? cards : hands[s as Seat])) as unknown as Hands;
}

/**
 * Hand evaluation — Technical Spec §6.6.
 *
 * `expectedTricks` estimates how many tricks a hand is worth with a given
 * trump. The v1 evaluator is a heuristic point count; it sits behind an
 * interface so a simulation-backed evaluator can replace it.
 *
 * Pure module: no DOM, no React, no storage.
 */

import {
  effectiveSuit,
  isLeftBower,
  isRightBower,
  rankOf,
  SUITS,
  suitOf,
  type CardId,
  type Rank,
  type Suit,
} from '../engine/cards';
import type { Rng } from '../util/rng';

/** Who ends up with the upcard if this suit is made trump in round one. */
export type UpcardTaker = 'me' | 'partner' | 'opponent' | null;

export interface EvaluationContext {
  readonly upcard: CardId | null;
  readonly taker: UpcardTaker;
}

export interface HandEvaluator {
  expectedTricks(hand: readonly CardId[], trump: Suit, context: EvaluationContext): number;
}

const TRUMP_VALUE: Record<Rank, number> = { A: 0.75, K: 0.6, Q: 0.45, T: 0.35, '9': 0.3, J: 0 };
const RIGHT_BOWER = 1.0;
const LEFT_BOWER = 0.9;
const OFF_ACE = 0.65;
const OFF_KING_WITH_ACE = 0.35;
const OFF_KING_SINGLETON = 0.15;
const TRUMP_LENGTH_BONUS = 0.2; // each trump beyond two
const VOID_BONUS = 0.25; // each off-suit void, given two or more trump
/** How much an upcard is worth to the side that gets it, relative to holding it. */
const UPCARD_TO_PARTNER = 0.5;
const UPCARD_TO_OPPONENT = 0.4;

/** The value of one card in a hand, with `trump` as trump. */
export function cardValue(card: CardId, trump: Suit, hand: readonly CardId[]): number {
  if (isRightBower(card, trump)) return RIGHT_BOWER;
  if (isLeftBower(card, trump)) return LEFT_BOWER;
  const suit = suitOf(card);
  if (suit === trump) return TRUMP_VALUE[rankOf(card)];
  const sameSuit = hand.filter((c) => effectiveSuit(c, trump) === suit);
  switch (rankOf(card)) {
    case 'A':
      return OFF_ACE;
    case 'K':
      if (sameSuit.some((c) => rankOf(c) === 'A')) return OFF_KING_WITH_ACE;
      return sameSuit.length === 1 ? OFF_KING_SINGLETON : 0;
    default:
      return 0;
  }
}

function handValue(hand: readonly CardId[], trump: Suit): number {
  const trumps = hand.filter((c) => effectiveSuit(c, trump) === trump).length;
  let value = hand.reduce((sum, c) => sum + cardValue(c, trump, hand), 0);
  value += Math.max(0, trumps - 2) * TRUMP_LENGTH_BONUS;
  if (trumps >= 2) {
    const voids = SUITS.filter(
      (s) => s !== trump && !hand.some((c) => effectiveSuit(c, trump) === s)
    ).length;
    value += voids * VOID_BONUS;
  }
  return Math.min(5, value);
}

export class HeuristicEvaluator implements HandEvaluator {
  expectedTricks(hand: readonly CardId[], trump: Suit, context: EvaluationContext): number {
    const { upcard, taker } = context;
    if (upcard === null || taker === null) return handValue(hand, trump);
    if (taker === 'me') {
      // The dealer picks up and discards: value the best five of six.
      const six = [...hand, upcard];
      return Math.max(
        ...six.map((_, i) =>
          handValue(
            six.filter((__, j) => j !== i),
            trump
          )
        )
      );
    }
    const upcardValue = cardValue(upcard, trump, [upcard]);
    const base = handValue(hand, trump);
    return taker === 'partner'
      ? Math.min(5, base + upcardValue * UPCARD_TO_PARTNER)
      : Math.max(0, base - upcardValue * UPCARD_TO_OPPONENT);
  }
}

/** Casual play: the same evaluation, blurred by up to ±`noise` tricks. */
export class NoisyEvaluator implements HandEvaluator {
  constructor(
    private readonly base: HandEvaluator,
    private readonly noise: number,
    private readonly rng: Rng
  ) {}

  expectedTricks(hand: readonly CardId[], trump: Suit, context: EvaluationContext): number {
    const jitter = ((this.rng.nextInt(2001) - 1000) / 1000) * this.noise;
    return this.base.expectedTricks(hand, trump, context) + jitter;
  }
}

/**
 * Shuffling and dealing — RU-1, RU-2; Technical Spec §4.5.
 *
 * The deck is shuffled with Fisher–Yates over an injected {@link Rng},
 * then dealt in the conventional packets of 3-2 / 2-3 starting left of
 * the dealer. Because the shuffle is uniform, the packet pattern does
 * not affect the distribution of hands; the packets are kept so the
 * deal animation can show them.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Rng } from '../util/rng';
import { ALL_CARDS, type CardId } from './cards';
import { leftOf, seatsFrom, type Seat } from './seats';

export type Hands = readonly [CardId[], CardId[], CardId[], CardId[]];

export interface DealPacket {
  readonly seat: Seat;
  readonly cards: readonly CardId[];
}

export interface Deal {
  /** Five cards per seat, indexed by seat. */
  readonly hands: Hands;
  /** Four cards; `kitty[0]` is the upcard. */
  readonly kitty: readonly CardId[];
  /** The deal in the order the cards left the dealer's hands. */
  readonly packets: readonly DealPacket[];
}

/** Packet sizes per round, starting with the seat left of the dealer. */
export const DEAL_PATTERN: readonly (readonly number[])[] = [
  [3, 2, 3, 2],
  [2, 3, 2, 3],
];

/** A uniformly shuffled copy of `items` (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function shuffledDeck(rng: Rng): CardId[] {
  return shuffle(ALL_CARDS, rng);
}

/** Deal an already-ordered deck. The deck must hold all 24 cards. */
export function dealFrom(deck: readonly CardId[], dealer: Seat): Deal {
  if (deck.length !== ALL_CARDS.length) {
    throw new RangeError(`A Euchre deck has ${ALL_CARDS.length} cards, got ${deck.length}`);
  }
  const hands: Hands = [[], [], [], []];
  const packets: DealPacket[] = [];
  const order = seatsFrom(leftOf(dealer));
  let next = 0;
  for (const round of DEAL_PATTERN) {
    round.forEach((size, i) => {
      const seat = order[i]!;
      const cards = deck.slice(next, next + size);
      next += size;
      hands[seat].push(...cards);
      packets.push({ seat, cards });
    });
  }
  return { hands, kitty: deck.slice(next), packets };
}

export function deal(rng: Rng, dealer: Seat): Deal {
  return dealFrom(shuffledDeck(rng), dealer);
}

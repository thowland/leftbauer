/**
 * Asset manifest — Technical Spec §9.5.
 *
 * Components ask the manifest how to present a card rather than
 * hard-coding art. v1 card faces are drawn in code from this data, so
 * replacing them with an illustrated deck later is a manifest change.
 *
 * Pure module: plain data and lookups.
 */

import { rankOf, suitOf, type CardId, type Rank, type Suit } from '../engine/cards';

export type DeckVariant = 'standard' | 'fourColor';

export const SUIT_NAMES: Record<Suit, string> = {
  C: 'clubs',
  D: 'diamonds',
  H: 'hearts',
  S: 'spades',
};

export const RANK_NAMES: Record<Rank, string> = {
  '9': 'Nine',
  T: 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
  A: 'Ace',
};

/** The index printed in a card's corner. */
export const RANK_LABELS: Record<Rank, string> = {
  '9': '9',
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

/** CSS custom property holding each suit's ink, per deck variant (VP-3). */
const SUIT_COLOR_TOKENS: Record<DeckVariant, Record<Suit, string>> = {
  standard: {
    C: '--suit-black',
    S: '--suit-black',
    D: '--suit-red',
    H: '--suit-red',
  },
  fourColor: {
    C: '--suit-green',
    S: '--suit-black',
    D: '--suit-blue',
    H: '--suit-red',
  },
};

export function suitColor(suit: Suit, variant: DeckVariant): string {
  return `var(${SUIT_COLOR_TOKENS[variant][suit]})`;
}

/** The accessible name of a card, e.g. "Jack of hearts". */
export function cardLabel(card: CardId): string {
  return `${RANK_NAMES[rankOf(card)]} of ${SUIT_NAMES[suitOf(card)]}`;
}

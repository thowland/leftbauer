/**
 * Cards, suits and trump semantics — Technical Spec §4.1.
 *
 * This is the only module that decides what suit a card belongs to once
 * trump is known. The left bower (the jack of the same color as trump)
 * leaves its printed suit and becomes trump (RU-6); everything else in
 * the codebase asks {@link effectiveSuit} rather than reading the
 * printed suit.
 *
 * Pure module: no DOM, no React, no storage.
 */

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type CardId = `${Rank}${Suit}`;
export type Color = 'black' | 'red';

/** Display order of suits when no trump is set: alternating colors. */
export const SUITS: readonly Suit[] = ['S', 'H', 'C', 'D'];
export const RANKS: readonly Rank[] = ['9', 'T', 'J', 'Q', 'K', 'A'];

/** The 24-card Euchre deck, in a fixed canonical order (RU-1). */
export const ALL_CARDS: readonly CardId[] = SUITS.flatMap((s) => RANKS.map((r) => cardId(r, s)));

export function cardId(rank: Rank, suit: Suit): CardId {
  return `${rank}${suit}`;
}

export function rankOf(card: CardId): Rank {
  return card[0] as Rank;
}

export function suitOf(card: CardId): Suit {
  return card[1] as Suit;
}

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && (ALL_CARDS as readonly string[]).includes(value);
}

export function colorOf(suit: Suit): Color {
  return suit === 'H' || suit === 'D' ? 'red' : 'black';
}

export function sameColor(a: Suit, b: Suit): boolean {
  return colorOf(a) === colorOf(b);
}

/** The other suit of the same color: the left bower's printed suit. */
export function sisterSuit(suit: Suit): Suit {
  const sisters: Record<Suit, Suit> = { C: 'S', S: 'C', D: 'H', H: 'D' };
  return sisters[suit];
}

export function isRightBower(card: CardId, trump: Suit): boolean {
  return card === cardId('J', trump);
}

export function isLeftBower(card: CardId, trump: Suit): boolean {
  return card === cardId('J', sisterSuit(trump));
}

/** The suit a card plays as. With no trump set, the printed suit. */
export function effectiveSuit(card: CardId, trump: Suit | null): Suit {
  if (trump !== null && isLeftBower(card, trump)) return trump;
  return suitOf(card);
}

const PLAIN_ORDER: Record<Rank, number> = { '9': 1, T: 2, J: 3, Q: 4, K: 5, A: 6 };
const TRUMP_ORDER: Record<Rank, number> = { '9': 1, T: 2, Q: 3, K: 4, A: 5, J: 0 };
const TRUMP_BASE = 10;
const LEFT_BOWER_RANK = TRUMP_BASE + 6;
const RIGHT_BOWER_RANK = TRUMP_BASE + 7;

/**
 * Strength of a card within a trick. Higher wins. Returns 0 for a card
 * that cannot win: neither trump nor of the led (effective) suit.
 */
export function trickRank(card: CardId, led: Suit, trump: Suit): number {
  if (isRightBower(card, trump)) return RIGHT_BOWER_RANK;
  if (isLeftBower(card, trump)) return LEFT_BOWER_RANK;
  const suit = suitOf(card);
  if (suit === trump) return TRUMP_BASE + TRUMP_ORDER[rankOf(card)];
  if (suit === led) return PLAIN_ORDER[rankOf(card)];
  return 0;
}

/**
 * Sort a hand for display (UI-4): grouped by effective suit with trump
 * first, the remaining suits alternating colors, and each group from
 * strongest to weakest.
 */
export function sortHand(cards: readonly CardId[], trump: Suit | null): CardId[] {
  const order = suitDisplayOrder(trump);
  const strength = (c: CardId): number => {
    const suit = effectiveSuit(c, trump);
    return trump === null ? PLAIN_ORDER[rankOf(c)] : trickRank(c, suit, trump);
  };
  return [...cards].sort((a, b) => {
    const bySuit = order.indexOf(effectiveSuit(a, trump)) - order.indexOf(effectiveSuit(b, trump));
    return bySuit !== 0 ? bySuit : strength(b) - strength(a);
  });
}

function suitDisplayOrder(trump: Suit | null): readonly Suit[] {
  if (trump === null) return SUITS;
  const start = SUITS.indexOf(trump);
  return [0, 1, 2, 3].map((i) => SUITS[(start + i) % 4]!);
}

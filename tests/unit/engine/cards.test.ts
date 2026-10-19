import { describe, expect, it } from 'vitest';
import {
  ALL_CARDS,
  cardId,
  colorOf,
  effectiveSuit,
  isCardId,
  isLeftBower,
  isRightBower,
  rankOf,
  sameColor,
  sisterSuit,
  sortHand,
  suitOf,
  SUITS,
  trickRank,
  type CardId,
  type Suit,
} from '../../../src/engine/cards';

describe('deck', () => {
  it('has 24 distinct cards, 9 through Ace in four suits', () => {
    expect(ALL_CARDS).toHaveLength(24);
    expect(new Set(ALL_CARDS).size).toBe(24);
    for (const suit of SUITS) {
      expect(ALL_CARDS.filter((c) => suitOf(c) === suit)).toHaveLength(6);
    }
  });

  it('round-trips rank and suit', () => {
    for (const card of ALL_CARDS) {
      expect(cardId(rankOf(card), suitOf(card))).toBe(card);
    }
  });

  it('recognizes valid card ids', () => {
    expect(isCardId('JH')).toBe(true);
    expect(isCardId('8H')).toBe(false);
    expect(isCardId('JX')).toBe(false);
    expect(isCardId(42)).toBe(false);
  });
});

describe('colors', () => {
  it('assigns red and black', () => {
    expect(colorOf('H')).toBe('red');
    expect(colorOf('D')).toBe('red');
    expect(colorOf('S')).toBe('black');
    expect(colorOf('C')).toBe('black');
  });

  it('pairs each suit with its same-color sister', () => {
    const pairs: [Suit, Suit][] = [
      ['H', 'D'],
      ['D', 'H'],
      ['S', 'C'],
      ['C', 'S'],
    ];
    for (const [a, b] of pairs) {
      expect(sisterSuit(a)).toBe(b);
      expect(sameColor(a, b)).toBe(true);
    }
    expect(sameColor('H', 'S')).toBe(false);
  });
});

describe('bowers (RU-6)', () => {
  it('identifies the right bower as the jack of trump', () => {
    expect(isRightBower('JH', 'H')).toBe(true);
    expect(isRightBower('JD', 'H')).toBe(false);
  });

  it('identifies the left bower as the jack of the same color', () => {
    expect(isLeftBower('JD', 'H')).toBe(true);
    expect(isLeftBower('JC', 'S')).toBe(true);
    expect(isLeftBower('JS', 'H')).toBe(false);
    expect(isLeftBower('JH', 'H')).toBe(false);
  });

  it('treats the left bower as trump for following suit', () => {
    expect(effectiveSuit('JD', 'H')).toBe('H');
    expect(effectiveSuit('JD', 'S')).toBe('D');
    expect(effectiveSuit('JD', null)).toBe('D');
    expect(effectiveSuit('AD', 'H')).toBe('D');
  });
});

describe('trickRank', () => {
  const trump: Suit = 'H';

  it('ranks trump: right, left, A, K, Q, 10, 9', () => {
    const order: CardId[] = ['JH', 'JD', 'AH', 'KH', 'QH', 'TH', '9H'];
    const ranks = order.map((c) => trickRank(c, 'S', trump));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]!).toBeGreaterThan(ranks[i]!);
    }
  });

  it('ranks any trump above any card of the led suit', () => {
    expect(trickRank('9H', 'S', trump)).toBeGreaterThan(trickRank('AS', 'S', trump));
  });

  it('ranks the led suit A, K, Q, J, 10, 9', () => {
    const order: CardId[] = ['AS', 'KS', 'QS', 'JS', 'TS', '9S'];
    const ranks = order.map((c) => trickRank(c, 'S', trump));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]!).toBeGreaterThan(ranks[i]!);
    }
  });

  it('gives off-suit, non-trump cards no chance to win', () => {
    expect(trickRank('AC', 'S', trump)).toBe(0);
  });

  it('never ranks the left bower as its printed suit', () => {
    // Diamonds led, hearts trump: the jack of diamonds is trump, not a diamond.
    expect(trickRank('JD', 'D', 'H')).toBeGreaterThan(trickRank('AH', 'D', 'H'));
    expect(trickRank('JD', 'D', 'H')).toBeGreaterThan(trickRank('AD', 'D', 'H'));
  });

  it('gives every card a distinct rank within a trick', () => {
    for (const t of SUITS) {
      for (const led of SUITS) {
        const ranks = ALL_CARDS.map((c) => trickRank(c, led, t)).filter((r) => r > 0);
        expect(new Set(ranks).size).toBe(ranks.length);
      }
    }
  });
});

describe('sortHand (UI-4)', () => {
  it('groups by suit with alternating colors and no trump', () => {
    expect(sortHand(['9D', 'AS', 'KH', 'TC', 'QS'], null)).toEqual(['AS', 'QS', 'KH', 'TC', '9D']);
  });

  it('puts trump first, with the left bower among trump', () => {
    // Hearts trump: JH, JD, AH lead; then C, D, S keep colors alternating.
    expect(sortHand(['AD', 'JD', 'AH', 'KS', 'JH'], 'H')).toEqual(['JH', 'JD', 'AH', 'AD', 'KS']);
  });

  it('does not mutate its input', () => {
    const hand: CardId[] = ['9D', 'AS'];
    sortHand(hand, null);
    expect(hand).toEqual(['9D', 'AS']);
  });
});

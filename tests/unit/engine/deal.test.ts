import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../../../src/engine/cards';
import { deal, dealFrom, DEAL_PATTERN, shuffle, shuffledDeck } from '../../../src/engine/deal';
import { SEATS } from '../../../src/engine/seats';
import { seededRng } from '../../../src/util/rng';

describe('shuffle', () => {
  it('returns a permutation without mutating its input', () => {
    const input = [...ALL_CARDS];
    const out = shuffle(input, seededRng(1));
    expect(input).toEqual(ALL_CARDS);
    expect([...out].sort()).toEqual([...ALL_CARDS].sort());
  });

  it('is deterministic under a seeded rng', () => {
    expect(shuffledDeck(seededRng(9))).toEqual(shuffledDeck(seededRng(9)));
  });

  it('places every card in every position uniformly (RU-2, chi-squared)', () => {
    const rng = seededRng(2026);
    const n = 24 * 1000;
    const counts = ALL_CARDS.map(() => new Array<number>(24).fill(0));
    for (let i = 0; i < n; i++) {
      shuffledDeck(rng).forEach((card, pos) => {
        counts[ALL_CARDS.indexOf(card)]![pos]!++;
      });
    }
    const expected = n / 24;
    for (const row of counts) {
      const chi2 = row.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
      // df = 23; p = 0.0001 critical value ≈ 56
      expect(chi2).toBeLessThan(56);
    }
  });
});

describe('dealFrom', () => {
  it('gives five cards to each seat and four to the kitty', () => {
    const d = dealFrom(ALL_CARDS, 0);
    for (const seat of SEATS) expect(d.hands[seat]).toHaveLength(5);
    expect(d.kitty).toHaveLength(4);
    const all = [...d.hands.flat(), ...d.kitty];
    expect(new Set(all).size).toBe(24);
  });

  it('deals 3-2-3-2 then 2-3-2-3, starting left of the dealer', () => {
    const d = dealFrom(ALL_CARDS, 3);
    expect(d.packets.map((p) => p.seat)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(d.packets.map((p) => p.cards.length)).toEqual(DEAL_PATTERN.flat());
    expect(d.hands[0]).toEqual([...ALL_CARDS.slice(0, 3), ...ALL_CARDS.slice(10, 12)]);
  });

  it('turns up the first remaining card', () => {
    const d = dealFrom(ALL_CARDS, 0);
    expect(d.kitty[0]).toBe(ALL_CARDS[20]);
  });

  it('rejects a short deck', () => {
    expect(() => dealFrom(ALL_CARDS.slice(1), 0)).toThrow(RangeError);
  });
});

describe('deal', () => {
  it('shuffles then deals', () => {
    const d = deal(seededRng(5), 1);
    expect(d.packets[0]!.seat).toBe(2);
    expect([...d.hands.flat(), ...d.kitty].sort()).toEqual([...ALL_CARDS].sort());
  });
});

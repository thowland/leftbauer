import { describe, expect, it } from 'vitest';
import { ALL_CARDS, SUITS } from '../../../src/engine/cards';
import { cardLabel, suitColor } from '../../../src/assets/manifest';

describe('asset manifest', () => {
  it('names every card', () => {
    expect(cardLabel('JD')).toBe('Jack of diamonds');
    expect(cardLabel('TC')).toBe('Ten of clubs');
    expect(new Set(ALL_CARDS.map(cardLabel)).size).toBe(24);
  });

  it('uses two inks in the standard deck', () => {
    expect(new Set(SUITS.map((s) => suitColor(s, 'standard')))).toEqual(
      new Set(['var(--suit-black)', 'var(--suit-red)'])
    );
  });

  it('gives every suit its own ink in the four-color deck (VP-3)', () => {
    expect(new Set(SUITS.map((s) => suitColor(s, 'fourColor'))).size).toBe(4);
  });
});

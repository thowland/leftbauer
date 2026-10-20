import { describe, expect, it } from 'vitest';
import { ALL_CARDS, SUITS } from '../../../src/engine/cards';
import { cardLabel, CREDITS, SOUNDS, suitColor } from '../../../src/assets/manifest';

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

  it('ships a file for every sound, at a sane gain (SA-2)', () => {
    const shipped = Object.keys(import.meta.glob('/public/sounds/*'));
    for (const { file, gain } of Object.values(SOUNDS)) {
      expect(shipped).toContain(`/public/${file}`);
      expect(gain).toBeGreaterThan(0);
      expect(gain).toBeLessThanOrEqual(1);
    }
  });

  it('credits every asset source (VP-2)', () => {
    expect(CREDITS.length).toBeGreaterThan(0);
    for (const credit of CREDITS) expect(credit.licenseUrl).toMatch(/^https:/);
  });
});

import { describe, expect, it } from 'vitest';
import { leftOf, partnerOf, SEATS, seatsFrom, teamOf } from '../../../src/engine/seats';

describe('seats', () => {
  it('puts partners across the table on the same team', () => {
    for (const seat of SEATS) {
      expect(teamOf(partnerOf(seat))).toBe(teamOf(seat));
      expect(partnerOf(partnerOf(seat))).toBe(seat);
    }
    expect(teamOf(0)).toBe(0);
    expect(teamOf(1)).toBe(1);
  });

  it('moves clockwise and wraps', () => {
    expect(leftOf(0)).toBe(1);
    expect(leftOf(3)).toBe(0);
    expect(teamOf(leftOf(0))).not.toBe(teamOf(0));
  });

  it('lists seats clockwise from a starting seat', () => {
    expect(seatsFrom(2)).toEqual([2, 3, 0, 1]);
  });
});

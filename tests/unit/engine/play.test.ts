import { describe, expect, it } from 'vitest';
import {
  activeSeatCount,
  firstActiveFrom,
  ledSuit,
  legalPlays,
  nextActiveSeat,
  sittingOut,
  trickWinner,
} from '../../../src/engine/play';
import type { CardId } from '../../../src/engine/cards';
import type { Seat } from '../../../src/engine/seats';
import type { Contract, Trick } from '../../../src/engine/state';

const TEAM: Contract = { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null };
const ALONE: Contract = { ...TEAM, alone: true };

function trick(...cards: [Seat, CardId][]): Trick {
  return {
    leader: cards[0]![0],
    plays: cards.map(([seat, card]) => ({ seat, card })),
    winner: null,
  };
}

describe('seats in play (RU-5)', () => {
  it('has the maker’s partner sit out a loner', () => {
    expect(sittingOut(TEAM)).toEqual([]);
    expect(sittingOut(null)).toEqual([]);
    expect(sittingOut(ALONE)).toEqual([2]);
    expect(activeSeatCount(ALONE)).toBe(3);
    expect(activeSeatCount(TEAM)).toBe(4);
  });

  it('has a lone defender’s partner sit out too (RU-13)', () => {
    expect(sittingOut({ ...TEAM, loneDefender: 1 })).toEqual([3]);
    expect(sittingOut({ ...ALONE, loneDefender: 3 })).toEqual([2, 1]);
    expect(activeSeatCount({ ...ALONE, loneDefender: 3 })).toBe(2);
    // Seats 1 and 2 are out: from seat 1 the next to play is 3, then 0.
    expect(firstActiveFrom(1, { ...ALONE, loneDefender: 3 })).toBe(3);
    expect(nextActiveSeat(3, { ...ALONE, loneDefender: 3 })).toBe(0);
    expect(nextActiveSeat(0, { ...ALONE, loneDefender: 3 })).toBe(3);
  });

  it('skips the seat sitting out', () => {
    expect(nextActiveSeat(1, ALONE)).toBe(3);
    expect(nextActiveSeat(1, TEAM)).toBe(2);
    expect(firstActiveFrom(2, ALONE)).toBe(3);
    expect(firstActiveFrom(1, ALONE)).toBe(1);
  });
});

describe('following suit (RU-7)', () => {
  it('allows any card on the lead', () => {
    expect(legalPlays(['AS', 'KH'], null, 'H')).toEqual(['AS', 'KH']);
  });

  it('requires following the led suit when able', () => {
    expect(legalPlays(['AS', 'KH', '9S'], trick([0, 'QS']), 'H')).toEqual(['AS', '9S']);
  });

  it('allows any card when void in the led suit', () => {
    expect(legalPlays(['AC', 'KH'], trick([0, 'QS']), 'H')).toEqual(['AC', 'KH']);
  });

  it('treats the left bower as trump, not its printed suit (RU-6)', () => {
    // Hearts trump. Diamonds led: the jack of diamonds may not follow diamonds...
    expect(legalPlays(['JD', 'AC'], trick([0, 'QD']), 'H')).toEqual(['JD', 'AC']);
    // ...and must follow when trump is led.
    expect(legalPlays(['JD', 'AC'], trick([0, '9H']), 'H')).toEqual(['JD']);
  });

  it('counts a left-bower lead as a trump lead', () => {
    expect(ledSuit(trick([0, 'JD']), 'H')).toBe('H');
    expect(ledSuit(null, 'H')).toBeNull();
    expect(legalPlays(['AD', 'TH'], trick([0, 'JD']), 'H')).toEqual(['TH']);
  });
});

describe('trickWinner', () => {
  it('goes to the highest card of the led suit without trump', () => {
    expect(trickWinner(trick([0, 'QS'], [1, 'AS'], [2, 'KS'], [3, 'AC']), 'H')).toBe(1);
  });

  it('goes to the highest trump', () => {
    expect(trickWinner(trick([0, 'AS'], [1, '9H'], [2, 'AH'], [3, 'KS']), 'H')).toBe(2);
  });

  it('ranks the right bower over the left over the ace', () => {
    expect(trickWinner(trick([0, 'AH'], [1, 'JD'], [2, 'JH'], [3, 'KH']), 'H')).toBe(2);
    expect(trickWinner(trick([0, 'AH'], [1, 'JD'], [2, 'KH'], [3, 'QH']), 'H')).toBe(1);
  });

  it('lets the leader win when nobody follows or trumps', () => {
    expect(trickWinner(trick([3, '9C'], [0, 'AS'], [1, 'AD']), 'H')).toBe(3);
  });
});

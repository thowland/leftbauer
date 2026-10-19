import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { addResult, gameWinner, scoreHand, tricksWon } from '../../../src/engine/scoring';
import type { Seat } from '../../../src/engine/seats';
import type { Contract, Trick } from '../../../src/engine/state';

/** Five completed tricks won by the given seats. */
function tricks(...winners: Seat[]): Trick[] {
  return winners.map((winner) => ({ leader: 0, plays: [], winner }));
}

const MAKER_0: Contract = { trump: 'H', maker: 0, round: 1, alone: false };
const ALONE_0: Contract = { ...MAKER_0, alone: true };

describe('tricksWon', () => {
  it('counts tricks per team, ignoring unfinished tricks', () => {
    expect(tricksWon([...tricks(0, 2, 1), { leader: 0, plays: [], winner: null }])).toEqual([2, 1]);
  });
});

describe('scoreHand (RU-8)', () => {
  it('gives the makers 1 for three or four tricks', () => {
    expect(scoreHand(MAKER_0, tricks(0, 2, 0, 1, 1), STANDARD_RULES)).toMatchObject({
      outcome: 'made',
      points: 1,
      pointsTo: 0,
      makers: 0,
      tricksWon: [3, 2],
    });
    expect(scoreHand(MAKER_0, tricks(0, 2, 0, 2, 1), STANDARD_RULES)).toMatchObject({
      outcome: 'made',
      points: 1,
    });
  });

  it('gives the makers 2 for a march', () => {
    expect(scoreHand(MAKER_0, tricks(0, 2, 0, 2, 0), STANDARD_RULES)).toMatchObject({
      outcome: 'march',
      points: 2,
      pointsTo: 0,
    });
  });

  it('gives the defenders 2 for a euchre', () => {
    expect(scoreHand(MAKER_0, tricks(1, 3, 0, 2, 1), STANDARD_RULES)).toMatchObject({
      outcome: 'euchred',
      points: 2,
      pointsTo: 1,
    });
  });

  it('scores loners: 1 for three or four, 4 for all five, 2 to defenders if euchred', () => {
    expect(scoreHand(ALONE_0, tricks(0, 0, 0, 1, 1), STANDARD_RULES)).toMatchObject({
      outcome: 'lonerMade',
      points: 1,
    });
    expect(scoreHand(ALONE_0, tricks(0, 0, 0, 0, 0), STANDARD_RULES)).toMatchObject({
      outcome: 'lonerSweep',
      points: 4,
    });
    expect(scoreHand(ALONE_0, tricks(1, 1, 1, 0, 0), STANDARD_RULES)).toMatchObject({
      outcome: 'euchredAlone',
      points: 2,
      pointsTo: 1,
    });
  });

  it('uses the loner sweep value from the rules (RU-12)', () => {
    const rules = { ...STANDARD_RULES, lonerSweepPoints: 5 as const };
    expect(scoreHand(ALONE_0, tricks(0, 0, 0, 0, 0), rules)).toMatchObject({ points: 5 });
  });

  it('scores makers on team 1', () => {
    const contract: Contract = { ...MAKER_0, maker: 3 };
    expect(scoreHand(contract, tricks(3, 1, 3, 0, 2), STANDARD_RULES)).toMatchObject({
      makers: 1,
      outcome: 'made',
      pointsTo: 1,
    });
  });
});

describe('game score (RU-9)', () => {
  it('adds a scored hand and ignores a redeal', () => {
    const result = scoreHand(MAKER_0, tricks(0, 0, 0, 0, 0), STANDARD_RULES);
    expect(addResult([3, 4], result)).toEqual([5, 4]);
    expect(addResult([3, 4], { kind: 'redeal' })).toEqual([3, 4]);
  });

  it('ends the game at the target score', () => {
    expect(gameWinner([9, 9], STANDARD_RULES)).toBeNull();
    expect(gameWinner([10, 4], STANDARD_RULES)).toBe(0);
    expect(gameWinner([7, 11], STANDARD_RULES)).toBe(1);
    expect(gameWinner([5, 0], { ...STANDARD_RULES, targetScore: 5 })).toBe(0);
  });
});

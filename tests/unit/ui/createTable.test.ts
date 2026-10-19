import { describe, expect, it } from 'vitest';
import { createTable, HUMAN_SEAT } from '../../../src/ui/game/createTable';

describe('createTable', () => {
  it('seats the human with three bots and an idle driver', () => {
    const table = createTable({ seed: 1, fast: true });
    expect(table.humanSeat).toBe(HUMAN_SEAT);
    expect(table.driver.snapshot().status).toBe('idle');
    expect(table.initialEvents[0]).toMatchObject({ type: 'handDealt', handNumber: 1 });
  });

  it('reproduces a seeded game, and shuffles with crypto otherwise', () => {
    const a = createTable({ seed: 9, fast: true }).driver.snapshot().state;
    const b = createTable({ seed: 9, fast: true }).driver.snapshot().state;
    expect(a).toEqual(b);
    const c = createTable({ seed: null, fast: false }).driver.snapshot().state;
    expect(c.hand.hands.every((h) => h.length === 5)).toBe(true);
  });
});

describe('createTable seating (OP-4)', () => {
  it('seats the partner across and two different named opponents', () => {
    const { seats } = createTable({ seed: 4, fast: true });
    expect(seats[0]).toEqual({ name: 'You', persona: null });
    expect(seats[2].persona?.id).toBe('partner');
    expect(seats[1].persona?.id).not.toBe(seats[3].persona?.id);
    expect(['Soopy', 'Shrubs', 'Rusty', 'Smooth']).toContain(seats[1].name);
  });

  it('honors chosen opponents and skill', () => {
    const { seats } = createTable({
      seed: 4,
      fast: true,
      opponents: ['rusty', 'soopy'],
      skill: 'casual',
    });
    expect(seats.map((s) => s.name)).toEqual(['You', 'Rusty', 'Partner', 'Soopy']);
  });

  it('chooses opponents without changing the deal', () => {
    const a = createTable({ seed: 8, fast: true, opponents: ['rusty', 'soopy'] });
    const b = createTable({ seed: 8, fast: true, opponents: ['smooth', 'shrubs'] });
    expect(a.driver.snapshot().state).toEqual(b.driver.snapshot().state);
  });
});

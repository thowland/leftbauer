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

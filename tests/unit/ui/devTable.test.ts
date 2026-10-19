import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { seededRng } from '../../../src/util/rng';
import {
  canDealNext,
  dealNextTableHand,
  finishTableHand,
  LOG_LIMIT,
  randomChooser,
  startTable,
  stepTable,
  type DevTable,
} from '../../../src/ui/dev/devTable';

const start = () => startTable(STANDARD_RULES, 3, 0, seededRng(1));
const choose = randomChooser(seededRng(2));

describe('dev table', () => {
  it('starts with the deal logged', () => {
    const t = start();
    expect(t.log).toHaveLength(1);
    expect(t.log[0]!.text).toMatch(/^Hand 1: Right opponent deals/);
  });

  it('does nothing when stepped after the hand is complete', () => {
    const done = finishTableHand(start(), choose);
    expect(stepTable(done, choose)).toBe(done);
  });

  it('only deals the next hand once the current one is complete', () => {
    const t = start();
    expect(canDealNext(t)).toBe(false);
    expect(dealNextTableHand(t, seededRng(3))).toBe(t);
    const next = dealNextTableHand(finishTableHand(t, choose), seededRng(3));
    expect(next.game.handNumber).toBe(2);
  });

  it('does not deal after the game is over', () => {
    const done = finishTableHand(start(), choose);
    const over: DevTable = { ...done, game: { ...done.game, winner: 0 } };
    expect(canDealNext(over)).toBe(false);
  });

  it('keeps only the most recent log entries, with unique ids', () => {
    let t = start();
    for (let i = 0; i < 4; i++) t = dealNextTableHand(finishTableHand(t, choose), seededRng(i));
    expect(t.log.length).toBeLessThanOrEqual(LOG_LIMIT);
    expect(new Set(t.log.map((e) => e.id)).size).toBe(t.log.length);
    expect(t.log.at(-1)!.text).toMatch(/^Hand 5/);
  });

  it('refuses to hide an engine rejection', () => {
    expect(() => stepTable(start(), () => ({ type: 'play', card: '9S' }))).toThrow(/rejected/);
  });
});

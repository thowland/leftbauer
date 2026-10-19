import { describe, expect, it } from 'vitest';
import { actionKey, isBidAction, sameAction, type Action } from '../../../src/engine/actions';

const ACTIONS: Action[] = [
  { type: 'pass' },
  { type: 'orderUp', alone: false },
  { type: 'orderUp', alone: true },
  { type: 'callTrump', suit: 'H', alone: false },
  { type: 'callTrump', suit: 'H', alone: true },
  { type: 'callTrump', suit: 'S', alone: false },
  { type: 'discard', card: 'AH' },
  { type: 'play', card: 'AH' },
];

describe('actions', () => {
  it('gives every distinct action a distinct key', () => {
    expect(new Set(ACTIONS.map(actionKey)).size).toBe(ACTIONS.length);
  });

  it('compares actions by value', () => {
    expect(sameAction({ type: 'play', card: 'JD' }, { type: 'play', card: 'JD' })).toBe(true);
    expect(sameAction({ type: 'play', card: 'JD' }, { type: 'discard', card: 'JD' })).toBe(false);
  });

  it('separates bids from other actions', () => {
    expect(ACTIONS.filter(isBidAction)).toHaveLength(6);
  });
});

import { describe, expect, it } from 'vitest';
import { toPlayerView } from '../../../src/engine/view';
import { act, finishHand, gameFromDeck } from '../../helpers/engine';

describe('toPlayerView', () => {
  it("shows a seat its own hand and only the size of everyone else's", () => {
    const view = toPlayerView(gameFromDeck(), 1);
    expect(view.seat).toBe(1);
    expect(view.myHand).toEqual(['QS', 'KS', '9C', 'TC', 'JC']);
    expect(view.handSizes).toEqual([5, 5, 5, 5]);
    expect(view.upcard).toBe('JD');
    expect(view.toAct).toBe(0);
    expect(view.phase).toBe('bidRound1');
    expect(JSON.stringify(view)).not.toContain('"AH"'); // seat 0's card
    expect(JSON.stringify(view)).not.toContain('"QD"'); // buried in the kitty
  });

  it('reports the contract, who sits out and the result', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    s = act(s, 1, { type: 'orderUp', alone: true });
    expect(toPlayerView(s, 2).contract).toEqual({
      trump: 'D',
      maker: 1,
      round: 1,
      alone: true,
      loneDefender: null,
    });
    expect(toPlayerView(s, 2).sittingOut).toEqual([3]);
    expect(toPlayerView(s, 2).result).toBeNull();
    s = finishHand(s, (legal) => legal[0]!);
    const view = toPlayerView(s, 2);
    expect(view.result).toMatchObject({ kind: 'scored', makers: 1 });
    expect(view.toAct).toBeNull();
    expect(view.gameWinner).toBeNull();
  });
});

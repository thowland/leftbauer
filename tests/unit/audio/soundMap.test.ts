import { describe, expect, it } from 'vitest';
import { soundsFor } from '../../../src/audio/soundMap';
import type { GameEvent } from '../../../src/engine/events';
import type { GameState, HandOutcome, Trick } from '../../../src/engine/state';
import { gameFromDeck } from '../../helpers/engine';

const base = gameFromDeck();

function withTrick(currentTrick: Trick | null): GameState {
  return { ...base, hand: { ...base.hand, currentTrick } };
}

const lead: Trick = { leader: 0, plays: [{ seat: 0, card: '9S' }], winner: null };
const second: Trick = {
  leader: 0,
  plays: [
    { seat: 0, card: '9S' },
    { seat: 1, card: 'QS' },
  ],
  winner: null,
};

function scored(outcome: HandOutcome): GameEvent {
  return {
    type: 'handScored',
    result: { kind: 'scored', makers: 0, tricksWon: [3, 2], outcome, points: 1, pointsTo: 0 },
    score: [1, 0],
  };
}

describe('soundsFor (SA-2)', () => {
  it('shuffles for a deal and rings for trump', () => {
    expect(soundsFor({ type: 'handDealt', dealer: 3, handNumber: 1, upcard: 'JD' }, base)).toEqual([
      'shuffle',
    ]);
    expect(
      soundsFor(
        {
          type: 'trumpSet',
          contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
        },
        base
      )
    ).toEqual(['trump']);
  });

  it('slides a card for the upcard and the discard', () => {
    for (const type of ['upcardPickedUp', 'upcardTurnedDown', 'dealerDiscarded'] as const) {
      expect(soundsFor({ type, dealer: 3 }, base)).toEqual(['deal']);
    }
    expect(soundsFor({ type: 'upcardSetAside', dealer: 3 }, base)).toEqual([]);
  });

  it('snaps each card, and sweeps the last trick when the next is led', () => {
    const played = (trickIndex: number): GameEvent => ({
      type: 'cardPlayed',
      seat: 0,
      card: '9S',
      trickIndex,
    });
    expect(soundsFor(played(0), withTrick(lead))).toEqual(['card']);
    expect(soundsFor(played(1), withTrick(lead))).toEqual(['sweep', 'card']);
    expect(soundsFor(played(1), withTrick(second))).toEqual(['card']);
    // The fourth card completes the trick, so none is in progress.
    expect(soundsFor(played(1), withTrick(null))).toEqual(['card']);
  });

  it('stings a euchre and celebrates a march or loner sweep', () => {
    expect(soundsFor(scored('euchred'), base)).toEqual(['euchre']);
    expect(soundsFor(scored('euchredAlone'), base)).toEqual(['euchre']);
    expect(soundsFor(scored('march'), base)).toEqual(['flourish']);
    expect(soundsFor(scored('lonerSweep'), base)).toEqual(['flourish']);
    expect(soundsFor(scored('made'), base)).toEqual([]);
    expect(soundsFor(scored('lonerMade'), base)).toEqual([]);
  });

  it('is quiet for everything else', () => {
    expect(
      soundsFor({ type: 'handScored', result: { kind: 'redeal' }, score: [0, 0] }, base)
    ).toEqual([]);
    expect(soundsFor({ type: 'trickWon', seat: 0, trickIndex: 0 }, base)).toEqual([]);
    expect(soundsFor({ type: 'gameOver', winner: 0, score: [10, 4] }, base)).toEqual([]);
    expect(
      soundsFor({ type: 'bidMade', seat: 0, round: 1, action: { type: 'pass' } }, base)
    ).toEqual([]);
  });
});

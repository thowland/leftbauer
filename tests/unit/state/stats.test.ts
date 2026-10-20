import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../src/engine/events';
import type { Contract, GameState, HandOutcome } from '../../../src/engine/state';
import { memoryStorage, save } from '../../../src/state/persistence';
import {
  applyToStats,
  EMPTY_STATS,
  EMPTY_TALLY,
  isStats,
  loadStats,
  opponentSkill,
  recordAbandoned,
  STATS_STORE,
  StatsSink,
  totalOf,
} from '../../../src/state/stats';
import { gameFromDeck } from '../../helpers/engine';

/** The state after a hand whose contract was `contract`. */
function after(contract: Contract): GameState {
  const s = gameFromDeck();
  return { ...s, hand: { ...s.hand, contract } };
}

const mine: Contract = { trump: 'H', maker: 0, round: 1, alone: false };
const partners: Contract = { ...mine, maker: 2 };
const theirs: Contract = { ...mine, maker: 1 };

function scored(makers: 0 | 1, outcome: HandOutcome): GameEvent {
  const euchred = outcome === 'euchred' || outcome === 'euchredAlone';
  return {
    type: 'handScored',
    result: {
      kind: 'scored',
      makers,
      tricksWon: [3, 2],
      outcome,
      points: 1,
      pointsTo: euchred ? ((1 - makers) as 0 | 1) : makers,
    },
    score: [0, 0],
  };
}

const play = (events: GameEvent[], state: GameState, skill = 'standard' as const) =>
  applyToStats(EMPTY_STATS, events, state, 0, skill)[skill];

describe('stats (PE-2)', () => {
  it('counts the human’s calls, made or euchred, and their loners', () => {
    expect(play([scored(0, 'made')], after(mine))).toMatchObject({
      handsPlayed: 1,
      calls: 1,
      made: 1,
    });
    expect(play([scored(0, 'euchred')], after(mine))).toMatchObject({
      calls: 1,
      made: 0,
      euchresTaken: 1,
    });
    const alone = after({ ...mine, alone: true });
    expect(play([scored(0, 'lonerSweep')], alone)).toMatchObject({
      lonersAttempted: 1,
      lonersMade: 1,
      marches: 1,
    });
    expect(play([scored(0, 'euchredAlone')], alone)).toMatchObject({
      lonersAttempted: 1,
      lonersMade: 0,
    });
  });

  it('credits the team for euchres and marches, but calls only to the human', () => {
    expect(play([scored(0, 'march')], after(partners))).toMatchObject({ calls: 0, marches: 1 });
    expect(play([scored(1, 'euchred')], after(theirs))).toMatchObject({ euchresGiven: 1 });
    expect(play([scored(1, 'march')], after(theirs))).toMatchObject({ marches: 0 });
  });

  it('counts games won and lost, and skips redeals', () => {
    const won = play([{ type: 'gameOver', winner: 0, score: [10, 4] }], after(mine));
    expect(won).toMatchObject({ gamesPlayed: 1, gamesWon: 1 });
    const lost = play([{ type: 'gameOver', winner: 1, score: [4, 10] }], after(mine));
    expect(lost).toMatchObject({ gamesPlayed: 1, gamesWon: 0 });
    const redeal = play(
      [{ type: 'handScored', result: { kind: 'redeal' }, score: [0, 0] }],
      after(mine)
    );
    expect(redeal).toEqual(EMPTY_TALLY);
  });

  it('keeps each difficulty apart, and adds them up', () => {
    let stats = applyToStats(EMPTY_STATS, [scored(0, 'made')], after(mine), 0, 'sharp');
    stats = recordAbandoned(stats, 'casual');
    expect(stats.sharp.calls).toBe(1);
    expect(stats.standard).toEqual(EMPTY_TALLY);
    expect(stats.casual).toMatchObject({ gamesPlayed: 1, gamesWon: 0 });
    expect(totalOf(stats)).toMatchObject({ gamesPlayed: 1, calls: 1, handsPlayed: 1 });
  });

  it('files a game under its opponents’ level', () => {
    expect(
      opponentSkill({
        humanSeat: 2,
        bots: { 3: { role: 'opponent', personaId: 'rusty', skill: 'casual' } },
      })
    ).toBe('casual');
    expect(opponentSkill({ humanSeat: 0, bots: {} })).toBe('standard');
  });

  it('rejects stats that cannot be right', () => {
    expect(isStats(EMPTY_STATS)).toBe(true);
    expect(isStats(null)).toBe(false);
    expect(isStats({ ...EMPTY_STATS, sharp: { ...EMPTY_TALLY, gamesWon: 1 } })).toBe(false);
    expect(isStats({ ...EMPTY_STATS, casual: { ...EMPTY_TALLY, calls: -1 } })).toBe(false);
    expect(isStats({ casual: EMPTY_TALLY })).toBe(false);
  });
});

describe('StatsSink', () => {
  it('saves after scored hands, and leaves the store alone otherwise', () => {
    const storage = memoryStorage();
    const sink = new StatsSink(storage, 0, 'standard');
    sink.handle([{ type: 'trickWon', seat: 0, trickIndex: 0 }], after(mine));
    expect(storage.getItem(STATS_STORE.key)).toBeNull();
    sink.handle([scored(0, 'made')], after(mine));
    sink.handle([scored(0, 'made')], after(mine));
    expect(loadStats(storage).standard).toMatchObject({ handsPlayed: 2, made: 2 });
  });

  it('starts from empty when the stored stats are unreadable', () => {
    const storage = memoryStorage({ [STATS_STORE.key]: '{"schemaVersion":1,"casual":3}' });
    expect(loadStats(storage)).toEqual(EMPTY_STATS);
    save(storage, STATS_STORE, recordAbandoned(EMPTY_STATS, 'sharp'));
    expect(loadStats(storage).sharp.gamesPlayed).toBe(1);
  });
});

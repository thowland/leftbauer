import { describe, expect, it } from 'vitest';
import type { Action } from '../../../src/engine/actions';
import type { GameEvent } from '../../../src/engine/events';
import {
  applyAction,
  currentActor,
  dealNextHand,
  legalActions,
  newGame,
} from '../../../src/engine/game';
import { STANDARD_RULES } from '../../../src/engine/rules';
import type { GameState } from '../../../src/engine/state';
import { seededRng } from '../../../src/util/rng';
import { act, finishHand, gameFromDeck, playRandomGame } from '../../helpers/engine';

const first = (legal: readonly Action[]): Action => legal[0]!;

describe('newGame', () => {
  it('deals the first hand and opens bidding left of the dealer', () => {
    const { state, events } = newGame(STANDARD_RULES, 2, seededRng(1));
    expect(state.handNumber).toBe(1);
    expect(state.dealer).toBe(2);
    expect(state.score).toEqual([0, 0]);
    expect(state.hand.phase).toEqual({ kind: 'bidRound1', toAct: 3 });
    expect(state.hand.hands.every((h) => h.length === 5)).toBe(true);
    expect(events).toEqual([
      { type: 'handDealt', dealer: 2, handNumber: 1, upcard: state.hand.kitty[0] },
    ]);
  });
});

describe('applyAction', () => {
  it('rejects an action out of turn', () => {
    expect(applyAction(gameFromDeck(), 1, { type: 'pass' })).toEqual({
      ok: false,
      reason: 'notYourTurn',
    });
  });

  it('rejects an illegal action', () => {
    expect(applyAction(gameFromDeck(), 0, { type: 'play', card: '9S' })).toEqual({
      ok: false,
      reason: 'illegal',
    });
  });

  it('rejects any action once the game is over', () => {
    const over: GameState = { ...gameFromDeck(), winner: 0 };
    expect(applyAction(over, 0, { type: 'pass' })).toEqual({ ok: false, reason: 'gameOver' });
    expect(legalActions(over, 0)).toEqual([]);
  });

  it('enforces following suit, with the left bower counted as trump', () => {
    // Seat 0 orders diamonds; the dealer discards AC; seat 0 leads AH.
    let s = act(gameFromDeck(), 0, { type: 'orderUp', alone: false });
    s = act(s, 3, { type: 'discard', card: 'AC' });
    s = act(s, 0, { type: 'play', card: 'AH' });
    expect(legalActions(s, 1)).toHaveLength(5); // void in hearts
    s = act(s, 1, { type: 'play', card: '9C' });
    expect(legalActions(s, 2)).toEqual([
      { type: 'play', card: '9H' },
      { type: 'play', card: 'TH' },
    ]);
    s = act(s, 2, { type: 'play', card: '9H' });
    // Seat 3 holds JH (the left bower: a diamond now) and QH: only QH follows hearts.
    expect(legalActions(s, 3)).toEqual([{ type: 'play', card: 'QH' }]);
    expect(applyAction(s, 3, { type: 'play', card: 'JH' })).toMatchObject({ reason: 'illegal' });
  });
});

describe('a full hand', () => {
  it('plays five tricks, scores the hand and waits for the next deal', () => {
    const log: GameEvent[] = [];
    const s = finishHand(gameFromDeck(), first, log);
    expect(s.hand.phase.kind).toBe('complete');
    expect(s.hand.tricks).toHaveLength(5);
    expect(currentActor(s)).toBeNull();
    expect(legalActions(s, 0)).toEqual([]);
    expect(s.completedHands).toHaveLength(1);
    const scored = log.filter((e) => e.type === 'handScored');
    expect(scored).toHaveLength(1);
    expect(s.score[0] + s.score[1]).toBeGreaterThan(0);
    expect(log.filter((e) => e.type === 'trickWon')).toHaveLength(5);
  });

  it('plays a loner with three cards to a trick', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    s = act(s, 1, { type: 'orderUp', alone: true });
    s = finishHand(s, first);
    expect(s.hand.tricks.every((t) => t.plays.length === 3)).toBe(true);
    expect(s.hand.tricks.flatMap((t) => t.plays).some((p) => p.seat === 3)).toBe(false);
  });
});

describe('dealNextHand', () => {
  it('passes the deal to the left and starts the next hand', () => {
    const done = finishHand(gameFromDeck(), first);
    const { state, events } = dealNextHand(done, seededRng(3));
    expect(state.dealer).toBe(0);
    expect(state.handNumber).toBe(2);
    expect(state.score).toEqual(done.score);
    expect(state.hand.phase).toEqual({ kind: 'bidRound1', toAct: 1 });
    expect(events[0]).toMatchObject({ type: 'handDealt', dealer: 0, handNumber: 2 });
  });

  it('refuses to deal mid-hand or after the game', () => {
    expect(() => dealNextHand(gameFromDeck(), seededRng(1))).toThrow(/complete/);
    const done = finishHand(gameFromDeck(), first);
    expect(() => dealNextHand({ ...done, winner: 1 }, seededRng(1))).toThrow(/over/);
  });
});

describe('the end of the game (RU-9)', () => {
  it('ends when a team reaches the target and announces the winner', () => {
    const events: GameEvent[] = [];
    const end = playRandomGame(
      newGame(STANDARD_RULES, 0, seededRng(11)).state,
      seededRng(12),
      (_, e) => events.push(...e)
    );
    expect(end.winner).not.toBeNull();
    expect(end.score[end.winner!]).toBeGreaterThanOrEqual(10);
    expect(events.at(-1)).toEqual({ type: 'gameOver', winner: end.winner, score: end.score });
    expect(currentActor(end)).toBeNull();
  });

  it('respects a shorter target score (RU-11)', () => {
    const rules = { ...STANDARD_RULES, targetScore: 5 as const };
    const end = playRandomGame(newGame(rules, 0, seededRng(5)).state, seededRng(6));
    expect(Math.max(...end.score)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...end.score)).toBeLessThan(10);
  });
});

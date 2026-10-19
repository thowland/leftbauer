import { describe, expect, it } from 'vitest';
import { actionKey } from '../../../src/engine/actions';
import { ALL_CARDS } from '../../../src/engine/cards';
import type { GameEvent } from '../../../src/engine/events';
import { currentActor, legalActions } from '../../../src/engine/game';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { toPlayerView } from '../../../src/engine/view';
import { act, gameFromDeck } from '../../helpers/engine';

// Canonical deck, dealer 3 (see helpers/engine.ts). Upcard JD.
const PASS = { type: 'pass' } as const;
const ORDER = { type: 'orderUp', alone: false } as const;
const ORDER_ALONE = { type: 'orderUp', alone: true } as const;

function passRoundOne() {
  let s = gameFromDeck();
  for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, PASS);
  return s;
}

describe('round one (RU-3)', () => {
  it('offers order up, order up alone and pass to the seat left of the dealer only', () => {
    const s = gameFromDeck();
    expect(legalActions(s, 0).map(actionKey)).toEqual(['orderUp', 'orderUp:alone', 'pass']);
    expect(legalActions(s, 1)).toEqual([]);
  });

  it('omits loners when they are turned off (RU-16)', () => {
    const s = gameFromDeck(ALL_CARDS, 3, { ...STANDARD_RULES, lonersAllowed: false });
    expect(legalActions(s, 0).map(actionKey)).toEqual(['orderUp', 'pass']);
  });

  it('moves clockwise on a pass', () => {
    const s = act(gameFromDeck(), 0, PASS);
    expect(currentActor(s)).toBe(1);
    expect(s.hand.bids).toEqual([{ seat: 0, round: 1, action: PASS }]);
  });

  it('turns the upcard down after four passes and opens round two', () => {
    const log: GameEvent[] = [];
    let s = gameFromDeck();
    for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, PASS, log);
    expect(s.hand.upcardStatus).toBe('turnedDown');
    expect(s.hand.phase).toEqual({ kind: 'bidRound2', toAct: 0 });
    expect(log.at(-1)).toEqual({ type: 'upcardTurnedDown', dealer: 3 });
  });

  it('has the dealer pick up the upcard and discard when ordered up', () => {
    const log: GameEvent[] = [];
    let s = act(gameFromDeck(), 0, ORDER, log);
    expect(s.hand.contract).toEqual({ trump: 'D', maker: 0, round: 1, alone: false });
    expect(s.hand.upcardStatus).toBe('pickedUp');
    expect(s.hand.hands[3]).toHaveLength(6);
    expect(s.hand.hands[3]).toContain('JD');
    expect(currentActor(s)).toBe(3);
    expect(legalActions(s, 3)).toHaveLength(6);
    expect(log.map((e) => e.type)).toEqual(['bidMade', 'trumpSet', 'upcardPickedUp']);

    s = act(s, 3, { type: 'discard', card: 'AC' }, log);
    expect(s.hand.hands[3]).toHaveLength(5);
    expect(s.hand.discard).toBe('AC');
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 0 });
    expect(log.at(-1)).toEqual({ type: 'dealerDiscarded', dealer: 3 });
  });

  it('lets the dealer pick it up for themselves', () => {
    let s = gameFromDeck();
    for (const seat of [0, 1, 2] as const) s = act(s, seat, PASS);
    s = act(s, 3, ORDER);
    expect(s.hand.contract?.maker).toBe(3);
    expect(s.hand.phase.kind).toBe('dealerDiscard');
  });

  it('keeps the discard hidden from everyone but the dealer', () => {
    let s = act(gameFromDeck(), 0, ORDER);
    s = act(s, 3, { type: 'discard', card: 'AC' });
    expect(toPlayerView(s, 3).myDiscard).toBe('AC');
    for (const seat of [0, 1, 2] as const) expect(toPlayerView(s, seat).myDiscard).toBeNull();
  });
});

describe("the dealer's partner going alone (RU-5, ADR-0004)", () => {
  it('sets the upcard aside: the dealer sits out, picks nothing up and does not discard', () => {
    const log: GameEvent[] = [];
    let s = act(gameFromDeck(), 0, PASS);
    s = act(s, 1, ORDER_ALONE, log);
    expect(s.hand.contract).toEqual({ trump: 'D', maker: 1, round: 1, alone: true });
    expect(s.hand.upcardStatus).toBe('setAside');
    expect(s.hand.hands[3]).not.toContain('JD');
    expect(s.hand.hands[3]).toHaveLength(5);
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 0 });
    expect(log.map((e) => e.type)).toEqual(['bidMade', 'trumpSet', 'upcardSetAside']);
    expect(toPlayerView(s, 0).sittingOut).toBe(3);
  });

  it('still has the dealer pick up when an opponent goes alone', () => {
    const s = act(gameFromDeck(), 0, ORDER_ALONE);
    expect(s.hand.upcardStatus).toBe('pickedUp');
    expect(s.hand.phase.kind).toBe('dealerDiscard');
  });

  it('passes the lead on when the seat left of the dealer sits out', () => {
    // Dealer 0; seat 3 goes alone, so seat 1 (left of the dealer) sits out.
    let s = gameFromDeck(ALL_CARDS, 0);
    s = act(s, 1, PASS);
    s = act(s, 2, PASS);
    s = act(s, 3, ORDER_ALONE);
    s = act(s, 0, { type: 'discard', card: s.hand.hands[0][0]! });
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 2 });
  });
});

describe('round two (RU-4)', () => {
  it('offers every suit but the turned-down one, alone or not, and pass', () => {
    const keys = legalActions(passRoundOne(), 0).map(actionKey);
    expect(keys).toHaveLength(7);
    expect(keys).not.toContain('callTrump:D');
    expect(keys).toContain('callTrump:S:alone');
    expect(keys.at(-1)).toBe('pass');
  });

  it('starts play as soon as trump is named', () => {
    const log: GameEvent[] = [];
    const s = act(passRoundOne(), 0, { type: 'callTrump', suit: 'S', alone: false }, log);
    expect(s.hand.contract).toEqual({ trump: 'S', maker: 0, round: 2, alone: false });
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 0 });
    expect(s.hand.upcardStatus).toBe('turnedDown');
    expect(log.map((e) => e.type)).toEqual(['bidMade', 'trumpSet']);
  });

  it('redeals after four more passes with stick the dealer off (the default)', () => {
    const log: GameEvent[] = [];
    let s = passRoundOne();
    for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, PASS, log);
    expect(s.hand.phase).toEqual({ kind: 'complete', result: { kind: 'redeal' } });
    expect(s.score).toEqual([0, 0]);
    expect(log.at(-1)).toEqual({ type: 'redeal', nextDealer: 0 });
    expect(currentActor(s)).toBeNull();
  });

  it('forces the dealer to name trump with stick the dealer on (RU-10)', () => {
    let s = gameFromDeck(ALL_CARDS, 3, { ...STANDARD_RULES, stickTheDealer: true });
    for (const seat of [0, 1, 2, 3, 0, 1, 2] as const) s = act(s, seat, PASS);
    const keys = legalActions(s, 3).map(actionKey);
    expect(keys).not.toContain('pass');
    expect(keys).toHaveLength(6);
  });
});

import { describe, expect, it } from 'vitest';
import type { BotSpec } from '../../../src/bots/bot';
import { createBot, PARTNER_SPEC } from '../../../src/bots/factory';
import { PolicyBot } from '../../../src/bots/policyBot';
import { HeuristicEvaluator } from '../../../src/bots/evaluate';
import { BY_THE_BOOK } from '../../../src/bots/personas';
import { bestSelector } from '../../../src/bots/selectors';
import { conventionalBidding } from '../../../src/bots/conventions/bidding';
import { conventionalDiscard } from '../../../src/bots/conventions/discard';
import { conventionalFarmer } from '../../../src/bots/conventions/farmer';
import { conventionalLoner } from '../../../src/bots/conventions/loner';
import { currentActor, legalActions } from '../../../src/engine/game';
import { toPlayerView } from '../../../src/engine/view';
import { act, gameFromDeck } from '../../helpers/engine';
import { legalFor, makeView } from '../../helpers/bots';

const SMOOTH: BotSpec = { role: 'opponent', personaId: 'smooth', skill: 'standard' };

describe('PolicyBot', () => {
  it('makes legal decisions through a whole hand, with a reason for each', () => {
    const bots = [0, 1, 2, 3].map(() => createBot(SMOOTH));
    let state = gameFromDeck();
    for (let seat = currentActor(state); seat !== null; seat = currentActor(state)) {
      const legal = legalActions(state, seat);
      const decision = bots[seat]!.decide(toPlayerView(state, seat), legal);
      expect(legal).toContainEqual(decision.action);
      expect(decision.reason.code).toBeTruthy();
      state = act(state, seat, decision.action);
    }
    expect(state.hand.phase.kind).toBe('complete');
  });

  it('decides identically for identical views (PB-3)', () => {
    const state = gameFromDeck();
    const view = toPlayerView(state, 0);
    const legal = legalActions(state, 0);
    for (const skill of ['casual', 'standard', 'sharp'] as const) {
      const spec: BotSpec = { ...SMOOTH, skill };
      expect(createBot(spec).decide(view, legal)).toEqual(createBot(spec).decide(view, legal));
    }
  });

  it('orders up and then decides separately whether to go alone', () => {
    // Seat 0 holds JH JD AH KH AS with hearts turned up: strong enough to go alone.
    const view = makeView({
      phase: 'bidRound1',
      contract: null,
      upcardStatus: 'faceUp',
      upcard: 'TH',
      myHand: ['JH', 'JD', 'AH', 'KH', 'AS'],
    });
    const decision = createBot(SMOOTH).decide(view, legalFor(view));
    expect(decision.action).toEqual({ type: 'orderUp', alone: true });
    expect(decision.reason.code).toBe('loner-strong');

    const noLoners = legalFor(view).filter((a) => !('alone' in a && a.alone));
    expect(createBot(SMOOTH).decide(view, noLoners).action).toEqual({
      type: 'orderUp',
      alone: false,
    });
  });

  it('passes a weak hand and discards as dealer', () => {
    const state = gameFromDeck();
    const pass = createBot(SMOOTH).decide(toPlayerView(state, 0), legalActions(state, 0));
    expect(pass.action.type).toBe('pass');

    const ordered = act(state, 0, { type: 'orderUp', alone: false });
    const discard = createBot(SMOOTH).decide(toPlayerView(ordered, 3), legalActions(ordered, 3));
    expect(discard.action.type).toBe('discard');
    expect(discard.reason.code).toMatch(/^discard-/);
  });

  it('refuses to act with nothing legal', () => {
    expect(() => createBot(SMOOTH).decide(toPlayerView(gameFromDeck(), 0), [])).toThrow(/no legal/);
  });

  it('refuses to return an action its policies chose illegally', () => {
    const broken = new PolicyBot({
      spec: SMOOTH,
      policies: {
        bidding: conventionalBidding,
        loner: conventionalLoner,
        farmer: conventionalFarmer,
        discard: conventionalDiscard,
        cardPlay: { play: () => [{ value: '9S', score: 1, reason: { code: 'lead-lowest' } }] },
      },
      style: BY_THE_BOOK,
      selector: bestSelector,
      evaluator: new HeuristicEvaluator(),
      evaluationNoise: 0,
    });
    const view = makeView({ myHand: ['AH', 'KH'] });
    expect(() => broken.decide(view, legalFor(view))).toThrow(/illegal action/);
  });

  it('seats the partner at full strength (PB-2)', () => {
    expect(PARTNER_SPEC).toEqual({ role: 'partner', personaId: 'partner', skill: 'sharp' });
    expect(createBot(PARTNER_SPEC).spec).toBe(PARTNER_SPEC);
  });
});

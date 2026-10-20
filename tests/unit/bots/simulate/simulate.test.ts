import { describe, expect, it } from 'vitest';
import { createBot } from '../../../../src/bots/factory';
import { buildKnowledge } from '../../../../src/bots/knowledge';
import { simulatedCardPlay } from '../../../../src/bots/simulate/cardPlay';
import { rollout } from '../../../../src/bots/simulate/rollout';
import { sampleDeal } from '../../../../src/bots/simulate/sampler';
import { BY_THE_BOOK } from '../../../../src/bots/personas';
import { HeuristicEvaluator } from '../../../../src/bots/evaluate';
import type { DecisionContext } from '../../../../src/bots/context';
import { effectiveSuit, type CardId } from '../../../../src/engine/cards';
import { currentActor, legalActions, newGame } from '../../../../src/engine/game';
import { STANDARD_RULES } from '../../../../src/engine/rules';
import { SEATS, type Seat } from '../../../../src/engine/seats';
import type { GameState } from '../../../../src/engine/state';
import { toPlayerView, type PlayerView } from '../../../../src/engine/view';
import { seededRng } from '../../../../src/util/rng';
import { act, gameFromDeck, playRandomGame } from '../../../helpers/engine';

/** Seat 0 orders up the jack of diamonds; the dealer (3) discards the ace of clubs. */
const playing = () =>
  act(act(gameFromDeck(), 0, { type: 'orderUp', alone: false }), 3, {
    type: 'discard',
    card: 'AC',
  });

/** Every play-phase position from a few random games, with the seat to act. */
function positions(): { state: GameState; seat: Seat }[] {
  const found: { state: GameState; seat: Seat }[] = [];
  for (let g = 0; g < 6; g++) {
    playRandomGame(newGame(STANDARD_RULES, 0, seededRng(g)).state, seededRng(100 + g), (s) => {
      const seat = currentActor(s);
      if (s.hand.phase.kind === 'play' && seat !== null) found.push({ state: s, seat });
    });
  }
  return found;
}

function context(view: PlayerView, seed = 1): DecisionContext {
  return {
    view,
    legal: [],
    knowledge: buildKnowledge(view),
    evaluator: new HeuristicEvaluator(),
    style: BY_THE_BOOK,
    rng: seededRng(seed),
  };
}

describe('sampleDeal', () => {
  it('deals only what the seat cannot see, in the right sizes, honoring every void', () => {
    const rng = seededRng(9);
    for (const { state, seat } of positions()) {
      const view = toPlayerView(state, seat);
      const knowledge = buildKnowledge(view);
      const hands = sampleDeal(view, knowledge, rng);
      expect(hands[seat]).toEqual(view.myHand);
      const dealt = SEATS.flatMap((s) => (s === seat ? [] : hands[s]));
      expect(new Set(dealt).size).toBe(dealt.length);
      for (const s of SEATS) {
        expect(hands[s]).toHaveLength(view.handSizes[s]);
        if (s === seat) continue;
        for (const card of hands[s]) {
          expect(knowledge.unseen.has(card)).toBe(true);
          expect(knowledge.voids[s].has(effectiveSuit(card, knowledge.trump))).toBe(false);
        }
      }
    }
  });

  it('gives the dealer the upcard they picked up', () => {
    const view = toPlayerView(playing(), 0);
    for (let seed = 0; seed < 20; seed++) {
      expect(sampleDeal(view, buildKnowledge(view), seededRng(seed))[3]).toContain('JD');
    }
  });

  it('does not, once the dealer has shown out of the upcard’s suit', () => {
    const view = toPlayerView(playing(), 0);
    const knowledge = { ...buildKnowledge(view) };
    const voids = knowledge.voids.map((v) => new Set(v));
    voids[3]!.add('D');
    const shownOut = { ...knowledge, voids: voids as unknown as typeof knowledge.voids };
    const placed = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      for (const card of sampleDeal(view, shownOut, seededRng(seed))[3]) placed.add(card);
    }
    expect(placed.has('JD')).toBe(false);
  });

  it('is reproducible from its RNG', () => {
    const view = toPlayerView(playing(), 1);
    const k = buildKnowledge(view);
    expect(sampleDeal(view, k, seededRng(4))).toEqual(sampleDeal(view, k, seededRng(4)));
  });

  it('still deals when the voids cannot all be honored', () => {
    const view = toPlayerView(playing(), 0);
    const knowledge = buildKnowledge(view);
    const everyVoid = SEATS.map(() => new Set(['C', 'D', 'H', 'S'] as const));
    const impossible = { ...knowledge, voids: everyVoid as unknown as typeof knowledge.voids };
    const hands = sampleDeal(view, impossible, seededRng(2));
    expect(SEATS.map((s) => hands[s].length)).toEqual([...view.handSizes]);
  });
});

/** The cards `seat` may play. */
const playable = (state: GameState, seat: Seat) =>
  legalActions(state, seat).flatMap((a) => (a.type === 'play' ? [a.card] : []));

describe('rollout', () => {
  it('plays the hand out and scores it for the seat’s team', () => {
    const state = playing();
    const firstLegal = (_view: PlayerView, legal: readonly CardId[]) => legal[0]!;
    for (const card of playable(state, 0)) {
      const value = rollout(toPlayerView(state, 0), state.hand.hands, card, firstLegal);
      // Points (1 or 2 made, 2 euchred), plus a hundredth for each trick taken.
      const points = Math.round(value);
      expect([1, 2, -2]).toContain(points);
      expect(Math.round((value - points) * 100)).toBeGreaterThanOrEqual(0);
      expect(Math.round((value - points) * 100)).toBeLessThanOrEqual(5);
    }
  });

  it('gives each seat its own view of the simulated hand', () => {
    const state = playing();
    const seen: Seat[] = [];
    rollout(toPlayerView(state, 0), state.hand.hands, playable(state, 0)[0]!, (view, legal) => {
      seen.push(view.seat);
      expect(legal.every((c) => view.myHand.includes(c))).toBe(true);
      expect(view.myDiscard).toBeNull();
      return legal[0]!;
    });
    expect(new Set(seen).size).toBeGreaterThan(1);
  });
});

describe('simulatedCardPlay (Sharp)', () => {
  const policy = simulatedCardPlay({ samples: 12, timeBudgetMs: 10_000 });

  it('ranks every legal card, and keeps the conventions’ reason when it agrees', () => {
    const state = playing();
    const view = toPlayerView(state, 0);
    const ctx = { ...context(view), legal: legalActions(state, 0) };
    const options = policy.play(ctx);
    expect(options.map((o) => o.value).sort()).toEqual(
      legalActions(state, 0)
        .map((a) => (a as { card: string }).card)
        .sort()
    );
    for (const o of options) {
      expect(o.reason.code === 'play-simulated' || o.reason.code.startsWith('lead-')).toBe(true);
    }
  });

  it('decides the same way every time for the same view (PB-3)', () => {
    const state = playing();
    const view = toPlayerView(state, 0);
    const legal = legalActions(state, 0);
    const a = policy.play({ ...context(view, 7), legal });
    const b = policy.play({ ...context(view, 7), legal });
    expect(a).toEqual(b);
  });

  it('skips simulation for a forced play', () => {
    let state = playing();
    // Play until some seat holds a single legal card.
    for (;;) {
      const seat = currentActor(state)!;
      const legal = legalActions(state, seat);
      if (legal.length === 1) {
        const options = policy.play({ ...context(toPlayerView(state, seat)), legal });
        expect(options).toHaveLength(1);
        expect(options[0]!.reason.code).not.toBe('play-simulated');
        return;
      }
      state = act(state, seat, legal[0]!);
    }
  });

  it('stops at the time budget, after at least one sample', () => {
    let clock = 0;
    const slow = simulatedCardPlay({ samples: 1000, timeBudgetMs: 5 }, () => (clock += 10));
    const state = playing();
    const options = slow.play({
      ...context(toPlayerView(state, 0)),
      legal: legalActions(state, 0),
    });
    const simulated = options.find((o) => o.reason.code === 'play-simulated');
    if (simulated) expect(simulated.reason.params?.samples).toBe(1);
    expect(options.length).toBeGreaterThan(1);
  });
});

describe('Sharp decision time (NF-2)', () => {
  it('decides every card within the 300 ms budget', () => {
    const bot = createBot({ role: 'partner', personaId: 'partner', skill: 'sharp' });
    const times: number[] = [];
    for (const { state, seat } of positions().slice(0, 60)) {
      const legal = legalActions(state, seat);
      if (legal.length < 2) continue;
      const start = performance.now();
      bot.decide(toPlayerView(state, seat), legal);
      times.push(performance.now() - start);
    }
    expect(times.length).toBeGreaterThan(20);
    // The time budget (250 ms) stops sampling early on a slow device.
    expect(Math.max(...times)).toBeLessThan(300);
  });
});

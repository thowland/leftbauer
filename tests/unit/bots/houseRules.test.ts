/**
 * Bot awareness of the house rules (Implementation Plan, Sprint 9): each
 * rule changes what a bot does in the situation it governs, and bots
 * play whole games under every rule without an illegal move.
 */
import { describe, expect, it } from 'vitest';
import type { BotSpec, SkillLevel } from '../../../src/bots/bot';
import { conventionalBidding } from '../../../src/bots/conventions/bidding';
import { conventionalFarmer } from '../../../src/bots/conventions/farmer';
import {
  BASE_LONER_THRESHOLD,
  conventionalLoner,
  FIVE_POINT_SWEEP_BONUS,
  lonerThreshold,
} from '../../../src/bots/conventions/loner';
import { createBot } from '../../../src/bots/factory';
import { buildKnowledge } from '../../../src/bots/knowledge';
import type { Action } from '../../../src/engine/actions';
import type { CardId } from '../../../src/engine/cards';
import {
  applyAction,
  currentActor,
  dealNextHand,
  legalActions,
  newGame,
} from '../../../src/engine/game';
import { STANDARD_RULES, type RuleSet } from '../../../src/engine/rules';
import { SEATS } from '../../../src/engine/seats';
import type { GameState } from '../../../src/engine/state';
import { toPlayerView, type PlayerView } from '../../../src/engine/view';
import { seededRng } from '../../../src/util/rng';
import { contextFor, makeView } from '../../helpers/bots';

const FARMER_LEGAL: Action[] = [{ type: 'farmerExchange', cards: [] }];
const DEFEND_LEGAL: Action[] = [
  { type: 'defendAlone', accept: true },
  { type: 'defendAlone', accept: false },
];
const FORCED_LEGAL: Action[] = [{ type: 'orderUp', alone: true }, { type: 'pass' }];

const top = <T>(options: readonly { value: T; score: number }[]) =>
  [...options].sort((a, b) => b.score - a.score)[0]!;

describe("the farmer's hand (RU-15)", () => {
  const farmerView = (myHand: CardId[]) =>
    makeView({
      myHand,
      phase: 'farmer',
      toAct: 0,
      contract: null,
      upcard: 'JD',
      upcardStatus: 'faceUp',
    });

  it('always swaps, giving up nines before tens and short suits before long', () => {
    const view = farmerView(['9S', 'TS', '9H', 'TH', '9C']);
    const best = top(conventionalFarmer.exchange(contextFor(view, { legal: FARMER_LEGAL })));
    expect(best.value).toEqual(['9C', '9S', '9H']);
  });

  it('decides through the bot as a legal swap, with a reason', () => {
    const view = farmerView(['9S', 'TS', '9H', 'TH', '9C']);
    const legal: Action[] = [
      { type: 'farmerExchange', cards: ['9S', '9H', '9C'] },
      { type: 'farmerExchange', cards: [] },
    ];
    const decision = createBot({ role: 'opponent', personaId: 'smooth', skill: 'standard' }).decide(
      view,
      legal
    );
    expect(decision.action).toEqual({ type: 'farmerExchange', cards: ['9C', '9S', '9H'] });
    expect(decision.reason.code).toBe('farmer-swap');
  });

  it('counts the cards it swapped away as out of play', () => {
    const view = makeView({
      myHand: ['TS', 'TH', 'QD', 'KD', 'AD'],
      myFarmerSwap: ['9C', '9S', '9H'],
    });
    const known = buildKnowledge(view);
    expect(known.unseen.has('9C')).toBe(false);
    expect(known.unseen.has('JC')).toBe(true);
  });
});

describe('defending alone (RU-13)', () => {
  // Seat 1 defends against seat 0's hearts.
  const defender = (myHand: CardId[], style = {}) =>
    top(
      conventionalLoner.defendAlone(
        contextFor(makeView({ seat: 1, myHand, phase: 'defendAlone', toAct: 1 }), {
          legal: DEFEND_LEGAL,
          style,
        })
      )
    );

  it('defends alone only on a hand that can stop the makers', () => {
    expect(defender(['JH', 'JD', 'AH', 'AS', 'AC'])).toMatchObject({
      value: true,
      reason: { code: 'defend-alone-strong' },
    });
    expect(defender(['AH', 'KS', 'AC', '9D', 'QS'])).toMatchObject({
      value: false,
      reason: { code: 'defend-alone-not-strong-enough' },
    });
  });

  it('counts a picked-up upcard against it when the makers dealt', () => {
    const hand: CardId[] = ['JH', 'JD', 'AS', 'AC', 'KH'];
    const score = (dealer: 0 | 1 | 2 | 3) =>
      conventionalLoner.defendAlone(
        contextFor(
          makeView({
            seat: 1,
            dealer,
            myHand: hand,
            phase: 'defendAlone',
            upcard: 'AH',
            upcardStatus: 'pickedUp',
          }),
          { legal: DEFEND_LEGAL }
        )
      )[0]!.score;
    expect(score(2)).toBeLessThan(score(3));
  });

  it('answers through the bot without a random slip', () => {
    const view = makeView({
      seat: 1,
      myHand: ['AH', 'KS', 'AC', '9D', 'QS'],
      phase: 'defendAlone',
    });
    const decision = createBot({ role: 'opponent', personaId: 'rusty', skill: 'casual' }).decide(
      view,
      DEFEND_LEGAL
    );
    expect(decision.action).toEqual({ type: 'defendAlone', accept: false });
  });
});

describe("the dealer's partner must go alone (RU-14)", () => {
  const forced = (myHand: CardId[]): PlayerView =>
    makeView({
      seat: 1,
      dealer: 3,
      myHand,
      phase: 'bidRound1',
      toAct: 1,
      contract: null,
      upcard: '9H',
      upcardStatus: 'faceUp',
      rules: { ...STANDARD_RULES, dealerPartnerMustGoAlone: true },
    });

  it('judges the call as a loner, without the upcard', () => {
    const strong = top(
      conventionalBidding.round1(
        contextFor(forced(['JH', 'JD', 'AH', 'KH', 'AS']), { legal: FORCED_LEGAL })
      )
    );
    expect(strong.value).toEqual({ type: 'orderUp', alone: true });
    // Good enough to order up with a partner's help, not to go alone.
    const fair = top(
      conventionalBidding.round1(
        contextFor(forced(['JH', 'AH', 'KS', 'AC', '9D']), { legal: FORCED_LEGAL })
      )
    );
    expect(fair.value).toEqual({ type: 'pass' });
  });

  it('orders up alone through the bot, with the forced-alone reason', () => {
    const decision = createBot({ role: 'partner', personaId: 'partner', skill: 'sharp' }).decide(
      forced(['JH', 'JD', 'AH', 'KH', 'AS']),
      FORCED_LEGAL
    );
    expect(decision).toMatchObject({
      action: { type: 'orderUp', alone: true },
      reason: { code: 'bid-forced-alone' },
    });
  });
});

describe('the loner sweep value (RU-12)', () => {
  it('goes alone a little more readily when a sweep is worth 5', () => {
    const view = (lonerSweepPoints: 4 | 5) =>
      makeView({ myHand: ['JH'], rules: { ...STANDARD_RULES, lonerSweepPoints } });
    expect(lonerThreshold(contextFor(view(4)))).toBe(BASE_LONER_THRESHOLD);
    expect(lonerThreshold(contextFor(view(5)))).toBeCloseTo(
      BASE_LONER_THRESHOLD - FIVE_POINT_SWEEP_BONUS
    );
  });
});

const ALL_ON: RuleSet = {
  targetScore: 5,
  stickTheDealer: true,
  lonersAllowed: true,
  lonerSweepPoints: 5,
  defendAlone: true,
  dealerPartnerMustGoAlone: true,
  farmersHand: true,
};

/** A whole game of bots at one level, checking every decision is legal. */
function botGame(rules: RuleSet, skill: SkillLevel, seed: number): GameState {
  const spec: BotSpec = { role: 'opponent', personaId: 'shrubs', skill };
  const bots = SEATS.map(() => createBot(spec));
  const rng = seededRng(seed);
  let state = newGame(rules, (seed % 4) as 0 | 1 | 2 | 3, rng).state;
  for (let hands = 0; hands < 100 && state.winner === null; hands++) {
    for (let seat = currentActor(state); seat !== null; seat = currentActor(state)) {
      const decision = bots[seat]!.decide(toPlayerView(state, seat), legalActions(state, seat));
      const applied = applyAction(state, seat, decision.action);
      if (!applied.ok) throw new Error(`Illegal bot action: ${JSON.stringify(decision.action)}`);
      state = applied.state;
    }
    if (state.winner === null) state = dealNextHand(state, rng).state;
  }
  return state;
}

describe('bots under every house rule', () => {
  it.each([1, 2, 3, 4, 5, 6])('finish a Casual game with every rule on (seed %i)', (seed) => {
    const end = botGame(ALL_ON, 'casual', seed);
    expect(Math.max(...end.score)).toBeGreaterThanOrEqual(5);
  });

  it('finish a Sharp game with every rule on', () => {
    expect(botGame(ALL_ON, 'sharp', 7).winner).not.toBeNull();
  });

  it('finish a Standard game with loners off', () => {
    expect(botGame({ ...ALL_ON, lonersAllowed: false }, 'standard', 8).winner).not.toBeNull();
  });
});

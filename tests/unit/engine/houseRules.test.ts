/**
 * The Sprint 9 house rules: the farmer's hand (RU-15), defending alone
 * (RU-13) and the dealer's partner having to go alone (RU-14).
 */
import { describe, expect, it } from 'vitest';
import { actionKey } from '../../../src/engine/actions';
import type { CardId } from '../../../src/engine/cards';
import type { GameEvent } from '../../../src/engine/events';
import { farmerSeat, isFarmersHand } from '../../../src/engine/farmer';
import {
  applyAction,
  currentActor,
  dealNextHand,
  legalActions,
  newGame,
} from '../../../src/engine/game';
import { STANDARD_RULES, type RuleSet } from '../../../src/engine/rules';
import { scoreHand } from '../../../src/engine/scoring';
import type { Contract, Trick } from '../../../src/engine/state';
import { toPlayerView } from '../../../src/engine/view';
import { seededRng } from '../../../src/util/rng';
import { act, deckFor, finishHand, gameFromDeck } from '../../helpers/engine';

const FARMER: RuleSet = { ...STANDARD_RULES, farmersHand: true };
const DEFEND: RuleSet = { ...STANDARD_RULES, defendAlone: true };
const MUST_GO_ALONE: RuleSet = { ...STANDARD_RULES, dealerPartnerMustGoAlone: true };

const PASS = { type: 'pass' } as const;
const ORDER = { type: 'orderUp', alone: false } as const;
const ORDER_ALONE = { type: 'orderUp', alone: true } as const;
const DEFEND_YES = { type: 'defendAlone', accept: true } as const;
const DEFEND_NO = { type: 'defendAlone', accept: false } as const;

// Dealer 3. Seat 0 holds a farmer's hand.
const FARMER_HANDS: CardId[][] = [
  ['9S', 'TS', '9H', 'TH', '9C'],
  ['JS', 'QS', 'KS', 'AS', 'TC'],
  ['JH', 'QH', 'KH', 'AH', 'JC'],
  ['QC', 'KC', 'AC', '9D', 'TD'],
];
const FARMER_KITTY: CardId[] = ['JD', 'QD', 'KD', 'AD'];
const farmerGame = (rules: RuleSet = FARMER) =>
  gameFromDeck(deckFor(FARMER_HANDS, FARMER_KITTY), 3, rules);

const swap = (cards: CardId[]) => ({ type: 'farmerExchange', cards }) as const;

describe("the farmer's hand (RU-15)", () => {
  it('is five 9s and 10s, nothing less', () => {
    expect(isFarmersHand(['9S', 'TS', '9H', 'TH', '9C'])).toBe(true);
    expect(isFarmersHand(['9S', 'TS', '9H', 'TH', 'JC'])).toBe(false);
    expect(isFarmersHand(['9S', 'TS', '9H', 'TH'])).toBe(false);
  });

  it('is ignored while the rule is off', () => {
    const s = farmerGame(STANDARD_RULES);
    expect(s.hand.phase).toEqual({ kind: 'bidRound1', toAct: 0 });
    expect(farmerSeat(s.hand.hands, 3, STANDARD_RULES)).toBeNull();
  });

  it('offers the farmer every three-card swap, or keeping the hand, before bidding', () => {
    const s = farmerGame();
    expect(s.hand.phase).toEqual({ kind: 'farmer', seat: 0 });
    expect(currentActor(s)).toBe(0);
    const legal = legalActions(s, 0);
    expect(legal).toHaveLength(11);
    expect(legal.at(-1)).toEqual(swap([]));
    expect(legal.every((a) => a.type === 'farmerExchange')).toBe(true);
    expect(legalActions(s, 1)).toEqual([]);
    expect(toPlayerView(s, 2).toAct).toBe(0);
  });

  it('swaps three cards, sight unseen, for the face-down kitty cards', () => {
    const log: GameEvent[] = [];
    const s = act(farmerGame(), 0, swap(['9C', '9H', '9S']), log);
    expect(s.hand.hands[0]).toEqual(['TS', 'TH', 'QD', 'KD', 'AD']);
    expect(s.hand.farmerSwap).toEqual({ seat: 0, gave: ['9C', '9H', '9S'] });
    expect(s.hand.kitty).toEqual(FARMER_KITTY);
    expect(s.hand.phase).toEqual({ kind: 'bidRound1', toAct: 0 });
    expect(log).toEqual([{ type: 'farmerSwapped', seat: 0 }]);
    // Only the farmer knows what went under the upcard.
    expect(toPlayerView(s, 0).myFarmerSwap).toEqual(['9C', '9H', '9S']);
    expect(toPlayerView(s, 1).myFarmerSwap).toBeNull();
    expect(toPlayerView(s, 3).myFarmerSwap).toBeNull();
  });

  it('accepts the three cards in any order', () => {
    const s = farmerGame();
    expect(applyAction(s, 0, swap(['TS', '9S', 'TH'])).ok).toBe(true);
    expect(actionKey(swap(['TS', '9S', 'TH']))).toBe(actionKey(swap(['9S', 'TH', 'TS'])));
    expect(applyAction(s, 0, swap(['9S', 'TS'])).ok).toBe(false);
    expect(applyAction(s, 0, swap(['9S', 'TS', 'AD'])).ok).toBe(false);
  });

  it('keeps the hand quietly: nothing public happens', () => {
    const log: GameEvent[] = [];
    const s = act(farmerGame(), 0, swap([]), log);
    expect(s.hand.hands[0]).toEqual(FARMER_HANDS[0]);
    expect(s.hand.farmerSwap).toBeNull();
    expect(s.hand.phase).toEqual({ kind: 'bidRound1', toAct: 0 });
    expect(log).toEqual([]);
  });

  it('lets the dealer swap, and still offers the upcard', () => {
    const hands = [FARMER_HANDS[1]!, FARMER_HANDS[2]!, FARMER_HANDS[3]!, FARMER_HANDS[0]!];
    let s = gameFromDeck(deckFor(hands, FARMER_KITTY, 3), 3, FARMER);
    expect(s.hand.phase).toEqual({ kind: 'farmer', seat: 3 });
    s = act(s, 3, swap(['9S', 'TS', '9H']));
    s = act(s, 0, ORDER);
    expect(s.hand.hands[3]).toEqual(['TH', '9C', 'QD', 'KD', 'AD', 'JD']);
    expect(s.hand.phase).toEqual({ kind: 'dealerDiscard' });
  });

  it('plays a swapped hand through to a score', () => {
    let s = act(farmerGame(), 0, swap(['9C', '9H', '9S']));
    s = finishHand(s, (legal) => legal[0]!);
    expect(s.hand.phase.kind).toBe('complete');
  });

  it('is detected on every deal, the first and later ones', () => {
    // Seed 116 deals seat 0 a farmer's hand when seat 0 deals.
    expect(newGame(FARMER, 0, seededRng(116)).state.hand.phase).toEqual({
      kind: 'farmer',
      seat: 0,
    });
    const done = finishHand(act(farmerGame(), 0, swap([])), (legal) => legal[0]!);
    expect(dealNextHand(done, seededRng(116)).state.hand.phase).toEqual({
      kind: 'farmer',
      seat: 0,
    });
    expect(dealNextHand(done, seededRng(116)).state.hand.farmerSwap).toBeNull();
  });
});

describe('defending alone (RU-13)', () => {
  // Canonical deal, dealer 3: seat 0 orders up diamonds; the dealer discards.
  const ordered = (rules: RuleSet = DEFEND) => {
    let s = act(gameFromDeck(undefined, 3, rules), 0, ORDER);
    s = act(s, 3, { type: 'discard', card: 'AC' });
    return s;
  };

  it('asks each defender in turn, from the maker’s left, once trump is set', () => {
    let s = ordered();
    expect(s.hand.phase).toEqual({ kind: 'defendAlone', toAct: 1 });
    expect(legalActions(s, 1)).toEqual([DEFEND_YES, DEFEND_NO]);
    expect(legalActions(s, 3)).toEqual([]);
    const log: GameEvent[] = [];
    s = act(s, 1, DEFEND_NO, log);
    expect(s.hand.phase).toEqual({ kind: 'defendAlone', toAct: 3 });
    s = act(s, 3, DEFEND_NO, log);
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 0 });
    expect(s.hand.contract?.loneDefender).toBeNull();
    expect(log).toEqual([
      { type: 'defendAloneChosen', seat: 1, accept: false },
      { type: 'defendAloneChosen', seat: 3, accept: false },
    ]);
  });

  it('sits the lone defender’s partner out and plays three-handed', () => {
    let s = act(act(ordered(), 1, DEFEND_NO), 3, DEFEND_YES);
    expect(s.hand.contract).toMatchObject({ maker: 0, loneDefender: 3 });
    expect(toPlayerView(s, 0).sittingOut).toEqual([1]);
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 0 });
    s = finishHand(s, (legal) => legal[0]!);
    expect(s.hand.tricks.every((t) => t.plays.length === 3)).toBe(true);
    expect(s.hand.tricks.flatMap((t) => t.plays).some((p) => p.seat === 1)).toBe(false);
  });

  it('follows a round-two call too', () => {
    let s = gameFromDeck(undefined, 3, DEFEND);
    for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, PASS);
    s = act(s, 0, { type: 'callTrump', suit: 'S', alone: false });
    expect(s.hand.phase).toEqual({ kind: 'defendAlone', toAct: 1 });
  });

  it('goes one against one when the maker is alone, the lead passing over both empty seats', () => {
    // The dealer's partner orders up alone: the dealer sits out without the upcard.
    let s = act(act(gameFromDeck(undefined, 3, DEFEND), 0, PASS), 1, ORDER_ALONE);
    expect(s.hand.phase).toEqual({ kind: 'defendAlone', toAct: 2 });
    s = act(s, 2, DEFEND_YES);
    expect(toPlayerView(s, 2).sittingOut).toEqual([3, 0]);
    expect(s.hand.phase).toEqual({ kind: 'play', toAct: 1 });
    s = finishHand(s, (legal) => legal[0]!);
    expect(s.hand.tricks.every((t) => t.plays.length === 2)).toBe(true);
  });

  it('is not offered while the rule is off, or with loners off (RU-16)', () => {
    expect(ordered(STANDARD_RULES).hand.phase.kind).toBe('play');
    expect(ordered({ ...DEFEND, lonersAllowed: false }).hand.phase.kind).toBe('play');
  });

  it('scores a lone defender’s euchre at 4, and the makers as usual otherwise', () => {
    const contract: Contract = { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: 1 };
    const tricks = (...winners: (0 | 1 | 2 | 3)[]): Trick[] =>
      winners.map((winner) => ({ leader: 0, plays: [], winner }));
    expect(scoreHand(contract, tricks(1, 1, 1, 0, 0), DEFEND)).toMatchObject({
      outcome: 'euchredByLoneDefender',
      points: 4,
      pointsTo: 1,
    });
    expect(scoreHand(contract, tricks(0, 0, 0, 1, 1), DEFEND)).toMatchObject({
      outcome: 'made',
      points: 1,
    });
    expect(scoreHand(contract, tricks(0, 0, 2, 0, 0), DEFEND)).toMatchObject({
      outcome: 'march',
      points: 2,
    });
    const alone = { ...contract, alone: true };
    expect(scoreHand(alone, tricks(0, 1, 1, 1, 0), DEFEND)).toMatchObject({
      outcome: 'euchredByLoneDefender',
      points: 4,
    });
  });
});

describe("the dealer's partner must go alone (RU-14)", () => {
  it('lets the dealer’s partner order up only by going alone', () => {
    const s = act(gameFromDeck(undefined, 3, MUST_GO_ALONE), 0, PASS);
    expect(legalActions(s, 1).map(actionKey)).toEqual(['orderUp:alone', 'pass']);
  });

  it('leaves every other seat, and round two, alone', () => {
    let s = gameFromDeck(undefined, 3, MUST_GO_ALONE);
    expect(legalActions(s, 0).map(actionKey)).toEqual(['orderUp', 'orderUp:alone', 'pass']);
    for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, PASS);
    s = act(s, 0, PASS);
    expect(legalActions(s, 1).map(actionKey)).toContain('callTrump:S');
  });

  it('has no effect with loners off (RU-16)', () => {
    const s = act(gameFromDeck(undefined, 3, { ...MUST_GO_ALONE, lonersAllowed: false }), 0, PASS);
    expect(legalActions(s, 1).map(actionKey)).toEqual(['orderUp', 'pass']);
  });
});

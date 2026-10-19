import type { DecisionContext } from '../../src/bots/context';
import { HeuristicEvaluator } from '../../src/bots/evaluate';
import { buildKnowledge } from '../../src/bots/knowledge';
import { BY_THE_BOOK, type StyleProfile } from '../../src/bots/personas';
import type { Action } from '../../src/engine/actions';
import type { CardId } from '../../src/engine/cards';
import { legalPlays } from '../../src/engine/play';
import { STANDARD_RULES } from '../../src/engine/rules';
import type { Seat } from '../../src/engine/seats';
import type { TrickPlay } from '../../src/engine/state';
import type { PlayerView } from '../../src/engine/view';
import { seededRng } from '../../src/util/rng';

/**
 * A player view for convention tests. Defaults: seat 0 to play, hearts
 * trump made by seat 0, dealer seat 3, nothing played yet.
 */
export function makeView(over: Partial<PlayerView> & { myHand: readonly CardId[] }): PlayerView {
  return {
    seat: 0,
    rules: STANDARD_RULES,
    score: [0, 0],
    dealer: 3,
    handNumber: 1,
    phase: 'play',
    toAct: over.seat ?? 0,
    upcard: '9D',
    upcardStatus: 'turnedDown',
    myDiscard: null,
    handSizes: [5, 5, 5, 5],
    bids: [],
    contract: { trump: 'H', maker: 0, round: 2, alone: false },
    tricks: [],
    currentTrick: null,
    sittingOut: null,
    result: null,
    gameWinner: null,
    ...over,
  };
}

/** A trick in progress, led by the first play. */
export function trickOf(...plays: [Seat, CardId][]): PlayerView['currentTrick'] {
  return {
    leader: plays[0]![0],
    plays: plays.map(([seat, card]): TrickPlay => ({ seat, card })),
    winner: null,
  };
}

/** The legal actions for the view's phase, as the engine would compute them. */
export function legalFor(view: PlayerView): Action[] {
  switch (view.phase) {
    case 'play':
      return legalPlays(view.myHand, view.currentTrick, view.contract!.trump).map((card) => ({
        type: 'play',
        card,
      }));
    case 'dealerDiscard':
      return view.myHand.map((card) => ({ type: 'discard', card }));
    case 'bidRound1':
      return [
        { type: 'orderUp', alone: false },
        { type: 'orderUp', alone: true },
        { type: 'pass' },
      ];
    default:
      throw new Error(`Pass legal actions explicitly for ${view.phase}`);
  }
}

export function contextFor(
  view: PlayerView,
  options: { legal?: readonly Action[]; style?: Partial<StyleProfile> } = {}
): DecisionContext {
  return {
    view,
    legal: options.legal ?? legalFor(view),
    knowledge: buildKnowledge(view),
    evaluator: new HeuristicEvaluator(),
    style: { ...BY_THE_BOOK, ...options.style },
    rng: seededRng(1),
  };
}

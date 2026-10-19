import type { Action } from '../../src/engine/actions';
import { ALL_CARDS, type CardId } from '../../src/engine/cards';
import { dealFrom } from '../../src/engine/deal';
import type { GameEvent } from '../../src/engine/events';
import { applyAction, currentActor, dealNextHand, legalActions } from '../../src/engine/game';
import { leftOf, type Seat } from '../../src/engine/seats';
import { STANDARD_RULES, type RuleSet } from '../../src/engine/rules';
import type { GameState } from '../../src/engine/state';
import type { Rng } from '../../src/util/rng';

/**
 * A fresh game dealt from a known deck order. With the canonical deck and
 * dealer 3:
 *
 *   seat 0: 9S TS JS KH AH     seat 2: AS 9H TH QC KC
 *   seat 1: QS KS 9C TC JC     seat 3: JH QH AC 9D TD
 *   kitty:  JD QD KD AD  (upcard JD)
 */
export function gameFromDeck(
  deck: readonly CardId[] = ALL_CARDS,
  dealer: Seat = 3,
  rules: RuleSet = STANDARD_RULES
): GameState {
  const { hands, kitty } = dealFrom(deck, dealer);
  return {
    rules,
    score: [0, 0],
    dealer,
    handNumber: 1,
    hand: {
      dealer,
      phase: { kind: 'bidRound1', toAct: leftOf(dealer) },
      hands,
      kitty,
      upcardStatus: 'faceUp',
      bids: [],
      contract: null,
      discard: null,
      tricks: [],
      currentTrick: null,
    },
    completedHands: [],
    winner: null,
  };
}

/** Apply an action that must be legal; collects events into `log` if given. */
export function act(state: GameState, seat: Seat, action: Action, log?: GameEvent[]): GameState {
  const applied = applyAction(state, seat, action);
  if (!applied.ok) {
    throw new Error(
      `Expected ${JSON.stringify(action)} by seat ${seat} to apply: ${applied.reason}`
    );
  }
  log?.push(...applied.events);
  return applied.state;
}

/** Let the current actor take an action chosen by `choose` until the hand is complete. */
export function finishHand(
  state: GameState,
  choose: (legal: readonly Action[], seat: Seat) => Action,
  log?: GameEvent[]
): GameState {
  let s = state;
  for (let seat = currentActor(s); seat !== null; seat = currentActor(s)) {
    s = act(s, seat, choose(legalActions(s, seat), seat), log);
  }
  return s;
}

export const randomChoice =
  (rng: Rng) =>
  (legal: readonly Action[]): Action =>
    legal[rng.nextInt(legal.length)]!;

/** Play hands with random legal actions until someone wins. */
export function playRandomGame(
  state: GameState,
  rng: Rng,
  onState?: (s: GameState, events: readonly GameEvent[]) => void
): GameState {
  let s = state;
  for (let guard = 0; guard < 500; guard++) {
    const log: GameEvent[] = [];
    let seat = currentActor(s);
    while (seat !== null) {
      const legal = legalActions(s, seat);
      const applied = applyAction(s, seat, legal[rng.nextInt(legal.length)]!);
      if (!applied.ok) throw new Error(`Legal action rejected: ${applied.reason}`);
      log.push(...applied.events);
      s = applied.state;
      onState?.(s, applied.events);
      seat = currentActor(s);
    }
    if (s.winner !== null) return s;
    const dealt = dealNextHand(s, rng);
    onState?.(dealt.state, dealt.events);
    s = dealt.state;
  }
  throw new Error('Game did not finish within 500 hands');
}

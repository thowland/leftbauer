// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The dev panel's table session (`?dev`). Advances the engine one action
 * at a time with a seeded random choice, so hands can be watched and
 * reproduced. This is a debugging tool: the real game loop is the
 * session layer's TableDriver (Sprint 3).
 */

import type { Action } from '../../engine/actions';
import type { GameEvent } from '../../engine/events';
import { applyAction, currentActor, dealNextHand, legalActions, newGame } from '../../engine/game';
import type { RuleSet } from '../../engine/rules';
import type { Seat } from '../../engine/seats';
import type { GameState } from '../../engine/state';
import type { Rng } from '../../util/rng';
import { describeEvent } from '../describe';

export const LOG_LIMIT = 60;

export interface LogEntry {
  readonly id: number;
  readonly text: string;
}

export interface DevTable {
  readonly game: GameState;
  readonly humanSeat: Seat;
  readonly log: readonly LogEntry[];
  readonly nextLogId: number;
}

export type Chooser = (legal: readonly Action[]) => Action;

export function randomChooser(rng: Rng): Chooser {
  return (legal) => legal[rng.nextInt(legal.length)]!;
}

function withEvents(table: DevTable, game: GameState, events: readonly GameEvent[]): DevTable {
  let id = table.nextLogId;
  const entries: LogEntry[] = [];
  for (const event of events) {
    const text = describeEvent(event, table.humanSeat, game.hand.dealer);
    if (text !== null) entries.push({ id: id++, text });
  }
  return { ...table, game, log: [...table.log, ...entries].slice(-LOG_LIMIT), nextLogId: id };
}

export function startTable(rules: RuleSet, dealer: Seat, humanSeat: Seat, rng: Rng): DevTable {
  const { state, events } = newGame(rules, dealer, rng);
  return withEvents({ game: state, humanSeat, log: [], nextLogId: 0 }, state, events);
}

/** One action by whoever must act. No change once the hand is complete. */
export function stepTable(table: DevTable, choose: Chooser): DevTable {
  const seat = currentActor(table.game);
  if (seat === null) return table;
  const applied = applyAction(table.game, seat, choose(legalActions(table.game, seat)));
  // The chooser picks from legalActions, so the engine always accepts it.
  if (!applied.ok) throw new Error(`Engine rejected a legal action: ${applied.reason}`);
  return withEvents(table, applied.state, applied.events);
}

export function finishTableHand(table: DevTable, choose: Chooser): DevTable {
  let t = table;
  while (currentActor(t.game) !== null) t = stepTable(t, choose);
  return t;
}

export function canDealNext(table: DevTable): boolean {
  return table.game.hand.phase.kind === 'complete' && table.game.winner === null;
}

export function dealNextTableHand(table: DevTable, rng: Rng): DevTable {
  if (!canDealNext(table)) return table;
  const { state, events } = dealNextHand(table.game, rng);
  return withEvents(table, state, events);
}

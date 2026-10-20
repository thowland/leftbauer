/**
 * Lifetime stats — PE-2, UI-5; Technical Spec §10.3.
 *
 * A pure reducer over game events, kept separately for each opponent
 * difficulty. Everything is counted from the human's point of view:
 * "calls" are hands the human named trump, while euchres and marches
 * count for the human's team. Hints are deliberately not recorded (CO-3).
 * A game abandoned before it ends (conceded, or replaced by a new game)
 * counts as played and lost.
 *
 * Pure module: no DOM, no React, no storage (it is injected).
 */

import type { SkillLevel } from '../bots/bot';
import type { GameEvent } from '../engine/events';
import { leftOf, teamOf, type Seat } from '../engine/seats';
import { EUCHRE_OUTCOMES, type GameState } from '../engine/state';
import type { EventSink } from '../session/driver';
import { isRecord, load, save, type StorageLike, type VersionedStore } from './persistence';
import type { SeatSetup } from './savedGame';

export interface Tally {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  /** Scored hands; redeals are not counted. */
  readonly handsPlayed: number;
  /** Hands where the human named trump, and how many of those were made. */
  readonly calls: number;
  readonly made: number;
  /** The human's team euchred the makers. */
  readonly euchresGiven: number;
  /** The human's team was euchred. */
  readonly euchresTaken: number;
  /** All five tricks to the human's team as makers, alone or not. */
  readonly marches: number;
  /** Loners the human declared, and how many of those were made. */
  readonly lonersAttempted: number;
  readonly lonersMade: number;
}

export type Stats = Readonly<Record<SkillLevel, Tally>>;

export const STAT_LEVELS: readonly SkillLevel[] = ['casual', 'standard', 'sharp'];

export const EMPTY_TALLY: Tally = {
  gamesPlayed: 0,
  gamesWon: 0,
  handsPlayed: 0,
  calls: 0,
  made: 0,
  euchresGiven: 0,
  euchresTaken: 0,
  marches: 0,
  lonersAttempted: 0,
  lonersMade: 0,
};

export const EMPTY_STATS: Stats = {
  casual: EMPTY_TALLY,
  standard: EMPTY_TALLY,
  sharp: EMPTY_TALLY,
};

const TALLY_KEYS = Object.keys(EMPTY_TALLY) as (keyof Tally)[];

type Counts = { -readonly [K in keyof Tally]: number };

/** Fold one batch of events into the stats. `state` is the state after them. */
export function applyToStats(
  stats: Stats,
  events: readonly GameEvent[],
  state: GameState,
  humanSeat: Seat,
  skill: SkillLevel
): Stats {
  const t: Counts = { ...stats[skill] };
  const us = teamOf(humanSeat);
  for (const event of events) {
    if (event.type === 'gameOver') {
      t.gamesPlayed++;
      if (event.winner === us) t.gamesWon++;
      continue;
    }
    if (event.type !== 'handScored' || event.result.kind !== 'scored') continue;
    const { result } = event;
    t.handsPlayed++;
    const euchred = EUCHRE_OUTCOMES.includes(result.outcome);
    if (euchred) {
      if (result.makers === us) t.euchresTaken++;
      else t.euchresGiven++;
    } else if (
      result.makers === us &&
      (result.outcome === 'march' || result.outcome === 'lonerSweep')
    ) {
      t.marches++;
    }
    // The hand keeps its contract until the next deal, so the maker is known here.
    if (state.hand.contract?.maker === humanSeat) {
      t.calls++;
      if (!euchred) t.made++;
      if (state.hand.contract.alone) {
        t.lonersAttempted++;
        if (!euchred) t.lonersMade++;
      }
    }
  }
  return { ...stats, [skill]: t };
}

/** A game left unfinished counts as played and lost. */
export function recordAbandoned(stats: Stats, skill: SkillLevel): Stats {
  return { ...stats, [skill]: { ...stats[skill], gamesPlayed: stats[skill].gamesPlayed + 1 } };
}

/** Every level added together. */
export function totalOf(stats: Stats): Tally {
  const total: Counts = { ...EMPTY_TALLY };
  for (const level of STAT_LEVELS) {
    for (const key of TALLY_KEYS) total[key] += stats[level][key];
  }
  return total;
}

/** The difficulty a game's stats belong to: its opponents' level. */
export function opponentSkill(seats: SeatSetup): SkillLevel {
  return seats.bots[leftOf(seats.humanSeat)]?.skill ?? 'standard';
}

const isTally = (v: unknown): v is Tally =>
  isRecord(v) &&
  TALLY_KEYS.every((k) => Number.isInteger(v[k]) && (v[k] as number) >= 0) &&
  (v.gamesWon as number) <= (v.gamesPlayed as number) &&
  (v.made as number) <= (v.calls as number) &&
  (v.lonersMade as number) <= (v.lonersAttempted as number);

export function isStats(value: unknown): value is Stats {
  return isRecord(value) && STAT_LEVELS.every((level) => isTally(value[level]));
}

export const STATS_STORE: VersionedStore<Stats> = {
  key: 'leftbauer:stats',
  schemaVersion: 1,
  migrations: {},
  isValid: isStats,
};

export function loadStats(storage: StorageLike): Stats {
  return load(storage, STATS_STORE) ?? EMPTY_STATS;
}

/** Updates the stored stats as a game is played (PE-2). */
export class StatsSink implements EventSink {
  constructor(
    private readonly storage: StorageLike,
    private readonly humanSeat: Seat,
    private readonly skill: SkillLevel
  ) {}

  handle(events: readonly GameEvent[], state: GameState): void {
    if (!events.some((e) => e.type === 'handScored' || e.type === 'gameOver')) return;
    const next = applyToStats(loadStats(this.storage), events, state, this.humanSeat, this.skill);
    save(this.storage, STATS_STORE, next);
  }
}

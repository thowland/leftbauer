/**
 * The tournament harness — Technical Spec §11.3.
 *
 * Plays bot teams against each other over seeded deals with the same
 * TableDriver the app uses (no pacing, no presentation), and reports how
 * each team fared. Used to tune conventions and personas, confirm the
 * difficulty ordering, and guard bot strength in the test suite.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BotSpec } from '../bots/bot';
import { newGame } from '../engine/game';
import { STANDARD_RULES, type RuleSet } from '../engine/rules';
import type { Seat, Team } from '../engine/seats';
import { EUCHRE_OUTCOMES, type HandResult } from '../engine/state';
import { hashSeed, seededRng } from '../util/rng';
import { InlineBotRunner } from './botRunner';
import { BotSeatController } from './controllers';
import { TableDriver } from './driver';
import { immediateScheduler } from './scheduler';

export interface TeamEntry {
  readonly label: string;
  /** The two partners; the first sits in the lower-numbered seat. */
  readonly specs: readonly [BotSpec, BotSpec];
}

export interface TeamStats {
  readonly label: string;
  wins: number;
  points: number;
  /** Hands where this team made trump. */
  calls: number;
  made: number;
  marches: number;
  euchredAsMakers: number;
  euchresInflicted: number;
  lonerAttempts: number;
  lonersMade: number;
}

export interface MatchReport {
  readonly games: number;
  readonly hands: number;
  readonly redeals: number;
  readonly a: TeamStats;
  readonly b: TeamStats;
}

export interface MatchOptions {
  readonly games: number;
  readonly seed: number;
  readonly rules?: RuleSet;
  /**
   * The number of the first game. A match split across processes gives
   * each a range of game numbers; merged, the shards equal one long run.
   */
  readonly firstGame?: number;
}

function emptyStats(label: string): TeamStats {
  return {
    label,
    wins: 0,
    points: 0,
    calls: 0,
    made: 0,
    marches: 0,
    euchredAsMakers: 0,
    euchresInflicted: 0,
    lonerAttempts: 0,
    lonersMade: 0,
  };
}

function tally(results: readonly HandResult[], ofTeam: (t: Team) => TeamStats): number {
  let redeals = 0;
  for (const r of results) {
    if (r.kind === 'redeal') {
      redeals++;
      continue;
    }
    const makers = ofTeam(r.makers);
    makers.calls++;
    ofTeam(r.pointsTo).points += r.points;
    const alone =
      r.outcome === 'lonerMade' || r.outcome === 'lonerSweep' || r.outcome === 'euchredAlone';
    if (alone) makers.lonerAttempts++;
    if (EUCHRE_OUTCOMES.includes(r.outcome)) {
      makers.euchredAsMakers++;
      ofTeam(r.pointsTo).euchresInflicted++;
    } else {
      makers.made++;
      if (r.outcome === 'march') makers.marches++;
      if (r.outcome === 'lonerMade' || r.outcome === 'lonerSweep') makers.lonersMade++;
    }
  }
  return redeals;
}

/**
 * Play `games` games between two teams. Teams swap seats every game and
 * the first dealer rotates, so neither side gains from position.
 */
export async function runMatch(
  a: TeamEntry,
  b: TeamEntry,
  options: MatchOptions
): Promise<MatchReport> {
  const rules = options.rules ?? STANDARD_RULES;
  const runner = new InlineBotRunner();
  const stats = { a: emptyStats(a.label), b: emptyStats(b.label) };
  let hands = 0;
  let redeals = 0;

  const first = options.firstGame ?? 0;
  for (let game = first; game < first + options.games; game++) {
    const aFirst = game % 2 === 0;
    const [even, odd] = aFirst ? [a, b] : [b, a];
    const specs = [even.specs[0], odd.specs[0], even.specs[1], odd.specs[1]] as const;
    const rng = seededRng(hashSeed('match', options.seed, game));
    const { state, events } = newGame(rules, (game % 4) as Seat, rng);
    const driver = new TableDriver(
      {
        controllers: [
          new BotSeatController(specs[0], runner),
          new BotSeatController(specs[1], runner),
          new BotSeatController(specs[2], runner),
          new BotSeatController(specs[3], runner),
        ],
        scheduler: immediateScheduler,
        shuffleRng: rng,
        autoContinue: true,
      },
      state
    );
    const end = await driver.start(events);
    const ofTeam = (t: Team) => ((t === 0) === aFirst ? stats.a : stats.b);
    ofTeam(end.winner!).wins++;
    hands += end.completedHands.length;
    redeals += tally(end.completedHands, ofTeam);
  }
  return { games: options.games, hands, redeals, ...stats };
}

/** Combine shards of one match (the same two teams, disjoint games). */
export function mergeReports(reports: readonly MatchReport[]): MatchReport {
  const sum = (pick: (r: MatchReport) => TeamStats): TeamStats => {
    const total = emptyStats(pick(reports[0]!).label);
    for (const r of reports) {
      const s = pick(r);
      for (const key of Object.keys(total) as (keyof TeamStats)[]) {
        if (key !== 'label') total[key] += s[key];
      }
    }
    return total;
  };
  return {
    games: reports.reduce((n, r) => n + r.games, 0),
    hands: reports.reduce((n, r) => n + r.hands, 0),
    redeals: reports.reduce((n, r) => n + r.redeals, 0),
    a: sum((r) => r.a),
    b: sum((r) => r.b),
  };
}

const pct = (n: number, d: number) =>
  d === 0 ? '  —  ' : `${((100 * n) / d).toFixed(1)}%`.padStart(6);

/** A plain-text table of a match report. */
export function formatReport(report: MatchReport): string {
  const row = (s: TeamStats) =>
    [
      s.label.padEnd(26),
      pct(s.wins, report.games),
      String(s.calls).padStart(6),
      pct(s.made, s.calls),
      pct(s.marches, s.calls),
      String(s.euchresInflicted).padStart(6),
      `${s.lonersMade}/${s.lonerAttempts}`.padStart(8),
    ].join('  ');
  return [
    `${report.games} games, ${report.hands} hands, ${report.redeals} redeals`,
    ['Team'.padEnd(26), '  Wins', ' Calls', '  Made', 'Marches', 'Euchres', '  Loners'].join('  '),
    row(report.a),
    row(report.b),
  ].join('\n');
}

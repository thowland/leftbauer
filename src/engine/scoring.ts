/**
 * Hand and game scoring — RU-8, RU-9.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { RuleSet } from './rules';
import { teamOf, type Team } from './seats';
import type { Contract, HandResult, Score, Trick } from './state';

/** Tricks taken by each team, indexed by team. */
export function tricksWon(tricks: readonly Trick[]): Score {
  const won: [number, number] = [0, 0];
  for (const trick of tricks) {
    if (trick.winner !== null) won[teamOf(trick.winner)]++;
  }
  return won;
}

/** Score a hand once all five tricks are played. */
export function scoreHand(
  contract: Contract,
  tricks: readonly Trick[],
  rules: RuleSet
): HandResult {
  const won = tricksWon(tricks);
  const makers = teamOf(contract.maker);
  const defenders: Team = makers === 0 ? 1 : 0;
  const made = won[makers];
  const base = { kind: 'scored', makers, tricksWon: won } as const;

  if (made < 3) {
    const outcome = contract.alone ? 'euchredAlone' : 'euchred';
    return { ...base, outcome, points: 2, pointsTo: defenders };
  }
  if (made < 5) {
    return { ...base, outcome: contract.alone ? 'lonerMade' : 'made', points: 1, pointsTo: makers };
  }
  return contract.alone
    ? { ...base, outcome: 'lonerSweep', points: rules.lonerSweepPoints, pointsTo: makers }
    : { ...base, outcome: 'march', points: 2, pointsTo: makers };
}

export function addResult(score: Score, result: HandResult): Score {
  if (result.kind === 'redeal') return score;
  const next: [number, number] = [score[0], score[1]];
  next[result.pointsTo] += result.points;
  return next;
}

/** The team that has reached the target score, if any. */
export function gameWinner(score: Score, rules: RuleSet): Team | null {
  if (score[0] >= rules.targetScore) return 0;
  if (score[1] >= rules.targetScore) return 1;
  return null;
}

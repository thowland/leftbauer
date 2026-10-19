/**
 * Choosing among scored options — Technical Spec §6.5.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Rng } from '../util/rng';
import type { ScoredOption } from './policies';

export interface Selector {
  select<T>(options: readonly ScoredOption<T>[], rng: Rng): ScoredOption<T>;
}

function ranked<T>(options: readonly ScoredOption<T>[]): ScoredOption<T>[] {
  if (options.length === 0) throw new Error('No options to choose from');
  // Stable: on equal scores the policy's own order wins.
  return [...options].sort((a, b) => b.score - a.score);
}

/** Always the highest-scoring option. */
export const bestSelector: Selector = {
  select: (options) => ranked(options)[0]!,
};

/**
 * Usually the best option, but with probability `mistakeRate` one of the
 * next `maxRankDrop` options instead: the Casual level (OP-2).
 */
export function noisySelector(mistakeRate: number, maxRankDrop: number): Selector {
  return {
    select(options, rng) {
      const sorted = ranked(options);
      const slip = rng.nextInt(1000) < mistakeRate * 1000;
      if (!slip || sorted.length === 1) return sorted[0]!;
      const drop = 1 + rng.nextInt(Math.min(maxRankDrop, sorted.length - 1));
      return sorted[drop]!;
    },
  };
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Skill: difficulty as strategy selection — OP-2; Technical Spec §6.5.
 *
 * Difficulty changes how well a bot plays, independently of its style.
 * Every tuning number lives here, never in policy code.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { SkillLevel } from './bot';
import type { SimulationBudget } from './simulate/cardPlay';

export interface SkillProfile {
  readonly cardPlay: 'conventional' | 'simulated';
  readonly selector:
    | { readonly kind: 'best' }
    | { readonly kind: 'noisy'; readonly mistakeRate: number; readonly maxRankDrop: number };
  /** Up to ± this many tricks of jitter on the evaluator's estimates. */
  readonly evaluationNoise: number;
  /** For simulated card play (Sharp). */
  readonly simulation?: SimulationBudget;
}

export const SKILLS: Record<SkillLevel, SkillProfile> = {
  casual: {
    cardPlay: 'conventional',
    selector: { kind: 'noisy', mistakeRate: 0.08, maxRankDrop: 2 },
    evaluationNoise: 0.3,
  },
  standard: {
    cardPlay: 'conventional',
    selector: { kind: 'best' },
    evaluationNoise: 0,
  },
  sharp: {
    cardPlay: 'simulated',
    selector: { kind: 'best' },
    evaluationNoise: 0,
    simulation: { samples: 80, timeBudgetMs: 250 },
  },
};

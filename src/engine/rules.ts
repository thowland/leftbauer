/**
 * The rule set — RU-10 to RU-16; Technical Spec §4.2.
 *
 * A game copies its `RuleSet` when it starts, so house rules can never
 * change mid-game. Every optional rule is off by default.
 *
 * Sprint 2 implements the standard rules plus the cheap variations
 * (stick the dealer, loners on/off, target score, loner sweep value).
 * Defending alone, the dealer's partner having to go alone and the
 * farmer's hand arrive in Sprint 9; until then `assertSupportedRules`
 * rejects them rather than silently ignoring them.
 *
 * Pure module: no DOM, no React, no storage.
 */

export type TargetScore = 5 | 7 | 10 | 11;

export interface RuleSet {
  readonly targetScore: TargetScore;
  readonly stickTheDealer: boolean;
  readonly lonersAllowed: boolean;
  readonly lonerSweepPoints: 4 | 5;
  readonly defendAlone: boolean;
  readonly dealerPartnerMustGoAlone: boolean;
  /** Mechanics undecided (RU-15); always `null` until they are. */
  readonly farmersHand: null;
}

export const STANDARD_RULES: RuleSet = {
  targetScore: 10,
  stickTheDealer: false,
  lonersAllowed: true,
  lonerSweepPoints: 4,
  defendAlone: false,
  dealerPartnerMustGoAlone: false,
  farmersHand: null,
};

export class UnsupportedRuleError extends Error {
  constructor(rule: keyof RuleSet) {
    super(`The "${rule}" house rule is not implemented yet`);
    this.name = 'UnsupportedRuleError';
  }
}

export function assertSupportedRules(rules: RuleSet): void {
  if (rules.defendAlone) throw new UnsupportedRuleError('defendAlone');
  if (rules.dealerPartnerMustGoAlone) throw new UnsupportedRuleError('dealerPartnerMustGoAlone');
}

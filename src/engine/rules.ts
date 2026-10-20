/**
 * The rule set — RU-10 to RU-16; Technical Spec §4.2.
 *
 * A game copies its `RuleSet` when it starts, so house rules can never
 * change mid-game. Every optional rule is off by default.
 *
 * The house rules that are about playing alone (defending alone, and the
 * dealer's partner having to go alone) only apply while loners are
 * allowed: turning loners off removes every alone option (RU-16).
 *
 * Pure module: no DOM, no React, no storage.
 */

export type TargetScore = 5 | 7 | 10 | 11;

export const TARGET_SCORES: readonly TargetScore[] = [5, 7, 10, 11];

export interface RuleSet {
  readonly targetScore: TargetScore;
  readonly stickTheDealer: boolean;
  readonly lonersAllowed: boolean;
  readonly lonerSweepPoints: 4 | 5;
  /** A defender may play alone against the makers; a lone euchre scores 4 (RU-13). */
  readonly defendAlone: boolean;
  /** The dealer's partner may order the dealer up only by going alone (RU-14). */
  readonly dealerPartnerMustGoAlone: boolean;
  /**
   * A player dealt five 9s and 10s may swap three of them for the three
   * face-down kitty cards before bidding (RU-15, ADR-0004).
   */
  readonly farmersHand: boolean;
}

export const STANDARD_RULES: RuleSet = {
  targetScore: 10,
  stickTheDealer: false,
  lonersAllowed: true,
  lonerSweepPoints: 4,
  defendAlone: false,
  dealerPartnerMustGoAlone: false,
  farmersHand: false,
};

/** Points for euchring the makers while defending alone (RU-13). */
export const LONE_DEFENCE_POINTS = 4;

/** Defending alone is in play: on, and loners allowed. */
export const defendAloneActive = (rules: RuleSet): boolean =>
  rules.defendAlone && rules.lonersAllowed;

/** The dealer's partner must go alone to order up: on, and loners allowed. */
export const dealerPartnerMustGoAloneActive = (rules: RuleSet): boolean =>
  rules.dealerPartnerMustGoAlone && rules.lonersAllowed;

const BOOLEAN_RULES = [
  'stickTheDealer',
  'lonersAllowed',
  'defendAlone',
  'dealerPartnerMustGoAlone',
  'farmersHand',
] as const satisfies readonly (keyof RuleSet)[];

/** A structural check for rule sets read from storage. */
export function isRuleSet(value: unknown): value is RuleSet {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    TARGET_SCORES.includes(v.targetScore as TargetScore) &&
    (v.lonerSweepPoints === 4 || v.lonerSweepPoints === 5) &&
    BOOLEAN_RULES.every((rule) => typeof v[rule] === 'boolean')
  );
}

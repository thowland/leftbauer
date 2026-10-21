// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The active rules in plain words — UI-2, RU-10 to RU-16. Used by the
 * table's Rules chip and the settings screen.
 */

import {
  dealerPartnerMustGoAloneActive,
  defendAloneActive,
  LONE_DEFENCE_POINTS,
  STANDARD_RULES,
  type RuleSet,
} from '../engine/rules';

/** One line per rule, the game's length first. */
export function rulesSummary(rules: RuleSet): string[] {
  const lines = [`The first team to ${rules.targetScore} points wins.`];
  lines.push(
    rules.stickTheDealer
      ? 'Stick the dealer: in round two the dealer must name trump.'
      : 'If everyone passes twice, the hand is thrown in and redealt.'
  );
  lines.push(
    rules.lonersAllowed
      ? `Loners are allowed; a loner who takes all five scores ${rules.lonerSweepPoints}.`
      : 'No loners: everyone plays every hand with their partner.'
  );
  if (dealerPartnerMustGoAloneActive(rules)) {
    lines.push('The dealer’s partner may order the dealer up only by going alone.');
  }
  if (defendAloneActive(rules)) {
    lines.push(
      `Defending alone: a defender may play alone against the makers; a lone euchre scores ${LONE_DEFENCE_POINTS}.`
    );
  }
  if (rules.farmersHand) {
    lines.push(
      'Farmer’s hand: a player dealt five 9s and 10s may swap three of them for the kitty.'
    );
  }
  return lines;
}

/** Whether any rule differs, in effect, from the standard game (the target aside). */
export function hasHouseRules(rules: RuleSet): boolean {
  return (
    rules.stickTheDealer !== STANDARD_RULES.stickTheDealer ||
    rules.lonersAllowed !== STANDARD_RULES.lonersAllowed ||
    (rules.lonersAllowed && rules.lonerSweepPoints !== STANDARD_RULES.lonerSweepPoints) ||
    dealerPartnerMustGoAloneActive(rules) ||
    defendAloneActive(rules) ||
    rules.farmersHand
  );
}

/** Whether two rule sets play the same game. */
export function sameRules(a: RuleSet, b: RuleSet): boolean {
  return rulesSummary(a).join() === rulesSummary(b).join();
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import type { RuleSet } from '../engine/rules';
import { Dialog } from './Dialog';
import { hasHouseRules, rulesSummary } from './rulesSummary';

/** The menu item's name for the game's rules: "Rules · to 10", or "House rules · to 10". */
export const rulesLabel = (rules: RuleSet): string =>
  `${hasHouseRules(rules) ? 'House rules' : 'Rules'} · to ${rules.targetScore}`;

/** A summary of the game's rules (RU-10 to RU-16), opened from the game menu. */
export function RulesDialog({ rules, onClose }: { rules: RuleSet; onClose: () => void }) {
  return (
    <Dialog
      title="Rules for this game"
      onClose={onClose}
      actions={
        <button type="button" className="button button-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <ul className="rules-list">
        {rulesSummary(rules).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="settings-detail">Changes in Settings apply from the next game.</p>
    </Dialog>
  );
}

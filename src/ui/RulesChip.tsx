import { useState } from 'react';
import type { RuleSet } from '../engine/rules';
import { Dialog } from './Dialog';
import { hasHouseRules, rulesSummary } from './rulesSummary';

/** The game's rules, from the table: a chip that opens a summary (RU-10 to RU-16). */
export function RulesChip({ rules }: { readonly rules: RuleSet }) {
  const [open, setOpen] = useState(false);
  const label = `${hasHouseRules(rules) ? 'House rules' : 'Rules'} · to ${rules.targetScore}`;
  return (
    <>
      <button
        type="button"
        className="button button-small rules-chip"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <span className="rules-chip-long" aria-hidden="true">
          {label}
        </span>
        {/* Phones in portrait have room only for a word. */}
        <span className="rules-chip-short" aria-hidden="true">
          Rules
        </span>
      </button>
      {open && (
        <Dialog
          title="Rules for this game"
          actions={
            <button type="button" className="button button-primary" onClick={() => setOpen(false)}>
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
      )}
    </>
  );
}

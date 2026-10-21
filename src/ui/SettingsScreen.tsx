// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import type { PersonaId, SkillLevel } from '../bots/bot';
import { OPPONENT_IDS, personaById } from '../bots/personas';
import {
  LONE_DEFENCE_POINTS,
  STANDARD_RULES,
  TARGET_SCORES,
  type RuleSet,
  type TargetScore,
} from '../engine/rules';
import {
  PACING_OPTIONS,
  SKILL_OPTIONS,
  type DeckChoice,
  type OpponentChoice,
  type OpponentSettings,
  type Settings,
} from '../state/settings';
import { Card } from './Card';
import { hasHouseRules, sameRules } from './rulesSummary';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onDone: () => void;
  /** Opened from a game: the label of the way back. */
  readonly doneLabel?: string;
  /** Opened from a game: the rules that game is played under. */
  readonly activeRules?: RuleSet | null;
}

type RuleToggle = 'stickTheDealer' | 'defendAlone' | 'dealerPartnerMustGoAlone' | 'farmersHand';

/** The on/off house rules; `loners` marks the ones that need loners allowed (RU-16). */
const RULE_TOGGLES: readonly {
  rule: RuleToggle;
  label: string;
  detail: string;
  loners: boolean;
}[] = [
  {
    rule: 'stickTheDealer',
    label: 'Stick the dealer',
    detail: 'In round two the dealer cannot pass, and must name trump.',
    loners: false,
  },
  {
    rule: 'dealerPartnerMustGoAlone',
    label: 'Dealer’s partner must go alone',
    detail: 'The dealer’s partner may order the dealer up only by going alone.',
    loners: true,
  },
  {
    rule: 'defendAlone',
    label: 'Defending alone',
    detail: `A defender may play alone against the makers. Euchring them alone scores ${LONE_DEFENCE_POINTS}.`,
    loners: true,
  },
  {
    rule: 'farmersHand',
    label: 'Farmer’s hand',
    detail:
      'A player dealt five 9s and 10s may swap three of them for the three face-down kitty cards before bidding.',
    loners: false,
  },
];

const DECKS: readonly { deck: DeckChoice; label: string; detail: string }[] = [
  {
    deck: 'standard',
    label: 'Two-color',
    detail: 'Hearts and diamonds red, spades and clubs black.',
  },
  {
    deck: 'fourColor',
    label: 'Four-color',
    detail: 'Spades black, hearts red, diamonds blue, clubs green.',
  },
];

const SKILL_TEXT: Record<SkillLevel, { label: string; detail: string }> = {
  casual: { label: 'Casual', detail: 'Opponents slip up now and then.' },
  standard: { label: 'Standard', detail: 'Opponents play sound, conventional Euchre.' },
  sharp: {
    label: 'Sharp',
    detail: 'Opponents think through how the cards may lie, as your partner does.',
  },
};

const SIDES = [
  { side: 'left', label: 'Left opponent' },
  { side: 'right', label: 'Right opponent' },
] as const;

/** Settings — UI-1. Every change is saved as it is made (PE-3). */
export function SettingsScreen({
  settings,
  onChange,
  onDone,
  doneLabel = 'Done',
  activeRules = null,
}: SettingsScreenProps) {
  const set = (change: Partial<Settings>) => onChange({ ...settings, ...change });
  const rules = settings.pendingRules;
  const setRules = (change: Partial<RuleSet>) => set({ pendingRules: { ...rules, ...change } });
  const setOpponent = (side: keyof OpponentSettings, choice: OpponentChoice) =>
    set({ opponents: { ...settings.opponents, [side]: choice } });

  return (
    <main className="settings" aria-label="Settings">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <button type="button" className="button button-primary" onClick={onDone}>
          {doneLabel}
        </button>
      </header>

      <fieldset className="settings-group">
        <legend>Opponents</legend>
        {SIDES.map(({ side, label }) => {
          const choice = settings.opponents[side];
          const other = settings.opponents[side === 'left' ? 'right' : 'left'];
          return (
            <div key={side} className="settings-row">
              <label htmlFor={`opponent-${side}`}>{label}</label>
              <select
                id={`opponent-${side}`}
                value={choice}
                onChange={(e) => setOpponent(side, e.target.value as OpponentChoice)}
              >
                <option value="random">Random</option>
                {OPPONENT_IDS.map((id: PersonaId) => (
                  <option key={id} value={id} disabled={id === other}>
                    {personaById(id).name}
                  </option>
                ))}
              </select>
              <p className="settings-detail">
                {choice === 'random'
                  ? 'A different opponent each game.'
                  : personaById(choice).tagline}
              </p>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="settings-group">
        <legend>Opponent difficulty</legend>
        {SKILL_OPTIONS.map((skill) => (
          <label key={skill} className="settings-choice">
            <input
              type="radio"
              name="skill"
              checked={settings.skill === skill}
              onChange={() => set({ skill })}
            />
            <span>
              {SKILL_TEXT[skill].label}
              <span className="settings-detail">{SKILL_TEXT[skill].detail}</span>
            </span>
          </label>
        ))}
        <p className="settings-detail">
          Your partner always plays its best. Opponents and difficulty apply from your next game.
        </p>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Pace of play</legend>
        {PACING_OPTIONS.map(({ label, ms }) => (
          <label key={ms} className="settings-choice">
            <input
              type="radio"
              name="pacing"
              checked={settings.pacingMs === ms}
              onChange={() => set({ pacingMs: ms })}
            />
            <span>{label}</span>
          </label>
        ))}
        <p className="settings-detail">Tap the table at any time to hurry the current trick.</p>
      </fieldset>

      <fieldset className="settings-group">
        <legend>House rules</legend>
        <div className="settings-row">
          <label htmlFor="target-score">Game to</label>
          <select
            id="target-score"
            value={rules.targetScore}
            onChange={(e) => setRules({ targetScore: Number(e.target.value) as TargetScore })}
          >
            {TARGET_SCORES.map((score) => (
              <option key={score} value={score}>
                {score} points
              </option>
            ))}
          </select>
        </div>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={rules.lonersAllowed}
            onChange={(e) => setRules({ lonersAllowed: e.target.checked })}
          />
          <span>
            Loners
            <span className="settings-detail">
              A player who names trump may play without their partner.
            </span>
          </span>
        </label>
        <div className="settings-row settings-row-dependent">
          <label htmlFor="sweep-points">A loner who takes all five scores</label>
          <select
            id="sweep-points"
            value={rules.lonerSweepPoints}
            disabled={!rules.lonersAllowed}
            onChange={(e) => setRules({ lonerSweepPoints: Number(e.target.value) as 4 | 5 })}
          >
            <option value={4}>4 points</option>
            <option value={5}>5 points</option>
          </select>
        </div>
        {RULE_TOGGLES.map(({ rule, label, detail, loners }) => (
          <label key={rule} className="settings-choice">
            <input
              type="checkbox"
              checked={rules[rule]}
              disabled={loners && !rules.lonersAllowed}
              onChange={(e) => setRules({ [rule]: e.target.checked })}
            />
            <span>
              {label}
              <span className="settings-detail">
                {detail}
                {loners && !rules.lonersAllowed ? ' Needs loners.' : ''}
              </span>
            </span>
          </label>
        ))}
        <p className="settings-detail">
          House rules apply from your next game.
          {activeRules !== null && !sameRules(activeRules, rules)
            ? ' The game in progress keeps the rules it started with.'
            : ''}
        </p>
        {hasHouseRules(rules) || rules.targetScore !== STANDARD_RULES.targetScore ? (
          <button
            type="button"
            className="button button-small"
            onClick={() => set({ pendingRules: STANDARD_RULES })}
          >
            Back to standard rules
          </button>
        ) : null}
      </fieldset>

      <fieldset className="settings-group">
        <legend>Cards</legend>
        {DECKS.map(({ deck, label, detail }) => (
          <label key={deck} className="settings-choice">
            <input
              type="radio"
              name="deck"
              checked={settings.deck === deck}
              onChange={() => set({ deck })}
            />
            <span>
              {label} deck
              <span className="settings-detail">{detail}</span>
            </span>
          </label>
        ))}
        <div className="deck-preview" aria-hidden="true">
          {(['AS', 'AH', 'AD', 'AC'] as const).map((card) => (
            <Card key={card} card={card} className="deck-preview-card" />
          ))}
        </div>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={settings.oneTapPlay}
            onChange={(e) => set({ oneTapPlay: e.target.checked })}
          />
          <span>
            One-tap play
            <span className="settings-detail">
              Play a card with a single tap, instead of tapping it twice.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Coach</legend>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={settings.hintsOn}
            onChange={(e) => set({ hintsOn: e.target.checked })}
          />
          <span>
            Hints
            <span className="settings-detail">
              A Hint button on your turn shows what your partner would do, and why.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Sound</legend>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={settings.soundOn}
            onChange={(e) => set({ soundOn: e.target.checked })}
          />
          <span>
            Sound effects
            <span className="settings-detail">
              Shuffles, cards and the odd sting. Also on the table, beside Menu.
            </span>
          </span>
        </label>
      </fieldset>
    </main>
  );
}

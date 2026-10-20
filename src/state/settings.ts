/**
 * Settings — UI-1 (first pass), PE-3; Technical Spec §10.2.
 *
 * Stored under their own key, separately from the game (PE-3). Opponent
 * choice, difficulty and the house rules apply when the next game starts
 * (a game keeps the rules it began with); pacing, one-tap play and the
 * deck apply as soon as the table is next shown. Hints joined in schema
 * version 2; house rules and the deck in version 3.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { PersonaId, SkillLevel } from '../bots/bot';
import { OPPONENT_IDS } from '../bots/personas';
import { shuffle } from '../engine/deal';
import { isRuleSet, STANDARD_RULES, type RuleSet } from '../engine/rules';
import type { Pacing } from '../session/driver';
import type { Rng } from '../util/rng';
import { isRecord, type VersionedStore } from './persistence';

/** The deck's suit colors; matches `assets/manifest` `DeckVariant`, which `state` may not import. */
export type DeckChoice = 'standard' | 'fourColor';

export type OpponentChoice = PersonaId | 'random';

export interface OpponentSettings {
  /** The seat to the human's left. */
  readonly left: OpponentChoice;
  /** The seat to the human's right. */
  readonly right: OpponentChoice;
}

export interface Settings {
  readonly opponents: OpponentSettings;
  /** Opponents only; the partner always plays at full strength (PB-2). */
  readonly skill: SkillLevel;
  /** The pause before each bot action, in milliseconds (GF-4). */
  readonly pacingMs: number;
  /** Play a card on the first tap instead of raising it (GF-2). */
  readonly oneTapPlay: boolean;
  /** Sound effects (SA-3). */
  readonly soundOn: boolean;
  /** Show the Hint control (CO-3). */
  readonly hintsOn: boolean;
  /** The house rules for the next new game (RU-10 to RU-16). */
  readonly pendingRules: RuleSet;
  /** Two-color or four-color suits (VP-3). */
  readonly deck: DeckChoice;
}

export const DEFAULT_SETTINGS: Settings = {
  opponents: { left: 'random', right: 'random' },
  skill: 'standard',
  pacingMs: 650,
  oneTapPlay: false,
  soundOn: true,
  hintsOn: true,
  pendingRules: STANDARD_RULES,
  deck: 'standard',
};

export interface PacingOption {
  readonly label: string;
  readonly ms: number;
}

export const PACING_OPTIONS: readonly PacingOption[] = [
  { label: 'Relaxed', ms: 1000 },
  { label: 'Normal', ms: 650 },
  { label: 'Brisk', ms: 350 },
];

/** Skill levels offered in settings (OP-2). */
export const SKILL_OPTIONS: readonly SkillLevel[] = ['casual', 'standard', 'sharp'];

/** The pause after a trick scales with the pause between actions. */
const TRICK_PAUSE_RATIO = 900 / 650;

export function pacingFor(pacingMs: number): Pacing {
  return { botMs: pacingMs, trickMs: Math.round(pacingMs * TRICK_PAUSE_RATIO) };
}

/**
 * The two opponents for a new game, left then right. Named choices are
 * kept; each `random` seat draws a different persona from the rest
 * (OP-4).
 */
export function resolveOpponents(
  choice: OpponentSettings,
  rng: Rng
): readonly [PersonaId, PersonaId] {
  const named = [choice.left, choice.right].filter((c): c is PersonaId => c !== 'random');
  const pool = shuffle(
    OPPONENT_IDS.filter((id) => !named.includes(id)),
    rng
  );
  const pick = (c: OpponentChoice) => (c === 'random' ? pool.shift()! : c);
  const left = pick(choice.left);
  return [left, pick(choice.right)];
}

const isOpponentChoice = (v: unknown): v is OpponentChoice =>
  v === 'random' || OPPONENT_IDS.includes(v as PersonaId);

export function isSettings(value: unknown): value is Settings {
  if (!isRecord(value) || !isRecord(value.opponents)) return false;
  const { left, right } = value.opponents;
  return (
    isOpponentChoice(left) &&
    isOpponentChoice(right) &&
    (left === 'random' || left !== right) &&
    (value.skill === 'casual' || value.skill === 'standard' || value.skill === 'sharp') &&
    typeof value.pacingMs === 'number' &&
    Number.isFinite(value.pacingMs) &&
    value.pacingMs >= 0 &&
    value.pacingMs <= 5000 &&
    typeof value.oneTapPlay === 'boolean' &&
    typeof value.soundOn === 'boolean' &&
    typeof value.hintsOn === 'boolean' &&
    isRuleSet(value.pendingRules) &&
    (value.deck === 'standard' || value.deck === 'fourColor')
  );
}

export const SETTINGS_STORE: VersionedStore<Settings> = {
  key: 'leftbauer:settings',
  schemaVersion: 3,
  migrations: {
    // Version 2 added hints, on by default.
    1: (blob) => ({ ...blob, schemaVersion: 2, hintsOn: true }),
    // Version 3 added house rules (standard to begin with) and the deck.
    2: (blob) => ({ ...blob, schemaVersion: 3, pendingRules: STANDARD_RULES, deck: 'standard' }),
  },
  isValid: isSettings,
};

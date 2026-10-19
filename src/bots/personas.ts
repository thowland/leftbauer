/**
 * Personas: playing style as data — OP-3, OP-4; Technical Spec §6.4.
 *
 * A persona is a `StyleProfile` (offsets to the shared strategy's
 * thresholds) plus presentation. Adding an opponent means adding an
 * entry here. A persona whose style is a different *way* of thinking
 * rather than a different appetite would supply policy overrides.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { PersonaId } from './bot';
import type { PolicySet } from './policies';

export interface StyleProfile {
  /** Added to the expected tricks needed to order up or call trump. */
  readonly callThreshold: number;
  /** Added to the expected tricks needed to go alone. */
  readonly lonerThreshold: number;
  /** 0..1: reluctance to spend trump on defense while partner may still win. */
  readonly defensiveCaution: number;
  /** 0..1: eagerness to pass and stick an opposing dealer (with stick the dealer on). */
  readonly stickAggression: number;
  /** 0..1: how strongly the game score shifts the calling threshold (PB-5). */
  readonly scoreAwareness: number;
}

export interface Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly tagline: string;
  /** A CSS custom property from the theme, for the monogram badge. */
  readonly colorToken: `--${string}`;
  readonly style: StyleProfile;
  readonly overrides?: Partial<PolicySet>;
}

/** The partner's conventions (PB-4): the neutral baseline, fully score-aware. */
export const BY_THE_BOOK: StyleProfile = {
  callThreshold: 0,
  lonerThreshold: 0,
  defensiveCaution: 0.5,
  stickAggression: 0,
  scoreAwareness: 1,
};

export const PERSONAS: readonly Persona[] = [
  {
    id: 'partner',
    name: 'Partner',
    tagline: 'Plays the conventions on the “How your partner plays” page, every time.',
    colorToken: '--persona-partner',
    style: BY_THE_BOOK,
  },
  {
    id: 'soopy',
    name: 'Soopy',
    tagline: 'A cautious defender: calls only on a strong hand, and is hard to euchre.',
    colorToken: '--persona-soopy',
    style: { ...BY_THE_BOOK, callThreshold: 0.35, lonerThreshold: 0.3, defensiveCaution: 0.9 },
  },
  {
    id: 'shrubs',
    name: 'Shrubs',
    tagline: 'A loner hunter: goes alone whenever the hand is close.',
    colorToken: '--persona-shrubs',
    style: { ...BY_THE_BOOK, lonerThreshold: -0.8 },
  },
  {
    id: 'rusty',
    name: 'Rusty',
    tagline: 'A bold caller: makes trump on thin hands and lives with the euchres.',
    colorToken: '--persona-rusty',
    style: { ...BY_THE_BOOK, callThreshold: -0.35, defensiveCaution: 0.3, stickAggression: 0.6 },
  },
  {
    id: 'smooth',
    name: 'Smooth',
    tagline: 'By the book: textbook Euchre, closest to how your partner plays.',
    colorToken: '--persona-smooth',
    style: BY_THE_BOOK,
  },
];

/** The opponents a player can face (everyone but the partner). */
export const OPPONENT_IDS: readonly PersonaId[] = PERSONAS.filter((p) => p.id !== 'partner').map(
  (p) => p.id
);

export function personaById(id: PersonaId): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (persona === undefined) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

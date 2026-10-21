// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The seat-level bot interface — Technical Spec §6.1.
 *
 * Every computer player implements `Bot`. A bot sees only a `PlayerView`
 * and the legal actions, never the game state, so it cannot cheat
 * (PB-1, OP-1).
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';

/** The partner, the four named opponents (OP-3), and Johnny Blue, who plays as one of them. */
export type PersonaId = 'partner' | 'soopy' | 'shrubs' | 'rusty' | 'smooth' | 'johnny';

export type SkillLevel = 'casual' | 'standard' | 'sharp';

/** Serializable: recreates the same bot anywhere (worker, harness, server). */
export interface BotSpec {
  readonly role: 'partner' | 'opponent' | 'coach';
  readonly personaId: PersonaId;
  readonly skill: SkillLevel;
  /** Johnny Blue's persona for this game (and only his): the style he plays. */
  readonly playsAs?: PersonaId;
}

/**
 * Why a bot chose an action: one code per convention (PB-4). Structured,
 * never prose; the coach renders the words (`coach/reasons.ts`).
 */
export const REASON_CODES = [
  'bid-strong-hand',
  'bid-call-next',
  'bid-best-suit',
  'bid-stuck',
  'bid-pass-weak',
  /** RU-14: the dealer's partner may order up only alone. */
  'bid-forced-alone',
  'loner-strong',
  'loner-not-strong-enough',
  'defend-alone-strong',
  'defend-alone-not-strong-enough',
  'farmer-swap',
  'farmer-keep',
  'discard-make-void',
  'discard-lowest',
  'lead-boss-trump',
  'lead-trump-to-partner',
  'lead-off-ace',
  'lead-short-suit',
  'lead-lowest',
  'follow-partner-winning',
  'follow-save-trump',
  'follow-win-cheaply',
  'follow-throw-low',
  /** Sharp: simulation preferred a different card to the conventions' choice. */
  'play-simulated',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export interface Reason {
  readonly code: ReasonCode;
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface Decision {
  /** Always a member of the legal actions passed in. */
  readonly action: Action;
  readonly reason: Reason;
}

export interface Bot {
  readonly spec: BotSpec;
  decide(view: PlayerView, legal: readonly Action[]): Decision;
}

/** A stable string for a spec, for caching and seeding. */
export function specKey(spec: BotSpec): string {
  const persona = spec.playsAs === undefined ? spec.personaId : `${spec.personaId}:${spec.playsAs}`;
  return `${spec.role}/${persona}/${spec.skill}`;
}

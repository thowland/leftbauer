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

/** Persona ids. Sprint 4 adds the partner and the four named opponents. */
export type PersonaId = 'placeholder';

export type SkillLevel = 'casual' | 'standard' | 'sharp';

/** Serializable: recreates the same bot anywhere (worker, harness, server). */
export interface BotSpec {
  readonly role: 'partner' | 'opponent' | 'coach';
  readonly personaId: PersonaId;
  readonly skill: SkillLevel;
}

/** Why a bot chose an action. Structured, never prose (rendered by coach/). */
export type ReasonCode = 'random-legal';

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
  return `${spec.role}/${spec.personaId}/${spec.skill}`;
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Hints — CO-1, CO-2; Technical Spec §7.
 *
 * A hint is what the partner would do in the player's seat, with its
 * reason in words. The coach has no strategy of its own: it asks a Sharp
 * bot built from the partner's profile.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BotSpec, ReasonCode } from '../bots/bot';
import { createBot } from '../bots/factory';
import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import { renderReason } from './reasons';

export interface Hint {
  readonly action: Action;
  readonly code: ReasonCode;
  readonly reasonText: string;
}

export const COACH_SPEC: BotSpec = { role: 'coach', personaId: 'partner', skill: 'sharp' };

const coach = createBot(COACH_SPEC);

export function hintFor(view: PlayerView, legal: readonly Action[]): Hint {
  const { action, reason } = coach.decide(view, legal);
  return { action, code: reason.code, reasonText: renderReason(reason, view) };
}

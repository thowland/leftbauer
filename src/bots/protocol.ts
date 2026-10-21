// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Messages to and from a bot running elsewhere (the Web Worker) —
 * Technical Spec §9.4. Plain data only, so they cross any boundary.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import type { BotSpec, Decision } from './bot';

export interface BotRequest {
  readonly id: number;
  readonly spec: BotSpec;
  readonly view: PlayerView;
  readonly legal: readonly Action[];
}

export type BotReply =
  | { readonly id: number; readonly ok: true; readonly decision: Decision }
  | { readonly id: number; readonly ok: false; readonly error: string };

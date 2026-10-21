// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Plain names the coach writes with.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Suit } from '../engine/cards';

export const SUIT_NAMES_PLAIN: Record<Suit, string> = {
  C: 'club',
  D: 'diamond',
  H: 'heart',
  S: 'spade',
};

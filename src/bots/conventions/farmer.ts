// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The farmer's hand — RU-15, PB-4.
 *
 * Five 9s and 10s is the weakest hand in the deck, and three unseen
 * kitty cards are almost always better, so the swap is always taken. It
 * gives up the cheapest three cards, keeping tens over nines and, on a
 * tie, the cards of a longer suit.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { CardId } from '../../engine/cards';
import type { FarmerPolicy, ScoredOption } from '../policies';
import { cheapestFirst } from './rule';

export const conventionalFarmer: FarmerPolicy = {
  exchange(ctx) {
    const hand = ctx.view.myHand;
    const give = cheapestFirst(hand, hand, null).slice(0, 3);
    const options: ScoredOption<readonly CardId[]>[] = [
      { value: give, score: 1, reason: { code: 'farmer-swap' } },
      { value: [], score: 0, reason: { code: 'farmer-keep' } },
    ];
    return options;
  },
};

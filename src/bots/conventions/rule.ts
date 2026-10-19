/**
 * Conventions as an ordered rule chain — Technical Spec §6.7.
 *
 * Each convention is one small rule. The first rule that applies picks
 * the decision and supplies its reason; the remaining candidates are
 * ranked behind it by a fallback ordering, so a Casual selector's
 * "mistake" is the next most natural choice. The same rule list
 * generates the "How your partner plays" page (Sprint 8).
 *
 * Pure module: no DOM, no React, no storage.
 */

import { effectiveSuit, rankOf, trickRank, type CardId, type Suit } from '../../engine/cards';
import type { ReasonCode } from '../bot';
import type { DecisionContext } from '../context';
import type { ScoredOption } from '../policies';

export interface ConventionRule<T> {
  readonly id: ReasonCode;
  /** The convention's choice, or `null` when it does not apply. */
  choose(ctx: DecisionContext): T | null;
}

/**
 * Run `rules` in order and rank every candidate: the chosen one first,
 * then the rest in `fallback` order. The last rule should always apply.
 */
export function rankByRules<T>(
  ctx: DecisionContext,
  rules: readonly ConventionRule<T>[],
  fallback: readonly T[],
  fallbackReason: ReasonCode
): ScoredOption<T>[] {
  for (const rule of rules) {
    const chosen = rule.choose(ctx);
    if (chosen === null) continue;
    const rest = fallback.filter((c) => c !== chosen);
    return [
      { value: chosen, score: rest.length + 1, reason: { code: rule.id } },
      ...rest.map((value, i) => ({
        value,
        score: rest.length - i,
        reason: { code: fallbackReason },
      })),
    ];
  }
  throw new Error(`No convention applied (fallback ${fallbackReason})`);
}

const PLAIN_RANK = { '9': 1, T: 2, J: 3, Q: 4, K: 5, A: 6 } as const;

/** How strong a card is to hold: any trump above any plain card. */
export function holdingStrength(card: CardId, trump: Suit | null): number {
  if (trump !== null && effectiveSuit(card, trump) === trump) {
    return 100 + trickRank(card, trump, trump);
  }
  return PLAIN_RANK[rankOf(card)];
}

/**
 * Cards from cheapest to dearest: plain cards before trump, low before
 * high, and on a tie the card from the shorter suit (to make a void).
 */
export function cheapestFirst(
  cards: readonly CardId[],
  hand: readonly CardId[],
  trump: Suit | null
): CardId[] {
  const suitLength = (c: CardId) =>
    hand.filter((h) => effectiveSuit(h, trump) === effectiveSuit(c, trump)).length;
  return [...cards].sort(
    (a, b) => holdingStrength(a, trump) - holdingStrength(b, trump) || suitLength(a) - suitLength(b)
  );
}

export const isAce = (card: CardId) => rankOf(card) === 'A';

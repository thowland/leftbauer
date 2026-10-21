// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * "How your partner plays" — UI-6, PB-4; Technical Spec §7.
 *
 * Generated from the same rule lists the partner plays by, in the order
 * it applies them, so the page cannot drift from the strategy.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { ReasonCode } from '../bots/bot';
import { FOLLOW_RULES, LEAD_RULES } from '../bots/conventions/cardPlay';
import { DISCARD_RULES } from '../bots/conventions/discard';
import { SKILLS } from '../bots/skills';

export interface ConventionSummary {
  readonly code: ReasonCode;
  readonly text: string;
}

export interface ConventionSection {
  readonly title: string;
  /** Read first: how the rules below are applied. */
  readonly intro: string;
  readonly conventions: readonly ConventionSummary[];
}

/** How the partner describes each convention, in the third person. */
const DESCRIPTIONS: Partial<Record<ReasonCode, string>> = {
  'bid-strong-hand':
    'Orders up (or, as dealer, picks up) when its hand plus the trick or so a partner usually adds should take three tricks.',
  'bid-call-next':
    'Sitting left of the dealer in round two, favors “next”: the suit of the same color as the turned-down card.',
  'bid-best-suit': 'Otherwise names its strongest suit, if that suit clears the same bar.',
  'bid-stuck': 'With “stick the dealer” on, a dealer who is stuck names its strongest suit.',
  'bid-pass-weak': 'Passes anything short of that.',
  'loner-strong': 'Goes alone only when its hand should take the tricks with no help.',
  'bid-forced-alone':
    'When the house rule says the dealer’s partner must go alone to order the dealer up, it orders up only on a hand that could win alone.',
  'defend-alone-strong':
    'Defends alone only when its hand should stop the makers with no help. Since the makers chose trump, that is rare.',
  'farmer-swap':
    'With a farmer’s hand, always swaps: it gives up its three lowest cards, keeping its tens and its longest suit.',
  'discard-make-void':
    'As dealer, discards a lone off-suit card (never an ace) to make a suit it can trump.',
  'discard-lowest': 'Otherwise discards its lowest card. It never throws a bower.',
  'lead-boss-trump':
    'As the maker, leads its highest trump while it holds two or more, to draw out the other side’s trump.',
  'lead-trump-to-partner': 'When you called trump, leads trump back to you.',
  'lead-off-ace': 'Cashes an off-suit ace, choosing a suit no opponent has shown out of.',
  'lead-short-suit':
    'On defense, leads low from its shortest plain suit, to empty it and trump later.',
  'lead-lowest': 'Otherwise leads its lowest card.',
  'follow-partner-winning': 'Never overtakes you when you are already winning the trick.',
  'follow-save-trump':
    'On defense, holds back its trump when you may still win the trick yourself.',
  'follow-win-cheaply':
    'Wins the trick with its cheapest winning card, preferring one nobody can beat.',
  'follow-throw-low': 'When it cannot win, throws its cheapest card and keeps its trump.',
};

const BIDDING: readonly ReasonCode[] = [
  'bid-strong-hand',
  'bid-call-next',
  'bid-best-suit',
  'bid-stuck',
  'bid-pass-weak',
  'loner-strong',
];

const HOUSE_RULES: readonly ReasonCode[] = [
  'bid-forced-alone',
  'defend-alone-strong',
  'farmer-swap',
];

const summaries = (codes: readonly ReasonCode[]): ConventionSummary[] =>
  codes.flatMap((code) => {
    const text = DESCRIPTIONS[code];
    return text === undefined ? [] : [{ code, text }];
  });

export function partnerConventions(): readonly ConventionSection[] {
  const samples = SKILLS.sharp.simulation?.samples ?? 0;
  return [
    {
      title: 'Bidding',
      intro:
        'Your partner counts how many tricks a hand should take. It calls a little more readily when the other side is one point from winning, and takes more chances when far behind.',
      conventions: summaries(BIDDING),
    },
    {
      title: 'House rules',
      intro: 'When these house rules are on, your partner plays them like this.',
      conventions: summaries(HOUSE_RULES),
    },
    {
      title: 'The dealer’s discard',
      intro: 'After picking up the upcard, the dealer discards one card.',
      conventions: summaries(DISCARD_RULES.map((r) => r.id)),
    },
    {
      title: 'Leading',
      intro: 'When it leads, your partner uses the first of these that applies.',
      conventions: summaries(LEAD_RULES.map((r) => r.id)),
    },
    {
      title: 'Following',
      intro: 'When it follows, your partner uses the first of these that applies.',
      conventions: summaries(FOLLOW_RULES.map((r) => r.id)),
    },
    {
      title: 'Thinking ahead',
      intro: `Before each card it plays, your partner also imagines ${samples} ways the unseen cards could be dealt, consistent with everything played so far, and plays each one out by the conventions above. It then plays the card that does best on average. Usually that is the conventional card; when it is not, the simulation wins.`,
      conventions: [],
    },
  ];
}

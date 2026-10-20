/**
 * Conventional card play — PB-4.
 *
 * Leads: the maker pulls trump with the boss trump; lead trump back to a
 * partner who called; cash off-suit aces; defenders lead from short suits.
 * Follows: never overtake a partner who is winning; a cautious defender
 * saves trump while partner may still win; otherwise win as cheaply as
 * possible, or throw the cheapest card.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { effectiveSuit, trickRank, type CardId, type Suit } from '../../engine/cards';
import { activeSeatCount, ledSuit, trickWinner } from '../../engine/play';
import { partnerOf } from '../../engine/seats';
import { cardsOfSuit, seatFacts, type DecisionContext } from '../context';
import type { CardPlayPolicy } from '../policies';
import { cheapestFirst, holdingStrength, isAce, rankByRules, type ConventionRule } from './rule';

/** Saving trump needs at least this much defensive caution. */
export const SAVE_TRUMP_CAUTION = 0.7;

interface Table {
  readonly trump: Suit;
  readonly legal: CardId[];
  readonly led: Suit | null;
  /** The card currently winning the trick, if any. */
  readonly winning: { readonly seat: number; readonly card: CardId } | null;
  readonly lastToPlay: boolean;
  readonly partnerStillToPlay: boolean;
}

function table(ctx: DecisionContext): Table {
  const { view } = ctx;
  const trump = view.contract!.trump;
  const trick = view.currentTrick;
  const plays = trick?.plays ?? [];
  const legal = ctx.legal.flatMap((a) => (a.type === 'play' ? [a.card] : []));
  const winnerSeat = trick && plays.length > 0 ? trickWinner(trick, trump) : null;
  const partner = partnerOf(view.seat);
  return {
    trump,
    legal,
    led: ledSuit(trick, trump),
    winning:
      winnerSeat === null
        ? null
        : { seat: winnerSeat, card: plays.find((p) => p.seat === winnerSeat)!.card },
    lastToPlay: plays.length + 1 === activeSeatCount(view.contract),
    partnerStillToPlay:
      !view.sittingOut.includes(partner) && !plays.some((p) => p.seat === partner),
  };
}

const cheapest = (ctx: DecisionContext, cards: readonly CardId[]) =>
  cheapestFirst(cards, ctx.view.myHand, ctx.view.contract!.trump)[0] ?? null;

const strongest = (cards: readonly CardId[], trump: Suit) =>
  [...cards].sort((a, b) => holdingStrength(b, trump) - holdingStrength(a, trump))[0] ?? null;

// ---- Leads ---------------------------------------------------------------

const leadBossTrump: ConventionRule<CardId> = {
  id: 'lead-boss-trump',
  choose(ctx) {
    const { trump, legal, led } = table(ctx);
    if (led !== null || !seatFacts(ctx.view).isMaker) return null;
    const trumps = cardsOfSuit(legal, trump, trump);
    const boss = trumps.find((c) => ctx.knowledge.isBoss(c));
    if (boss === undefined) return null;
    return trumps.length >= 2 || ctx.view.contract!.alone ? boss : null;
  },
};

const leadTrumpToPartner: ConventionRule<CardId> = {
  id: 'lead-trump-to-partner',
  choose(ctx) {
    const { trump, legal, led } = table(ctx);
    if (led !== null || !seatFacts(ctx.view).partnerIsMaker) return null;
    if (ctx.knowledge.unseenInSuit(trump).length === 0) return null;
    return strongest(cardsOfSuit(legal, trump, trump), trump);
  },
};

const leadOffAce: ConventionRule<CardId> = {
  id: 'lead-off-ace',
  choose(ctx) {
    const { trump, legal, led } = table(ctx);
    if (led !== null) return null;
    const f = seatFacts(ctx.view);
    const opponents = [(f.me + 1) % 4, (f.me + 3) % 4] as const;
    const aces = legal.filter((c) => isAce(c) && effectiveSuit(c, trump) !== trump);
    // Prefer an ace in a suit no opponent has shown out of (it won't be trumped yet).
    const safe = aces.filter(
      (c) => !opponents.some((s) => ctx.knowledge.voids[s]!.has(effectiveSuit(c, trump)))
    );
    return safe[0] ?? aces[0] ?? null;
  },
};

const leadShortSuit: ConventionRule<CardId> = {
  id: 'lead-short-suit',
  choose(ctx) {
    const { trump, legal, led } = table(ctx);
    if (led !== null || seatFacts(ctx.view).weAreMakers) return null;
    const plain = legal.filter((c) => effectiveSuit(c, trump) !== trump);
    if (plain.length === 0) return null;
    const length = (c: CardId) =>
      cardsOfSuit(ctx.view.myHand, effectiveSuit(c, trump), trump).length;
    const shortest = Math.min(...plain.map(length));
    return cheapest(
      ctx,
      plain.filter((c) => length(c) === shortest)
    );
  },
};

const leadLowest: ConventionRule<CardId> = {
  id: 'lead-lowest',
  choose: (ctx) => cheapest(ctx, table(ctx).legal),
};

// ---- Follows -------------------------------------------------------------

const followPartnerWinning: ConventionRule<CardId> = {
  id: 'follow-partner-winning',
  choose(ctx) {
    const t = table(ctx);
    if (t.winning === null || t.winning.seat !== partnerOf(ctx.view.seat)) return null;
    return cheapest(ctx, t.legal);
  },
};

function winners(t: Table): CardId[] {
  if (t.winning === null || t.led === null) return [];
  const toBeat = trickRank(t.winning.card, t.led, t.trump);
  return t.legal.filter((c) => trickRank(c, t.led!, t.trump) > toBeat);
}

const followSaveTrump: ConventionRule<CardId> = {
  id: 'follow-save-trump',
  choose(ctx) {
    const t = table(ctx);
    if (t.led === null || t.lastToPlay || !t.partnerStillToPlay) return null;
    if (seatFacts(ctx.view).weAreMakers || ctx.style.defensiveCaution < SAVE_TRUMP_CAUTION) {
      return null;
    }
    const canWin = winners(t);
    const onlyByTrumping =
      t.led !== t.trump &&
      canWin.length > 0 &&
      canWin.every((c) => effectiveSuit(c, t.trump) === t.trump);
    if (!onlyByTrumping) return null;
    return cheapest(
      ctx,
      t.legal.filter((c) => !canWin.includes(c))
    );
  },
};

const followWinCheaply: ConventionRule<CardId> = {
  id: 'follow-win-cheaply',
  choose(ctx) {
    const t = table(ctx);
    const canWin = winners(t);
    if (canWin.length === 0) return null;
    if (t.lastToPlay) return cheapest(ctx, canWin);
    // With players still to come, prefer a winner nobody can beat.
    const safe = canWin.filter((c) => ctx.knowledge.isBoss(c));
    return cheapest(ctx, safe.length > 0 ? safe : canWin);
  },
};

const followThrowLow: ConventionRule<CardId> = {
  id: 'follow-throw-low',
  choose: (ctx) => cheapest(ctx, table(ctx).legal),
};

export const LEAD_RULES: readonly ConventionRule<CardId>[] = [
  leadBossTrump,
  leadTrumpToPartner,
  leadOffAce,
  leadShortSuit,
  leadLowest,
];

export const FOLLOW_RULES: readonly ConventionRule<CardId>[] = [
  followPartnerWinning,
  followSaveTrump,
  followWinCheaply,
  followThrowLow,
];

export const conventionalCardPlay: CardPlayPolicy = {
  play(ctx) {
    const t = table(ctx);
    const leading = t.led === null;
    return rankByRules(
      ctx,
      leading ? LEAD_RULES : FOLLOW_RULES,
      cheapestFirst(t.legal, ctx.view.myHand, t.trump),
      leading ? 'lead-lowest' : 'follow-throw-low'
    );
  },
};

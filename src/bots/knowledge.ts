/**
 * What a seat can know about the cards — Technical Spec §6.6.
 *
 * Derived purely from a `PlayerView`: cards played, suits a player has
 * shown out of, and which cards are still unseen. Every inference is one
 * a human at the table could make.
 *
 * Pure module: no DOM, no React, no storage.
 */

import {
  ALL_CARDS,
  effectiveSuit,
  RANKS,
  rankOf,
  trickRank,
  type CardId,
  type Suit,
} from '../engine/cards';
import type { Seat } from '../engine/seats';
import type { PlayerView } from '../engine/view';

export interface CardKnowledge {
  readonly trump: Suit | null;
  readonly played: ReadonlySet<CardId>;
  /** Cards that may still be in another player's hand. */
  readonly unseen: ReadonlySet<CardId>;
  /** Suits each seat has failed to follow, so cannot hold. */
  readonly voids: readonly [
    ReadonlySet<Suit>,
    ReadonlySet<Suit>,
    ReadonlySet<Suit>,
    ReadonlySet<Suit>,
  ];
  /** True if no unseen card of the same effective suit outranks `card`. */
  isBoss(card: CardId): boolean;
  /** Unseen cards of a suit (as it plays with the current trump). */
  unseenInSuit(suit: Suit): CardId[];
}

export function buildKnowledge(view: PlayerView): CardKnowledge {
  const trump = view.contract?.trump ?? null;
  const tricks = [...view.tricks, ...(view.currentTrick ? [view.currentTrick] : [])];
  const played = new Set(tricks.flatMap((t) => t.plays.map((p) => p.card)));

  const known = new Set<CardId>([...view.myHand, ...played]);
  if (view.myDiscard) known.add(view.myDiscard);
  // A refused or set-aside upcard stays in the kitty, out of play.
  if (view.upcardStatus === 'turnedDown' || view.upcardStatus === 'setAside') {
    known.add(view.upcard);
  }
  const unseen = new Set(ALL_CARDS.filter((c) => !known.has(c)));

  const voids = [new Set<Suit>(), new Set<Suit>(), new Set<Suit>(), new Set<Suit>()] as const;
  if (trump !== null) {
    for (const trick of tricks) {
      const lead = trick.plays[0];
      if (!lead) continue;
      const led = effectiveSuit(lead.card, trump);
      for (const { seat, card } of trick.plays.slice(1)) {
        if (effectiveSuit(card, trump) !== led) voids[seat as Seat].add(led);
      }
    }
  }

  // Before trump is set every suit ranks plainly (9 low, ace high).
  const strength = (card: CardId, suit: Suit) =>
    trump === null ? RANKS.indexOf(rankOf(card)) : trickRank(card, suit, trump);
  const unseenInSuit = (suit: Suit) => [...unseen].filter((c) => effectiveSuit(c, trump) === suit);

  return {
    trump,
    played,
    unseen,
    voids,
    unseenInSuit,
    isBoss(card) {
      const suit = effectiveSuit(card, trump);
      const mine = strength(card, suit);
      return unseenInSuit(suit).every((c) => strength(c, suit) < mine);
    },
  };
}

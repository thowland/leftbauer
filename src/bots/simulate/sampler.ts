/**
 * Deal sampling — Technical Spec §6.4.
 *
 * Deals the cards a seat cannot see to the other hands, at random but
 * consistent with everything the seat knows: each hand's size, the suits
 * a player has shown out of, and the dealer holding a picked-up upcard
 * (unless the dealer has since shown out of its suit, or has no cards
 * left, either of which means it was the discard). Cards left over are the kitty and the dealer's discard,
 * out of play.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { effectiveSuit, type CardId } from '../../engine/cards';
import type { Hands } from '../../engine/deal';
import { SEATS, type Seat } from '../../engine/seats';
import type { PlayerView } from '../../engine/view';
import type { Rng } from '../../util/rng';
import type { CardKnowledge } from '../knowledge';

/** Random placements tried before the void constraints are relaxed. */
const ATTEMPTS = 20;

/** Where a hidden card may go: one of the other seats, or out of play. */
type Slot = Seat | 'out';

export function sampleDeal(view: PlayerView, knowledge: CardKnowledge, rng: Rng): Hands {
  const trump = knowledge.trump;
  const hands: CardId[][] = SEATS.map((s) => (s === view.seat ? [...view.myHand] : []));
  const room = SEATS.map((s) => (s === view.seat ? 0 : view.handSizes[s]));

  const pool = [...knowledge.unseen];
  const dealer = view.dealer;
  const upcardHeld =
    view.upcardStatus === 'pickedUp' &&
    dealer !== view.seat &&
    room[dealer]! > 0 &&
    knowledge.unseen.has(view.upcard) &&
    !knowledge.voids[dealer].has(effectiveSuit(view.upcard, trump));
  if (upcardHeld) {
    hands[dealer]!.push(view.upcard);
    room[dealer]!--;
    pool.splice(pool.indexOf(view.upcard), 1);
  }

  const seatRoom = room.reduce((a, b) => a + b, 0);
  for (let attempt = 0; attempt <= ATTEMPTS; attempt++) {
    const relaxed = attempt === ATTEMPTS;
    const placed = place(pool, room, pool.length - seatRoom, rng, (card, seat) =>
      relaxed ? true : !knowledge.voids[seat].has(effectiveSuit(card, trump))
    );
    if (placed !== null) {
      return SEATS.map((s) => [...hands[s]!, ...placed[s]!]) as unknown as Hands;
    }
  }
  /* v8 ignore next 2 -- the relaxed attempt always fits: every card may go anywhere */
  throw new Error('Could not sample a deal');
}

/**
 * Place every card, most constrained first, each in a slot chosen with
 * probability proportional to the room left there. Returns `null` when a
 * card has nowhere it may go.
 */
function place(
  pool: readonly CardId[],
  seatRoom: readonly number[],
  outRoom: number,
  rng: Rng,
  allowed: (card: CardId, seat: Seat) => boolean
): CardId[][] | null {
  const room = [...seatRoom];
  let out = outRoom;
  const placed: CardId[][] = [[], [], [], []];
  const options = (card: CardId) => SEATS.filter((s) => room[s]! > 0 && allowed(card, s));
  // Cards with fewer possible owners go first, shuffled among equals.
  const order = pool
    .map((card) => ({ card, key: options(card).length * 1000 + rng.nextInt(1000) }))
    .sort((a, b) => a.key - b.key);

  for (const { card } of order) {
    const slots: { slot: Slot; weight: number }[] = options(card).map((s) => ({
      slot: s,
      weight: room[s]!,
    }));
    if (out > 0) slots.push({ slot: 'out', weight: out });
    const total = slots.reduce((sum, s) => sum + s.weight, 0);
    if (total === 0) return null;
    let pick = rng.nextInt(total);
    const chosen = slots.find((s) => (pick -= s.weight) < 0)!.slot;
    if (chosen === 'out') {
      out--;
    } else {
      room[chosen]!--;
      placed[chosen]!.push(card);
    }
  }
  return room.every((r) => r === 0) ? placed : null;
}

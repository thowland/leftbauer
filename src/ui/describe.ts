/**
 * Plain-language descriptions of game events and seat status, from the
 * human's point of view. Used by the dev panel now and by the table's
 * status messages later.
 */

import type { BidAction } from '../engine/actions';
import type { GameEvent } from '../engine/events';
import type { Seat } from '../engine/seats';
import type { HandOutcome, HandResult } from '../engine/state';
import type { PlayerView } from '../engine/view';
import { cardLabel, SUIT_NAMES } from '../assets/manifest';
import { seatName, teamName } from './layout';

const OUTCOME_TEXT: Record<HandOutcome, string> = {
  made: 'made it',
  march: 'marched',
  lonerMade: 'made it alone',
  lonerSweep: 'swept it alone',
  euchred: 'were euchred',
  euchredAlone: 'were euchred alone',
};

/** A verb agreeing with its subject: "plays" for others, "play" for "You". */
type Conjugate = (thirdPerson: string) => string;

const thirdPerson: Conjugate = (verb) => verb;
const secondPerson: Conjugate = (verb) => verb.replace(/(?<=ss|o)es$|s$/, '');

function bidText(action: BidAction, isDealer: boolean, v: Conjugate): string {
  const alone = 'alone' in action && action.alone ? ` and ${v('goes')} alone` : '';
  switch (action.type) {
    case 'pass':
      return v('passes');
    case 'orderUp':
      return (isDealer ? `${v('picks')} it up` : `${v('orders')} it up`) + alone;
    case 'callTrump':
      return `${v('calls')} ${SUIT_NAMES[action.suit]}${alone}`;
  }
}

export function describeResult(result: HandResult, humanSeat: Seat): string {
  if (result.kind === 'redeal') return 'Everyone passed. The hand is redealt.';
  const makers = teamName(result.makers, humanSeat);
  const [ours, theirs] =
    teamName(0, humanSeat) === 'Us'
      ? [result.tricksWon[0], result.tricksWon[1]]
      : [result.tricksWon[1], result.tricksWon[0]];
  const to = teamName(result.pointsTo, humanSeat);
  const points = `${result.points} point${result.points === 1 ? '' : 's'}`;
  return `${makers === 'Us' ? 'We' : 'They'} ${OUTCOME_TEXT[result.outcome]} (tricks ${ours}–${theirs}): ${points} to ${to.toLowerCase()}.`;
}

/**
 * One line per event, or `null` for events that add nothing to read.
 * `dealer` is the dealer of the hand the event belongs to.
 */
export function describeEvent(event: GameEvent, humanSeat: Seat, dealer: Seat): string | null {
  const name = (seat: Seat) => seatName(seat, humanSeat);
  const v = (seat: Seat): Conjugate => (seat === humanSeat ? secondPerson : thirdPerson);
  switch (event.type) {
    case 'handDealt':
      return `Hand ${event.handNumber}: ${name(event.dealer)} ${v(event.dealer)('deals')}. The ${cardLabel(event.upcard)} is turned up.`;
    case 'bidMade':
      return `${name(event.seat)} ${bidText(event.action, event.seat === dealer, v(event.seat))}.`;
    case 'trumpSet':
      return null;
    case 'upcardPickedUp':
      return null;
    case 'upcardTurnedDown':
      return `${name(event.dealer)} ${v(event.dealer)('turns')} the upcard down.`;
    case 'upcardSetAside':
      return `${name(event.dealer)} ${v(event.dealer)('sits')} out, and the upcard is set aside.`;
    case 'dealerDiscarded':
      return `${name(event.dealer)} ${v(event.dealer)('discards')}.`;
    case 'cardPlayed':
      return `${name(event.seat)} ${v(event.seat)('plays')} the ${cardLabel(event.card)}.`;
    case 'trickWon':
      return `${name(event.seat)} ${v(event.seat)('takes')} trick ${event.trickIndex + 1}.`;
    case 'handScored':
      return describeResult(event.result, humanSeat);
    case 'redeal':
      return describeResult({ kind: 'redeal' }, humanSeat);
    case 'gameOver':
      return `${teamName(event.winner, humanSeat) === 'Us' ? 'We win' : 'They win'} the game.`;
  }
}

/** A short status chip for a seat: its bid this round, the contract, or sitting out. */
export function seatStatus(view: PlayerView, seat: Seat): string | null {
  if (view.sittingOut === seat) return 'Sitting out';
  const { contract } = view;
  if (contract !== null) {
    if (contract.maker !== seat) return null;
    return `Called ${SUIT_NAMES[contract.trump]}${contract.alone ? ' · alone' : ''}`;
  }
  const round = view.phase === 'bidRound2' ? 2 : 1;
  const bid = view.bids.filter((b) => b.seat === seat && b.round === round).at(-1);
  return bid?.action.type === 'pass' ? 'Pass' : null;
}

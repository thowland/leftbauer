/**
 * Plain-language descriptions of game events and seat status, from the
 * human's point of view. Used by the dev panel now and by the table's
 * status messages later.
 */

import type { Action, BidAction } from '../engine/actions';
import type { GameEvent } from '../engine/events';
import type { Seat } from '../engine/seats';
import { EUCHRE_OUTCOMES, type HandOutcome, type HandResult } from '../engine/state';
import type { PlayerView } from '../engine/view';
import { cardLabel, SUIT_NAMES } from '../assets/manifest';
import { seatName, teamName, type SeatNames } from './layout';

const OUTCOME_TEXT: Record<HandOutcome, string> = {
  made: 'made it',
  march: 'marched',
  lonerMade: 'made it alone',
  lonerSweep: 'swept it alone',
  euchred: 'were euchred',
  euchredAlone: 'were euchred alone',
  euchredByLoneDefender: 'were euchred by a lone defender',
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
export function describeEvent(
  event: GameEvent,
  humanSeat: Seat,
  dealer: Seat,
  names?: SeatNames
): string | null {
  const name = (seat: Seat) => seatName(seat, humanSeat, names);
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
    case 'farmerSwapped':
      return `${name(event.seat)} ${v(event.seat)('swaps')} a farmer’s hand: three cards for the kitty.`;
    case 'defendAloneChosen':
      return event.accept ? `${name(event.seat)} ${v(event.seat)('defends')} alone.` : null;
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
  if (view.sittingOut.includes(seat)) return 'Sitting out';
  const { contract } = view;
  if (contract !== null) {
    if (contract.loneDefender === seat) return 'Defending alone';
    if (contract.maker !== seat) return null;
    return `Called ${SUIT_NAMES[contract.trump]}${contract.alone ? ' · alone' : ''}`;
  }
  const round = view.phase === 'bidRound2' ? 2 : 1;
  const bid = view.bids.filter((b) => b.seat === seat && b.round === round).at(-1);
  return bid?.action.type === 'pass' ? 'Pass' : null;
}

/** The line under the table telling the human what is happening (GF-2, GF-3). */
export function turnPrompt(
  view: PlayerView,
  legal: readonly Action[] | null,
  names?: SeatNames
): string {
  if (view.toAct === null) return '';
  if (legal === null) {
    return view.toAct === view.seat
      ? 'Your turn.'
      : `${seatName(view.toAct, view.seat, names)} is thinking…`;
  }
  switch (view.phase) {
    case 'farmer':
      return 'A farmer’s hand! Choose three cards to swap with the kitty, or keep your hand.';
    case 'defendAlone':
      return 'Defend alone against the makers? A euchre alone scores 4.';
    case 'bidRound1':
      if (!legal.some((a) => a.type === 'orderUp' && !a.alone) && legal.length > 1) {
        return 'Your partner deals: order it up only by going alone, or pass.';
      }
      return view.dealer === view.seat
        ? 'Pick up the upcard, or pass.'
        : 'Order up the upcard, or pass.';
    case 'bidRound2':
      return legal.some((a) => a.type === 'pass')
        ? 'Name trump, or pass.'
        : 'Stick the dealer: you must name trump.';
    case 'dealerDiscard':
      return 'Choose a card to discard: tap it, then tap again.';
    default:
      return view.currentTrick === null
        ? 'Your lead: tap a card, then tap again to play.'
        : 'Your turn: tap a card, then tap again to play.';
  }
}

export interface GameHighlight {
  readonly label: string;
  readonly us: number;
  readonly them: number;
}

/** Notable events over a whole game, for the game-over screen (GF-7). */
export function gameHighlights(results: readonly HandResult[], humanSeat: Seat): GameHighlight[] {
  const count = (
    label: string,
    test: (r: Extract<HandResult, { kind: 'scored' }>) => boolean,
    by: 'makers' | 'pointsTo'
  ) => {
    const tally = { label, us: 0, them: 0 };
    for (const r of results) {
      if (r.kind !== 'scored' || !test(r)) continue;
      if (teamName(r[by], humanSeat) === 'Us') tally.us++;
      else tally.them++;
    }
    return tally;
  };
  return [
    count('Marches', (r) => r.outcome === 'march', 'makers'),
    count('Loners made', (r) => r.outcome === 'lonerMade' || r.outcome === 'lonerSweep', 'makers'),
    count('Euchres', (r) => EUCHRE_OUTCOMES.includes(r.outcome), 'pointsTo'),
  ];
}

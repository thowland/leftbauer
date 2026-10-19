import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../src/engine/events';
import { scoreHand } from '../../../src/engine/scoring';
import { STANDARD_RULES } from '../../../src/engine/rules';
import type { Seat } from '../../../src/engine/seats';
import type { Trick } from '../../../src/engine/state';
import { toPlayerView } from '../../../src/engine/view';
import { describeEvent, describeResult, seatStatus } from '../../../src/ui/describe';
import { act, gameFromDeck } from '../../helpers/engine';

const d = (event: GameEvent, dealer: Seat = 3) => describeEvent(event, 0, dealer);
const tricks = (...winners: Seat[]): Trick[] =>
  winners.map((winner) => ({ leader: 0, plays: [], winner }));

describe('describeEvent', () => {
  it('describes the deal', () => {
    expect(d({ type: 'handDealt', dealer: 3, handNumber: 2, upcard: 'JD' })).toBe(
      'Hand 2: Right opponent deals. The Jack of diamonds is turned up.'
    );
    expect(d({ type: 'handDealt', dealer: 0, handNumber: 1, upcard: '9S' })).toBe(
      'Hand 1: You deal. The Nine of spades is turned up.'
    );
  });

  it('describes bids, with the dealer picking it up and verbs agreeing with "You"', () => {
    const bid = (seat: Seat, action: Extract<GameEvent, { type: 'bidMade' }>['action']) =>
      d({ type: 'bidMade', seat, round: 1, action });
    expect(bid(0, { type: 'pass' })).toBe('You pass.');
    expect(bid(1, { type: 'pass' })).toBe('Left opponent passes.');
    expect(bid(2, { type: 'orderUp', alone: false })).toBe('Partner orders it up.');
    expect(bid(3, { type: 'orderUp', alone: true })).toBe(
      'Right opponent picks it up and goes alone.'
    );
    expect(bid(0, { type: 'callTrump', suit: 'H', alone: true })).toBe(
      'You call hearts and go alone.'
    );
  });

  it('describes the upcard and the discard', () => {
    expect(d({ type: 'upcardTurnedDown', dealer: 3 })).toBe(
      'Right opponent turns the upcard down.'
    );
    expect(d({ type: 'upcardSetAside', dealer: 0 })).toBe(
      'You sit out, and the upcard is set aside.'
    );
    expect(d({ type: 'dealerDiscarded', dealer: 0 })).toBe('You discard.');
  });

  it('describes play', () => {
    expect(d({ type: 'cardPlayed', seat: 2, card: 'AH', trickIndex: 0 })).toBe(
      'Partner plays the Ace of hearts.'
    );
    expect(d({ type: 'trickWon', seat: 0, trickIndex: 4 })).toBe('You take trick 5.');
  });

  it('describes the end of a hand and of the game', () => {
    expect(d({ type: 'redeal', nextDealer: 0 })).toBe('Everyone passed. The hand is redealt.');
    expect(d({ type: 'gameOver', winner: 0, score: [10, 4] })).toBe('We win the game.');
    expect(d({ type: 'gameOver', winner: 1, score: [4, 10] })).toBe('They win the game.');
    const result = scoreHand(
      { trump: 'H', maker: 1, round: 1, alone: false },
      tricks(1, 3, 1, 0, 2),
      STANDARD_RULES
    );
    expect(d({ type: 'handScored', result, score: [0, 1] })).toBe(
      'They made it (tricks 2–3): 1 point to them.'
    );
  });

  it('stays quiet about events another line already covers', () => {
    expect(
      d({ type: 'trumpSet', contract: { trump: 'H', maker: 0, round: 1, alone: false } })
    ).toBeNull();
    expect(d({ type: 'upcardPickedUp', dealer: 3 })).toBeNull();
  });
});

describe('describeResult', () => {
  const contract = { trump: 'H' as const, maker: 0 as const, round: 1 as const, alone: false };

  it('counts tricks from the human team’s side', () => {
    const result = scoreHand(contract, tricks(1, 1, 3, 0, 1), STANDARD_RULES);
    expect(describeResult(result, 0)).toBe('We were euchred (tricks 1–4): 2 points to them.');
    expect(describeResult(result, 1)).toBe('They were euchred (tricks 4–1): 2 points to us.');
  });

  it('names marches and loners', () => {
    expect(describeResult(scoreHand(contract, tricks(0, 0, 2, 0, 2), STANDARD_RULES), 0)).toBe(
      'We marched (tricks 5–0): 2 points to us.'
    );
    const alone = { ...contract, alone: true };
    expect(describeResult(scoreHand(alone, tricks(0, 0, 0, 0, 0), STANDARD_RULES), 0)).toBe(
      'We swept it alone (tricks 5–0): 4 points to us.'
    );
  });
});

describe('seatStatus', () => {
  it('shows a pass in the current round only', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    expect(seatStatus(toPlayerView(s, 0), 0)).toBe('Pass');
    expect(seatStatus(toPlayerView(s, 0), 1)).toBeNull();
    for (const seat of [1, 2, 3] as const) s = act(s, seat, { type: 'pass' });
    expect(seatStatus(toPlayerView(s, 0), 0)).toBeNull();
  });

  it('shows the maker and who sits out', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    s = act(s, 1, { type: 'orderUp', alone: true });
    const view = toPlayerView(s, 0);
    expect(seatStatus(view, 1)).toBe('Called diamonds · alone');
    expect(seatStatus(view, 3)).toBe('Sitting out');
    expect(seatStatus(view, 0)).toBeNull();
  });
});

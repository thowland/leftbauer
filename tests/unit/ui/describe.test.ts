import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../../src/engine/events';
import { scoreHand } from '../../../src/engine/scoring';
import { STANDARD_RULES } from '../../../src/engine/rules';
import type { Seat } from '../../../src/engine/seats';
import type { Trick } from '../../../src/engine/state';
import { toPlayerView } from '../../../src/engine/view';
import { legalActions } from '../../../src/engine/game';
import {
  describeEvent,
  describeResult,
  gameHighlights,
  seatStatus,
  turnPrompt,
} from '../../../src/ui/describe';
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
      { trump: 'H', maker: 1, round: 1, alone: false, loneDefender: null },
      tricks(1, 3, 1, 0, 2),
      STANDARD_RULES
    );
    expect(d({ type: 'handScored', result, score: [0, 1] })).toBe(
      'They made it (tricks 2–3): 1 point to them.'
    );
  });

  it('describes the house rules’ moments, but not a defender declining', () => {
    expect(d({ type: 'farmerSwapped', seat: 1 })).toBe(
      'Left opponent swaps a farmer’s hand: three cards for the kitty.'
    );
    expect(d({ type: 'farmerSwapped', seat: 0 })).toBe(
      'You swap a farmer’s hand: three cards for the kitty.'
    );
    expect(d({ type: 'defendAloneChosen', seat: 0, accept: true })).toBe('You defend alone.');
    expect(d({ type: 'defendAloneChosen', seat: 3, accept: false })).toBeNull();
    const result = scoreHand(
      { trump: 'H', maker: 1, round: 1, alone: false, loneDefender: 0 },
      tricks(0, 0, 0, 1, 1),
      STANDARD_RULES
    );
    expect(d({ type: 'handScored', result, score: [4, 0] })).toBe(
      'They were euchred by a lone defender (tricks 3–2): 4 points to us.'
    );
  });

  it('stays quiet about events another line already covers', () => {
    expect(
      d({
        type: 'trumpSet',
        contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
      })
    ).toBeNull();
    expect(d({ type: 'upcardPickedUp', dealer: 3 })).toBeNull();
  });
});

describe('describeResult', () => {
  const contract = {
    trump: 'H' as const,
    maker: 0 as const,
    round: 1 as const,
    alone: false,
    loneDefender: null,
  };

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

describe('turnPrompt', () => {
  it('says who is thinking when it is not the human’s turn', () => {
    const s = act(gameFromDeck(), 0, { type: 'pass' });
    expect(turnPrompt(toPlayerView(s, 0), null)).toBe('Left opponent is thinking…');
    expect(turnPrompt(toPlayerView(gameFromDeck(), 0), null)).toBe('Your turn.');
  });

  it('prompts each kind of decision', () => {
    let s = gameFromDeck();
    const prompt = (seat: Seat) => turnPrompt(toPlayerView(s, seat), legalActions(s, seat));
    expect(prompt(0)).toBe('Order up the upcard, or pass.');
    for (const seat of [0, 1, 2] as const) s = act(s, seat, { type: 'pass' });
    expect(prompt(3)).toBe('Pick up the upcard, or pass.');
    s = act(s, 3, { type: 'pass' });
    expect(prompt(0)).toBe('Name trump, or pass.');
    s = act(gameFromDeck(), 0, { type: 'orderUp', alone: false });
    expect(prompt(3)).toMatch(/^Choose a card to discard/);
    s = act(s, 3, { type: 'discard', card: 'AC' });
    expect(prompt(0)).toMatch(/^Your lead/);
    s = act(s, 0, { type: 'play', card: 'AH' });
    expect(prompt(1)).toMatch(/^Your turn/);
  });

  it('tells a stuck dealer they must name trump', () => {
    let s = gameFromDeck(undefined, 3, { ...STANDARD_RULES, stickTheDealer: true });
    for (const seat of [0, 1, 2, 3, 0, 1, 2] as const) s = act(s, seat, { type: 'pass' });
    expect(turnPrompt(toPlayerView(s, 3), legalActions(s, 3))).toBe(
      'Stick the dealer: you must name trump.'
    );
  });

  it('is empty once the hand is over', () => {
    let s = gameFromDeck();
    for (const seat of [0, 1, 2, 3, 0, 1, 2, 3] as const) s = act(s, seat, { type: 'pass' });
    expect(turnPrompt(toPlayerView(s, 0), null)).toBe('');
  });
});

describe('gameHighlights', () => {
  it('tallies marches, loners and euchres for each team', () => {
    const contract = {
      trump: 'H' as const,
      maker: 0 as const,
      round: 1 as const,
      alone: false,
      loneDefender: null,
    };
    const results = [
      scoreHand(contract, tricks(0, 0, 0, 2, 2), STANDARD_RULES), // our march
      scoreHand({ ...contract, alone: true }, tricks(0, 0, 0, 1, 0), STANDARD_RULES), // our loner
      scoreHand(contract, tricks(1, 1, 3, 0, 1), STANDARD_RULES), // they euchre us
      { kind: 'redeal' as const },
    ];
    expect(gameHighlights(results, 0)).toEqual([
      { label: 'Marches', us: 1, them: 0 },
      { label: 'Loners made', us: 1, them: 0 },
      { label: 'Euchres', us: 0, them: 1 },
    ]);
  });
});

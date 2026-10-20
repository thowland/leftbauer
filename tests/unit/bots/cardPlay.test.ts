import { describe, expect, it } from 'vitest';
import { conventionalCardPlay, SAVE_TRUMP_CAUTION } from '../../../src/bots/conventions/cardPlay';
import type { CardId } from '../../../src/engine/cards';
import type { PlayerView } from '../../../src/engine/view';
import { contextFor, makeView, trickOf } from '../../helpers/bots';

/** The top-ranked card and its reason. Hearts are trump unless stated. */
function play(view: PlayerView, style = {}): { card: CardId; reason: string } {
  const [top] = conventionalCardPlay.play(contextFor(view, { style }));
  return { card: top!.value, reason: top!.reason.code };
}

describe('leading (PB-4)', () => {
  it('has the maker pull trump with the boss trump', () => {
    expect(play(makeView({ myHand: ['JH', 'TH', 'AS', '9C', 'KD'] }))).toEqual({
      card: 'JH',
      reason: 'lead-boss-trump',
    });
  });

  it('treats the left bower as boss once the right is gone', () => {
    const view = makeView({
      myHand: ['JD', 'TH', 'AS', '9C'],
      tricks: [
        {
          leader: 1,
          plays: [
            { seat: 1, card: 'JH' },
            { seat: 2, card: '9H' },
            { seat: 3, card: 'QH' },
            { seat: 0, card: 'KH' },
          ],
          winner: 1,
        },
      ],
      handSizes: [4, 4, 4, 4],
    });
    expect(play(view)).toEqual({ card: 'JD', reason: 'lead-boss-trump' });
  });

  it('does not lead a lone boss trump unless alone', () => {
    const hand: CardId[] = ['JH', 'AS', '9C', 'KD', 'QD'];
    expect(play(makeView({ myHand: hand })).reason).not.toBe('lead-boss-trump');
    const alone = makeView({
      myHand: hand,
      contract: { trump: 'H', maker: 0, round: 2, alone: true, loneDefender: null },
      sittingOut: [2],
    });
    expect(play(alone)).toEqual({ card: 'JH', reason: 'lead-boss-trump' });
  });

  it('leads trump back to a partner who called', () => {
    const view = makeView({
      myHand: ['TH', '9H', 'AS', '9C', 'KD'],
      contract: { trump: 'H', maker: 2, round: 1, alone: false, loneDefender: null },
    });
    expect(play(view)).toEqual({ card: 'TH', reason: 'lead-trump-to-partner' });
  });

  it('cashes an off-suit ace, avoiding a suit an opponent is void in', () => {
    const view = makeView({
      myHand: ['AS', 'AC', '9D', 'TD'],
      contract: { trump: 'H', maker: 1, round: 1, alone: false, loneDefender: null },
      handSizes: [4, 4, 4, 4],
      tricks: [
        {
          leader: 0,
          plays: [
            { seat: 0, card: 'KS' },
            { seat: 1, card: '9H' },
            { seat: 2, card: '9S' },
            { seat: 3, card: 'TS' },
          ],
          winner: 1,
        },
      ],
    });
    expect(play(view)).toEqual({ card: 'AC', reason: 'lead-off-ace' });
  });

  it('defends by leading low from the shortest plain suit', () => {
    const view = makeView({
      myHand: ['QS', 'KC', '9C', 'TH', 'QD'],
      contract: { trump: 'H', maker: 1, round: 1, alone: false, loneDefender: null },
    });
    // Spades and diamonds are singletons; the queens tie, so either is fine but not trump.
    const { card, reason } = play(view);
    expect(reason).toBe('lead-short-suit');
    expect(['QS', 'QD']).toContain(card);
  });

  it('falls back to the cheapest card', () => {
    const view = makeView({ myHand: ['TH', 'QS', 'KS'], handSizes: [3, 3, 3, 3] });
    expect(play(view)).toEqual({ card: 'QS', reason: 'lead-lowest' });
  });
});

describe('following (PB-4)', () => {
  it('never overtakes a partner who is winning', () => {
    const view = makeView({
      seat: 3,
      myHand: ['AS', '9S', 'JH'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'TS'], [1, 'AC'], [2, 'KS']),
      contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
    });
    // Seat 3's partner is seat 1, who is not winning; check with seat 1's view instead.
    const partnerWinning = makeView({
      seat: 2,
      myHand: ['AS', '9S', 'KD'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'KS'], [1, 'QS']),
    });
    expect(play(partnerWinning)).toEqual({ card: '9S', reason: 'follow-partner-winning' });
    expect(play(view).reason).not.toBe('follow-partner-winning');
  });

  it('wins as cheaply as possible when last to play', () => {
    const view = makeView({
      seat: 3,
      myHand: ['AS', 'KS', 'JH'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'QS'], [1, '9S'], [2, 'TS']),
    });
    expect(play(view)).toEqual({ card: 'KS', reason: 'follow-win-cheaply' });
  });

  it('prefers a winner nobody can beat with players still to come', () => {
    const view = makeView({
      seat: 1,
      // Both spades beat the 9, but only the ace is safe from the unseen J, Q and K.
      myHand: ['AS', 'TS', '9C'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, '9S']),
      contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
    });
    expect(play(view)).toEqual({ card: 'AS', reason: 'follow-win-cheaply' });
  });

  it('trumps in cheaply when void in the led suit', () => {
    const view = makeView({
      seat: 3,
      myHand: ['QH', '9H', 'AC'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'AS'], [1, 'KS'], [2, '9S']),
      contract: { trump: 'H', maker: 3, round: 1, alone: false, loneDefender: null },
    });
    expect(play(view)).toEqual({ card: '9H', reason: 'follow-win-cheaply' });
  });

  it('lets a cautious defender save trump while partner may still win', () => {
    const view = makeView({
      seat: 1,
      myHand: ['QH', '9C', 'TD'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'KS']),
      contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
    });
    expect(play(view, { defensiveCaution: SAVE_TRUMP_CAUTION })).toEqual({
      card: '9C',
      reason: 'follow-save-trump',
    });
    expect(play(view, { defensiveCaution: 0.3 })).toEqual({
      card: 'QH',
      reason: 'follow-win-cheaply',
    });
  });

  it('throws the cheapest card when it cannot win, keeping trump', () => {
    const view = makeView({
      seat: 3,
      myHand: ['9S', 'TS', 'JH'],
      handSizes: [3, 3, 3, 3],
      currentTrick: trickOf([0, 'AS'], [1, 'KS'], [2, 'QS']),
      contract: { trump: 'H', maker: 1, round: 1, alone: false, loneDefender: null },
    });
    expect(play(view)).toEqual({ card: '9S', reason: 'follow-throw-low' });
  });

  it('ranks every legal card, the chosen one first', () => {
    const options = conventionalCardPlay.play(
      contextFor(makeView({ myHand: ['JH', 'TH', 'AS', '9C', 'KD'] }))
    );
    expect(options.map((o) => o.value).sort()).toEqual(['9C', 'AS', 'JH', 'KD', 'TH']);
    expect(options[0]!.score).toBeGreaterThan(options[1]!.score);
  });
});

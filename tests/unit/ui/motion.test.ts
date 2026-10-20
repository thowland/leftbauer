import { describe, expect, it } from 'vitest';
import { dealt, flyFrom, flyTo, intoHand } from '../../../src/ui/motion';
import type { Cue } from '../../../src/ui/game/presenter';

const deal: Cue = { kind: 'deal', dealer: 3, handNumber: 1 };

describe('card motion (SA-1)', () => {
  it('flies cards between the center and a seat, as seen from the human', () => {
    expect(flyFrom(0, 0)).toEqual({
      className: 'fly-in',
      style: { '--dx': 0, '--dy': 1, '--step': 0 },
    });
    expect(flyFrom(1, 0).style).toMatchObject({ '--dx': -1, '--dy': 0 });
    // Seen from seat 2, seat 0 sits across the table, at the top.
    expect(flyTo(0, 2)).toEqual({
      className: 'fly-out',
      style: { '--dx': 0, '--dy': -1, '--step': 0 },
    });
  });

  it('deals from the dealer, clockwise from their left, a card per seat per round', () => {
    // Dealer 3 is on the human's right; seat 0 (bottom) is dealt first.
    expect(dealt(deal, 0, 0, 0)).toEqual({
      className: 'fly-in',
      style: { '--dx': 1, '--dy': -1, '--step': 0 },
    });
    expect(dealt(deal, 1, 0, 0)?.style).toMatchObject({ '--step': 1 });
    expect(dealt(deal, 3, 0, 0)?.style).toMatchObject({ '--dx': 0, '--dy': 0, '--step': 3 });
    expect(dealt(deal, 0, 4, 0)?.style).toMatchObject({ '--step': 16 });
    // The kitty lands last, straight from the dealer.
    expect(dealt(deal, null, 0, 0)?.style).toMatchObject({ '--dx': 1, '--dy': 0, '--step': 20 });
  });

  it('moves nothing without a matching cue', () => {
    expect(dealt(null, 0, 0, 0)).toBeUndefined();
    expect(dealt({ kind: 'turnDown' }, 0, 0, 0)).toBeUndefined();
    expect(intoHand(null, 'JD')).toBeUndefined();
    expect(intoHand({ kind: 'pickup', dealer: 0, card: 'JD' }, 'QD')).toBeUndefined();
    expect(intoHand({ kind: 'pickup', dealer: 0, card: 'JD' }, 'JD')?.className).toBe('fly-in');
  });
});

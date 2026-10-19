import { describe, expect, it } from 'vitest';
import {
  BASE_CALL_THRESHOLD,
  CATCH_UP,
  callThreshold,
  conventionalBidding,
  SCORE_PRESSURE,
  STICK_PENALTY,
} from '../../../src/bots/conventions/bidding';
import { BASE_LONER_THRESHOLD, conventionalLoner } from '../../../src/bots/conventions/loner';
import { conventionalDiscard } from '../../../src/bots/conventions/discard';
import type { Action } from '../../../src/engine/actions';
import { STANDARD_RULES } from '../../../src/engine/rules';
import type { PlayerView } from '../../../src/engine/view';
import { contextFor, makeView } from '../../helpers/bots';

const round1 = (over: Partial<PlayerView> & { myHand: PlayerView['myHand'] }) =>
  makeView({ phase: 'bidRound1', contract: null, upcardStatus: 'faceUp', upcard: 'TH', ...over });

const ROUND2_LEGAL: Action[] = [
  ...(['S', 'C', 'D'] as const).flatMap((suit) => [
    { type: 'callTrump' as const, suit, alone: false },
    { type: 'callTrump' as const, suit, alone: true },
  ]),
  { type: 'pass' },
];

const round2 = (over: Partial<PlayerView> & { myHand: PlayerView['myHand'] }) =>
  makeView({
    phase: 'bidRound2',
    contract: null,
    upcardStatus: 'turnedDown',
    upcard: 'TH',
    ...over,
  });

const top = <T>(options: { value: T; score: number; reason: { code: string } }[]) =>
  [...options].sort((a, b) => b.score - a.score)[0]!;

describe('round one bidding (PB-4)', () => {
  it('orders up a strong trump hand', () => {
    const best = top(
      conventionalBidding.round1(contextFor(round1({ myHand: ['JH', 'JD', 'AH', 'KS', '9C'] })))
    );
    expect(best.value).toEqual({ type: 'orderUp', alone: false });
    expect(best.reason.code).toBe('bid-strong-hand');
  });

  it('passes a weak hand', () => {
    const best = top(
      conventionalBidding.round1(contextFor(round1({ myHand: ['9H', 'QS', 'TC', '9D', 'KD'] })))
    );
    expect(best.value).toEqual({ type: 'pass' });
    expect(best.reason.code).toBe('bid-pass-weak');
  });

  it('values the upcard for the dealer, and against an opponent dealer', () => {
    const hand = ['JH', 'AH', 'KS', 'AC', '9D'] as const;
    const score = (seat: 0 | 1 | 2 | 3, dealer: 0 | 1 | 2 | 3) =>
      conventionalBidding.round1(contextFor(round1({ seat, dealer, myHand: [...hand] })))[0]!.score;
    // Same hand: best as dealer, then partner of the dealer, worst against an opponent dealer.
    expect(score(3, 3)).toBeGreaterThan(score(1, 3));
    expect(score(1, 3)).toBeGreaterThan(score(0, 3));
  });

  it('offers only pass when ordering up is not legal', () => {
    const options = conventionalBidding.round1(
      contextFor(round1({ myHand: ['JH', 'JD', 'AH', 'KS', '9C'] }), { legal: [{ type: 'pass' }] })
    );
    expect(options.map((o) => o.value)).toEqual([{ type: 'pass' }]);
  });
});

describe('round two bidding (PB-4)', () => {
  it('calls the best suit with a strong hand', () => {
    const best = top(
      conventionalBidding.round2(
        contextFor(round2({ seat: 2, myHand: ['JS', 'JC', 'AS', 'KS', '9D'] }), {
          legal: ROUND2_LEGAL,
        })
      )
    );
    expect(best.value).toEqual({ type: 'callTrump', suit: 'S', alone: false });
    expect(best.reason.code).toBe('bid-best-suit');
  });

  it('favors "next" from the seat left of the dealer', () => {
    // Hearts turned down; next is diamonds. Seat 0 is left of dealer 3.
    const hand = ['JD', 'AD', 'QD', 'AS', '9C'] as const;
    const options = conventionalBidding.round2(
      contextFor(round2({ myHand: [...hand] }), { legal: ROUND2_LEGAL })
    );
    const diamonds = options.find((o) => o.value.type === 'callTrump' && o.value.suit === 'D')!;
    expect(diamonds.reason.code).toBe('bid-call-next');
    const fromOtherSeat = conventionalBidding
      .round2(contextFor(round2({ seat: 2, myHand: [...hand] }), { legal: ROUND2_LEGAL }))
      .find((o) => o.value.type === 'callTrump' && o.value.suit === 'D')!;
    expect(diamonds.score).toBeGreaterThan(fromOtherSeat.score);
  });

  it('names the best suit when stuck, however weak', () => {
    const stuckLegal = ROUND2_LEGAL.filter((a) => a.type !== 'pass');
    const best = top(
      conventionalBidding.round2(
        contextFor(round2({ seat: 3, myHand: ['9S', 'TS', 'QC', '9D', 'KD'] }), {
          legal: stuckLegal,
        })
      )
    );
    expect(best.value.type).toBe('callTrump');
    expect(best.reason.code).toBe('bid-stuck');
  });
});

describe('the calling threshold (PB-5)', () => {
  const ctx = (over: Partial<PlayerView>, style = {}) =>
    contextFor(round1({ myHand: ['9S'], ...over }), { style });

  it('starts from the base threshold plus the persona offset', () => {
    expect(callThreshold(ctx({}), 1)).toBe(BASE_CALL_THRESHOLD);
    expect(callThreshold(ctx({}, { callThreshold: -0.35 }), 1)).toBeCloseTo(
      BASE_CALL_THRESHOLD - 0.35
    );
  });

  it('contests the call when the opponents are one point from winning', () => {
    expect(callThreshold(ctx({ score: [5, 9] }), 1)).toBeCloseTo(
      BASE_CALL_THRESHOLD - SCORE_PRESSURE
    );
    expect(callThreshold(ctx({ score: [5, 9] }, { scoreAwareness: 0 }), 1)).toBe(
      BASE_CALL_THRESHOLD
    );
  });

  it('takes more chances when far behind', () => {
    expect(callThreshold(ctx({ score: [0, 7] }), 1)).toBeCloseTo(BASE_CALL_THRESHOLD - CATCH_UP);
  });

  it('passes more readily to stick an opposing dealer', () => {
    const rules = { ...STANDARD_RULES, stickTheDealer: true };
    expect(callThreshold(ctx({ rules }, { stickAggression: 1 }), 2)).toBeCloseTo(
      BASE_CALL_THRESHOLD + STICK_PENALTY
    );
    expect(callThreshold(ctx({ rules, dealer: 2 }, { stickAggression: 1 }), 2)).toBe(
      BASE_CALL_THRESHOLD
    );
  });
});

describe('going alone (PB-4)', () => {
  const goAlone = (hand: PlayerView['myHand'], over: Partial<PlayerView> = {}, style = {}) =>
    top(conventionalLoner.goAlone(contextFor(round1({ myHand: hand, ...over }), { style }), 'H'));

  it('goes alone only on a hand that justifies it', () => {
    expect(goAlone(['JH', 'JD', 'AH', 'KH', 'AS'])).toMatchObject({
      value: true,
      reason: { code: 'loner-strong' },
    });
    expect(goAlone(['JH', 'AH', 'KS', 'AC', '9D'])).toMatchObject({
      value: false,
      reason: { code: 'loner-not-strong-enough' },
    });
  });

  it('lets a loner hunter go alone on less', () => {
    const hand = ['JH', 'JD', 'AH', 'QS', '9C'] as const;
    expect(goAlone([...hand]).value).toBe(false);
    expect(goAlone([...hand], {}, { lonerThreshold: -0.8 }).value).toBe(true);
  });

  it('does not count the upcard when the partner deals (it is set aside)', () => {
    const hand = ['JD', 'AH', 'KH', 'QH', 'AS'] as const;
    const asPartnerOfDealer = conventionalLoner.goAlone(
      contextFor(round1({ seat: 1, dealer: 3, myHand: [...hand] })),
      'H'
    )[0]!;
    const asDealer = conventionalLoner.goAlone(
      contextFor(round1({ seat: 3, dealer: 3, myHand: [...hand] })),
      'H'
    )[0]!;
    expect(asDealer.score).toBeGreaterThan(asPartnerOfDealer.score);
    expect(BASE_LONER_THRESHOLD).toBeGreaterThan(3);
  });

  it('ignores the upcard in round two', () => {
    const options = conventionalLoner.goAlone(
      contextFor(round2({ myHand: ['JS', 'JC', 'AS', 'KS', 'QS'] }), { legal: ROUND2_LEGAL }),
      'S'
    );
    expect(options[0]!.value).toBe(true);
    expect(options[0]!.score).toBeGreaterThan(0);
  });
});

describe('the dealer’s discard (PB-4)', () => {
  const discard = (hand: PlayerView['myHand']) =>
    top(
      conventionalDiscard.discard(
        contextFor(
          makeView({
            phase: 'dealerDiscard',
            seat: 3,
            myHand: hand,
            upcardStatus: 'pickedUp',
            upcard: 'AH',
          })
        )
      )
    );

  it('makes a void by throwing a lone off-suit card', () => {
    expect(discard(['AH', 'KH', '9H', 'KS', 'QS', 'TC'])).toMatchObject({
      value: 'TC',
      reason: { code: 'discard-make-void' },
    });
  });

  it('keeps a lone ace and throws the cheapest card instead', () => {
    expect(discard(['AH', 'KH', '9H', 'AC', 'QS', '9S'])).toMatchObject({
      value: '9S',
      reason: { code: 'discard-lowest' },
    });
  });

  it('never throws a bower', () => {
    const { value } = discard(['JH', 'JD', 'AH', 'KH', 'QH', 'TH']);
    expect(['JH', 'JD']).not.toContain(value);
    expect(value).toBe('TH');
  });
});

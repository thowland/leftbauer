import { describe, expect, it } from 'vitest';
import { cardValue, HeuristicEvaluator, NoisyEvaluator } from '../../../src/bots/evaluate';
import { buildKnowledge } from '../../../src/bots/knowledge';
import { createBot } from '../../../src/bots/factory';
import {
  DISGUISES,
  OPPONENT_IDS,
  PERSONAS,
  personaById,
  playingPersona,
} from '../../../src/bots/personas';
import { specKey } from '../../../src/bots/bot';
import { bestSelector, noisySelector } from '../../../src/bots/selectors';
import { cheapestFirst, holdingStrength, rankByRules } from '../../../src/bots/conventions/rule';
import { seededRng } from '../../../src/util/rng';
import { contextFor, makeView, trickOf } from '../../helpers/bots';

describe('HeuristicEvaluator', () => {
  const evaluator = new HeuristicEvaluator();
  const none = { upcard: null, taker: null };

  it('ranks the bowers above the ace of trump', () => {
    const hand = ['JH', 'JD', 'AH'] as const;
    expect(cardValue('JH', 'H', hand)).toBeGreaterThan(cardValue('JD', 'H', hand));
    expect(cardValue('JD', 'H', hand)).toBeGreaterThan(cardValue('AH', 'H', hand));
  });

  it('values off-suit aces and guarded kings', () => {
    expect(cardValue('AS', 'H', ['AS'])).toBeGreaterThan(0.5);
    expect(cardValue('KS', 'H', ['AS', 'KS'])).toBeGreaterThan(cardValue('KS', 'H', ['KS', '9S']));
    expect(cardValue('KS', 'H', ['KS'])).toBeGreaterThan(0);
    expect(cardValue('QS', 'H', ['QS'])).toBe(0);
  });

  it('rewards trump length and voids, and never exceeds five tricks', () => {
    const long = evaluator.expectedTricks(['JH', 'JD', 'AH', 'KH', 'QH'], 'H', none);
    expect(long).toBe(5);
    const short = evaluator.expectedTricks(['9H', 'TH', 'AS', 'KS', 'QS'], 'H', none);
    const withVoid = evaluator.expectedTricks(['9H', 'TH', 'AS', 'KS', 'QC'], 'H', none);
    expect(short).toBeLessThan(long);
    expect(withVoid).not.toBe(short);
  });

  it('accounts for who takes the upcard', () => {
    const hand = ['JH', 'AS', '9C', 'TD', 'QD'] as const;
    const base = evaluator.expectedTricks(hand, 'H', none);
    const upcard = 'AH' as const;
    expect(evaluator.expectedTricks(hand, 'H', { upcard, taker: 'me' })).toBeGreaterThan(base);
    expect(evaluator.expectedTricks(hand, 'H', { upcard, taker: 'partner' })).toBeGreaterThan(base);
    expect(evaluator.expectedTricks(hand, 'H', { upcard, taker: 'opponent' })).toBeLessThan(base);
  });

  it('blurs estimates for Casual play, deterministically per seed', () => {
    const hand = ['JH', 'AS', '9C', 'TD', 'QD'] as const;
    const a = new NoisyEvaluator(evaluator, 0.5, seededRng(4)).expectedTricks(hand, 'H', none);
    const b = new NoisyEvaluator(evaluator, 0.5, seededRng(4)).expectedTricks(hand, 'H', none);
    expect(a).toBe(b);
    expect(Math.abs(a - evaluator.expectedTricks(hand, 'H', none))).toBeLessThanOrEqual(0.5);
  });
});

describe('CardKnowledge', () => {
  it('tracks played cards and voids, and excludes a dead upcard', () => {
    const view = makeView({
      myHand: ['AS', 'KS'],
      upcard: '9D',
      upcardStatus: 'turnedDown',
      tricks: [
        {
          leader: 0,
          plays: [
            { seat: 0, card: 'QS' },
            { seat: 1, card: '9H' },
            { seat: 2, card: 'TS' },
            { seat: 3, card: 'JS' },
          ],
          winner: 1,
        },
      ],
      currentTrick: trickOf([1, 'AC'], [2, '9C']),
    });
    const k = buildKnowledge(view);
    expect(k.played.has('QS')).toBe(true);
    expect(k.played.has('AC')).toBe(true);
    expect(k.unseen.has('9D')).toBe(false);
    expect(k.unseen.has('AS')).toBe(false);
    expect(k.voids[1].has('S')).toBe(true);
    expect(k.voids[2].size).toBe(0);
    expect(k.isBoss('AS')).toBe(true);
    expect(k.unseenInSuit('S')).toEqual(['9S']);
  });

  it('keeps a picked-up upcard live and knows the dealer’s own discard', () => {
    const view = makeView({
      myHand: ['AH'],
      upcard: 'KH',
      upcardStatus: 'pickedUp',
      myDiscard: '9C',
    });
    const k = buildKnowledge(view);
    expect(k.unseen.has('KH')).toBe(true);
    expect(k.unseen.has('9C')).toBe(false);
  });

  it('ranks plainly before trump is set', () => {
    const k = buildKnowledge(
      makeView({ myHand: ['AS', 'JS'], contract: null, phase: 'bidRound1' })
    );
    expect(k.trump).toBeNull();
    expect(k.isBoss('AS')).toBe(true);
    expect(k.isBoss('JS')).toBe(false);
  });
});

describe('selectors', () => {
  const options = [
    { value: 'a', score: 1, reason: { code: 'lead-lowest' as const } },
    { value: 'b', score: 3, reason: { code: 'lead-lowest' as const } },
    { value: 'c', score: 2, reason: { code: 'lead-lowest' as const } },
  ];

  it('picks the best score', () => {
    expect(bestSelector.select(options, seededRng(1)).value).toBe('b');
    expect(() => bestSelector.select([], seededRng(1))).toThrow(/No options/);
  });

  it('slips to a lower-ranked option at the mistake rate', () => {
    const always = noisySelector(1, 2);
    const picks = new Set(
      Array.from({ length: 50 }, (_, i) => always.select(options, seededRng(i)).value)
    );
    expect(picks.has('b')).toBe(false);
    expect([...picks].every((p) => p === 'a' || p === 'c')).toBe(true);
    expect(noisySelector(0, 2).select(options, seededRng(3)).value).toBe('b');
    expect(always.select([options[0]!], seededRng(3)).value).toBe('a');
  });
});

describe('rule helpers', () => {
  it('orders cards cheapest first: plain before trump, short suits on a tie', () => {
    expect(cheapestFirst(['9H', 'AS', '9C', '9S'], ['9H', 'AS', '9C', '9S', 'TS'], 'H')).toEqual([
      '9C',
      '9S',
      'AS',
      '9H',
    ]);
    expect(holdingStrength('JD', 'H')).toBeGreaterThan(holdingStrength('AH', 'H'));
    expect(holdingStrength('JS', null)).toBeLessThan(holdingStrength('QS', null));
  });

  it('refuses a rule chain where nothing applies', () => {
    expect(() =>
      rankByRules(
        contextFor(makeView({ myHand: ['9S'] })),
        [{ id: 'lead-lowest', choose: () => null }],
        [],
        'lead-lowest'
      )
    ).toThrow(/No convention applied/);
  });
});

describe('personas (OP-3)', () => {
  it('has the partner, four named opponents and Johnny Blue', () => {
    expect(PERSONAS.map((p) => p.name)).toEqual([
      'Partner',
      'Soopy',
      'Shrubs',
      'Rusty',
      'Smooth',
      'Johnny Blue',
    ]);
    expect(OPPONENT_IDS).toEqual(['soopy', 'shrubs', 'rusty', 'smooth', 'johnny']);
    for (const p of PERSONAS) {
      expect(p.tagline.length).toBeGreaterThan(10);
      expect(p.colorToken).toMatch(/^--persona-/);
    }
  });

  it('gives each opponent its documented tendency', () => {
    expect(personaById('soopy').style!.callThreshold).toBeGreaterThan(0);
    expect(personaById('rusty').style!.callThreshold).toBeLessThan(0);
    expect(personaById('shrubs').style!.lonerThreshold).toBeLessThan(0);
    expect(personaById('smooth').style).toEqual(personaById('partner').style);
  });

  it('lets Johnny Blue play as any of the four, with no style of his own', () => {
    expect(DISGUISES).toEqual(['soopy', 'shrubs', 'rusty', 'smooth']);
    expect(personaById('johnny').style).toBeUndefined();
    const johnny = { role: 'opponent', personaId: 'johnny', skill: 'standard' } as const;
    expect(playingPersona({ ...johnny, playsAs: 'rusty' })).toBe(personaById('rusty'));
    expect(playingPersona({ personaId: 'smooth' })).toBe(personaById('smooth'));
    expect(() => playingPersona(johnny)).toThrow(/Johnny Blue needs a persona/);
    expect(() => createBot(johnny)).toThrow(/Johnny Blue needs a persona/);
    expect(createBot({ ...johnny, playsAs: 'shrubs' }).spec.playsAs).toBe('shrubs');
  });

  it("keys each of Johnny Blue's disguises apart, for caching and seeding", () => {
    const johnny = { role: 'opponent', personaId: 'johnny', skill: 'casual' } as const;
    expect(specKey({ ...johnny, playsAs: 'rusty' })).toBe('opponent/johnny:rusty/casual');
    expect(specKey({ ...johnny, playsAs: 'soopy' })).not.toBe(
      specKey({ ...johnny, playsAs: 'rusty' })
    );
    expect(specKey({ role: 'opponent', personaId: 'rusty', skill: 'casual' })).toBe(
      'opponent/rusty/casual'
    );
  });

  it('rejects an unknown persona', () => {
    expect(() => personaById('nobody' as never)).toThrow(/Unknown persona/);
  });
});

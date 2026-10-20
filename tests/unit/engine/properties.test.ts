/**
 * Property-based tests over random legal games (Implementation Plan,
 * Sprint 2). Every game is played with random legal actions under a
 * random rule set, and invariants are checked after every step.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ALL_CARDS, type CardId } from '../../../src/engine/cards';
import type { GameEvent } from '../../../src/engine/events';
import { newGame } from '../../../src/engine/game';
import { STANDARD_RULES, type RuleSet } from '../../../src/engine/rules';
import { SEATS, type Seat } from '../../../src/engine/seats';
import type { GameState } from '../../../src/engine/state';
import { toPlayerView } from '../../../src/engine/view';
import { seededRng } from '../../../src/util/rng';
import { deckFor, gameFromDeck, playRandomGame } from '../../helpers/engine';

const rulesArb: fc.Arbitrary<RuleSet> = fc.record({
  targetScore: fc.constantFrom(5 as const, 7 as const, 10 as const, 11 as const),
  stickTheDealer: fc.boolean(),
  lonersAllowed: fc.boolean(),
  lonerSweepPoints: fc.constantFrom(4 as const, 5 as const),
  defendAlone: fc.boolean(),
  dealerPartnerMustGoAlone: fc.boolean(),
  farmersHand: fc.boolean(),
});

interface GameRun {
  readonly rules: RuleSet;
  readonly dealer: Seat;
  readonly dealSeed: number;
  readonly playSeed: number;
  /** Deal the first hand from this deck instead of the seed. */
  readonly farmerDeck?: readonly CardId[];
}

const randomGameArb: fc.Arbitrary<GameRun> = fc.record({
  rules: rulesArb,
  dealer: fc.constantFrom(...SEATS),
  dealSeed: fc.integer(),
  playSeed: fc.integer(),
});

/** One run in four opens with a farmer's hand, with the rule on. */
const gameArb: fc.Arbitrary<GameRun> = fc.oneof(
  { weight: 3, arbitrary: randomGameArb },
  {
    weight: 1,
    arbitrary: randomGameArb.chain((run) =>
      farmerDeckArb(run.dealer).map((farmerDeck) => ({
        ...run,
        rules: { ...run.rules, farmersHand: true },
        farmerDeck,
      }))
    ),
  }
);

function playedCards(s: GameState): CardId[] {
  const tricks = [...s.hand.tricks, ...(s.hand.currentTrick ? [s.hand.currentTrick] : [])];
  return tricks.flatMap((t) => t.plays.map((p) => p.card));
}

/** Run a whole random game, calling `check` with every intermediate state. */
function forEachState(
  run: GameRun,
  check: (s: GameState, events: readonly GameEvent[]) => void
): GameState {
  const start = run.farmerDeck
    ? { state: gameFromDeck(run.farmerDeck, run.dealer, run.rules), events: [] }
    : newGame(run.rules, run.dealer, seededRng(run.dealSeed));
  check(start.state, start.events);
  return playRandomGame(start.state, seededRng(run.playSeed), check);
}

const NINES_AND_TENS = ALL_CARDS.filter((c) => c[0] === '9' || c[0] === 'T');

/**
 * A first deal in which `seat` holds a farmer's hand, so the rare swap
 * (about one hand in 170) is exercised on every run.
 */
const farmerDeckArb = (dealer: Seat) =>
  fc
    .record({
      farmer: fc.constantFrom(...SEATS),
      farmerCards: fc.shuffledSubarray(NINES_AND_TENS, { minLength: 5, maxLength: 5 }),
      seed: fc.integer(),
    })
    .map(({ farmer, farmerCards, seed }) => {
      const rest = ALL_CARDS.filter((c) => !farmerCards.includes(c));
      const rng = seededRng(seed);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = rng.nextInt(i + 1);
        [rest[i], rest[j]] = [rest[j]!, rest[i]!];
      }
      const others = SEATS.filter((s) => s !== farmer);
      const hands: CardId[][] = [[], [], [], []];
      hands[farmer] = farmerCards;
      others.forEach((s, i) => (hands[s] = rest.slice(i * 5, i * 5 + 5)));
      return deckFor(hands, rest.slice(15), dealer);
    });

const CARD_TOKEN = /"([9TJQKA][CDHS])"/g;

describe('engine invariants', () => {
  it('conserves all 24 cards and never duplicates one', () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        forEachState(run, (s) => {
          const held = [...s.hand.hands.flat(), ...playedCards(s)];
          if (s.hand.discard) held.push(s.hand.discard);
          expect(new Set(held).size).toBe(held.length);
          // A farmer's swap replaces the three face-down kitty cards.
          const buried = s.hand.farmerSwap?.gave ?? s.hand.kitty.slice(1);
          expect(buried).toHaveLength(3);
          expect(held.some((c) => buried.includes(c))).toBe(false);
          expect(new Set([...held, s.hand.kitty[0]!, ...buried])).toEqual(new Set(ALL_CARDS));
          expect(held.includes(s.hand.kitty[0]!)).toBe(s.hand.upcardStatus === 'pickedUp');
        });
      }),
      { numRuns: 40 }
    );
  });

  it('only ever increases the score, and ends exactly at the target', () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        let prev: readonly [number, number] = [0, 0];
        const end = forEachState(run, (s) => {
          expect(s.score[0]).toBeGreaterThanOrEqual(prev[0]);
          expect(s.score[1]).toBeGreaterThanOrEqual(prev[1]);
          prev = s.score;
        });
        expect(Math.max(...end.score)).toBeGreaterThanOrEqual(run.rules.targetScore);
        expect(end.score[end.winner!]).toBe(Math.max(...end.score));
      }),
      { numRuns: 40 }
    );
  });

  it('keeps hand sizes consistent with play', () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        forEachState(run, (s) => {
          if (s.hand.phase.kind !== 'play') return;
          const played = playedCards(s);
          for (const seat of SEATS) {
            const playedBySeat = [
              ...s.hand.tricks,
              ...(s.hand.currentTrick ? [s.hand.currentTrick] : []),
            ]
              .flatMap((t) => t.plays)
              .filter((p) => p.seat === seat).length;
            expect(s.hand.hands[seat].length + playedBySeat).toBe(5);
          }
          expect(played.length).toBeLessThanOrEqual(20);
        });
      }),
      { numRuns: 30 }
    );
  });

  it("never shows a seat another player's hidden cards", () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        forEachState(run, (s) => {
          const publicCards = new Set<string>([s.hand.kitty[0]!, ...playedCards(s)]);
          for (const seat of SEATS) {
            const view = toPlayerView(s, seat);
            const visible = new Set<string>([...publicCards, ...view.myHand]);
            if (view.myDiscard) visible.add(view.myDiscard);
            for (const card of view.myFarmerSwap ?? []) visible.add(card);
            const shown = [...JSON.stringify(view).matchAll(CARD_TOKEN)].map((m) => m[1]!);
            for (const card of shown) expect(visible.has(card)).toBe(true);
          }
        });
      }),
      { numRuns: 30 }
    );
  });

  it('never puts a hidden card in an event', () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        forEachState(run, (s, events) => {
          const publicCards = new Set<string>([s.hand.kitty[0]!, ...playedCards(s)]);
          // A completed trick's cards are public even once the next hand is dealt.
          for (const e of events) if (e.type === 'cardPlayed') publicCards.add(e.card);
          const shown = [...JSON.stringify(events).matchAll(CARD_TOKEN)].map((m) => m[1]!);
          for (const card of shown) expect(publicCards.has(card)).toBe(true);
        });
      }),
      { numRuns: 30 }
    );
  });

  it('makes every game reproducible from its seeds', () => {
    const run = { rules: STANDARD_RULES, dealer: 1 as const, dealSeed: 4, playSeed: 9 };
    expect(forEachState(run, () => {})).toEqual(forEachState(run, () => {}));
  });
});

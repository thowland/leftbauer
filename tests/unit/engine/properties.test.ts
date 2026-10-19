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
import { playRandomGame } from '../../helpers/engine';

const rulesArb: fc.Arbitrary<RuleSet> = fc.record({
  targetScore: fc.constantFrom(5 as const, 7 as const, 10 as const, 11 as const),
  stickTheDealer: fc.boolean(),
  lonersAllowed: fc.boolean(),
  lonerSweepPoints: fc.constantFrom(4 as const, 5 as const),
  defendAlone: fc.constant(false),
  dealerPartnerMustGoAlone: fc.constant(false),
  farmersHand: fc.constant(null),
});

interface GameRun {
  readonly rules: RuleSet;
  readonly dealer: Seat;
  readonly dealSeed: number;
  readonly playSeed: number;
}

const gameArb: fc.Arbitrary<GameRun> = fc.record({
  rules: rulesArb,
  dealer: fc.constantFrom(...SEATS),
  dealSeed: fc.integer(),
  playSeed: fc.integer(),
});

function playedCards(s: GameState): CardId[] {
  const tricks = [...s.hand.tricks, ...(s.hand.currentTrick ? [s.hand.currentTrick] : [])];
  return tricks.flatMap((t) => t.plays.map((p) => p.card));
}

/** Run a whole random game, calling `check` with every intermediate state. */
function forEachState(
  run: GameRun,
  check: (s: GameState, events: readonly GameEvent[]) => void
): GameState {
  const start = newGame(run.rules, run.dealer, seededRng(run.dealSeed));
  check(start.state, start.events);
  return playRandomGame(start.state, seededRng(run.playSeed), check);
}

const CARD_TOKEN = /"([9TJQKA][CDHS])"/g;

describe('engine invariants', () => {
  it('conserves all 24 cards and never duplicates one', () => {
    fc.assert(
      fc.property(gameArb, (run) => {
        forEachState(run, (s) => {
          const held = [...s.hand.hands.flat(), ...playedCards(s)];
          if (s.hand.discard) held.push(s.hand.discard);
          expect(new Set(held).size).toBe(held.length);
          const buried = s.hand.kitty.slice(1);
          expect(held.some((c) => buried.includes(c))).toBe(false);
          expect(new Set([...held, ...s.hand.kitty])).toEqual(new Set(ALL_CARDS));
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

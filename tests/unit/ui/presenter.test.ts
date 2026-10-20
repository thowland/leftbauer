import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../../src/engine/events';
import { immediateScheduler, type Scheduler } from '../../../src/session/scheduler';
import { dealDuration, MOTION, motionVars } from '../../../src/themes/motion';
import { Presenter, type Cue } from '../../../src/ui/game/presenter';
import { gameFromDeck } from '../../helpers/engine';

const state = gameFromDeck();

const EVENTS: readonly GameEvent[] = [
  { type: 'handDealt', dealer: 3, handNumber: 1, upcard: 'JD' },
  { type: 'bidMade', seat: 0, round: 1, action: { type: 'pass' } },
  { type: 'upcardTurnedDown', dealer: 3 },
  { type: 'upcardPickedUp', dealer: 3 },
  { type: 'dealerDiscarded', dealer: 3 },
  { type: 'cardPlayed', seat: 1, card: 'QS', trickIndex: 0 },
  { type: 'trickWon', seat: 1, trickIndex: 0 },
];

/** Records each wait, with the cue showing while it ran. */
function recorder(presenter: () => Presenter) {
  const waits: { ms: number; cue: Cue | null }[] = [];
  const scheduler: Scheduler = {
    delay: (ms, signal) => {
      waits.push({ ms, cue: presenter().cue() });
      return immediateScheduler.delay(ms, signal);
    },
  };
  return { waits, scheduler };
}

describe('Presenter (SA-1)', () => {
  it('cues each animated event and waits for it to finish', async () => {
    let presenter: Presenter | null = null;
    const { waits, scheduler } = recorder(() => presenter!);
    presenter = new Presenter(scheduler, MOTION);
    await presenter.handle(EVENTS, state);

    expect(waits).toEqual([
      { ms: dealDuration(MOTION), cue: { kind: 'deal', dealer: 3, handNumber: 1 } },
      { ms: MOTION.flipMs, cue: { kind: 'turnDown' } },
      { ms: MOTION.flightMs, cue: { kind: 'pickup', dealer: 3, card: 'JD' } },
      { ms: MOTION.flightMs, cue: { kind: 'discard', dealer: 3 } },
      { ms: MOTION.flightMs, cue: { kind: 'play', seat: 1, card: 'QS' } },
    ]);
    expect(presenter.cue()).toBeNull();
  });

  it('tells subscribers about every change, until they unsubscribe', async () => {
    const presenter = new Presenter(immediateScheduler, MOTION);
    const listener = vi.fn();
    const off = presenter.subscribe(listener);
    await presenter.handle([EVENTS[0]!], state);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    await presenter.handle([EVENTS[0]!], state);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('neither cues nor waits with motion off', async () => {
    const delay = vi.fn();
    const presenter = new Presenter({ delay }, null);
    await presenter.handle(EVENTS, state);
    expect(delay).not.toHaveBeenCalled();
    expect(presenter.cue()).toBeNull();
  });
});

describe('motion tokens', () => {
  it('deals 20 cards and the upcard, one stagger apart', () => {
    expect(dealDuration({ dealStaggerMs: 10, flightMs: 100, flipMs: 50 })).toBe(300);
  });

  it('reaches CSS as custom properties', () => {
    expect(motionVars(MOTION)).toEqual({
      '--deal-stagger': `${MOTION.dealStaggerMs}ms`,
      '--flight': `${MOTION.flightMs}ms`,
      '--flip': `${MOTION.flipMs}ms`,
    });
  });
});

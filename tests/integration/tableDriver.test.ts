import { describe, expect, it, vi } from 'vitest';
import type { BotSpec } from '../../src/bots/bot';
import type { Action } from '../../src/engine/actions';
import type { GameEvent } from '../../src/engine/events';
import { newGame } from '../../src/engine/game';
import { STANDARD_RULES } from '../../src/engine/rules';
import type { GameState } from '../../src/engine/state';
import { AbortedError, abortable } from '../../src/session/abort';
import { InlineBotRunner, type BotRunner } from '../../src/session/botRunner';
import {
  BotSeatController,
  HumanSeatController,
  type SeatController,
} from '../../src/session/controllers';
import { TableDriver, type DriverDeps, type EventSink } from '../../src/session/driver';
import { immediateScheduler, timerScheduler, type Scheduler } from '../../src/session/scheduler';
import { seededRng } from '../../src/util/rng';

const SPEC: BotSpec = { role: 'opponent', personaId: 'smooth', skill: 'standard' };

function bots(runner: BotRunner = new InlineBotRunner()): SeatController[] {
  return [0, 1, 2, 3].map(() => new BotSeatController(SPEC, runner));
}

function start(seed = 1): { state: GameState; events: readonly GameEvent[] } {
  return newGame(STANDARD_RULES, 3, seededRng(seed));
}

function driver(
  controllers: SeatController[],
  initial: GameState,
  extra: Partial<DriverDeps> = {}
): TableDriver {
  return new TableDriver(
    {
      controllers: controllers as unknown as DriverDeps['controllers'],
      scheduler: immediateScheduler,
      shuffleRng: seededRng(99),
      autoContinue: true,
      ...extra,
    },
    initial
  );
}

/** Resolves once the snapshot satisfies `predicate`. */
function until(d: TableDriver, predicate: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (predicate()) return resolve();
    const off = d.subscribe(() => {
      if (predicate()) {
        off();
        resolve();
      }
    });
  });
}

describe('TableDriver with four bots', () => {
  it('plays a whole game to a winner, emitting every event in order', async () => {
    const log: GameEvent[] = [];
    const sink: EventSink = { handle: (events) => void log.push(...events) };
    const { state, events } = start();
    const d = driver(bots(), state, { sinks: [sink] });

    const end = await d.start(events);

    expect(end.winner).not.toBeNull();
    expect(d.snapshot().status).toBe('gameOver');
    expect(log[0]).toMatchObject({ type: 'handDealt', handNumber: 1 });
    expect(log.at(-1)).toMatchObject({ type: 'gameOver', winner: end.winner });
    const dealt = log.filter((e) => e.type === 'handDealt');
    expect(dealt).toHaveLength(end.handNumber);
  });

  it('is reproducible from its seeds', async () => {
    const a = await driver(bots(), start(5).state).start();
    const b = await driver(bots(), start(5).state).start();
    expect(a).toEqual(b);
  });

  it('awaits async sinks before continuing', async () => {
    const order: string[] = [];
    const slow: EventSink = {
      handle: async (events) => {
        await Promise.resolve();
        order.push(events[0]!.type);
      },
    };
    const d = driver(bots(), start().state, { sinks: [slow] });
    await d.start();
    expect(order.length).toBeGreaterThan(20);
  });

  it('keeps a bot from making an illegal move', async () => {
    const liar: BotRunner = {
      decide: async () => ({
        action: { type: 'play', card: '9S' },
        reason: { code: 'lead-lowest' },
      }),
    };
    const onIllegal = vi.fn();
    const controllers = [0, 1, 2, 3].map(() => new BotSeatController(SPEC, liar, onIllegal));
    const end = await driver(controllers, start().state).start();
    expect(end.winner).not.toBeNull();
    expect(onIllegal).toHaveBeenCalled();
  });
});

describe('TableDriver with a human', () => {
  function withHuman(extra: Partial<DriverDeps> = {}) {
    const human = new HumanSeatController();
    const [, ...rest] = bots();
    const d = driver([human, ...rest], start().state, extra);
    return { human, d };
  }

  it('asks the human and waits for a legal submission', async () => {
    const { human, d } = withHuman();
    void d.start();
    await until(d, () => d.snapshot().awaiting?.seat === 0);

    expect(human.awaiting).toEqual(d.snapshot().awaiting!.legal);
    expect(human.submit({ type: 'play', card: '9S' })).toBe(false);
    expect(human.submit({ type: 'pass' })).toBe(true);
    expect(human.submit({ type: 'pass' })).toBe(false); // no longer awaited
    await until(d, () => d.snapshot().state.hand.bids.length > 0);
    expect(d.snapshot().state.hand.bids[0]).toEqual({
      seat: 0,
      round: 1,
      action: { type: 'pass' },
    });
    d.stop();
  });

  it('can be stopped mid-request and resumed from the same state', async () => {
    const { human, d } = withHuman();
    const run = d.start();
    await until(d, () => d.snapshot().awaiting?.seat === 0);
    d.stop();
    const stoppedAt = await run;
    expect(d.snapshot().status).toBe('stopped');
    expect(human.awaiting).toBeNull();

    void d.start();
    await until(d, () => d.snapshot().awaiting?.seat === 0);
    expect(d.snapshot().state).toBe(stoppedAt);
    d.stop();
  });

  it('waits for the hand summary to be acknowledged before dealing again', async () => {
    const { human, d } = withHuman({ autoContinue: false });
    const choose = (legal: readonly Action[]) => legal[0]!;
    void d.start();
    while (d.snapshot().status !== 'handComplete') {
      await until(
        d,
        () => d.snapshot().awaiting?.seat === 0 || d.snapshot().status === 'handComplete'
      );
      if (human.awaiting) human.submit(choose(human.awaiting));
    }
    expect(d.snapshot().state.handNumber).toBe(1);
    d.continueToNextHand();
    await until(d, () => d.snapshot().state.handNumber === 2);
    expect(d.snapshot().status).toBe('running');
    d.stop();
  });

  it('paces bot actions but never the human’s', async () => {
    const delays: number[] = [];
    const recording: Scheduler = {
      delay: (ms, signal) => {
        delays.push(ms);
        return immediateScheduler.delay(ms, signal);
      },
    };
    const { human, d } = withHuman({ scheduler: recording, pacing: { botMs: 10, trickMs: 50 } });
    void d.start();
    await until(d, () => d.snapshot().awaiting?.seat === 0);
    human.submit({ type: 'pass' });
    // Wait for at least one bot to bid after the human.
    await until(d, () => d.snapshot().state.hand.bids.length >= 2);
    expect(delays.length).toBeGreaterThan(0);
    expect(delays.every((ms) => ms === 10 || ms === 60)).toBe(true);
    d.stop();
  });
});

describe('TableDriver hurry (GF-4)', () => {
  /** Resolves once `predicate` holds, checking after every macrotask. */
  async function eventually(predicate: () => boolean): Promise<void> {
    for (let i = 0; i < 1000 && !predicate(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(predicate()).toBe(true);
  }

  /** A scheduler whose pauses last until they are cut short. */
  function heldScheduler() {
    const delays: { phase: string; bids: number; tricks: number; plays: number }[] = [];
    let d: TableDriver | null = null;
    const scheduler: Scheduler = {
      delay: (_ms, signal) => {
        const { hand } = d!.snapshot().state;
        delays.push({
          phase: hand.phase.kind,
          bids: hand.bids.length,
          tricks: hand.tricks.length,
          plays: hand.currentTrick?.plays.length ?? 0,
        });
        return abortable<void>(signal, () => () => {});
      },
    };
    return { delays, scheduler, attach: (driver: TableDriver) => (d = driver) };
  }

  it('cuts the current pause, and skips pauses until the bidding round ends', async () => {
    const held = heldScheduler();
    const d = held.attach(
      driver(bots(), start().state, {
        scheduler: held.scheduler,
        pacing: { botMs: 1000, trickMs: 1000 },
      })
    );
    void d.start();
    await eventually(() => held.delays.length === 1);
    expect(held.delays[0]).toMatchObject({ phase: 'bidRound1', bids: 1 });

    d.hurry();
    await eventually(() => held.delays.length === 2);
    // The next pause comes only once round one is over.
    expect(held.delays[1]!.phase).not.toBe('bidRound1');
    d.stop();
  });

  it('lasts until the trick is won', async () => {
    const held = heldScheduler();
    const d = held.attach(
      driver(bots(), start().state, {
        scheduler: held.scheduler,
        pacing: { botMs: 1000, trickMs: 1000 },
      })
    );
    void d.start();
    const playing = () => d.snapshot().state.hand.phase.kind === 'play';
    while (!playing()) {
      const before = held.delays.length;
      d.hurry();
      await eventually(() => held.delays.length > before);
    }
    // Hurried through trick one; pauses return after the second trick's lead.
    const before = held.delays.length;
    expect(held.delays.at(-1)).toMatchObject({ tricks: 0 });
    d.hurry();
    await eventually(() => held.delays.length > before);
    expect(held.delays.at(-1)).toMatchObject({ tricks: 1, plays: 1 });
    d.stop();
  });

  it('ends a run stopped during a pause', async () => {
    const held = heldScheduler();
    const d = held.attach(
      driver(bots(), start().state, { scheduler: held.scheduler, pacing: { botMs: 5, trickMs: 5 } })
    );
    const run = d.start();
    await eventually(() => held.delays.length === 1);
    d.stop();
    await expect(run).resolves.toBe(d.snapshot().state);
    expect(d.snapshot().status).toBe('stopped');
  });

  it('surfaces a scheduler failure', async () => {
    const failing: Scheduler = { delay: () => Promise.reject(new Error('clock broke')) };
    const d = driver(bots(), start().state, {
      scheduler: failing,
      pacing: { botMs: 5, trickMs: 5 },
    });
    await expect(d.start()).rejects.toThrow('clock broke');
  });

  it('does nothing when there is no pause to cut', () => {
    const d = driver(bots(), start().state);
    expect(() => d.hurry()).not.toThrow();
  });
});

describe('session primitives', () => {
  it('rejects an already-aborted wait', async () => {
    const abort = new AbortController();
    abort.abort();
    await expect(abortable(abort.signal, () => () => {})).rejects.toBeInstanceOf(AbortedError);
    await expect(
      new InlineBotRunner().decide(SPEC, {} as never, [], abort.signal)
    ).rejects.toBeInstanceOf(AbortedError);
  });

  it('cancels a pending timer delay', async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const wait = timerScheduler.delay(1000, abort.signal);
    abort.abort();
    await expect(wait).rejects.toBeInstanceOf(AbortedError);
    const done = timerScheduler.delay(5, new AbortController().signal);
    vi.advanceTimersByTime(5);
    await expect(done).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('passes through a failure from the awaited work', async () => {
    const failing = abortable(new AbortController().signal, (_resolve, reject) => {
      reject(new Error('boom'));
      return () => {};
    });
    await expect(failing).rejects.toThrow('boom');
  });

  it('surfaces errors that are not aborts', async () => {
    const broken: SeatController = {
      kind: 'bot',
      requestAction: async () => {
        throw new Error('broken controller');
      },
    };
    const d = driver([broken, broken, broken, broken], start().state);
    await expect(d.start()).rejects.toThrow('broken controller');
  });
});

describe('TableDriver restarts (React StrictMode)', () => {
  it('lets only the newest run act after a stop and immediate restart', async () => {
    let calls = 0;
    const counting: BotRunner = {
      decide: async (spec, view, legal, signal) => {
        calls++;
        return new InlineBotRunner().decide(spec, view, legal, signal);
      },
    };
    const d = driver(bots(counting), start().state, { autoContinue: false });
    void d.start();
    d.stop();
    const end = d.start();
    await until(d, () => d.snapshot().status === 'handComplete');
    const state = d.snapshot().state;
    // One decision per applied action: the stale run never acted.
    const actions =
      state.hand.bids.length +
      (state.hand.discard ? 1 : 0) +
      state.hand.tricks.reduce((n, t) => n + t.plays.length, 0);
    expect(calls).toBe(actions);
    expect(d.snapshot().status).toBe('handComplete');
    d.stop();
    await end;
    expect(d.snapshot().status).toBe('stopped');
  });

  it('ignores stop when not running', () => {
    const d = driver(bots(), start().state);
    d.stop();
    expect(d.snapshot().status).toBe('idle');
  });
});

describe('TableDriver guards', () => {
  it('fails loudly if a controller returns an illegal action', async () => {
    const cheat: SeatController = {
      kind: 'bot',
      requestAction: async () => ({ type: 'play', card: '9S' }),
    };
    const d = driver([cheat, cheat, cheat, cheat], start().state);
    await expect(d.start()).rejects.toThrow(/rejected action \(illegal\)/);
  });
});

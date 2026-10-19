/**
 * The table driver — Technical Spec §8.2.
 *
 * Runs a game in real time: asks each seat's controller for an action,
 * applies it through the engine, fans the events out to sinks, and paces
 * bot turns. It knows nothing about React; the UI reads it through
 * `subscribe` and `snapshot` (useSyncExternalStore).
 *
 * The same driver runs the app, the integration tests and (from Sprint 4)
 * the tournament harness.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from '../engine/actions';
import type { GameEvent } from '../engine/events';
import { applyAction, currentActor, dealNextHand, legalActions } from '../engine/game';
import type { Seat } from '../engine/seats';
import type { GameState } from '../engine/state';
import { toPlayerView } from '../engine/view';
import type { Rng } from '../util/rng';
import { abortable, AbortedError, isAborted } from './abort';
import type { SeatController } from './controllers';
import type { Scheduler } from './scheduler';

export interface EventSink {
  handle(events: readonly GameEvent[], state: GameState): void | Promise<void>;
}

export interface Pacing {
  /** Pause before each bot action (GF-4). */
  readonly botMs: number;
  /** Extra pause after a trick is won, so the trick can be read. */
  readonly trickMs: number;
}

export const DEFAULT_PACING: Pacing = { botMs: 650, trickMs: 900 };
export const NO_PACING: Pacing = { botMs: 0, trickMs: 0 };

export type DriverStatus = 'idle' | 'running' | 'handComplete' | 'gameOver' | 'stopped';

export interface TableSnapshot {
  readonly state: GameState;
  readonly status: DriverStatus;
  /** The seat being asked to act and its legal actions, while a request is open. */
  readonly awaiting: { readonly seat: Seat; readonly legal: readonly Action[] } | null;
}

export interface DriverDeps {
  readonly controllers: readonly [SeatController, SeatController, SeatController, SeatController];
  readonly scheduler: Scheduler;
  readonly shuffleRng: Rng;
  readonly sinks?: readonly EventSink[];
  readonly pacing?: Pacing;
  /** Deal the next hand without waiting for `continueToNextHand` (tests, tournaments). */
  readonly autoContinue?: boolean;
}

export class TableDriver {
  private current: TableSnapshot;
  private readonly listeners = new Set<() => void>();
  private abort: AbortController | null = null;
  private continueGate: (() => void) | null = null;
  /** Set by `hurry`: skip bot pauses until the current trick is won. */
  private hurried = false;
  private cutPause: (() => void) | null = null;

  constructor(
    private readonly deps: DriverDeps,
    initial: GameState
  ) {
    this.current = { state: initial, status: 'idle', awaiting: null };
  }

  /** For useSyncExternalStore: a stable object until something changes. */
  readonly snapshot = (): TableSnapshot => this.current;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Run (or resume) the game from the current state. Resolves with the
   * final state when the game ends or the driver is stopped. Starting an
   * already-running driver restarts it from where it was.
   */
  start(initialEvents: readonly GameEvent[] = []): Promise<GameState> {
    this.stop();
    const abort = new AbortController();
    this.abort = abort;
    return this.run(initialEvents, abort.signal);
  }

  /** Cancel any pending request or wait. The game can be resumed with `start`. */
  stop(): void {
    if (this.abort === null) return;
    this.abort.abort();
    this.abort = null;
    this.publish({ status: 'stopped', awaiting: null });
  }

  /** Acknowledge the hand summary and deal the next hand. */
  readonly continueToNextHand = (): void => {
    const gate = this.continueGate;
    this.continueGate = null;
    gate?.();
  };

  /**
   * The human tapped the table: end the current pause and play the rest
   * of this trick (or bidding round) without pauses (GF-4).
   */
  readonly hurry = (): void => {
    this.hurried = true;
    this.cutPause?.();
  };

  private publish(change: Partial<TableSnapshot>): void {
    this.current = { ...this.current, ...change };
    for (const listener of this.listeners) listener();
  }

  private async emit(events: readonly GameEvent[], signal: AbortSignal): Promise<void> {
    if (events.length === 0) return;
    for (const sink of this.deps.sinks ?? []) {
      await settled(sink.handle(events, this.current.state), signal);
    }
  }

  /**
   * The game loop. Every await goes through `settled`, so once this run's
   * signal aborts it can never publish or act again, even if a newer run
   * has already started (React StrictMode stops and restarts the driver).
   */
  private async run(initialEvents: readonly GameEvent[], signal: AbortSignal): Promise<GameState> {
    const pacing = this.deps.pacing ?? NO_PACING;
    try {
      this.publish({ status: 'running', awaiting: null });
      await settled(this.emit(initialEvents, signal), signal);
      for (;;) {
        const state = this.current.state;
        const seat = currentActor(state);

        if (seat === null) {
          if (state.winner !== null) {
            this.publish({ status: 'gameOver' });
            return state;
          }
          this.publish({ status: 'handComplete' });
          if (!this.deps.autoContinue) await settled(this.waitForContinue(signal), signal);
          this.hurried = false;
          const dealt = dealNextHand(state, this.deps.shuffleRng);
          this.publish({ state: dealt.state, status: 'running' });
          await settled(this.emit(dealt.events, signal), signal);
          await this.paceBot(currentActor(dealt.state), pacing.botMs, signal);
          continue;
        }

        const legal = legalActions(state, seat);
        this.publish({ awaiting: { seat, legal } });
        const action = await settled(
          this.deps.controllers[seat].requestAction(toPlayerView(state, seat), legal, signal),
          signal
        );
        const applied = applyAction(state, seat, action);
        if (!applied.ok) {
          // Controllers only return legal actions; anything else is a bug.
          throw new Error(`Seat ${seat} returned a rejected action (${applied.reason})`);
        }
        this.publish({ state: applied.state, awaiting: null });
        await settled(this.emit(applied.events, signal), signal);

        const trickWon = applied.events.some((e) => e.type === 'trickWon');
        const pause = (trickWon ? pacing.trickMs : 0) + pacing.botMs;
        // A hurry covers the rest of its trick or bidding round, including
        // the pause that ends it; a tap during that pause hurries the next.
        const skip = this.hurried;
        if (trickWon || applied.state.hand.phase.kind !== state.hand.phase.kind) {
          this.hurried = false;
        }
        await this.paceBot(currentActor(applied.state), pause, signal, skip);
      }
    } catch (error) {
      // `stop` has already published the stopped status.
      if (!isAborted(error)) throw error;
      return this.current.state;
    }
  }

  /** Pause before a bot acts, so the human can follow along. `hurry` cuts it short. */
  private async paceBot(
    next: Seat | null,
    ms: number,
    signal: AbortSignal,
    skip = this.hurried
  ): Promise<void> {
    if (next === null || ms <= 0 || skip || this.deps.controllers[next].kind !== 'bot') return;
    const pause = new AbortController();
    const forward = () => pause.abort();
    signal.addEventListener('abort', forward, { once: true });
    this.cutPause = forward;
    try {
      await this.deps.scheduler.delay(ms, pause.signal);
    } catch (error) {
      if (!isAborted(error)) throw error;
    } finally {
      signal.removeEventListener('abort', forward);
      this.cutPause = null;
    }
    if (signal.aborted) throw new AbortedError();
  }

  private waitForContinue(signal: AbortSignal): Promise<void> {
    return abortable<void>(signal, (resolve) => {
      this.continueGate = resolve;
      return () => {
        this.continueGate = null;
      };
    });
  }
}

/** Await `work`, then fail with AbortedError if the signal aborted meanwhile. */
async function settled<T>(work: T | Promise<T>, signal: AbortSignal): Promise<T> {
  const value = await work;
  if (signal.aborted) throw new AbortedError();
  return value;
}

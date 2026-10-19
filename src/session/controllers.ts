/**
 * Seat controllers — Technical Spec §8.1.
 *
 * Every seat is driven through one interface, so a human, a bot or (in
 * Phase 3) a remote player are interchangeable to the TableDriver.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { BotSpec } from '../bots/bot';
import { sameAction, type Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import { abortable } from './abort';
import type { BotRunner } from './botRunner';

export interface SeatController {
  readonly kind: 'human' | 'bot' | 'remote';
  requestAction(view: PlayerView, legal: readonly Action[], signal: AbortSignal): Promise<Action>;
}

interface PendingRequest {
  readonly legal: readonly Action[];
  readonly resolve: (action: Action) => void;
}

/** Resolves when the UI submits one of the legal actions. */
export class HumanSeatController implements SeatController {
  readonly kind = 'human';
  private pending: PendingRequest | null = null;

  requestAction(_view: PlayerView, legal: readonly Action[], signal: AbortSignal): Promise<Action> {
    return abortable<Action>(signal, (resolve) => {
      this.pending = { legal, resolve };
      return () => {
        this.pending = null;
      };
    });
  }

  /** The actions the table is waiting for, or `null` when it is not this seat's turn. */
  get awaiting(): readonly Action[] | null {
    return this.pending?.legal ?? null;
  }

  /** Submit an action. Returns `false` (and changes nothing) unless it is awaited and legal. */
  submit(action: Action): boolean {
    const pending = this.pending;
    if (pending === null || !pending.legal.some((legal) => sameAction(legal, action))) {
      return false;
    }
    this.pending = null;
    pending.resolve(action);
    return true;
  }
}

/** Asks a bot, through a runner, and guarantees a legal answer. */
export class BotSeatController implements SeatController {
  readonly kind = 'bot';

  constructor(
    readonly spec: BotSpec,
    private readonly runner: BotRunner,
    private readonly onIllegal: (action: Action) => void = () => {}
  ) {}

  async requestAction(
    view: PlayerView,
    legal: readonly Action[],
    signal: AbortSignal
  ): Promise<Action> {
    const { action } = await this.runner.decide(this.spec, view, legal, signal);
    if (legal.some((l) => sameAction(l, action))) return action;
    // A bot returning an illegal action is a bug; report it and keep the game moving.
    this.onIllegal(action);
    return legal[0]!;
  }
}

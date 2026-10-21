// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * The Presenter — SA-1; Technical Spec §9.2.
 *
 * An EventSink that turns events into animation cues for the table and
 * holds the driver until each animation has finished, so the next action
 * never starts while a card is still moving. The table reads the current
 * cue through `subscribe` and `cue` (useSyncExternalStore) and animates
 * stable-identity card elements with CSS; this class owns only timing.
 *
 * With motion off (`?e2e`, or reduced motion) it never cues or waits.
 */

import type { CardId } from '../../engine/cards';
import type { GameEvent } from '../../engine/events';
import type { Seat } from '../../engine/seats';
import type { GameState } from '../../engine/state';
import type { Scheduler } from '../../session/scheduler';
import { dealDuration, type Motion } from '../../themes/motion';

export type Cue =
  /** Cards fly from the dealer to every seat, then the upcard turns. */
  | { readonly kind: 'deal'; readonly dealer: Seat; readonly handNumber: number }
  /** The upcard goes into the dealer's hand. */
  | { readonly kind: 'pickup'; readonly dealer: Seat; readonly card: CardId }
  /** Everyone passed: the upcard is turned face down. */
  | { readonly kind: 'turnDown' }
  /** The dealer lays a card face down. */
  | { readonly kind: 'discard'; readonly dealer: Seat }
  /** A card flies from its seat to the trick; a lead also sweeps the last trick away. */
  | { readonly kind: 'play'; readonly seat: Seat; readonly card: CardId };

/** Nothing ever aborts a presentation; a stopped driver just ignores it. */
const NEVER = new AbortController().signal;

export class Presenter {
  private current: Cue | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly scheduler: Scheduler,
    /** `null` turns animation off. */
    private readonly motion: Motion | null
  ) {}

  readonly cue = (): Cue | null => this.current;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async handle(events: readonly GameEvent[], state: GameState): Promise<void> {
    const motion = this.motion;
    if (motion === null) return;
    for (const event of events) {
      const step = stepFor(event, state, motion);
      if (step === null) continue;
      this.show(step.cue);
      await this.scheduler.delay(step.ms, NEVER);
      this.show(null);
    }
  }

  private show(cue: Cue | null): void {
    this.current = cue;
    for (const listener of this.listeners) listener();
  }
}

function stepFor(
  event: GameEvent,
  state: GameState,
  motion: Motion
): { cue: Cue; ms: number } | null {
  switch (event.type) {
    case 'handDealt':
      return {
        cue: { kind: 'deal', dealer: event.dealer, handNumber: event.handNumber },
        ms: dealDuration(motion),
      };
    case 'upcardPickedUp':
      return {
        cue: { kind: 'pickup', dealer: event.dealer, card: state.hand.kitty[0]! },
        ms: motion.flightMs,
      };
    case 'upcardTurnedDown':
      return { cue: { kind: 'turnDown' }, ms: motion.flipMs };
    case 'dealerDiscarded':
      return { cue: { kind: 'discard', dealer: event.dealer }, ms: motion.flightMs };
    case 'cardPlayed':
      return { cue: { kind: 'play', seat: event.seat, card: event.card }, ms: motion.flightMs };
    default:
      return null;
  }
}

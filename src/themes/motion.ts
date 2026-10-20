/**
 * Animation timing tokens — SA-1; Technical Spec §9.2.
 *
 * One source for both sides of every animation: the Presenter waits these
 * durations, and the same values reach CSS as custom properties, so the
 * driver never moves on while a card is still in flight.
 */

export interface Motion {
  /** Between one dealt card and the next. */
  readonly dealStaggerMs: number;
  /** A card travelling between a seat and the table. */
  readonly flightMs: number;
  /** The upcard turning over. */
  readonly flipMs: number;
}

export const MOTION: Motion = {
  dealStaggerMs: 40,
  flightMs: 280,
  flipMs: 320,
};

/** Cards dealt per hand, plus the upcard, which turns last. */
export const DEAL_STEPS = 21;

/** How long the deal takes, from the first card leaving to the upcard landing. */
export function dealDuration(motion: Motion): number {
  return (DEAL_STEPS - 1) * motion.dealStaggerMs + motion.flightMs;
}

export function motionVars(motion: Motion): Readonly<Record<`--${string}`, string>> {
  return {
    '--deal-stagger': `${motion.dealStaggerMs}ms`,
    '--flight': `${motion.flightMs}ms`,
    '--flip': `${motion.flipMs}ms`,
  };
}

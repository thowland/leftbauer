import type { Seat } from '../engine/seats';

export type ScreenPosition = 'bottom' | 'left' | 'top' | 'right';

const CLOCKWISE: readonly ScreenPosition[] = ['bottom', 'left', 'top', 'right'];

/**
 * Where a seat sits on screen. The human is always at the bottom; the
 * next seat clockwise is on their left, their partner across the top.
 * This is the only place the UI maps seats to screen positions (§9.1).
 */
export function screenPosition(seat: Seat, humanSeat: Seat): ScreenPosition {
  return CLOCKWISE[(seat - humanSeat + 4) % 4]!;
}

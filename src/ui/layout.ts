import { teamOf, type Seat, type Team } from '../engine/seats';

export type ScreenPosition = 'bottom' | 'left' | 'top' | 'right';

const CLOCKWISE: readonly ScreenPosition[] = ['bottom', 'left', 'top', 'right'];

const POSITION_NAMES: Record<ScreenPosition, string> = {
  bottom: 'You',
  left: 'Left opponent',
  top: 'Partner',
  right: 'Right opponent',
};

/**
 * Where a seat sits on screen. The human is always at the bottom; the
 * next seat clockwise is on their left, their partner across the top.
 * This is the only place the UI maps seats to screen positions (§9.1).
 */
export function screenPosition(seat: Seat, humanSeat: Seat): ScreenPosition {
  return CLOCKWISE[(seat - humanSeat + 4) % 4]!;
}

/** How a seat is named on screen, until personas arrive in Sprint 4. */
export function seatName(seat: Seat, humanSeat: Seat): string {
  return POSITION_NAMES[screenPosition(seat, humanSeat)];
}

/** "Us" for the human's team, "Them" for the other. */
export function teamName(team: Team, humanSeat: Seat): 'Us' | 'Them' {
  return team === teamOf(humanSeat) ? 'Us' : 'Them';
}

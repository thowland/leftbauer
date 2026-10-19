import type { Persona } from '../bots/personas';
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

/** Display names for the four seats, indexed by seat. */
export type SeatNames = readonly [string, string, string, string];

/** Who sits in a seat: a display name and, for a bot, its persona (OP-4). */
export interface SeatInfo {
  readonly name: string;
  readonly persona: Persona | null;
}

/**
 * How a seat is named in text: its persona name when `names` is given,
 * otherwise its position ("Left opponent"). Positional names also label
 * the seat regions, so they stay stable whoever is playing.
 */
export function seatName(seat: Seat, humanSeat: Seat, names?: SeatNames): string {
  return names?.[seat] ?? POSITION_NAMES[screenPosition(seat, humanSeat)];
}

export function namesOf(seats: readonly SeatInfo[] | undefined): SeatNames | undefined {
  return seats?.map((s) => s.name) as SeatNames | undefined;
}

/** "Us" for the human's team, "Them" for the other. */
export function teamName(team: Team, humanSeat: Seat): 'Us' | 'Them' {
  return team === teamOf(humanSeat) ? 'Us' : 'Them';
}

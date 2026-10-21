// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Seats and teams — Technical Spec §4.1.
 *
 * Seats are numbered clockwise. Partners sit across from each other, so
 * seats 0 and 2 form team 0 and seats 1 and 3 form team 1. Nothing in the
 * engine assumes which seat the human occupies.
 *
 * Pure module: no DOM, no React, no storage.
 */

export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

/** The next seat clockwise: the player to this seat's left. */
export function leftOf(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

/** Seats clockwise starting from `first`. */
export function seatsFrom(first: Seat): Seat[] {
  return [0, 1, 2, 3].map((i) => ((first + i) % 4) as Seat);
}

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * How each card on the table moves for the Presenter's current cue — SA-1.
 *
 * Positions are unit vectors from the table's center toward each seat;
 * CSS scales them by the table's reach (`--reach-x`, `--reach-y`), so a
 * card flies from the seat that played it without measuring the layout.
 */

import type { CSSProperties } from 'react';
import type { CardId } from '../engine/cards';
import type { Seat } from '../engine/seats';
import { DEAL_STEPS } from '../themes/motion';
import type { Cue } from './game/presenter';
import { screenPosition, type ScreenPosition } from './layout';

export interface CardMotion {
  readonly className: string;
  readonly style: CSSProperties;
}

const TOWARD: Record<ScreenPosition, readonly [x: number, y: number]> = {
  bottom: [0, 1],
  left: [-1, 0],
  top: [0, -1],
  right: [1, 0],
};

function toward(seat: Seat, humanSeat: Seat): readonly [number, number] {
  return TOWARD[screenPosition(seat, humanSeat)];
}

function moving(className: string, [dx, dy]: readonly [number, number], step = 0): CardMotion {
  return {
    className,
    style: { '--dx': dx, '--dy': dy, '--step': step } as CSSProperties,
  };
}

/** A card arriving at the center from a seat. */
export function flyFrom(seat: Seat, humanSeat: Seat): CardMotion {
  return moving('fly-in', toward(seat, humanSeat));
}

/** A card leaving the center for a seat. */
export function flyTo(seat: Seat, humanSeat: Seat): CardMotion {
  return moving('fly-out', toward(seat, humanSeat));
}

/**
 * The `index`th card of `seat`'s hand during the deal: it flies from the
 * dealer, in turn clockwise from the dealer's left, one card per seat per
 * round. `null` deals a kitty card or the upcard, which land last.
 */
export function dealt(
  cue: Cue | null,
  seat: Seat | null,
  index: number,
  humanSeat: Seat
): CardMotion | undefined {
  if (cue?.kind !== 'deal') return undefined;
  const [fromX, fromY] = toward(cue.dealer, humanSeat);
  if (seat === null) return moving('fly-in', [fromX, fromY], DEAL_STEPS - 1);
  const [toX, toY] = toward(seat, humanSeat);
  const turn = (seat - cue.dealer + 3) % 4;
  return moving('fly-in', [fromX - toX, fromY - toY], index * 4 + turn);
}

/** The human's hand: a picked-up upcard drops in from the center. */
export function intoHand(cue: Cue | null, card: CardId): CardMotion | undefined {
  return cue?.kind === 'pickup' && cue.card === card ? moving('fly-in', [0, -1]) : undefined;
}

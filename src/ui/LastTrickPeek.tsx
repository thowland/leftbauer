// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { useState } from 'react';
import type { Seat } from '../engine/seats';
import type { Trick } from '../engine/state';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { seatName, type SeatNames } from './layout';

interface LastTrickPeekProps {
  /** The tricks won so far this hand; the button is disabled until there is one. */
  readonly tricks: readonly Trick[];
  readonly humanSeat: Seat;
  readonly names?: SeatNames | undefined;
}

/**
 * Look back at the previous trick at any point in the hand — GF-5. The
 * trick is captured when the panel opens, so play moving on underneath
 * does not change what is being read.
 */
export function LastTrickPeek({ tricks, humanSeat, names }: LastTrickPeekProps) {
  const [shown, setShown] = useState<{ trick: Trick; number: number } | null>(null);
  const last = tricks.at(-1) ?? null;
  return (
    <>
      <button
        type="button"
        className="button button-small"
        disabled={last === null}
        onClick={() => last !== null && setShown({ trick: last, number: tricks.length })}
      >
        Last trick
      </button>
      {shown !== null && (
        <Dialog
          title={`Trick ${shown.number}`}
          actions={
            <button type="button" className="button button-primary" onClick={() => setShown(null)}>
              Close
            </button>
          }
        >
          <ol className="peek">
            {shown.trick.plays.map(({ seat, card }) => {
              const won = shown.trick.winner === seat;
              return (
                <li key={card} className={`peek-play${won ? ' peek-winner' : ''}`}>
                  <Card card={card} className="peek-card" />
                  <span className="peek-name">{seatName(seat, humanSeat, names)}</span>
                  {won && <span className="chip">Took it</span>}
                </li>
              );
            })}
          </ol>
        </Dialog>
      )}
    </>
  );
}

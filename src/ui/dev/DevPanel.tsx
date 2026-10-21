// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { currentActor } from '../../engine/game';
import { seatName } from '../layout';
import type { DevTable } from './devTable';
import { canDealNext } from './devTable';

interface DevPanelProps {
  readonly table: DevTable;
  readonly seed: number;
  readonly revealed: boolean;
  readonly onStep: () => void;
  readonly onFinishHand: () => void;
  readonly onNextHand: () => void;
  readonly onNewGame: () => void;
  readonly onToggleReveal: () => void;
}

/** `?dev`: step the engine, reveal every hand, and read the event log. */
export function DevPanel(props: DevPanelProps) {
  const { table, seed, revealed } = props;
  const { game } = table;
  const actor = currentActor(game);
  const status =
    game.winner !== null
      ? 'Game over'
      : actor === null
        ? 'Hand complete'
        : `${game.hand.phase.kind} · ${seatName(actor, table.humanSeat)} to act`;

  return (
    <aside className="dev-panel" aria-label="Dev panel">
      <h2>Dev panel</h2>
      <p className="dev-status" role="status">
        Hand {game.handNumber} · seed {seed} · {status}
      </p>
      <div className="dev-buttons">
        <button type="button" className="button" onClick={props.onStep} disabled={actor === null}>
          Step
        </button>
        <button
          type="button"
          className="button"
          onClick={props.onFinishHand}
          disabled={actor === null}
        >
          Finish hand
        </button>
        <button
          type="button"
          className="button"
          onClick={props.onNextHand}
          disabled={!canDealNext(table)}
        >
          Next hand
        </button>
        <button type="button" className="button" onClick={props.onNewGame}>
          New game
        </button>
        <label className="dev-toggle">
          <input type="checkbox" checked={revealed} onChange={props.onToggleReveal} />
          Reveal hands
        </label>
      </div>
      <ol className="dev-log" aria-label="Event log">
        {table.log.map((entry) => (
          <li key={entry.id}>{entry.text}</li>
        ))}
      </ol>
    </aside>
  );
}

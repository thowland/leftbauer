// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import type { Action } from '../engine/actions';
import type { CardId } from '../engine/cards';

const mark = (match: boolean) => (match ? ' hinted' : '');

interface FarmerPanelProps {
  /** The cards picked so far in the hand. */
  readonly picked: readonly CardId[];
  readonly onSwap: () => void;
  readonly onKeep: () => void;
  /** The coach's suggestion (CO-1). */
  readonly hinted: Action | null;
}

/** A farmer's hand (RU-15): pick three cards in the hand, then swap them or keep the hand. */
export function FarmerPanel({ picked, onSwap, onKeep, hinted }: FarmerPanelProps) {
  const hintedSwap = hinted?.type === 'farmerExchange' ? hinted.cards.length > 0 : null;
  return (
    <div className="bid-panel" role="group" aria-label="Farmer’s hand">
      <button
        type="button"
        className={`button button-primary${mark(hintedSwap === true)}`}
        disabled={picked.length !== 3}
        onClick={onSwap}
      >
        {picked.length === 3 ? 'Swap these three' : `Pick ${3 - picked.length} more`}
      </button>
      <button type="button" className={`button${mark(hintedSwap === false)}`} onClick={onKeep}>
        Keep my hand
      </button>
    </div>
  );
}

interface DefendAlonePanelProps {
  readonly onChoose: (accept: boolean) => void;
  readonly hinted: Action | null;
}

/** Defending alone (RU-13): play alone against the makers, or with your partner. */
export function DefendAlonePanel({ onChoose, hinted }: DefendAlonePanelProps) {
  const hintedAccept = hinted?.type === 'defendAlone' ? hinted.accept : null;
  return (
    <div className="bid-panel" role="group" aria-label="Defend alone">
      <button
        type="button"
        className={`button button-primary${mark(hintedAccept === true)}`}
        onClick={() => onChoose(true)}
      >
        Defend alone
      </button>
      <button
        type="button"
        className={`button${mark(hintedAccept === false)}`}
        onClick={() => onChoose(false)}
      >
        Play with my partner
      </button>
    </div>
  );
}

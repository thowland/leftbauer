import { useState } from 'react';
import type { Action, BidAction } from '../engine/actions';
import { SUITS, type Suit } from '../engine/cards';
import { SUIT_NAMES } from '../assets/manifest';
import { SuitIcon } from './SuitIcon';

interface BidPanelProps {
  readonly legal: readonly Action[];
  readonly isDealer: boolean;
  readonly onBid: (action: BidAction) => void;
  /** The coach's suggested bid (CO-1). */
  readonly hinted?: BidAction | null;
}

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Only the legal bids, as large buttons — GF-3. */
export function BidPanel({ legal, isDealer, onBid, hinted = null }: BidPanelProps) {
  const [alone, setAlone] = useState(false);
  const canOrder = legal.some((a) => a.type === 'orderUp');
  // RU-14: the dealer's partner may order up only by going alone.
  const orderAloneOnly = canOrder && !legal.some((a) => a.type === 'orderUp' && !a.alone);
  const callable = SUITS.filter((suit) =>
    legal.some((a) => a.type === 'callTrump' && a.suit === suit)
  );
  const canPass = legal.some((a) => a.type === 'pass');
  const canGoAlone = legal.some((a) => (a.type === 'orderUp' || a.type === 'callTrump') && a.alone);
  const mark = (match: boolean) => (match ? ' hinted' : '');
  const hintedAlone = hinted !== null && hinted.type !== 'pass' && hinted.alone;

  return (
    <div className="bid-panel" role="group" aria-label="Your bid">
      {canOrder && (
        <button
          type="button"
          className={`button button-primary${mark(hinted?.type === 'orderUp')}`}
          onClick={() => onBid({ type: 'orderUp', alone: alone || orderAloneOnly })}
        >
          {isDealer ? 'Pick it up' : orderAloneOnly ? 'Order it up alone' : 'Order it up'}
        </button>
      )}
      {callable.map((suit: Suit) => (
        <button
          key={suit}
          type="button"
          className={`button button-primary suit-button${mark(
            hinted?.type === 'callTrump' && hinted.suit === suit
          )}`}
          onClick={() => onBid({ type: 'callTrump', suit, alone })}
        >
          <svg viewBox="0 0 100 100" className="suit-button-icon" aria-hidden="true">
            <SuitIcon suit={suit} x={50} y={50} size={100} color="currentColor" />
          </svg>
          {/* Phones show only the suit, so a round-two bid fits on one row. */}
          <span className="suit-button-name">{capitalize(SUIT_NAMES[suit])}</span>
        </button>
      ))}
      {canGoAlone && !orderAloneOnly && (
        <label className={`alone-toggle${mark(hintedAlone)}`}>
          <input type="checkbox" checked={alone} onChange={(e) => setAlone(e.target.checked)} />
          Go alone
        </label>
      )}
      {canPass && (
        <button
          type="button"
          className={`button${mark(hinted?.type === 'pass')}`}
          onClick={() => onBid({ type: 'pass' })}
        >
          Pass
        </button>
      )}
    </div>
  );
}

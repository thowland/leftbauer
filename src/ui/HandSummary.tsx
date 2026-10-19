import { teamOf } from '../engine/seats';
import type { PlayerView } from '../engine/view';
import { SUIT_NAMES } from '../assets/manifest';
import { describeResult } from './describe';
import { Dialog } from './Dialog';
import { seatName, type SeatNames } from './layout';

interface HandSummaryProps {
  readonly view: PlayerView;
  readonly onContinue: () => void;
  readonly names?: SeatNames | undefined;
}

/** After each hand: who made trump, the result and the running score — GF-6. */
export function HandSummary({ view, onContinue, names }: HandSummaryProps) {
  const { result, contract } = view;
  if (result === null) return null;
  const us = teamOf(view.seat);
  return (
    <Dialog
      title={`Hand ${view.handNumber}`}
      actions={
        <button type="button" className="button button-primary" onClick={onContinue}>
          Continue
        </button>
      }
    >
      {contract !== null && (
        <p>
          {seatName(contract.maker, view.seat, names)} called {SUIT_NAMES[contract.trump]}
          {contract.alone ? ', alone' : ''}.
        </p>
      )}
      <p className="dialog-result">{describeResult(result, view.seat)}</p>
      <p className="dialog-score">
        Score: us {view.score[us]}, them {view.score[us === 0 ? 1 : 0]}
      </p>
    </Dialog>
  );
}

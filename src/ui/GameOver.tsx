import { teamOf } from '../engine/seats';
import type { HandResult } from '../engine/state';
import type { PlayerView } from '../engine/view';
import { gameHighlights } from './describe';
import { Dialog } from './Dialog';

interface GameOverProps {
  readonly view: PlayerView;
  readonly results: readonly HandResult[];
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

/** The end of the game: result, notable events and Play again — GF-7. */
export function GameOver({ view, results, onPlayAgain, onHome }: GameOverProps) {
  if (view.gameWinner === null) return null;
  const us = teamOf(view.seat);
  const won = view.gameWinner === us;
  return (
    <Dialog
      title={won ? 'We win!' : 'They win'}
      actions={
        <>
          <button type="button" className="button button-primary" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="button" onClick={onHome}>
            Home
          </button>
        </>
      }
    >
      <p className="dialog-score">
        Final score: us {view.score[us]}, them {view.score[us === 0 ? 1 : 0]}
      </p>
      <table className="highlights">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Event</span>
            </th>
            <th scope="col">Us</th>
            <th scope="col">Them</th>
          </tr>
        </thead>
        <tbody>
          {gameHighlights(results, view.seat).map((h) => (
            <tr key={h.label}>
              <th scope="row">{h.label}</th>
              <td>{h.us}</td>
              <td>{h.them}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}

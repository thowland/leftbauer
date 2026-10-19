import { useState } from 'react';
import { Dialog } from './Dialog';

interface GameMenuProps {
  readonly onClose: () => void;
  readonly onSettings: () => void;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
  readonly onConcede: () => void;
}

type Confirming = 'newGame' | 'concede' | null;

/**
 * The in-game menu. Leaving for home or settings keeps the game to
 * continue later; a new game or conceding abandons it, after a
 * confirmation (GF-8). The safe choice always takes the focus.
 */
export function GameMenu({ onClose, onSettings, onHome, onNewGame, onConcede }: GameMenuProps) {
  const [confirming, setConfirming] = useState<Confirming>(null);

  if (confirming !== null) {
    const newGame = confirming === 'newGame';
    return (
      <Dialog
        key={confirming}
        title={newGame ? 'Start a new game?' : 'Concede this game?'}
        actions={
          <>
            <button type="button" className="button" onClick={() => setConfirming(null)}>
              Keep playing
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={newGame ? onNewGame : onConcede}
            >
              {newGame ? 'New game' : 'Concede'}
            </button>
          </>
        }
      >
        <p>The game in progress will be lost.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Menu"
      actions={
        <button type="button" className="button button-primary" onClick={onClose}>
          Back to the game
        </button>
      }
    >
      <div className="menu-list">
        <button type="button" className="button" onClick={onSettings}>
          Settings
        </button>
        <button type="button" className="button" onClick={onHome}>
          Home
        </button>
        <button type="button" className="button" onClick={() => setConfirming('newGame')}>
          New game
        </button>
        <button type="button" className="button" onClick={() => setConfirming('concede')}>
          Concede
        </button>
      </div>
      <p className="menu-note">Your game is saved when you leave it.</p>
    </Dialog>
  );
}

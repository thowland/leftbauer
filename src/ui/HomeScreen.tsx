import { useState } from 'react';
import { Dialog } from './Dialog';

interface HomeScreenProps {
  /** A game is saved and can be continued. */
  readonly canContinue: boolean;
  readonly onContinue: () => void;
  readonly onNewGame: () => void;
  readonly onSettings: () => void;
}

/**
 * The first screen — GF-1: Continue when a game is in progress, and one
 * tap to a new game with the last-used settings. Starting over while a
 * game is saved asks first (GF-8).
 */
export function HomeScreen({ canContinue, onContinue, onNewGame, onSettings }: HomeScreenProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="home" aria-label="Home">
      <h1 className="home-title">Left Bauer</h1>
      <p className="home-tagline">Euchre at the kitchen table.</p>
      {canContinue && (
        <button type="button" className="button button-primary home-button" onClick={onContinue}>
          Continue
        </button>
      )}
      <button
        type="button"
        className={`button home-button${canContinue ? '' : ' button-primary'}`}
        onClick={canContinue ? () => setConfirming(true) : onNewGame}
      >
        New game
      </button>
      <button type="button" className="button home-button" onClick={onSettings}>
        Settings
      </button>
      {confirming && (
        <Dialog
          title="Start a new game?"
          actions={
            <>
              <button type="button" className="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={onNewGame}>
                New game
              </button>
            </>
          }
        >
          <p>The game in progress will be lost.</p>
        </Dialog>
      )}
    </main>
  );
}

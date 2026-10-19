import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toPlayerView } from '../engine/view';
import type { GameTable } from './game/createTable';
import { GameMenu } from './GameMenu';
import { GameOver } from './GameOver';
import { HandSummary } from './HandSummary';
import { namesOf } from './layout';
import { TableScreen } from './TableScreen';

interface GameScreenProps {
  readonly table: GameTable;
  /** Play a card on the first tap (GF-2). */
  readonly oneTap?: boolean;
  readonly onPlayAgain: () => void;
  /** Leave the game; it stays saved to continue later. */
  readonly onHome: () => void;
  readonly onSettings: () => void;
  /** Abandon the game for a new one (confirmed in the menu). */
  readonly onNewGame: () => void;
  /** Abandon the game (confirmed in the menu). */
  readonly onConcede: () => void;
}

/**
 * A live game: subscribes to the TableDriver and routes the human's
 * actions to their seat controller. The driver runs while this screen is
 * mounted and stops when it unmounts.
 */
export function GameScreen({
  table,
  oneTap = false,
  onPlayAgain,
  onHome,
  onSettings,
  onNewGame,
  onConcede,
}: GameScreenProps) {
  const { driver, human, humanSeat } = table;
  const snapshot = useSyncExternalStore(driver.subscribe, driver.snapshot);
  const started = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Initial events are emitted once, even if React restarts the effect.
    void driver.start(started.current ? [] : table.initialEvents);
    started.current = true;
    return () => driver.stop();
  }, [driver, table.initialEvents]);

  const view = toPlayerView(snapshot.state, humanSeat);
  const legal = snapshot.awaiting?.seat === humanSeat ? snapshot.awaiting.legal : null;

  return (
    <>
      <TableScreen
        view={view}
        legal={legal}
        onAction={(action) => human.submit(action)}
        seats={table.seats}
        oneTap={oneTap}
        onHurry={driver.hurry}
        controls={
          <button type="button" className="button button-small" onClick={() => setMenuOpen(true)}>
            Menu
          </button>
        }
      />
      {snapshot.status === 'handComplete' && (
        <HandSummary
          view={view}
          onContinue={driver.continueToNextHand}
          names={namesOf(table.seats)}
        />
      )}
      {snapshot.status === 'gameOver' && (
        <GameOver
          view={view}
          results={snapshot.state.completedHands}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
        />
      )}
      {menuOpen && snapshot.status !== 'gameOver' && (
        <GameMenu
          onClose={() => setMenuOpen(false)}
          onSettings={onSettings}
          onHome={onHome}
          onNewGame={onNewGame}
          onConcede={onConcede}
        />
      )}
    </>
  );
}

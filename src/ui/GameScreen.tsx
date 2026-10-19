import { useEffect, useRef, useSyncExternalStore } from 'react';
import { toPlayerView } from '../engine/view';
import type { GameTable } from './game/createTable';
import { GameOver } from './GameOver';
import { HandSummary } from './HandSummary';
import { namesOf } from './layout';
import { TableScreen } from './TableScreen';

interface GameScreenProps {
  readonly table: GameTable;
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

/**
 * A live game: subscribes to the TableDriver and routes the human's
 * actions to their seat controller. The driver runs while this screen is
 * mounted and stops when it unmounts.
 */
export function GameScreen({ table, onPlayAgain, onHome }: GameScreenProps) {
  const { driver, human, humanSeat } = table;
  const snapshot = useSyncExternalStore(driver.subscribe, driver.snapshot);
  const started = useRef(false);

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
    </>
  );
}

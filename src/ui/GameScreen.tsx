import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { hintFor, type Hint } from '../coach/hint';
import { toPlayerView } from '../engine/view';
import type { GameTable } from './game/createTable';
import { GameMenu } from './GameMenu';
import { GameOver } from './GameOver';
import { HandSummary } from './HandSummary';
import { namesOf } from './layout';
import { SoundToggle } from './SoundToggle';
import { TableScreen } from './TableScreen';

interface GameScreenProps {
  readonly table: GameTable;
  /** Play a card on the first tap (GF-2). */
  readonly oneTap?: boolean;
  /** Sound effects on (SA-3). */
  readonly soundOn?: boolean;
  readonly onToggleSound?: () => void;
  /** Offer the Hint control (CO-3). */
  readonly hintsOn?: boolean;
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
  soundOn = false,
  onToggleSound = () => {},
  hintsOn = false,
  onPlayAgain,
  onHome,
  onSettings,
  onNewGame,
  onConcede,
}: GameScreenProps) {
  const { driver, human, humanSeat } = table;
  const snapshot = useSyncExternalStore(driver.subscribe, driver.snapshot);
  const cue = useSyncExternalStore(table.presenter.subscribe, table.presenter.cue);
  // The first deal's events, until the driver has been started with them.
  const pending = useRef(table.initialEvents);
  const [menuOpen, setMenuOpen] = useState(false);
  // A hint belongs to the request it answered; a new turn clears it.
  const [hinted, setHinted] = useState<{ for: object; hint: Hint } | null>(null);

  useEffect(() => {
    // Start after StrictMode's mount, unmount and remount, so the first
    // deal is presented once, and in full.
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      void driver.start(pending.current);
      pending.current = [];
    });
    return () => {
      live = false;
      driver.stop();
    };
  }, [driver]);

  const view = toPlayerView(snapshot.state, humanSeat);
  const awaiting = snapshot.awaiting?.seat === humanSeat ? snapshot.awaiting : null;
  const legal = awaiting?.legal ?? null;
  const hint = awaiting !== null && hinted?.for === awaiting ? hinted.hint : null;
  const askCoach =
    hintsOn && awaiting !== null
      ? () => setHinted({ for: awaiting, hint: hintFor(view, awaiting.legal) })
      : undefined;

  return (
    <>
      <TableScreen
        view={view}
        legal={legal}
        onAction={(action) => human.submit(action)}
        seats={table.seats}
        oneTap={oneTap}
        onHurry={driver.hurry}
        cue={cue}
        onHint={askCoach}
        hint={hint}
        controls={
          <>
            <SoundToggle on={soundOn} onToggle={onToggleSound} />
            <button type="button" className="button button-small" onClick={() => setMenuOpen(true)}>
              Menu
            </button>
          </>
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

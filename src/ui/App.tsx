import { useState, type CSSProperties } from 'react';
import { CARD_ROOM, type Theme } from '../themes/cardRoom';
import { DevApp } from './dev/DevApp';
import { createTable, type GameTable } from './game/createTable';
import { GameScreen } from './GameScreen';
import { HomeScreen } from './HomeScreen';

interface AppProps {
  /** `?dev`: step the engine from the dev panel instead of playing. */
  readonly dev?: boolean;
  /** `?seed=N`: reproducible shuffles. Without it, shuffles use crypto (RU-2). */
  readonly seed?: number | null;
  /** `?e2e`: no pacing between bot actions. */
  readonly fast?: boolean;
  readonly theme?: Theme;
}

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'game'; readonly id: number; readonly table: GameTable };

export function App({ dev = false, seed = null, fast = false, theme = CARD_ROOM }: AppProps) {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [games, setGames] = useState(0);

  const newGame = () => {
    // Each game in a seeded session gets its own reproducible seed.
    const table = createTable({ seed: seed === null ? null : seed + games, fast });
    setScreen({ kind: 'game', id: games, table });
    setGames((n) => n + 1);
  };

  return (
    <div className="app" data-theme={theme.id} style={theme.vars as CSSProperties}>
      {dev ? (
        <DevApp seed={seed} />
      ) : screen.kind === 'home' ? (
        <HomeScreen onNewGame={newGame} />
      ) : (
        <GameScreen
          key={screen.id}
          table={screen.table}
          onPlayAgain={newGame}
          onHome={() => setScreen({ kind: 'home' })}
        />
      )}
    </div>
  );
}

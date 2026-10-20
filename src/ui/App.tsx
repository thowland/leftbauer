import { useEffect, useState, type CSSProperties } from 'react';
import type { AudioEngine } from '../audio/audioEngine';
import type { BotRunner } from '../session/botRunner';
import { clear, load, memoryStorage, save, type StorageLike } from '../state/persistence';
import { GAME_STORE, type SavedGame } from '../state/savedGame';
import { DEFAULT_SETTINGS, SETTINGS_STORE, type Settings } from '../state/settings';
import { CARD_ROOM, type Theme } from '../themes/cardRoom';
import { MOTION, motionVars } from '../themes/motion';
import { DevApp } from './dev/DevApp';
import { newTable, resumeTable, type GameTable, type TableOptions } from './game/createTable';
import { GameScreen } from './GameScreen';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';

interface AppProps {
  /** `?dev`: step the engine from the dev panel instead of playing. */
  readonly dev?: boolean;
  /** `?seed=N`: reproducible shuffles. Without it, shuffles use crypto (RU-2). */
  readonly seed?: number | null;
  /** `?e2e`: no pacing between bot actions. */
  readonly fast?: boolean;
  readonly theme?: Theme;
  /** Where the game and settings are kept (PE-1, PE-3); in memory when omitted. */
  readonly storage?: StorageLike;
  /** Animate the table (SA-1); off for `?e2e` and reduced motion. */
  readonly motion?: boolean;
  /** Sound playback (SA-2); silent when omitted. */
  readonly audio?: AudioEngine | null;
  /** Where bots decide (the Web Worker); inline when omitted. */
  readonly botRunner?: BotRunner;
}

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'game'; readonly id: number; readonly table: GameTable }
  | { readonly kind: 'settings'; readonly from: 'home' | 'game' };

export function App({
  dev = false,
  seed = null,
  fast = false,
  theme = CARD_ROOM,
  storage,
  motion = false,
  audio = null,
  botRunner,
}: AppProps) {
  const [store] = useState(() => storage ?? memoryStorage());
  const [settings, setSettings] = useState(() => load(store, SETTINGS_STORE) ?? DEFAULT_SETTINGS);
  // The game to continue, kept in memory too, so it survives a storage failure.
  const [paused, setPaused] = useState<SavedGame | null>(() => load(store, GAME_STORE));
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [games, setGames] = useState(0);

  // Browsers only start audio inside a gesture (SA-3).
  useEffect(() => audio?.unlockOn(window), [audio]);
  useEffect(() => audio?.setMuted(!settings.soundOn), [audio, settings.soundOn]);

  const options: TableOptions = {
    fast,
    pacingMs: settings.pacingMs,
    storage: store,
    motion: motion ? MOTION : null,
    sound: audio,
    ...(botRunner === undefined ? {} : { runner: botRunner }),
  };

  const play = (table: GameTable) => {
    setScreen({ kind: 'game', id: games, table });
    setGames((n) => n + 1);
  };

  const newGame = () => {
    clear(store, GAME_STORE);
    setPaused(null);
    // Each game in a seeded session gets its own reproducible seed.
    play(newTable(settings, seed === null ? null : seed + games, options));
  };

  const resume = (saved: SavedGame | null) => {
    if (saved === null) setScreen({ kind: 'home' });
    else play(resumeTable(saved, options));
  };

  /** Leave the table, keeping the game to continue later. */
  const leave = (table: GameTable, to: Screen) => {
    const game = table.driver.snapshot().state;
    setPaused(game.winner === null ? { ...table.setup, game } : null);
    setScreen(to);
  };

  const abandon = () => {
    clear(store, GAME_STORE);
    setPaused(null);
    setScreen({ kind: 'home' });
  };

  const changeSettings = (next: Settings) => {
    setSettings(next);
    save(store, SETTINGS_STORE, next);
  };

  const content = () => {
    switch (screen.kind) {
      case 'home':
        return (
          <HomeScreen
            canContinue={paused !== null}
            onContinue={() => resume(paused)}
            onNewGame={newGame}
            onSettings={() => setScreen({ kind: 'settings', from: 'home' })}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onChange={changeSettings}
            doneLabel={screen.from === 'game' ? 'Back to the game' : 'Done'}
            onDone={() => (screen.from === 'game' ? resume(paused) : setScreen({ kind: 'home' }))}
          />
        );
      case 'game': {
        const { table } = screen;
        return (
          <GameScreen
            key={screen.id}
            table={table}
            oneTap={settings.oneTapPlay}
            soundOn={settings.soundOn}
            onToggleSound={() => changeSettings({ ...settings, soundOn: !settings.soundOn })}
            onPlayAgain={newGame}
            onHome={() => leave(table, { kind: 'home' })}
            onSettings={() => leave(table, { kind: 'settings', from: 'game' })}
            onNewGame={newGame}
            onConcede={abandon}
          />
        );
      }
    }
  };

  return (
    <div
      className="app"
      data-theme={theme.id}
      style={{ ...theme.vars, ...motionVars(MOTION) } as CSSProperties}
    >
      {dev ? <DevApp seed={seed} /> : content()}
    </div>
  );
}

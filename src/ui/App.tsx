import { useEffect, useState, type CSSProperties } from 'react';
import type { AudioEngine } from '../audio/audioEngine';
import type { BotRunner } from '../session/botRunner';
import { clear, load, memoryStorage, save, type StorageLike } from '../state/persistence';
import { GAME_STORE, type SavedGame } from '../state/savedGame';
import { DEFAULT_SETTINGS, SETTINGS_STORE, type Settings } from '../state/settings';
import {
  EMPTY_STATS,
  loadStats,
  opponentSkill,
  recordAbandoned,
  STATS_STORE,
  type Stats,
} from '../state/stats';
import { CARD_ROOM, type Theme } from '../themes/cardRoom';
import { MOTION, motionVars } from '../themes/motion';
import { DeckContext } from './deck';
import { DevApp } from './dev/DevApp';
import { newTable, resumeTable, type GameTable, type TableOptions } from './game/createTable';
import { GameScreen } from './GameScreen';
import { AboutScreen } from './AboutScreen';
import { HomeScreen, type InfoScreen } from './HomeScreen';
import { PartnerConventionsScreen } from './PartnerConventionsScreen';
import { RulesScreen } from './RulesScreen';
import { StatsScreen } from './StatsScreen';
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
  | { readonly kind: 'settings'; readonly from: 'home' | 'game' }
  | { readonly kind: 'stats'; readonly stats: Stats }
  | { readonly kind: Exclude<InfoScreen, 'stats'> };

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

  /** A game left unfinished counts as a loss (PE-2). */
  const abandonInProgress = () => {
    const playing = screen.kind === 'game' ? screen.table : null;
    const unfinished =
      playing !== null
        ? playing.driver.snapshot().state.winner === null
          ? playing.setup.seats
          : null
        : (paused?.seats ?? null);
    if (unfinished !== null) {
      save(store, STATS_STORE, recordAbandoned(loadStats(store), opponentSkill(unfinished)));
    }
  };

  const newGame = () => {
    abandonInProgress();
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
    abandonInProgress();
    clear(store, GAME_STORE);
    setPaused(null);
    setScreen({ kind: 'home' });
  };

  const changeSettings = (next: Settings) => {
    setSettings(next);
    save(store, SETTINGS_STORE, next);
  };

  const home = () => setScreen({ kind: 'home' });

  const content = () => {
    switch (screen.kind) {
      case 'home':
        return (
          <HomeScreen
            canContinue={paused !== null}
            onContinue={() => resume(paused)}
            onNewGame={newGame}
            onSettings={() => setScreen({ kind: 'settings', from: 'home' })}
            onOpen={(kind) =>
              setScreen(kind === 'stats' ? { kind, stats: loadStats(store) } : { kind })
            }
          />
        );
      case 'rules':
        return <RulesScreen rules={settings.pendingRules} onDone={home} />;
      case 'conventions':
        return <PartnerConventionsScreen onDone={home} />;
      case 'about':
        return <AboutScreen onDone={home} />;
      case 'stats':
        return (
          <StatsScreen
            stats={screen.stats}
            onDone={home}
            onReset={() => {
              clear(store, STATS_STORE);
              setScreen({ kind: 'stats', stats: EMPTY_STATS });
            }}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onChange={changeSettings}
            doneLabel={screen.from === 'game' ? 'Back to the game' : 'Done'}
            activeRules={screen.from === 'game' ? (paused?.game.rules ?? null) : null}
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
            hintsOn={settings.hintsOn}
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
      <DeckContext.Provider value={settings.deck}>
        {dev ? <DevApp seed={seed} /> : content()}
      </DeckContext.Provider>
    </div>
  );
}

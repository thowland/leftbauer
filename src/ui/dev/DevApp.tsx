import { useState, type CSSProperties } from 'react';
import { STANDARD_RULES } from '../engine/rules';
import { leftOf, type Seat } from '../engine/seats';
import { toPlayerView } from '../engine/view';
import { CARD_ROOM, type Theme } from '../themes/cardRoom';
import { cryptoRng, seededRng, type Rng } from '../util/rng';
import { DevPanel } from './dev/DevPanel';
import {
  dealNextTableHand,
  finishTableHand,
  randomChooser,
  startTable,
  stepTable,
  type Chooser,
  type DevTable,
} from './dev/devTable';
import { TableScreen } from './TableScreen';

const HUMAN_SEAT: Seat = 0;
/** Start with the dealer on the human's right, so the human bids first. */
const FIRST_DEALER: Seat = 3;

interface AppProps {
  /** `?dev`: show the dev panel. */
  readonly dev?: boolean;
  /**
   * `?seed=N`: shuffle and choose dev steps from seeded RNGs so a session
   * can be reproduced. Without it, shuffles use crypto (RU-2).
   */
  readonly seed?: number | null;
  readonly theme?: Theme;
}

interface Sources {
  readonly shuffle: Rng;
  readonly choose: Chooser;
  readonly seed: number;
}

function makeSources(seed: number | null): Sources {
  const base = seed ?? cryptoRng().nextInt(0x7fffffff);
  return {
    shuffle: seed === null ? cryptoRng() : seededRng(base),
    choose: randomChooser(seededRng(base + 1)),
    seed: base,
  };
}

export function App({ dev = false, seed = null, theme = CARD_ROOM }: AppProps) {
  const [sources] = useState(() => makeSources(seed));
  const [table, setTable] = useState<DevTable>(() =>
    startTable(STANDARD_RULES, FIRST_DEALER, HUMAN_SEAT, sources.shuffle)
  );
  const [revealed, setRevealed] = useState(false);

  const newTable = () =>
    setTable(startTable(STANDARD_RULES, leftOf(table.game.dealer), HUMAN_SEAT, sources.shuffle));

  const controls = dev ? null : (
    <button type="button" className="button" onClick={newTable}>
      Deal again
    </button>
  );

  return (
    <div
      className={dev ? 'app app-dev' : 'app'}
      data-theme={theme.id}
      style={theme.vars as CSSProperties}
    >
      <TableScreen
        view={toPlayerView(table.game, HUMAN_SEAT)}
        revealed={dev && revealed ? table.game.hand.hands : null}
        controls={controls}
      />
      {dev && (
        <DevPanel
          table={table}
          seed={sources.seed}
          revealed={revealed}
          onStep={() => setTable(stepTable(table, sources.choose))}
          onFinishHand={() => setTable(finishTableHand(table, sources.choose))}
          onNextHand={() => setTable(dealNextTableHand(table, sources.shuffle))}
          onNewGame={newTable}
          onToggleReveal={() => setRevealed((r) => !r)}
        />
      )}
    </div>
  );
}

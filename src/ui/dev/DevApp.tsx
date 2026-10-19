import { useState } from 'react';
import { STANDARD_RULES } from '../../engine/rules';
import { leftOf, type Seat } from '../../engine/seats';
import { toPlayerView } from '../../engine/view';
import { cryptoRng, seededRng, type Rng } from '../../util/rng';
import { TableScreen } from '../TableScreen';
import { DevPanel } from './DevPanel';
import {
  dealNextTableHand,
  finishTableHand,
  randomChooser,
  startTable,
  stepTable,
  type Chooser,
  type DevTable,
} from './devTable';

const HUMAN_SEAT: Seat = 0;
/** Start with the dealer on the human's right, so the human bids first. */
const FIRST_DEALER: Seat = 3;

interface DevAppProps {
  /**
   * `?seed=N`: shuffle and choose dev steps from seeded RNGs so a session
   * can be reproduced. Without it, shuffles use crypto (RU-2).
   */
  readonly seed: number | null;
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

/** `?dev`: the table driven step by step from the dev panel. */
export function DevApp({ seed }: DevAppProps) {
  const [sources] = useState(() => makeSources(seed));
  const [table, setTable] = useState<DevTable>(() =>
    startTable(STANDARD_RULES, FIRST_DEALER, HUMAN_SEAT, sources.shuffle)
  );
  const [revealed, setRevealed] = useState(false);

  const newTable = () =>
    setTable(startTable(STANDARD_RULES, leftOf(table.game.dealer), HUMAN_SEAT, sources.shuffle));

  return (
    <div className="app-dev">
      <TableScreen
        view={toPlayerView(table.game, HUMAN_SEAT)}
        revealed={revealed ? table.game.hand.hands : null}
      />
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
    </div>
  );
}

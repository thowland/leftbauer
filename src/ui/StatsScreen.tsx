import { useState } from 'react';
import { STAT_LEVELS, totalOf, type Stats, type Tally } from '../state/stats';
import { Dialog } from './Dialog';
import { Page } from './Page';

interface StatsScreenProps {
  readonly stats: Stats;
  readonly onReset: () => void;
  readonly onDone: () => void;
}

const LEVEL_NAMES = { casual: 'Casual', standard: 'Standard', sharp: 'Sharp' } as const;

const rate = (n: number, of: number) => (of === 0 ? '—' : `${Math.round((100 * n) / of)}%`);

const ROWS: readonly { label: string; value: (t: Tally) => string }[] = [
  { label: 'Games played', value: (t) => String(t.gamesPlayed) },
  { label: 'Games won', value: (t) => String(t.gamesWon) },
  { label: 'Win rate', value: (t) => rate(t.gamesWon, t.gamesPlayed) },
  { label: 'Hands played', value: (t) => String(t.handsPlayed) },
  { label: 'Trump you named', value: (t) => String(t.calls) },
  { label: 'Made', value: (t) => rate(t.made, t.calls) },
  { label: 'Euchres given', value: (t) => String(t.euchresGiven) },
  { label: 'Euchres taken', value: (t) => String(t.euchresTaken) },
  { label: 'Marches', value: (t) => String(t.marches) },
  { label: 'Loners made', value: (t) => `${t.lonersMade}/${t.lonersAttempted}` },
];

/** Lifetime stats — UI-5, PE-2: by opponent difficulty, and in all. */
export function StatsScreen({ stats, onReset, onDone }: StatsScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const columns = [
    ...STAT_LEVELS.map((level) => ({ name: LEVEL_NAMES[level], tally: stats[level] })),
    { name: 'All', tally: totalOf(stats) },
  ];
  return (
    <Page title="Stats" onDone={onDone}>
      <p className="page-lede">By opponent difficulty.</p>
      <div className="stats-scroll">
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Stat</span>
              </th>
              {columns.map((c) => (
                <th key={c.name} scope="col">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {columns.map((c) => (
                  <td key={c.name}>{row.value(c.tally)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="settings-detail">
        A game left unfinished counts as a loss. Hints are never counted.
      </p>
      <button type="button" className="button" onClick={() => setConfirming(true)}>
        Reset stats
      </button>
      {confirming && (
        <Dialog
          title="Reset your stats?"
          actions={
            <>
              <button type="button" className="button" onClick={() => setConfirming(false)}>
                Keep them
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setConfirming(false);
                  onReset();
                }}
              >
                Reset
              </button>
            </>
          }
        >
          <p>Every count goes back to zero. This cannot be undone.</p>
        </Dialog>
      )}
    </Page>
  );
}

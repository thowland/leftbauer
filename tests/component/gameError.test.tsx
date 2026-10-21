import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/state/settings';
import { newTable } from '../../src/ui/game/createTable';
import { GameScreen } from '../../src/ui/GameScreen';

/** A game whose driver has stopped on an error it recovered from (CR-1). */
function failedTable() {
  const table = newTable(DEFAULT_SETTINGS, 5, {
    fast: true,
    pacingMs: 0,
    storage: null,
    motion: null,
    sound: null,
  });
  const failed = { ...table.driver.snapshot(), status: 'error' as const };
  vi.spyOn(table.driver, 'snapshot').mockReturnValue(failed);
  const start = vi.spyOn(table.driver, 'start').mockResolvedValue(failed.state);
  return { table, start };
}

const screenFor = (table: ReturnType<typeof failedTable>['table'], onHome = () => {}) => (
  <GameScreen
    table={table}
    onPlayAgain={() => {}}
    onHome={onHome}
    onSettings={() => {}}
    onNewGame={() => {}}
    onConcede={() => {}}
  />
);

describe('a game that hit an error', () => {
  it('says so instead of freezing, and tries again from the saved position', async () => {
    const { table, start } = failedTable();
    render(screenFor(table));
    const dialog = await screen.findByRole('dialog', { name: 'Something went wrong' });
    expect(dialog).toHaveTextContent('saved up to the last move');
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    start.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('can leave for Home with the game kept', async () => {
    const onHome = vi.fn();
    const { table } = failedTable();
    render(screenFor(table, onHome));
    await userEvent.click(await screen.findByRole('button', { name: 'Home' }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { load, memoryStorage, save } from '../../src/state/persistence';
import { GAME_STORE, startGame } from '../../src/state/savedGame';
import { DEFAULT_SETTINGS, SETTINGS_STORE } from '../../src/state/settings';
import { STANDARD_RULES } from '../../src/engine/rules';
import { ErrorBoundary } from '../../src/ui/ErrorBoundary';

function Broken(): never {
  throw new Error('bad save');
}

function setup() {
  const storage = memoryStorage();
  const { saved } = startGame({
    rules: STANDARD_RULES,
    skill: 'standard',
    opponents: { left: 'rusty', right: 'soopy' },
    seed: 3,
  });
  save(storage, GAME_STORE, saved);
  save(storage, SETTINGS_STORE, DEFAULT_SETTINGS);
  const onReload = vi.fn();
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(
    <ErrorBoundary storage={storage} onReload={onReload}>
      <Broken />
    </ErrorBoundary>
  );
  return { storage, onReload, quiet };
}

describe('ErrorBoundary (CR-2)', () => {
  it('shows a way out instead of a blank page', async () => {
    const { onReload, quiet, storage } = setup();
    expect(screen.getByRole('main', { name: 'Something went wrong' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledOnce();
    expect(load(storage, GAME_STORE)).not.toBeNull();
    expect(quiet).toHaveBeenCalled();
    quiet.mockRestore();
  });

  it('clears only the saved game, keeping settings, then reloads', async () => {
    const { onReload, quiet, storage } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Clear the saved game and reload' }));
    expect(load(storage, GAME_STORE)).toBeNull();
    expect(load(storage, SETTINGS_STORE)).toEqual(DEFAULT_SETTINGS);
    expect(onReload).toHaveBeenCalledOnce();
    quiet.mockRestore();
  });

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary storage={memoryStorage()}>
        <p>the table</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('the table')).toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { load, memoryStorage, save } from '../../src/state/persistence';
import { GAME_STORE } from '../../src/state/savedGame';
import { DEFAULT_SETTINGS, SETTINGS_STORE } from '../../src/state/settings';
import { App } from '../../src/ui/App';
import { browserStorage } from '../../src/ui/browserStorage';

const handCards = () =>
  within(screen.getByRole('region', { name: 'Your hand' }))
    .getAllByRole('img')
    .map((c) => c.getAttribute('data-card'));

/** Wait for the human's first decision of the game. */
const yourTurn = () =>
  waitFor(() =>
    expect(
      screen.queryByRole('group', { name: 'Your bid' }) ??
        within(screen.getByRole('region', { name: 'Your hand' })).queryAllByRole('button')[0]
    ).toBeTruthy()
  );

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
  return screen.getByRole('dialog', { name: 'Menu' });
}

describe('App persistence (PE-1, PE-3)', () => {
  it('continues a saved game after the app is closed and reopened', async () => {
    const storage = memoryStorage();
    const first = render(<App seed={3} fast storage={storage} />);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await yourTurn();
    const before = handCards();
    const state = load(storage, GAME_STORE)!.game;
    first.unmount();

    render(<App seed={3} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await yourTurn();
    expect(handCards()).toEqual(before);
    expect(load(storage, GAME_STORE)!.game).toEqual(state);
  });

  it('leaves for home and settings from the menu, then picks up where it was', async () => {
    const storage = memoryStorage();
    render(<App seed={4} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await yourTurn();
    const before = handCards();

    await userEvent.click(within(await openMenu()).getByRole('button', { name: 'Home' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await yourTurn();
    expect(handCards()).toEqual(before);

    await userEvent.click(within(await openMenu()).getByRole('button', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /One-tap play/ }));
    expect(load(storage, SETTINGS_STORE)?.oneTapPlay).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Back to the game' }));
    await yourTurn();
    expect(handCards()).toEqual(before);
  });

  it('closes the menu and plays on', async () => {
    render(<App seed={4} fast />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(
      within(await openMenu()).getByRole('button', { name: 'Back to the game' })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('concedes, clearing the saved game', async () => {
    const storage = memoryStorage();
    render(<App seed={5} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await yourTurn();
    expect(load(storage, GAME_STORE)).not.toBeNull();

    await userEvent.click(within(await openMenu()).getByRole('button', { name: 'Concede' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Concede' })
    );
    expect(screen.getByRole('main', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(load(storage, GAME_STORE)).toBeNull();
  });

  it('abandons the game for a new one from the menu', async () => {
    const storage = memoryStorage();
    render(<App seed={6} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await yourTurn();
    const first = load(storage, GAME_STORE)!.game;

    await userEvent.click(within(await openMenu()).getByRole('button', { name: 'New game' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' })
    );
    await yourTurn();
    expect(load(storage, GAME_STORE)!.game.hand.hands).not.toEqual(first.hand.hands);
  });

  it('starts new games with the saved settings', async () => {
    const storage = memoryStorage();
    save(storage, SETTINGS_STORE, {
      ...DEFAULT_SETTINGS,
      opponents: { left: 'shrubs', right: 'smooth' },
    });
    render(<App seed={7} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByLabelText('Left opponent')).toHaveValue('shrubs');
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('region', { name: 'Left opponent' })).toHaveTextContent('Shrubs');
    expect(screen.getByRole('region', { name: 'Right opponent' })).toHaveTextContent('Smooth');
  });
});

describe('browserStorage', () => {
  it('uses localStorage when it works', () => {
    const local = memoryStorage() as Storage;
    expect(browserStorage({ localStorage: local })).toBe(local);
  });

  it('falls back to memory when localStorage is missing or blocked', () => {
    const blocked = {
      setItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    for (const scope of [{}, { localStorage: blocked }]) {
      const storage = browserStorage(scope);
      storage.setItem('k', 'v');
      expect(storage.getItem('k')).toBe('v');
    }
    expect(browserStorage().getItem('leftbauer:probe')).toBeNull();
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { currentActor, legalActions } from '../../src/engine/game';
import type { GameState } from '../../src/engine/state';
import { toPlayerView } from '../../src/engine/view';
import { DEFAULT_SETTINGS, type Settings } from '../../src/state/settings';
import { GameMenu } from '../../src/ui/GameMenu';
import { HomeScreen } from '../../src/ui/HomeScreen';
import { PlayerHand } from '../../src/ui/PlayerHand';
import { SettingsScreen } from '../../src/ui/SettingsScreen';
import { TableScreen } from '../../src/ui/TableScreen';
import { act, gameFromDeck } from '../helpers/engine';

const playing = () =>
  act(act(gameFromDeck(), 0, { type: 'orderUp', alone: false }), 3, {
    type: 'discard',
    card: 'AC',
  });

/** Play first-legal cards until `tricks` tricks are complete. */
function afterTricks(tricks: number): GameState {
  let s = playing();
  while (s.hand.tricks.length < tricks) {
    const seat = currentActor(s)!;
    s = act(s, seat, legalActions(s, seat)[0]!);
  }
  return s;
}

describe('one-tap play (GF-2)', () => {
  it('plays a card on the first tap', async () => {
    const onChoose = vi.fn();
    render(
      <PlayerHand cards={['AS', 'KH']} trump="S" choosable={['AS']} onChoose={onChoose} oneTap />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ace of spades' }));
    expect(onChoose).toHaveBeenCalledWith('AS');
  });
});

describe('tapping the table (GF-4)', () => {
  it('hurries on a tap away from the controls, but not on a control', () => {
    const onHurry = vi.fn();
    render(
      <TableScreen
        view={toPlayerView(playing(), 0)}
        onHurry={onHurry}
        controls={<button type="button">Menu</button>}
      />
    );
    fireEvent.pointerDown(screen.getByRole('region', { name: 'Table center' }));
    expect(onHurry).toHaveBeenCalledOnce();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Menu' }));
    expect(onHurry).toHaveBeenCalledOnce();
  });

  it('ignores taps when nothing listens', () => {
    render(<TableScreen view={toPlayerView(playing(), 0)} />);
    expect(() => fireEvent.pointerDown(screen.getByRole('main'))).not.toThrow();
  });
});

describe('last trick (GF-5)', () => {
  it('is unavailable before the first trick is won', () => {
    render(<TableScreen view={toPlayerView(playing(), 0)} />);
    expect(screen.getByRole('button', { name: 'Last trick' })).toBeDisabled();
  });

  it('shows the previous trick, who played what and who took it', async () => {
    const state = afterTricks(1);
    const trick = state.hand.tricks[0]!;
    render(
      <TableScreen
        view={toPlayerView(state, 0)}
        seats={[
          { name: 'You', persona: null },
          { name: 'Rusty', persona: null },
          { name: 'Partner', persona: null },
          { name: 'Soopy', persona: null },
        ]}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Last trick' }));
    const dialog = screen.getByRole('dialog', { name: 'Trick 1' });
    const plays = within(dialog).getAllByRole('listitem');
    expect(plays.map((p) => within(p).getByRole('img').getAttribute('data-card'))).toEqual(
      trick.plays.map((p) => p.card)
    );
    const winner = plays.find((p) => within(p).queryByText('Took it'))!;
    expect(winner).toHaveTextContent(['You', 'Rusty', 'Partner', 'Soopy'][trick.winner!]!);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is not offered while bidding', () => {
    render(<TableScreen view={toPlayerView(gameFromDeck(), 0)} />);
    expect(screen.queryByRole('button', { name: 'Last trick' })).toBeNull();
  });
});

describe('GameMenu (GF-8)', () => {
  function renderMenu() {
    const handlers = {
      onClose: vi.fn(),
      onSettings: vi.fn(),
      onHome: vi.fn(),
      onNewGame: vi.fn(),
      onConcede: vi.fn(),
    };
    render(<GameMenu {...handlers} />);
    return handlers;
  }

  it('goes back to the game, to settings or home without asking', async () => {
    const h = renderMenu();
    expect(screen.getByRole('button', { name: 'Back to the game' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to the game' }));
    expect(h.onSettings).toHaveBeenCalledOnce();
    expect(h.onHome).toHaveBeenCalledOnce();
    expect(h.onClose).toHaveBeenCalledOnce();
  });

  it('confirms a new game, with the safe choice focused', async () => {
    const h = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('dialog', { name: 'Start a new game?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(h.onNewGame).toHaveBeenCalledOnce();
  });

  it('confirms conceding', async () => {
    const h = renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Concede' }));
    expect(screen.getByRole('dialog', { name: 'Concede this game?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Concede' }));
    expect(h.onConcede).toHaveBeenCalledOnce();
  });
});

describe('HomeScreen (GF-1)', () => {
  const handlers = () => ({ onContinue: vi.fn(), onNewGame: vi.fn(), onSettings: vi.fn() });

  it('starts a new game in one tap when nothing is saved', async () => {
    const h = handlers();
    render(<HomeScreen canContinue={false} {...h} />);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(h.onNewGame).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(h.onSettings).toHaveBeenCalledOnce();
  });

  it('offers Continue, and asks before abandoning the saved game', async () => {
    const h = handlers();
    render(<HomeScreen canContinue {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(h.onContinue).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    const dialog = screen.getByRole('dialog', { name: 'Start a new game?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(h.onNewGame).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' })
    );
    expect(h.onNewGame).toHaveBeenCalledOnce();
  });
});

describe('SettingsScreen (UI-1)', () => {
  function renderSettings(initial: Settings = DEFAULT_SETTINGS) {
    let current = initial;
    const onChange = vi.fn((next: Settings) => (current = next));
    const onDone = vi.fn();
    const view = render(<SettingsScreen settings={current} onChange={onChange} onDone={onDone} />);
    const rerender = () =>
      view.rerender(<SettingsScreen settings={current} onChange={onChange} onDone={onDone} />);
    return { onChange, onDone, rerender, latest: () => current };
  }

  it('chooses opponents, never the same one on both sides', async () => {
    const s = renderSettings();
    await userEvent.selectOptions(screen.getByLabelText('Left opponent'), 'rusty');
    s.rerender();
    expect(s.latest().opponents).toEqual({ left: 'rusty', right: 'random' });
    expect(screen.getByText(/A bold caller/)).toBeInTheDocument();
    const right = screen.getByLabelText('Right opponent');
    expect(within(right).getByRole('option', { name: 'Rusty' })).toBeDisabled();
    await userEvent.selectOptions(right, 'soopy');
    s.rerender();
    expect(s.latest().opponents).toEqual({ left: 'rusty', right: 'soopy' });
  });

  it('sets difficulty, pace, one-tap play and sound', async () => {
    const s = renderSettings();
    await userEvent.click(screen.getByRole('radio', { name: /Casual/ }));
    s.rerender();
    await userEvent.click(screen.getByRole('radio', { name: 'Brisk' }));
    s.rerender();
    await userEvent.click(screen.getByRole('checkbox', { name: /One-tap play/ }));
    s.rerender();
    await userEvent.click(screen.getByRole('checkbox', { name: /Sound effects/ }));
    s.rerender();
    expect(s.latest()).toMatchObject({
      skill: 'casual',
      pacingMs: 350,
      oneTapPlay: true,
      soundOn: false,
    });
    expect(screen.getByRole('radio', { name: 'Brisk' })).toBeChecked();
  });

  it('offers only the levels that play differently', () => {
    renderSettings();
    expect(screen.getAllByRole('radio', { name: /Casual|Standard|Sharp/ })).toHaveLength(2);
  });

  it('labels the way back', async () => {
    const onDone = vi.fn();
    render(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        onChange={() => {}}
        onDone={onDone}
        doneLabel="Back to the game"
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back to the game' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';
import { CARD_ROOM } from '../../src/themes/cardRoom';

/**
 * Take the human's turn if it is theirs: the first bid offered, or the
 * first playable card (tapped twice). Returns false if there was nothing to do.
 */
async function takeTurn(): Promise<boolean> {
  const bid = screen.queryByRole('group', { name: 'Your bid' });
  if (bid) {
    await userEvent.click(within(bid).getAllByRole('button')[0]!);
    return true;
  }
  const hand = screen.queryByRole('region', { name: 'Your hand' });
  const card = hand && within(hand).queryAllByRole('button')[0];
  if (card) {
    await userEvent.click(card);
    await userEvent.click(card);
    return true;
  }
  return false;
}

/** Play until a dialog (hand summary or game over) appears. */
async function playUntilDialog(): Promise<HTMLElement> {
  for (let i = 0; i < 200; i++) {
    const dialog = screen.queryByRole('dialog');
    if (dialog) return dialog;
    if (!(await takeTurn())) {
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog') ??
            screen.queryByRole('group', { name: 'Your bid' }) ??
            within(screen.getByRole('region', { name: 'Your hand' })).queryAllByRole('button')[0]
        ).toBeTruthy()
      );
    }
  }
  throw new Error('No dialog appeared');
}

describe('App', () => {
  it('opens on the home screen and applies the theme', () => {
    const { container } = render(<App seed={1} fast />);
    expect(screen.getByRole('main', { name: 'Home' })).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-theme', CARD_ROOM.id);
    expect(root.style.getPropertyValue('--felt')).toBe(CARD_ROOM.vars['--felt']);
  });

  it('starts a game in one tap and plays a hand to its summary', async () => {
    render(<App seed={2} fast />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('main', { name: 'Euchre table' })).toBeInTheDocument();

    const summary = await playUntilDialog();
    expect(summary).toHaveAccessibleName('Hand 1');
    await userEvent.click(within(summary).getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('main', { name: 'Euchre table' })).toBeInTheDocument();
  });

  it('plays a whole game, then offers Play again and Home', async () => {
    render(<App seed={5} fast />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    let dialog = await playUntilDialog();
    while (dialog.getAttribute('aria-labelledby') && /^Hand/.test(dialog.textContent ?? '')) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
      dialog = await playUntilDialog();
    }
    expect(dialog).toHaveAccessibleName(/We win!|They win/);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Play again' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Score').querySelectorAll('dd')[0]).toHaveTextContent('0');

    dialog = await playUntilDialog();
    while (/^Hand/.test(dialog.textContent ?? '')) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
      dialog = await playUntilDialog();
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('main', { name: 'Home' })).toBeInTheDocument();
  }, 60_000);

  it('shows the dev panel with ?dev', () => {
    render(<App dev seed={7} />);
    expect(screen.getByRole('complementary', { name: 'Dev panel' })).toBeInTheDocument();
  });
});

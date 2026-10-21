import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Seat } from '../../src/engine/seats';
import type { GameState } from '../../src/engine/state';
import { toPlayerView } from '../../src/engine/view';
import { personaById } from '../../src/bots/personas';
import { TableScreen } from '../../src/ui/TableScreen';
import { act, gameFromDeck } from '../helpers/engine';

// Canonical deck, dealer 3 (see helpers/engine.ts). Seat 0 holds 9S TS JS KH AH; upcard JD.
function renderTable(state: GameState, seat: Seat = 0, revealed = false) {
  return render(
    <TableScreen
      view={toPlayerView(state, seat)}
      revealed={revealed ? state.hand.hands : null}
      controls={<button type="button">Extra</button>}
    />
  );
}

function cardsIn(region: string): (string | null)[] {
  return within(screen.getByRole('region', { name: region }))
    .getAllByRole('img')
    .map((c) => c.getAttribute('data-card'));
}

const ordered = () => act(gameFromDeck(), 0, { type: 'orderUp', alone: false });
const playing = () => act(ordered(), 3, { type: 'discard', card: 'AC' });

describe('TableScreen during bidding', () => {
  it("shows the human's hand face up, sorted, and the others face down", () => {
    renderTable(gameFromDeck());
    expect(cardsIn('Your hand')).toEqual(['JS', 'TS', '9S', 'AH', 'KH']);
    for (const seat of ['Partner', 'Left opponent', 'Right opponent']) {
      expect(cardsIn(seat)).toEqual([null, null, null, null, null]);
    }
  });

  it('turns up the upcard and marks the dealer and the seat to act', () => {
    renderTable(gameFromDeck());
    const center = within(screen.getByRole('region', { name: 'Table center' }));
    expect(center.getByRole('img', { name: 'Jack of diamonds' })).toBeInTheDocument();
    expect(center.getByText('Upcard')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Right opponent' })).getByTitle('Dealer')
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your hand' })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('shows passes, and a turned-down upcard in round two', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    const { unmount } = renderTable(s);
    expect(within(screen.getByRole('region', { name: 'Your hand' })).getByText('Pass'));
    expect(screen.getByRole('region', { name: 'Left opponent' })).toHaveAttribute(
      'aria-current',
      'true'
    );
    unmount();

    for (const seat of [1, 2, 3] as const) s = act(s, seat, { type: 'pass' });
    renderTable(s);
    const center = within(screen.getByRole('region', { name: 'Table center' }));
    expect(center.getByText('Turned down')).toBeInTheDocument();
    expect(center.queryByRole('img', { name: 'Jack of diamonds' })).toBeNull();
    // Round two starts fresh: round-one passes are no longer shown.
    expect(screen.queryByText('Pass')).toBeNull();
  });
});

describe('TableScreen once trump is set', () => {
  it('shows trump, the maker, and the dealer discarding', () => {
    renderTable(ordered());
    expect(screen.getByLabelText('Trump: diamonds')).toBeInTheDocument();
    expect(screen.getByText('Called diamonds')).toBeInTheDocument();
    expect(screen.getByText('Dealer is discarding')).toBeInTheDocument();
    expect(cardsIn('Right opponent')).toHaveLength(6);
  });

  it('sorts the hand with trump first, including the left bower', () => {
    // Seat 3 holds JH (left bower for diamonds) and JD after the pickup.
    renderTable(playing(), 3);
    expect(cardsIn('Your hand')).toEqual(['JD', 'JH', 'TD', '9D', 'QH']);
  });

  it('invites a lead, then shows the trick by seat', () => {
    let s = playing();
    const { unmount } = renderTable(s);
    expect(screen.getByText('Lead')).toBeInTheDocument();
    unmount();

    s = act(s, 0, { type: 'play', card: 'AH' });
    const { container } = renderTable(s);
    const trick = within(screen.getByLabelText('Trick'));
    expect(trick.getByRole('img', { name: 'Ace of hearts' })).toBeInTheDocument();
    expect(container.querySelector('.trick-bottom [data-card="AH"]')).not.toBeNull();
  });

  it('keeps the last trick on the table with its winner marked', () => {
    let s = act(playing(), 0, { type: 'play', card: 'AH' });
    s = act(s, 1, { type: 'play', card: '9C' });
    s = act(s, 2, { type: 'play', card: '9H' });
    s = act(s, 3, { type: 'play', card: 'QH' });
    const { container } = renderTable(s);
    expect(screen.getByLabelText('Last trick')).toBeInTheDocument();
    expect(container.querySelector('.trick-winner [data-card="AH"]')).not.toBeNull();
  });

  it('marks the seat sitting out a loner', () => {
    let s = act(gameFromDeck(), 0, { type: 'pass' });
    s = act(s, 1, { type: 'orderUp', alone: true });
    renderTable(s);
    const dealer = screen.getByRole('region', { name: 'Right opponent' });
    expect(within(dealer).getByText('Sitting out')).toBeInTheDocument();
    expect(dealer).toHaveClass('seat-out');
    expect(screen.getByText('Called diamonds · alone')).toBeInTheDocument();
  });
});

describe('TableScreen options', () => {
  it('reveals every hand in dev mode', () => {
    renderTable(gameFromDeck(), 0, true);
    expect(cardsIn('Partner')).toEqual(['AS', 'TH', '9H', 'KC', 'QC']);
  });

  it('scores from the human team’s point of view', () => {
    renderTable({ ...gameFromDeck(), score: [3, 7] }, 1);
    const values = [...screen.getByLabelText('Score').querySelectorAll('dd')];
    // Trump and Tricks hold their places with a dash until trump is named.
    expect(values.map((d) => d.textContent)).toEqual(['7', '3', '—', '—']);
    expect(screen.getByLabelText('Trump: not named yet')).toBeInTheDocument();
    expect(screen.getByLabelText('Tricks: none yet')).toBeInTheDocument();
  });

  it('renders extra score-bar controls', () => {
    renderTable(gameFromDeck());
    expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument();
  });
});

describe('TableScreen with personas (OP-4)', () => {
  it('shows persona names and monograms, keeping positional region labels', () => {
    const seats = [
      { name: 'You', persona: null },
      { name: 'Rusty', persona: personaById('rusty') },
      { name: 'Partner', persona: personaById('partner') },
      { name: 'Soopy', persona: personaById('soopy') },
    ] as const;
    render(<TableScreen view={toPlayerView(gameFromDeck(), 0)} seats={seats} />);
    const left = screen.getByRole('region', { name: 'Left opponent' });
    expect(left).toHaveTextContent('Rusty');
    expect(within(left).getByText('Rusty').closest('.seat-name')).toHaveAttribute(
      'title',
      personaById('rusty').tagline
    );
    expect(screen.getByRole('region', { name: 'Right opponent' })).toHaveTextContent('SSoopy');
  });

  it('names the seat to act in the prompt', () => {
    const seats = [
      { name: 'You', persona: null },
      { name: 'Rusty', persona: personaById('rusty') },
      { name: 'Partner', persona: personaById('partner') },
      { name: 'Soopy', persona: personaById('soopy') },
    ] as const;
    const s = act(gameFromDeck(), 0, { type: 'pass' });
    render(<TableScreen view={toPlayerView(s, 0)} seats={seats} />);
    expect(screen.getByText('Rusty is thinking…')).toBeInTheDocument();
  });
});

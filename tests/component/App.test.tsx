import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';
import { CARD_ROOM } from '../../src/themes/cardRoom';
import { seededRng } from '../../src/util/rng';

function handCards(): (string | null)[] {
  const hand = within(screen.getByRole('region', { name: 'Your hand' }));
  return hand.getAllByRole('img').map((c) => c.getAttribute('data-card'));
}

describe('App', () => {
  it('deals a table on load', () => {
    render(<App rng={seededRng(1)} />);
    expect(handCards()).toHaveLength(5);
    expect(screen.getAllByTitle('Dealer')).toHaveLength(1);
  });

  it('applies the theme as CSS variables', () => {
    const { container } = render(<App rng={seededRng(1)} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-theme', CARD_ROOM.id);
    expect(root.style.getPropertyValue('--felt')).toBe(CARD_ROOM.vars['--felt']);
  });

  it('deals a new hand and passes the deal to the left', async () => {
    render(<App rng={seededRng(1)} />);
    const first = handCards();
    // The first dealer is on the human's right, so the next dealer is the human.
    expect(
      within(screen.getByRole('region', { name: 'Opponent (right)' })).getByTitle('Dealer')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deal again' }));

    expect(handCards()).not.toEqual(first);
    expect(
      within(screen.getByRole('region', { name: 'Your hand' })).getByTitle('Dealer')
    ).toBeInTheDocument();
  });

  it('falls back to a crypto-backed shuffle', () => {
    render(<App />);
    expect(handCards()).toHaveLength(5);
  });
});

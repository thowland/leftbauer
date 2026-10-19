import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ALL_CARDS } from '../../src/engine/cards';
import { dealFrom } from '../../src/engine/deal';
import { TableScreen } from '../../src/ui/TableScreen';

// Canonical order dealt by seat 3: seat 0 holds 9S TS JS + KH AH; the upcard is JD.
const DEAL = dealFrom(ALL_CARDS, 3);

describe('TableScreen', () => {
  it("shows the human's five cards face up, sorted by suit", () => {
    render(<TableScreen deal={DEAL} dealer={3} humanSeat={0} onDealAgain={() => {}} />);
    const hand = within(screen.getByRole('region', { name: 'Your hand' }));
    const cards = hand.getAllByRole('img');
    expect(cards.map((c) => c.getAttribute('data-card'))).toEqual(['JS', 'TS', '9S', 'AH', 'KH']);
  });

  it('shows the other hands and the buried kitty face down', () => {
    render(<TableScreen deal={DEAL} dealer={3} humanSeat={0} onDealAgain={() => {}} />);
    expect(screen.getAllByRole('img', { name: 'Face-down card' })).toHaveLength(15 + 3);
    for (const name of ['Partner (top)', 'Opponent (left)', 'Opponent (right)']) {
      const seat = within(screen.getByRole('region', { name }));
      expect(seat.getAllByRole('img', { name: 'Face-down card' })).toHaveLength(5);
    }
  });

  it('turns up the first kitty card', () => {
    render(<TableScreen deal={DEAL} dealer={3} humanSeat={0} onDealAgain={() => {}} />);
    const kitty = within(screen.getByRole('region', { name: 'Kitty' }));
    expect(kitty.getByRole('img', { name: 'Jack of diamonds' })).toBeInTheDocument();
  });

  it('marks the dealer', () => {
    render(<TableScreen deal={DEAL} dealer={3} humanSeat={0} onDealAgain={() => {}} />);
    const right = within(screen.getByRole('region', { name: 'Opponent (right)' }));
    expect(right.getByTitle('Dealer')).toBeInTheDocument();
    expect(screen.getAllByTitle('Dealer')).toHaveLength(1);
  });

  it('marks the human as dealer when they deal', () => {
    render(<TableScreen deal={DEAL} dealer={0} humanSeat={0} onDealAgain={() => {}} />);
    const mine = within(screen.getByRole('region', { name: 'Your hand' }));
    expect(mine.getByTitle('Dealer')).toBeInTheDocument();
  });

  it('places seats relative to whichever seat the human occupies', () => {
    render(<TableScreen deal={DEAL} dealer={1} humanSeat={2} onDealAgain={() => {}} />);
    // Seat 1 is to seat 2's right; seat 0 is seat 2's partner.
    const right = within(screen.getByRole('region', { name: 'Opponent (right)' }));
    expect(right.getByTitle('Dealer')).toBeInTheDocument();
    const hand = within(screen.getByRole('region', { name: 'Your hand' }));
    expect(hand.getAllByRole('img').map((c) => c.getAttribute('data-card'))).toContain('AS');
  });

  it('asks for a new deal', async () => {
    const onDealAgain = vi.fn();
    render(<TableScreen deal={DEAL} dealer={3} humanSeat={0} onDealAgain={onDealAgain} />);
    await userEvent.click(screen.getByRole('button', { name: 'Deal again' }));
    expect(onDealAgain).toHaveBeenCalledOnce();
  });
});

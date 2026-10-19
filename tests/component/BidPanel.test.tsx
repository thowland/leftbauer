import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Action } from '../../src/engine/actions';
import { BidPanel } from '../../src/ui/BidPanel';

const ROUND_ONE: Action[] = [
  { type: 'orderUp', alone: false },
  { type: 'orderUp', alone: true },
  { type: 'pass' },
];

const ROUND_TWO_STUCK: Action[] = (['S', 'H', 'C'] as const).map((suit) => ({
  type: 'callTrump',
  suit,
  alone: false,
}));

describe('BidPanel (GF-3)', () => {
  it('offers ordering up, going alone and passing in round one', async () => {
    const onBid = vi.fn();
    render(<BidPanel legal={ROUND_ONE} isDealer={false} onBid={onBid} />);
    await userEvent.click(screen.getByRole('button', { name: 'Order it up' }));
    expect(onBid).toHaveBeenLastCalledWith({ type: 'orderUp', alone: false });

    await userEvent.click(screen.getByLabelText('Go alone'));
    await userEvent.click(screen.getByRole('button', { name: 'Order it up' }));
    expect(onBid).toHaveBeenLastCalledWith({ type: 'orderUp', alone: true });

    await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(onBid).toHaveBeenLastCalledWith({ type: 'pass' });
  });

  it('says "Pick it up" to the dealer', () => {
    render(<BidPanel legal={ROUND_ONE} isDealer onBid={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pick it up' })).toBeInTheDocument();
  });

  it('offers only the legal suits in round two, with no pass when stuck', async () => {
    const onBid = vi.fn();
    render(<BidPanel legal={ROUND_TWO_STUCK} isDealer onBid={onBid} />);
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Diamonds' })).toBeNull();
    expect(screen.queryByLabelText('Go alone')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hearts' }));
    expect(onBid).toHaveBeenCalledWith({ type: 'callTrump', suit: 'H', alone: false });
  });
});

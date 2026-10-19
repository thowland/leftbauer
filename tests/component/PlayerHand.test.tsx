import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerHand } from '../../src/ui/PlayerHand';

describe('PlayerHand (GF-2, UI-4)', () => {
  it('shows plain cards when nothing is to be chosen', () => {
    render(<PlayerHand cards={['AS', 'KH']} trump={null} choosable={[]} onChoose={() => {}} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('raises a card on the first tap and commits on the second', async () => {
    const onChoose = vi.fn();
    render(
      <PlayerHand cards={['AS', 'KH']} trump="S" choosable={['AS', 'KH']} onChoose={onChoose} />
    );
    const ace = screen.getByRole('button', { name: 'Ace of spades' });
    await userEvent.click(ace);
    expect(ace).toHaveAttribute('aria-pressed', 'true');
    expect(onChoose).not.toHaveBeenCalled();
    await userEvent.click(ace);
    expect(onChoose).toHaveBeenCalledWith('AS');
    expect(ace).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves the raise to another card without committing', async () => {
    const onChoose = vi.fn();
    render(
      <PlayerHand cards={['AS', 'KH']} trump="S" choosable={['AS', 'KH']} onChoose={onChoose} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ace of spades' }));
    await userEvent.click(screen.getByRole('button', { name: 'King of hearts' }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'King of hearts' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('dims cards that cannot be played', () => {
    const { container } = render(
      <PlayerHand cards={['AS', 'KH']} trump="S" choosable={['AS']} onChoose={() => {}} />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelector('.card-illegal [data-card="KH"]')).not.toBeNull();
  });

  it('badges and names the bowers', () => {
    render(
      <PlayerHand
        cards={['JH', 'JD', 'AH']}
        trump="H"
        choosable={['JH', 'JD']}
        onChoose={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Jack of hearts, right bower' })).toHaveTextContent(
      'Right'
    );
    expect(screen.getByRole('button', { name: 'Jack of diamonds, left bower' })).toHaveTextContent(
      'Left'
    );
    expect(screen.getAllByText(/Right|Left/)).toHaveLength(2);
  });
});

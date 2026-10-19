import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DevApp } from '../../src/ui/dev/DevApp';

function handCards(): (string | null)[] {
  const hand = within(screen.getByRole('region', { name: 'Your hand' }));
  return hand.getAllByRole('img').map((c) => c.getAttribute('data-card'));
}

const status = () => screen.getByRole('status').textContent;
const button = (name: string) => screen.getByRole('button', { name });

describe('DevApp (?dev)', () => {
  it('reproduces a session from its seed', () => {
    const { unmount } = render(<DevApp seed={42} />);
    const first = handCards();
    unmount();
    render(<DevApp seed={42} />);
    expect(handCards()).toEqual(first);
  });

  it('picks a random seed when none is given', () => {
    render(<DevApp seed={null} />);
    expect(status()).toMatch(/seed \d+/);
  });

  it('steps the engine one action at a time and logs it', async () => {
    render(<DevApp seed={7} />);
    expect(status()).toContain('seed 7');
    expect(status()).toContain('bidRound1 · You to act');
    const log = within(screen.getByRole('list', { name: 'Event log' }));
    expect(log.getAllByRole('listitem')).toHaveLength(1);

    await userEvent.click(button('Step'));
    expect(log.getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(status()).not.toContain('You to act');
  });

  it('finishes a hand, then deals the next one', async () => {
    render(<DevApp seed={7} />);
    expect(button('Next hand')).toBeDisabled();
    await userEvent.click(button('Finish hand'));
    expect(status()).toContain('Hand complete');
    expect(button('Step')).toBeDisabled();
    expect(button('Finish hand')).toBeDisabled();

    await userEvent.click(button('Next hand'));
    expect(status()).toContain('Hand 2');
  });

  it('reveals every hand on request', async () => {
    render(<DevApp seed={7} />);
    const partner = () => screen.getByRole('region', { name: 'Partner' });
    expect(within(partner()).getAllByRole('img', { name: 'Face-down card' })).toHaveLength(5);
    await userEvent.click(screen.getByLabelText('Reveal hands'));
    expect(within(partner()).queryAllByRole('img', { name: 'Face-down card' })).toHaveLength(0);
  });

  it('starts a new game', async () => {
    render(<DevApp seed={7} />);
    await userEvent.click(button('Finish hand'));
    await userEvent.click(button('New game'));
    expect(status()).toContain('Hand 1');
    expect(status()).toContain('bidRound1');
  });

  it('shows game over in the status', async () => {
    render(<DevApp seed={3} />);
    for (let i = 0; i < 60 && !status()!.includes('Game over'); i++) {
      await userEvent.click(button('Finish hand'));
      if (!button('Next hand').hasAttribute('disabled')) await userEvent.click(button('Next hand'));
    }
    expect(status()).toContain('Game over');
  });
});

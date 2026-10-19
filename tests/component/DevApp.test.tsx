import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/ui/App';
import { CARD_ROOM } from '../../src/themes/cardRoom';

function handCards(): (string | null)[] {
  const hand = within(screen.getByRole('region', { name: 'Your hand' }));
  return hand.getAllByRole('img').map((c) => c.getAttribute('data-card'));
}

const status = () => screen.getByRole('status').textContent;
const button = (name: string) => screen.getByRole('button', { name });

describe('App', () => {
  it('deals a table on load, with no dev panel by default', () => {
    render(<App seed={1} />);
    expect(handCards()).toHaveLength(5);
    expect(screen.getAllByTitle('Dealer')).toHaveLength(1);
    expect(screen.queryByRole('complementary', { name: 'Dev panel' })).toBeNull();
  });

  it('applies the theme as CSS variables', () => {
    const { container } = render(<App seed={1} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('data-theme', CARD_ROOM.id);
    expect(root.style.getPropertyValue('--felt')).toBe(CARD_ROOM.vars['--felt']);
  });

  it('deals a new hand and passes the deal to the left', async () => {
    render(<App seed={1} />);
    const first = handCards();
    await userEvent.click(button('Deal again'));
    expect(handCards()).not.toEqual(first);
    expect(
      within(screen.getByRole('region', { name: 'Your hand' })).getByTitle('Dealer')
    ).toBeInTheDocument();
  });

  it('reproduces a deal from its seed', () => {
    const { unmount } = render(<App seed={42} />);
    const first = handCards();
    unmount();
    render(<App seed={42} />);
    expect(handCards()).toEqual(first);
  });

  it('falls back to a crypto-backed shuffle without a seed', () => {
    render(<App />);
    expect(handCards()).toHaveLength(5);
  });
});

describe('App dev panel (?dev)', () => {
  it('steps the engine one action at a time and logs it', async () => {
    render(<App dev seed={7} />);
    expect(status()).toContain('seed 7');
    expect(status()).toContain('bidRound1 · You to act');
    const log = within(screen.getByRole('list', { name: 'Event log' }));
    expect(log.getAllByRole('listitem')).toHaveLength(1);

    await userEvent.click(button('Step'));
    expect(log.getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(status()).not.toContain('You to act');
  });

  it('finishes a hand, then deals the next one', async () => {
    render(<App dev seed={7} />);
    expect(button('Next hand')).toBeDisabled();
    await userEvent.click(button('Finish hand'));
    expect(status()).toContain('Hand complete');
    expect(button('Step')).toBeDisabled();
    expect(button('Finish hand')).toBeDisabled();

    await userEvent.click(button('Next hand'));
    expect(status()).toContain('Hand 2');
  });

  it('reveals every hand on request', async () => {
    render(<App dev seed={7} />);
    const partner = () => screen.getByRole('region', { name: 'Partner' });
    expect(within(partner()).getAllByRole('img', { name: 'Face-down card' })).toHaveLength(5);
    await userEvent.click(screen.getByLabelText('Reveal hands'));
    expect(within(partner()).queryAllByRole('img', { name: 'Face-down card' })).toHaveLength(0);
  });

  it('starts a new game', async () => {
    render(<App dev seed={7} />);
    await userEvent.click(button('Finish hand'));
    await userEvent.click(button('New game'));
    expect(status()).toContain('Hand 1');
    expect(status()).toContain('bidRound1');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../../src/engine/state';
import { toPlayerView } from '../../src/engine/view';
import { GameOver } from '../../src/ui/GameOver';
import { HandSummary } from '../../src/ui/HandSummary';
import { HomeScreen } from '../../src/ui/HomeScreen';
import { act, finishHand, gameFromDeck } from '../helpers/engine';

const first = <T,>(legal: readonly T[]): T => legal[0]!;

function scoredHand(): GameState {
  // Seat 1 orders up alone; the dealer (seat 3) sits out.
  let s = act(gameFromDeck(), 0, { type: 'pass' });
  s = act(s, 1, { type: 'orderUp', alone: true });
  return finishHand(s, first);
}

describe('HandSummary (GF-6)', () => {
  it('shows who called trump, the result and the score, and continues', async () => {
    const onContinue = vi.fn();
    render(<HandSummary view={toPlayerView(scoredHand(), 0)} onContinue={onContinue} />);
    const dialog = screen.getByRole('dialog', { name: 'Hand 1' });
    expect(dialog).toHaveTextContent('Left opponent called diamonds, alone.');
    expect(dialog).toHaveTextContent(/They .* to (us|them)\./);
    expect(dialog).toHaveTextContent(/Score: us \d+, them \d+/);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveFocus();
    await userEvent.click(button);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('explains a redeal', () => {
    let s = gameFromDeck();
    for (const seat of [0, 1, 2, 3, 0, 1, 2, 3] as const) s = act(s, seat, { type: 'pass' });
    render(<HandSummary view={toPlayerView(s, 0)} onContinue={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Everyone passed. The hand is redealt.');
  });

  it('renders nothing mid-hand', () => {
    const { container } = render(
      <HandSummary view={toPlayerView(gameFromDeck(), 0)} onContinue={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('GameOver (GF-7)', () => {
  const over = (winner: 0 | 1): GameState => ({ ...scoredHand(), winner, score: [10, 6] });

  it('announces a win with the final score and highlights', async () => {
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    const state = over(0);
    render(
      <GameOver
        view={toPlayerView(state, 0)}
        results={state.completedHands}
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />
    );
    expect(screen.getByRole('dialog', { name: 'We win!' })).toHaveTextContent(
      'Final score: us 10, them 6'
    );
    expect(screen.getByRole('rowheader', { name: 'Loners made' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
    expect(onHome).toHaveBeenCalledOnce();
  });

  it('announces a loss from the other team’s seat', () => {
    const state = over(0);
    render(
      <GameOver
        view={toPlayerView(state, 1)}
        results={[]}
        onPlayAgain={() => {}}
        onHome={() => {}}
      />
    );
    expect(screen.getByRole('dialog', { name: 'They win' })).toHaveTextContent(
      'Final score: us 6, them 10'
    );
  });

  it('renders nothing while the game is on', () => {
    const { container } = render(
      <GameOver
        view={toPlayerView(gameFromDeck(), 0)}
        results={[]}
        onPlayAgain={() => {}}
        onHome={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('HomeScreen (GF-1)', () => {
  it('starts a new game in one tap', async () => {
    const onNewGame = vi.fn();
    render(<HomeScreen onNewGame={onNewGame} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});

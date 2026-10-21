import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hintFor } from '../../src/coach/hint';
import { legalActions } from '../../src/engine/game';
import { STANDARD_RULES } from '../../src/engine/rules';
import { toPlayerView } from '../../src/engine/view';
import { load, memoryStorage, save } from '../../src/state/persistence';
import { DEFAULT_SETTINGS, SETTINGS_STORE } from '../../src/state/settings';
import {
  EMPTY_STATS,
  EMPTY_TALLY,
  loadStats,
  recordAbandoned,
  STATS_STORE,
} from '../../src/state/stats';
import { AboutScreen } from '../../src/ui/AboutScreen';
import { App } from '../../src/ui/App';
import { BidPanel } from '../../src/ui/BidPanel';
import { PartnerConventionsScreen } from '../../src/ui/PartnerConventionsScreen';
import { RulesScreen } from '../../src/ui/RulesScreen';
import { StatsScreen } from '../../src/ui/StatsScreen';
import { TableScreen } from '../../src/ui/TableScreen';
import { act, gameFromDeck } from '../helpers/engine';

const bidding = gameFromDeck();
const ordered = act(bidding, 0, { type: 'orderUp', alone: false });
const playing = act(ordered, 3, { type: 'discard', card: 'AC' });

describe('the Hint control (CO-1, CO-2)', () => {
  it('appears only on the human’s turn, and only when hints are on', () => {
    const view = toPlayerView(playing, 0);
    const { rerender } = render(<TableScreen view={view} legal={legalActions(playing, 0)} />);
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    rerender(<TableScreen view={view} legal={null} onHint={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    const onHint = vi.fn();
    rerender(<TableScreen view={view} legal={legalActions(playing, 0)} onHint={onHint} />);
    screen.getByRole('button', { name: 'Hint' }).click();
    expect(onHint).toHaveBeenCalledOnce();
  });

  it('highlights the suggested card and replaces the prompt with its reason', () => {
    const view = toPlayerView(playing, 0);
    const legal = legalActions(playing, 0);
    const hint = hintFor(view, legal);
    render(<TableScreen view={view} legal={legal} onHint={() => {}} hint={hint} />);
    expect(screen.getByText(`Hint: ${hint.reasonText}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hint' })).toBeDisabled();
    const card = (hint.action as { card: string }).card;
    const hand = within(screen.getByRole('region', { name: 'Your hand' }));
    const hinted = hand.getAllByRole('button').filter((b) => b.classList.contains('hinted'));
    expect(hinted).toHaveLength(1);
    expect(hinted[0]!.querySelector(`[data-card="${card}"]`)).not.toBeNull();
  });

  it('highlights the dealer’s suggested discard', () => {
    const view = toPlayerView(ordered, 3);
    const legal = legalActions(ordered, 3);
    render(<TableScreen view={view} legal={legal} hint={hintFor(view, legal)} />);
    expect(document.querySelectorAll('.hand-choice.hinted')).toHaveLength(1);
  });

  it('highlights a suggested bid, including going alone', () => {
    const legal = legalActions(bidding, 0);
    const { rerender } = render(
      <BidPanel legal={legal} isDealer={false} onBid={() => {}} hinted={{ type: 'pass' }} />
    );
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveClass('hinted');
    rerender(
      <BidPanel
        legal={legal}
        isDealer={false}
        onBid={() => {}}
        hinted={{ type: 'orderUp', alone: true }}
      />
    );
    expect(screen.getByRole('button', { name: 'Order it up' })).toHaveClass('hinted');
    expect(screen.getByText('Go alone').closest('label')).toHaveClass('hinted');
  });
});

describe('reading screens (UI-2, UI-3, UI-6)', () => {
  it('writes the rules from the active rule set', () => {
    const { rerender } = render(<RulesScreen rules={STANDARD_RULES} onDone={() => {}} />);
    expect(screen.getByText('The first team to 10 points wins.')).toBeInTheDocument();
    expect(screen.getByText(/the cards are thrown in/)).toBeInTheDocument();
    expect(screen.getByText('A loner who takes all five: 4 points.')).toBeInTheDocument();
    rerender(
      <RulesScreen
        rules={{ ...STANDARD_RULES, stickTheDealer: true, lonersAllowed: false, targetScore: 5 }}
        onDone={() => {}}
      />
    );
    expect(screen.getByText(/must name a suit/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Going alone' })).toBeNull();
    expect(screen.getByText('The first team to 5 points wins.')).toBeInTheDocument();
  });

  it('lists the partner’s conventions', () => {
    render(<PartnerConventionsScreen onDone={() => {}} />);
    for (const name of ['Bidding', 'Leading', 'Following', 'Thinking ahead']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/leads trump back to you/)).toBeInTheDocument();
  });

  it('tells the Bauer story, credits the sounds, states the license and shows the version', async () => {
    const onDone = vi.fn();
    render(<AboutScreen onDone={onDone} />);
    expect(screen.getByText(/German-speaking settlers in Pennsylvania/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Casino Audio' })).toHaveAttribute(
      'href',
      'https://kenney.nl/assets/casino-audio'
    );
    expect(screen.getByText('Copyright © 2026 Tim Howland.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'source code' })).toHaveAttribute(
      'href',
      'https://github.com/thowland/leftbauer'
    );
    expect(screen.getByRole('link', { name: 'GNU General Public License' })).toBeInTheDocument();
    // Under the title, where it shows without scrolling.
    const version = screen.getByText(/^Version \d+\.\d+\.\d+$/);
    const firstSection = screen.getByRole('heading', { name: 'The name' });
    expect(
      version.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('StatsScreen (UI-5)', () => {
  it('shows each level and the total, and resets only when confirmed', async () => {
    const onReset = vi.fn();
    const stats = {
      ...EMPTY_STATS,
      casual: { ...EMPTY_TALLY, gamesPlayed: 4, gamesWon: 3, calls: 2, made: 1 },
      sharp: { ...EMPTY_TALLY, gamesPlayed: 1 },
    };
    render(<StatsScreen stats={stats} onReset={onReset} onDone={() => {}} />);
    const row = (label: string) =>
      within(screen.getByRole('row', { name: new RegExp(`^${label}`) }))
        .getAllByRole('cell')
        .map((c) => c.textContent);
    expect(row('Games played')).toEqual(['4', '0', '1', '5']);
    expect(row('Win rate')).toEqual(['75%', '—', '0%', '60%']);
    expect(row('Made')).toEqual(['50%', '—', '—', '50%']);

    await userEvent.click(screen.getByRole('button', { name: 'Reset stats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep them' }));
    expect(onReset).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Reset stats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

describe('App (UI-2, UI-3, UI-5, UI-6, CO-3)', () => {
  it('opens every reading screen from home and comes back', async () => {
    render(<App seed={3} fast />);
    for (const [link, title] of [
      ['How to play', 'How to play'],
      ['How your partner plays', 'How your partner plays'],
      ['Stats', 'Stats'],
      ['About', 'About'],
    ] as const) {
      await userEvent.click(screen.getByRole('button', { name: link }));
      expect(screen.getByRole('main', { name: title })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    }
    expect(screen.getByRole('main', { name: 'Home' })).toBeInTheDocument();
  });

  it('resets stored stats from the stats screen', async () => {
    const storage = memoryStorage();
    save(storage, STATS_STORE, recordAbandoned(EMPTY_STATS, 'casual'));
    render(<App seed={3} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Stats' }));
    expect(
      within(screen.getByRole('row', { name: /^Games played/ })).getAllByRole('cell')[0]
    ).toHaveTextContent('1');
    await userEvent.click(screen.getByRole('button', { name: 'Reset stats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(loadStats(storage)).toEqual(EMPTY_STATS);
    expect(
      within(screen.getByRole('row', { name: /^Games played/ })).getAllByRole('cell')[0]
    ).toHaveTextContent('0');
  });

  it('counts a conceded game, or one replaced by a new game, as a loss', async () => {
    const storage = memoryStorage();
    render(<App seed={3} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' })
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Concede' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Concede' })
    );
    expect(loadStats(storage).standard).toMatchObject({ gamesPlayed: 2, gamesWon: 0 });
  });

  it('gives a hint on request, and hides the control when hints are off', async () => {
    const storage = memoryStorage();
    const { unmount } = render(<App seed={3} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Hint' }));
    expect(await screen.findByText(/^Hint: /)).toBeInTheDocument();
    unmount();

    save(storage, SETTINGS_STORE, { ...DEFAULT_SETTINGS, hintsOn: false });
    render(<App seed={3} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Your hand' })).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(load(storage, SETTINGS_STORE)?.hintsOn).toBe(false);
  });
});

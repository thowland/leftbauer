/**
 * The Sprint 9 screens: house-rule controls on the table, the Rules chip,
 * house-rule settings and the four-color deck.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Action } from '../../src/engine/actions';
import type { CardId } from '../../src/engine/cards';
import { legalActions } from '../../src/engine/game';
import { STANDARD_RULES, type RuleSet } from '../../src/engine/rules';
import type { GameState } from '../../src/engine/state';
import { toPlayerView } from '../../src/engine/view';
import { memoryStorage, save } from '../../src/state/persistence';
import { DEFAULT_SETTINGS, SETTINGS_STORE, type Settings } from '../../src/state/settings';
import { App } from '../../src/ui/App';
import { BidPanel } from '../../src/ui/BidPanel';
import { Card } from '../../src/ui/Card';
import { DeckContext } from '../../src/ui/deck';
import { RulesChip } from '../../src/ui/RulesChip';
import { RulesScreen } from '../../src/ui/RulesScreen';
import { SettingsScreen } from '../../src/ui/SettingsScreen';
import { TableScreen } from '../../src/ui/TableScreen';
import { act, deckFor, gameFromDeck } from '../helpers/engine';

const FARMER: RuleSet = { ...STANDARD_RULES, farmersHand: true };
const DEFEND: RuleSet = { ...STANDARD_RULES, defendAlone: true };

// Dealer 3; seat 0, the human, holds a farmer's hand.
const farmerGame = () =>
  gameFromDeck(
    deckFor(
      [
        ['9S', 'TS', '9H', 'TH', '9C'],
        ['JS', 'QS', 'KS', 'AS', 'TC'],
        ['JH', 'QH', 'KH', 'AH', 'JC'],
        ['QC', 'KC', 'AC', '9D', 'TD'],
      ],
      ['JD', 'QD', 'KD', 'AD']
    ),
    3,
    FARMER
  );

function renderTurn(state: GameState, extra: Partial<Parameters<typeof TableScreen>[0]> = {}) {
  const onAction = vi.fn<(action: Action) => void>();
  const utils = render(
    <TableScreen
      view={toPlayerView(state, 0)}
      legal={legalActions(state, 0)}
      onAction={onAction}
      {...extra}
    />
  );
  return { ...utils, onAction };
}

const handButton = (card: CardId) =>
  within(screen.getByRole('region', { name: 'Your hand' }))
    .getAllByRole('button')
    .find((b) => b.querySelector(`[data-card="${card}"]`) !== null)!;

describe("the farmer's hand on the table (RU-15)", () => {
  it('picks three cards, then swaps them', async () => {
    const { onAction } = renderTurn(farmerGame());
    expect(screen.getByText(/A farmer’s hand!/)).toBeInTheDocument();
    const swap = () => screen.getByRole('button', { name: /Swap these three|Pick \d more/ });
    expect(swap()).toBeDisabled();
    expect(swap()).toHaveTextContent('Pick 3 more');

    await userEvent.click(handButton('9S'));
    await userEvent.click(handButton('9H'));
    expect(handButton('9S')).toHaveAttribute('aria-pressed', 'true');
    // A second tap puts a card back.
    await userEvent.click(handButton('9H'));
    expect(handButton('9H')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(handButton('9C'));
    await userEvent.click(handButton('TS'));
    // A fourth card cannot be picked.
    await userEvent.click(handButton('TH'));
    expect(handButton('TH')).toHaveAttribute('aria-pressed', 'false');

    expect(swap()).toHaveTextContent('Swap these three');
    await userEvent.click(swap());
    expect(onAction).toHaveBeenCalledWith({ type: 'farmerExchange', cards: ['9S', '9C', 'TS'] });
  });

  it('keeps the hand', async () => {
    const { onAction } = renderTurn(farmerGame());
    await userEvent.click(screen.getByRole('button', { name: 'Keep my hand' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'farmerExchange', cards: [] });
  });

  it('highlights the hinted swap', () => {
    renderTurn(farmerGame(), {
      hint: {
        action: { type: 'farmerExchange', cards: ['9C', '9S', '9H'] },
        code: 'farmer-swap',
        reasonText: 'Swap your three lowest cards.',
      },
    });
    const hinted = document.querySelectorAll('.hand-choice.hinted');
    expect(hinted).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Pick 3 more/ })).toHaveClass('hinted');
    expect(screen.getByText('Hint: Swap your three lowest cards.')).toBeInTheDocument();
  });

  it('shows the upcard while the farmer decides', () => {
    renderTurn(farmerGame());
    const center = within(screen.getByRole('region', { name: 'Table center' }));
    expect(center.getByRole('img', { name: 'Jack of diamonds' })).toBeInTheDocument();
  });
});

describe('defending alone on the table (RU-13)', () => {
  // Seat 1 orders up and the dealer (3) discards. The defender left of the maker, seat 2,
  // is asked first and declines, so the human is asked second.
  const asked = () => {
    let s = act(gameFromDeck(undefined, 3, DEFEND), 0, { type: 'pass' });
    s = act(s, 1, { type: 'orderUp', alone: false });
    s = act(s, 3, { type: 'discard', card: 'AC' });
    return act(s, 2, { type: 'defendAlone', accept: false });
  };

  it('offers defending alone or with the partner', async () => {
    const { onAction } = renderTurn(asked());
    expect(screen.getByText(/Defend alone against the makers\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Defend alone' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'defendAlone', accept: true });
    await userEvent.click(screen.getByRole('button', { name: 'Play with my partner' }));
    expect(onAction).toHaveBeenLastCalledWith({ type: 'defendAlone', accept: false });
  });

  it('marks the hinted answer', () => {
    renderTurn(asked(), {
      hint: {
        action: { type: 'defendAlone', accept: false },
        code: 'defend-alone-not-strong-enough',
        reasonText: 'Defend with your partner.',
      },
    });
    expect(screen.getByRole('button', { name: 'Play with my partner' })).toHaveClass('hinted');
    expect(screen.getByRole('button', { name: 'Defend alone' })).not.toHaveClass('hinted');
  });

  it('shows the lone defender and the partner sitting out', () => {
    const s = act(asked(), 0, { type: 'defendAlone', accept: true });
    render(<TableScreen view={toPlayerView(s, 0)} />);
    expect(
      within(screen.getByRole('region', { name: 'Your hand' })).getByText('Defending alone')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Partner' })).getByText('Sitting out')
    ).toBeInTheDocument();
  });
});

describe("the dealer's partner must go alone (RU-14)", () => {
  it('offers only ordering up alone', async () => {
    const onBid = vi.fn();
    render(
      <BidPanel
        legal={[{ type: 'orderUp', alone: true }, { type: 'pass' }]}
        isDealer={false}
        onBid={onBid}
      />
    );
    expect(screen.queryByText('Go alone')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Order it up alone' }));
    expect(onBid).toHaveBeenCalledWith({ type: 'orderUp', alone: true });
  });

  it('says why in the prompt', () => {
    const rules = { ...STANDARD_RULES, dealerPartnerMustGoAlone: true };
    // Dealer 2: the human, across from the dealer, is its partner and bids second.
    const s = act(gameFromDeck(undefined, 2, rules), 3, { type: 'pass' });
    renderTurn(s);
    expect(screen.getByText(/order it up only by going alone/)).toBeInTheDocument();
  });
});

describe('the Rules chip', () => {
  it('names the game and opens a summary', async () => {
    const { rerender } = render(<RulesChip rules={STANDARD_RULES} />);
    expect(screen.getByRole('button', { name: 'Rules · to 10' })).toBeInTheDocument();
    rerender(<RulesChip rules={{ ...FARMER, targetScore: 5, stickTheDealer: true }} />);
    await userEvent.click(screen.getByRole('button', { name: 'House rules · to 5' }));
    const dialog = screen.getByRole('dialog', { name: 'Rules for this game' });
    expect(within(dialog).getByText(/first team to 5 points/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Stick the dealer/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Farmer’s hand/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists every house rule in play, and none that are not', async () => {
    render(
      <RulesChip
        rules={{
          ...STANDARD_RULES,
          lonerSweepPoints: 5,
          defendAlone: true,
          dealerPartnerMustGoAlone: true,
        }}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'House rules · to 10' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/takes all five scores 5/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Defending alone/)).toBeInTheDocument();
    expect(within(dialog).getByText(/only by going alone/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Farmer/)).toBeNull();
  });

  it('shows no loner rules with loners off', async () => {
    render(<RulesChip rules={{ ...STANDARD_RULES, lonersAllowed: false, defendAlone: true }} />);
    await userEvent.click(screen.getByRole('button', { name: 'House rules · to 10' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/No loners/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Defending alone/)).toBeNull();
  });

  it('sits on the table', () => {
    render(<TableScreen view={toPlayerView(gameFromDeck(), 0)} />);
    expect(screen.getByRole('button', { name: 'Rules · to 10' })).toBeInTheDocument();
  });
});

describe('house-rule settings (UI-1)', () => {
  function renderSettings(settings: Settings = DEFAULT_SETTINGS, activeRules?: RuleSet) {
    const onChange = vi.fn<(s: Settings) => void>();
    const utils = render(
      <SettingsScreen
        settings={settings}
        onChange={onChange}
        onDone={() => {}}
        activeRules={activeRules ?? null}
      />
    );
    return { ...utils, onChange };
  }
  const lastRules = (onChange: ReturnType<typeof vi.fn>) =>
    (onChange.mock.lastCall![0] as Settings).pendingRules;

  it('edits each rule', async () => {
    const { onChange } = renderSettings();
    await userEvent.selectOptions(screen.getByLabelText('Game to'), '7');
    expect(lastRules(onChange).targetScore).toBe(7);
    await userEvent.selectOptions(screen.getByLabelText('A loner who takes all five scores'), '5');
    expect(lastRules(onChange).lonerSweepPoints).toBe(5);
    for (const [label, rule] of [
      ['Stick the dealer', 'stickTheDealer'],
      ['Dealer’s partner must go alone', 'dealerPartnerMustGoAlone'],
      ['Defending alone', 'defendAlone'],
      ['Farmer’s hand', 'farmersHand'],
    ] as const) {
      await userEvent.click(screen.getByRole('checkbox', { name: new RegExp(label) }));
      expect(lastRules(onChange)[rule]).toBe(true);
    }
    await userEvent.click(screen.getByRole('checkbox', { name: /^Loners/ }));
    expect(lastRules(onChange).lonersAllowed).toBe(false);
  });

  it('disables the alone rules while loners are off', () => {
    renderSettings({
      ...DEFAULT_SETTINGS,
      pendingRules: { ...STANDARD_RULES, lonersAllowed: false },
    });
    expect(screen.getByRole('checkbox', { name: /Defending alone/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /must go alone/ })).toBeDisabled();
    expect(screen.getByLabelText('A loner who takes all five scores')).toBeDisabled();
    expect(screen.getAllByText(/Needs loners/)).toHaveLength(2);
  });

  it('goes back to standard rules', async () => {
    const { onChange } = renderSettings({
      ...DEFAULT_SETTINGS,
      pendingRules: { ...STANDARD_RULES, targetScore: 5 },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Back to standard rules' }));
    expect(lastRules(onChange)).toEqual(STANDARD_RULES);
  });

  it('offers no reset for standard rules', () => {
    renderSettings();
    expect(screen.queryByRole('button', { name: 'Back to standard rules' })).toBeNull();
  });

  it('says a game in progress keeps its rules', () => {
    const changed = { ...DEFAULT_SETTINGS, pendingRules: FARMER };
    const { unmount } = renderSettings(changed, STANDARD_RULES);
    expect(screen.getByText(/keeps the rules it started with/)).toBeInTheDocument();
    unmount();
    renderSettings(changed, FARMER);
    expect(screen.queryByText(/keeps the rules it started with/)).toBeNull();
  });

  it('chooses the deck (VP-3)', async () => {
    const { onChange } = renderSettings();
    expect(screen.getByRole('radio', { name: /Two-color deck/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Four-color deck/ }));
    expect((onChange.mock.lastCall![0] as Settings).deck).toBe('fourColor');
  });
});

describe('the four-color deck (VP-3)', () => {
  const ink = (container: HTMLElement) =>
    container.querySelector('[data-suit]')!.getAttribute('fill');

  it('draws every card from the chosen deck', () => {
    const { container } = render(
      <DeckContext.Provider value="fourColor">
        <Card card="AD" />
      </DeckContext.Provider>
    );
    expect(ink(container)).toBe('var(--suit-blue)');
  });

  it('lets a card ask for a deck of its own', () => {
    const { container } = render(
      <DeckContext.Provider value="fourColor">
        <Card card="AD" deck="standard" />
      </DeckContext.Provider>
    );
    expect(ink(container)).toBe('var(--suit-red)');
  });

  it('follows the setting across the app', async () => {
    const storage = memoryStorage();
    save(storage, SETTINGS_STORE, { ...DEFAULT_SETTINGS, deck: 'fourColor' });
    const { container } = render(<App seed={1} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const club = container.querySelector('.deck-preview [data-card="AC"]') as HTMLElement;
    expect(ink(club)).toBe('var(--suit-green)');
  });
});

describe('house rules reach the game', () => {
  it('starts the next game with the pending rules', async () => {
    const storage = memoryStorage();
    save(storage, SETTINGS_STORE, {
      ...DEFAULT_SETTINGS,
      pendingRules: { ...STANDARD_RULES, targetScore: 5, stickTheDealer: true },
    });
    render(<App seed={1} fast storage={storage} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('button', { name: 'House rules · to 5' })).toBeInTheDocument();
  });

  it('shows the pending rules on How to play', () => {
    render(
      <RulesScreen
        rules={{
          ...STANDARD_RULES,
          farmersHand: true,
          defendAlone: true,
          dealerPartnerMustGoAlone: true,
        }}
        onDone={() => {}}
      />
    );
    expect(screen.getByText('Farmer’s hand.')).toBeInTheDocument();
    expect(screen.getByText(/either defender may also choose to play alone/)).toBeInTheDocument();
    expect(screen.getByText(/only by going alone/)).toBeInTheDocument();
    expect(
      screen.getByText(/A lone defender who euchres the makers: 4 points/)
    ).toBeInTheDocument();
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../../src/audio/audioEngine';
import type { SoundId } from '../../src/assets/manifest';
import { currentActor, legalActions } from '../../src/engine/game';
import type { GameState } from '../../src/engine/state';
import { toPlayerView } from '../../src/engine/view';
import { load, memoryStorage } from '../../src/state/persistence';
import { SETTINGS_STORE } from '../../src/state/settings';
import { App } from '../../src/ui/App';
import type { Cue } from '../../src/ui/game/presenter';
import { SoundToggle } from '../../src/ui/SoundToggle';
import { TableScreen } from '../../src/ui/TableScreen';
import { act, gameFromDeck } from '../helpers/engine';

const bidding = gameFromDeck();
const ordered = act(bidding, 0, { type: 'orderUp', alone: false });
const playing = act(ordered, 3, { type: 'discard', card: 'AC' });

function next(s: GameState): GameState {
  const seat = currentActor(s)!;
  return act(s, seat, legalActions(s, seat)[0]!);
}

function roundTwo(): GameState {
  let s = bidding;
  for (const seat of [0, 1, 2, 3] as const) s = act(s, seat, { type: 'pass' });
  return s;
}

function table(state: GameState, cue: Cue | null) {
  return render(<TableScreen view={toPlayerView(state, 0)} cue={cue} />);
}

const animated = (className: string) => document.querySelectorAll(`.${className}`).length;

describe('table animation (SA-1)', () => {
  it('deals every hand and the kitty from the dealer', () => {
    table(bidding, { kind: 'deal', dealer: 3, handNumber: 1 });
    // 5 cards for each of four seats, three kitty cards and the upcard.
    expect(animated('fly-in')).toBe(24);
  });

  it('moves nothing without a cue', () => {
    table(bidding, null);
    expect(animated('fly-in')).toBe(0);
  });

  it('turns the upcard down', () => {
    table(roundTwo(), { kind: 'turnDown' });
    expect(document.querySelector('.upcard')).toHaveClass('flip');
  });

  it('sends the upcard to the dealer, and into the human’s hand when they deal', () => {
    table(ordered, { kind: 'pickup', dealer: 3, card: 'JD' });
    expect(document.querySelector('.center-flight .fly-out')).toHaveAttribute('data-card', 'JD');
    const dealerView = render(
      <TableScreen
        view={toPlayerView(ordered, 3)}
        cue={{ kind: 'pickup', dealer: 3, card: 'JD' }}
      />
    );
    const hand = within(dealerView.getAllByRole('region', { name: 'Your hand' })[1]!);
    expect(hand.getByRole('img', { name: 'Jack of diamonds' })).toHaveClass('fly-in');
  });

  it('lays the discard face down', () => {
    table(playing, { kind: 'discard', dealer: 3 });
    expect(document.querySelector('.center-flight .fly-in')).toHaveAccessibleName('Face-down card');
  });

  it('flies a played card in from its seat', () => {
    const s = next(playing);
    const { card } = s.hand.currentTrick!.plays[0]!;
    table(s, { kind: 'play', seat: 1, card });
    const trick = screen.getByLabelText('Trick');
    expect(within(trick).getByRole('img')).toHaveClass('fly-in');
  });

  it('sweeps the last trick to its winner as the next is led', () => {
    let s = playing;
    while (s.hand.tricks.length < 1) s = next(s);
    s = next(s);
    const lead = s.hand.currentTrick!.plays[0]!;
    table(s, { kind: 'play', seat: lead.seat, card: lead.card });
    expect(document.querySelector('.center-flight .trick')).toHaveClass('fly-out');
    // The sweep is decoration; the trick in progress is still the one named.
    expect(screen.getByLabelText('Trick')).toBeInTheDocument();
  });
});

describe('SoundToggle (SA-3)', () => {
  it('shows and flips the sound setting', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SoundToggle on onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Sound' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<SoundToggle on={false} onToggle={onToggle} />);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('title', 'Sound off');
  });
});

function fakeAudio() {
  const played: SoundId[] = [];
  const audio = {
    play: (id: SoundId) => played.push(id),
    setMuted: vi.fn(),
    unlockOn: vi.fn(() => () => {}),
  };
  return { played, audio: audio as unknown as AudioEngine & typeof audio };
}

describe('App sound (SA-2, SA-3)', () => {
  it('plays the game’s sounds, and mutes from the table, persistently', async () => {
    const storage = memoryStorage();
    const { played, audio } = fakeAudio();
    render(<App seed={3} fast storage={storage} audio={audio} />);
    expect(audio.unlockOn).toHaveBeenCalledWith(window);
    expect(audio.setMuted).toHaveBeenLastCalledWith(false);

    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await waitFor(() => expect(played).toContain('shuffle'));

    await userEvent.click(screen.getByRole('button', { name: 'Sound' }));
    expect(audio.setMuted).toHaveBeenLastCalledWith(true);
    expect(load(storage, SETTINGS_STORE)?.soundOn).toBe(false);
    expect(screen.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('animates a new game when motion is on', async () => {
    render(<App seed={3} fast motion storage={memoryStorage()} />);
    await userEvent.click(screen.getByRole('button', { name: 'New game' }));
    await waitFor(() => expect(animated('fly-in')).toBe(24));
  });
});

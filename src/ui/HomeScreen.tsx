// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { useState } from 'react';
import { Dialog } from './Dialog';

interface HomeScreenProps {
  /** A game is saved and can be continued. */
  readonly canContinue: boolean;
  readonly onContinue: () => void;
  readonly onNewGame: () => void;
  readonly onSettings: () => void;
  /** The reading screens: how to play, the partner's conventions, stats and about. */
  readonly onOpen?: (screen: InfoScreen) => void;
}

export type InfoScreen = 'rules' | 'conventions' | 'stats' | 'about';

const LINKS: readonly { screen: InfoScreen; label: string }[] = [
  { screen: 'rules', label: 'How to play' },
  { screen: 'conventions', label: 'How your partner plays' },
  { screen: 'stats', label: 'Stats' },
  { screen: 'about', label: 'About' },
];

/**
 * The first screen — GF-1: Continue when a game is in progress, and one
 * tap to a new game with the last-used settings. Starting over while a
 * game is saved asks first (GF-8).
 */
export function HomeScreen({
  canContinue,
  onContinue,
  onNewGame,
  onSettings,
  onOpen = () => {},
}: HomeScreenProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="home" aria-label="Home">
      <div className="home-hero">
        <h1 className="home-title">Left Bauer</h1>
      </div>
      <div className="home-actions">
        <div className="home-primary">
          {canContinue && (
            <button
              type="button"
              className="button button-primary home-button"
              onClick={onContinue}
            >
              Continue
            </button>
          )}
          <button
            type="button"
            className={`button home-button${canContinue ? '' : ' button-primary'}`}
            onClick={canContinue ? () => setConfirming(true) : onNewGame}
          >
            New game
          </button>
        </div>
        {/* Settings is a destination like the reading screens, so it sits with them. */}
        <nav className="home-links" aria-label="More">
          <button type="button" className="button" onClick={onSettings}>
            Settings
          </button>
          {LINKS.map(({ screen, label }) => (
            <button key={screen} type="button" className="button" onClick={() => onOpen(screen)}>
              {label}
            </button>
          ))}
        </nav>
      </div>
      {confirming && (
        <Dialog
          title="Start a new game?"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={onNewGame}>
                New game
              </button>
            </>
          }
        >
          <p>The game in progress will be lost.</p>
        </Dialog>
      )}
    </main>
  );
}

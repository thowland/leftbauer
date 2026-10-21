// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clear, type StorageLike } from '../state/persistence';
import { GAME_STORE } from '../state/savedGame';

interface ErrorBoundaryProps {
  readonly storage: StorageLike;
  readonly children: ReactNode;
  /** Start the app again; a page reload in the browser. */
  readonly onReload?: () => void;
}

/**
 * The last line of defense: a render failure shows a way out instead of a
 * blank page. A bad saved game would fail again on every Continue, so the
 * player can clear it; settings and stats are kept.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Left Bauer could not show the page', error, info.componentStack);
  }

  private reload = () => (this.props.onReload ?? (() => window.location.reload()))();

  private clearAndReload = () => {
    clear(this.props.storage, GAME_STORE);
    this.reload();
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="home" aria-label="Something went wrong">
        <div className="home-hero">
          <h1 className="home-title">Left Bauer</h1>
        </div>
        <p>Something went wrong and the game could not be shown.</p>
        <div className="home-actions">
          <button type="button" className="button button-primary home-button" onClick={this.reload}>
            Reload
          </button>
          <button type="button" className="button home-button" onClick={this.clearAndReload}>
            Clear the saved game and reload
          </button>
        </div>
        <p className="settings-detail">Clearing the saved game keeps your settings and stats.</p>
      </main>
    );
  }
}

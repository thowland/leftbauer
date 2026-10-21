import { useId, useState, type ReactNode } from 'react';
import type { RuleSet } from '../engine/rules';
import { Dialog } from './Dialog';
import { RulesDialog, rulesLabel } from './RulesDialog';
import { SoundToggle } from './SoundToggle';

interface GameMenuProps {
  readonly onClose: () => void;
  /** The game's own rules, for the Rules item. */
  readonly rules: RuleSet;
  readonly soundOn: boolean;
  readonly onToggleSound: () => void;
  readonly onRules: () => void;
  readonly onSettings: () => void;
  readonly onHome: () => void;
  readonly onNewGame: () => void;
  readonly onConcede: () => void;
}

type Showing = 'menu' | 'rules' | 'newGame' | 'concede';

/** A titled group of menu items. */
function MenuGroup({
  title,
  danger = false,
  children,
}: {
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div
      className={`menu-group${danger ? ' menu-group-danger' : ''}`}
      role="group"
      aria-labelledby={id}
    >
      <h3 id={id} className="menu-heading">
        {title}
      </h3>
      <div className="menu-list">{children}</div>
    </div>
  );
}

/**
 * The in-game menu (GF-8), grouped: this game, leaving it, and ending it.
 * Leaving for home or settings keeps the game to continue later; a new
 * game or conceding abandons it, after a confirmation. The safe choice
 * always takes the focus, and Escape goes back a step.
 */
export function GameMenu({
  onClose,
  rules,
  soundOn,
  onToggleSound,
  onRules,
  onSettings,
  onHome,
  onNewGame,
  onConcede,
}: GameMenuProps) {
  const [showing, setShowing] = useState<Showing>('menu');
  const back = () => setShowing('menu');

  if (showing === 'rules') return <RulesDialog rules={rules} onClose={back} />;

  if (showing !== 'menu') {
    const newGame = showing === 'newGame';
    return (
      <Dialog
        key={showing}
        title={newGame ? 'Start a new game?' : 'Concede this game?'}
        onClose={back}
        actions={
          <>
            <button type="button" className="button" onClick={back}>
              Keep playing
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={newGame ? onNewGame : onConcede}
            >
              {newGame ? 'New game' : 'Concede'}
            </button>
          </>
        }
      >
        <p>The game in progress will be lost.</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Menu"
      onClose={onClose}
      actions={
        <button type="button" className="button button-primary" onClick={onClose}>
          Back to the game
        </button>
      }
    >
      <div className="menu-groups">
        <MenuGroup title="This game">
          {/* Shown only on portrait phones, where the score bar has no room for it. */}
          <SoundToggle on={soundOn} onToggle={onToggleSound} variant="menu" />
          <button type="button" className="button" onClick={() => setShowing('rules')}>
            {rulesLabel(rules)}
          </button>
          <button type="button" className="button" onClick={onRules}>
            How to play
          </button>
        </MenuGroup>
        <MenuGroup title="Leave">
          <button type="button" className="button" onClick={onSettings}>
            Settings
          </button>
          <button type="button" className="button" onClick={onHome}>
            Home
          </button>
          <p className="menu-note">Your game is saved when you leave it.</p>
        </MenuGroup>
        <MenuGroup title="End the game" danger>
          <button type="button" className="button" onClick={() => setShowing('newGame')}>
            New game
          </button>
          <button type="button" className="button" onClick={() => setShowing('concede')}>
            Concede
          </button>
        </MenuGroup>
      </div>
    </Dialog>
  );
}

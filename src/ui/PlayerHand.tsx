import { useState } from 'react';
import { isLeftBower, isRightBower, type CardId, type Suit } from '../engine/cards';
import { cardLabel } from '../assets/manifest';
import { Card } from './Card';

interface PlayerHandProps {
  /** Already sorted for display. */
  readonly cards: readonly CardId[];
  readonly trump: Suit | null;
  /** Cards the human may choose now; empty when it is not their turn to choose a card. */
  readonly choosable: readonly CardId[];
  readonly onChoose: (card: CardId) => void;
}

function bowerOf(card: CardId, trump: Suit | null): 'Right bower' | 'Left bower' | null {
  if (trump === null) return null;
  if (isRightBower(card, trump)) return 'Right bower';
  if (isLeftBower(card, trump)) return 'Left bower';
  return null;
}

/**
 * The human's hand — GF-2, UI-4. When a card must be chosen (to play or
 * discard), legal cards become buttons: tap once to raise, tap the raised
 * card again to commit. Illegal cards are dimmed. Bowers carry a badge.
 */
export function PlayerHand({ cards, trump, choosable, onChoose }: PlayerHandProps) {
  const [raised, setRaised] = useState<CardId | null>(null);
  const choosing = choosable.length > 0;
  const raisedCard = raised !== null && choosable.includes(raised) ? raised : null;

  return (
    <div className="hand">
      {cards.map((card) => {
        const bower = bowerOf(card, trump);
        const badge = bower && <span className="bower-badge">{bower.split(' ')[0]}</span>;
        if (choosing && choosable.includes(card)) {
          const isRaised = raisedCard === card;
          return (
            <button
              key={card}
              type="button"
              className={`hand-slot hand-choice${isRaised ? ' raised' : ''}`}
              aria-label={bower ? `${cardLabel(card)}, ${bower.toLowerCase()}` : cardLabel(card)}
              aria-pressed={isRaised}
              onClick={() => {
                if (isRaised) {
                  setRaised(null);
                  onChoose(card);
                } else {
                  setRaised(card);
                }
              }}
            >
              {badge}
              <Card card={card} className="hand-card" />
            </button>
          );
        }
        return (
          <div
            key={card}
            className={`hand-slot${choosing ? ' card-illegal' : ''}`}
            aria-disabled={choosing || undefined}
          >
            {badge}
            <Card card={card} className="hand-card" />
          </div>
        );
      })}
    </div>
  );
}

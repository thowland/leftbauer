import { useState, type CSSProperties } from 'react';
import { isLeftBower, isRightBower, type CardId, type Suit } from '../engine/cards';
import { cardLabel } from '../assets/manifest';
import { Card } from './Card';
import type { CardMotion } from './motion';

interface PlayerHandProps {
  /** Already sorted for display. */
  readonly cards: readonly CardId[];
  readonly trump: Suit | null;
  /** Cards the human may choose now; empty when it is not their turn to choose a card. */
  readonly choosable: readonly CardId[];
  readonly onChoose: (card: CardId) => void;
  /** Play on the first tap instead of raising the card (GF-2). */
  readonly oneTap?: boolean;
  /** How each card is animated for the current cue (SA-1). */
  readonly motionFor?: (card: CardId, index: number) => CardMotion | undefined;
  /** The coach's suggested cards (CO-1). */
  readonly hinted?: readonly CardId[];
  /**
   * A farmer's hand (RU-15): every card toggles in and out of the three to
   * swap, instead of being played.
   */
  readonly picking?: {
    readonly picked: readonly CardId[];
    readonly onToggle: (card: CardId) => void;
  } | null;
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
 * card again to commit (or commit on the first tap with one-tap play).
 * Illegal cards are dimmed. Bowers carry a badge. With a farmer's hand,
 * tapping a card picks it for the swap instead.
 */
export function PlayerHand({
  cards,
  trump,
  choosable,
  onChoose,
  oneTap = false,
  motionFor = () => undefined,
  hinted = [],
  picking = null,
}: PlayerHandProps) {
  const [raised, setRaised] = useState<CardId | null>(null);
  const choosing = choosable.length > 0;
  const raisedCard = raised !== null && choosable.includes(raised) ? raised : null;
  const hint = (card: CardId) => (hinted.includes(card) ? ' hinted' : '');

  return (
    <div className="hand" style={{ '--count': cards.length } as CSSProperties}>
      {cards.map((card, index) => {
        const bower = bowerOf(card, trump);
        const badge = bower && <span className="bower-badge">{bower.split(' ')[0]}</span>;
        const label = bower ? `${cardLabel(card)}, ${bower.toLowerCase()}` : cardLabel(card);
        if (picking !== null) {
          const isPicked = picking.picked.includes(card);
          return (
            <button
              key={card}
              type="button"
              className={`hand-slot hand-choice${isPicked ? ' raised' : ''}${hint(card)}`}
              aria-label={label}
              aria-pressed={isPicked}
              onClick={() => picking.onToggle(card)}
            >
              <Card card={card} className="hand-card" motion={motionFor(card, index)} />
            </button>
          );
        }
        if (choosing && choosable.includes(card)) {
          const isRaised = raisedCard === card;
          return (
            <button
              key={card}
              type="button"
              className={`hand-slot hand-choice${isRaised ? ' raised' : ''}${hint(card)}`}
              aria-label={label}
              aria-pressed={isRaised}
              onClick={() => {
                if (isRaised || oneTap) {
                  setRaised(null);
                  onChoose(card);
                } else {
                  setRaised(card);
                }
              }}
            >
              {badge}
              <Card card={card} className="hand-card" motion={motionFor(card, index)} />
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
            <Card card={card} className="hand-card" motion={motionFor(card, index)} />
          </div>
        );
      })}
    </div>
  );
}

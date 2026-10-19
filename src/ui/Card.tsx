import { useId } from 'react';
import { rankOf, suitOf, type CardId, type Rank, type Suit } from '../engine/cards';
import { cardLabel, RANK_LABELS, suitColor, type DeckVariant } from '../assets/manifest';
import { SuitIcon } from './SuitIcon';

/** Card geometry in SVG user units (poker proportions, 2.5 × 3.5). */
const W = 250;
const H = 350;

type Pip = readonly [x: number, y: number];

const COLUMN_L = 72;
const COLUMN_R = 178;
const CENTER_X = 125;
const ROWS = [78, 136, 214, 272] as const;

/** Pip layouts for the number cards; inverted below the center line. */
const PIPS: Partial<Record<Rank, readonly Pip[]>> = {
  '9': [...columnPips(), [CENTER_X, 175]],
  T: [...columnPips(), [CENTER_X, 107], [CENTER_X, 243]],
};

function columnPips(): Pip[] {
  return ROWS.flatMap((y) => [[COLUMN_L, y] as Pip, [COLUMN_R, y] as Pip]);
}

interface CardProps {
  /** The card to show, or `null` for a face-down card. */
  readonly card: CardId | null;
  readonly deck?: DeckVariant;
  readonly className?: string;
}

export function Card({ card, deck = 'standard', className }: CardProps) {
  const classes = ['card', className].filter(Boolean).join(' ');
  if (card === null) {
    return (
      <svg className={classes} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Face-down card">
        <CardBack />
      </svg>
    );
  }
  return (
    <svg
      className={classes}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={cardLabel(card)}
      data-card={card}
    >
      <CardFace card={card} deck={deck} />
    </svg>
  );
}

function CardFace({ card, deck }: { card: CardId; deck: DeckVariant }) {
  const rank = rankOf(card);
  const suit = suitOf(card);
  const color = suitColor(suit, deck);
  const pips = PIPS[rank];
  return (
    <g>
      <rect
        x="3"
        y="3"
        width={W - 6}
        height={H - 6}
        rx="18"
        fill="var(--card-stock)"
        stroke="var(--card-edge)"
        strokeWidth="4"
      />
      <CornerIndex rank={rank} color={color} />
      <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
        <CornerIndex rank={rank} color={color} />
      </g>
      <SuitIcon suit={suit} x={30} y={92} size={34} color={color} />
      <SuitIcon suit={suit} x={W - 30} y={H - 92} size={34} color={color} inverted />
      {pips ? (
        pips.map(([x, y]) => (
          <SuitIcon
            key={`${x}-${y}`}
            suit={suit}
            x={x}
            y={y}
            size={50}
            color={color}
            inverted={y > H / 2}
          />
        ))
      ) : rank === 'A' ? (
        <SuitIcon suit={suit} x={CENTER_X} y={H / 2} size={120} color={color} />
      ) : (
        <CourtPanel rank={rank} suit={suit} color={color} />
      )}
    </g>
  );
}

function CornerIndex({ rank, color }: { rank: Rank; color: string }) {
  return (
    <text
      x="30"
      y="56"
      textAnchor="middle"
      fontFamily="Georgia, 'Times New Roman', serif"
      fontWeight="700"
      fontSize={rank === 'T' ? 40 : 48}
      fill={color}
    >
      {RANK_LABELS[rank]}
    </text>
  );
}

/** Jacks, queens and kings: a framed panel with the rank and suit. */
function CourtPanel({ rank, suit, color }: { rank: Rank; suit: Suit; color: string }) {
  return (
    <g>
      <rect
        x="62"
        y="64"
        width="126"
        height="222"
        rx="10"
        fill="none"
        stroke={color}
        strokeWidth="4"
        opacity="0.75"
      />
      <text
        x={CENTER_X}
        y="170"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="92"
        fill={color}
      >
        {RANK_LABELS[rank]}
      </text>
      <SuitIcon suit={suit} x={CENTER_X} y={230} size={58} color={color} />
    </g>
  );
}

function CardBack() {
  const patternId = `lb-back-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <g>
      <defs>
        <pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse">
          <path
            d="M11 0 L22 11 L11 22 L0 11 Z"
            fill="none"
            stroke="var(--card-back-trim)"
            strokeWidth="1.5"
            opacity="0.55"
          />
        </pattern>
      </defs>
      <rect
        x="3"
        y="3"
        width={W - 6}
        height={H - 6}
        rx="18"
        fill="var(--card-back)"
        stroke="var(--card-edge)"
        strokeWidth="4"
      />
      <rect
        x="20"
        y="20"
        width={W - 40}
        height={H - 40}
        rx="10"
        fill={`url(#${patternId})`}
        stroke="var(--card-back-trim)"
        strokeWidth="3"
      />
      <circle
        cx={W / 2}
        cy={H / 2}
        r="44"
        fill="var(--card-back)"
        stroke="var(--card-back-trim)"
        strokeWidth="3"
      />
      <text
        x={W / 2}
        y={H / 2 + 15}
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="42"
        fill="var(--card-back-trim)"
      >
        LB
      </text>
    </g>
  );
}

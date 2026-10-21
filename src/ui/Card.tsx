// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { useContext, useId, type ReactNode } from 'react';
import { rankOf, suitOf, type CardId, type Rank, type Suit } from '../engine/cards';
import { cardLabel, RANK_LABELS, suitColor, type DeckVariant } from '../assets/manifest';
import { DeckContext } from './deck';
import type { CardMotion } from './motion';
import { SuitIcon } from './SuitIcon';

/** Card geometry in SVG user units (poker proportions, 2.5 × 3.5). */
const W = 250;
const H = 350;

type Pip = readonly [x: number, y: number];

const COLUMN_L = 80;
const COLUMN_R = 170;
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
  /** The deck to draw from; the app's chosen deck when omitted. */
  readonly deck?: DeckVariant;
  readonly className?: string;
  /** An animation from the Presenter's current cue (SA-1). */
  readonly motion?: CardMotion | undefined;
}

export function Card({ card, deck: chosen, className, motion }: CardProps) {
  const appDeck = useContext(DeckContext);
  const deck = chosen ?? appDeck;
  const classes = ['card', className, motion?.className].filter(Boolean).join(' ');
  const style = motion?.style;
  if (card === null) {
    return (
      <svg
        className={classes}
        style={style}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Face-down card"
      >
        <CardBack />
      </svg>
    );
  }
  return (
    <svg
      className={classes}
      style={style}
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
            size={46}
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

/**
 * Each rank as strokes in a box 56 units tall, with its width. Ranks are
 * drawn, not set in a font, so they show on every device: some phones
 * failed to paint SVG text in the card corners.
 */
const GLYPHS: Record<Rank, { readonly d: string; readonly w: number }> = {
  '9': {
    d: 'M7 21 A13 15 0 1 1 33 21 A13 15 0 1 1 7 21 M33 21 V34 C33 46 27 52 18 52 C12 52 8 49 6 45',
    w: 40,
  },
  T: {
    d: 'M5 12 L13 4 V52 M26 28 C26 12 31 4 38 4 C45 4 50 12 50 28 C50 44 45 52 38 52 C31 52 26 44 26 28 Z',
    w: 55,
  },
  J: { d: 'M20 4 H36 M30 4 V38 C30 48 25 52 18 52 C11 52 7 48 6 42', w: 40 },
  Q: {
    d: 'M20 4 C9 4 4 14 4 28 C4 42 9 52 20 52 C31 52 36 42 36 28 C36 14 31 4 20 4 Z M24 40 L37 55',
    w: 40,
  },
  K: { d: 'M8 4 V52 M32 4 L9 32 M17 24 L33 52', w: 40 },
  A: { d: 'M6 52 L20 4 L34 52 M11 36 H29', w: 40 },
};

/** A rank, centred on `cx`, from `top` down `height` units. */
function RankGlyph(props: { rank: Rank; cx: number; top: number; height: number; color: string }) {
  const { rank, cx, top, height, color } = props;
  const glyph = GLYPHS[rank];
  const scale = height / 56;
  return (
    <path
      data-rank={RANK_LABELS[rank]}
      d={glyph.d}
      transform={`translate(${cx - (glyph.w * scale) / 2} ${top}) scale(${scale})`}
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function CornerIndex({ rank, color }: { rank: Rank; color: string }) {
  return <RankGlyph rank={rank} cx={30} top={16} height={42} color={color} />;
}

/**
 * Each court card's emblem, drawn in a 100 × 100 box: a crown for the
 * king, a coronet for the queen and, for the jack, the Bauer's hat (the
 * farmer the left bower is named for). Bands are cut out in card stock.
 */
const EMBLEMS: Partial<Record<Rank, (color: string) => ReactNode>> = {
  K: (color) => (
    <>
      <path d="M12 78 L12 40 L31 58 L50 24 L69 58 L88 40 L88 78 Z" fill={color} />
      <rect x="12" y="78" width="76" height="12" rx="2" fill={color} />
      <rect x="18" y="81" width="64" height="5" rx="2" fill="var(--card-stock)" />
      {[12, 50, 88].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 22 : 38} r="6" fill={color} />
      ))}
    </>
  ),
  Q: (color) => (
    <>
      <path d="M16 80 Q14 56 24 50 L36 64 L50 40 L64 64 L76 50 Q86 56 84 80 Z" fill={color} />
      <rect x="16" y="80" width="68" height="10" rx="2" fill={color} />
      <circle cx="50" cy="66" r="6" fill="var(--card-stock)" />
      {[24, 50, 76].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 36 : 46} r="5.5" fill={color} />
      ))}
    </>
  ),
  J: (color) => (
    <>
      <path d="M66 50 Q84 24 94 8 Q88 32 72 54 Z" fill={color} opacity="0.8" />
      <path d="M28 76 Q28 40 50 38 Q72 40 72 76 Z" fill={color} />
      <rect x="29" y="64" width="42" height="7" fill="var(--card-stock)" />
      <ellipse cx="50" cy="78" rx="44" ry="9" fill={color} />
    </>
  ),
};

/** Jacks, queens and kings: a tinted, double-framed panel with an emblem, rank and suit. */
function CourtPanel({ rank, suit, color }: { rank: Rank; suit: Suit; color: string }) {
  return (
    <g>
      <rect x="62" y="64" width="126" height="222" rx="10" fill={color} opacity="0.07" />
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
      <rect
        x="70"
        y="72"
        width="110"
        height="206"
        rx="6"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.45"
      />
      <g transform="translate(83 78) scale(0.84)">{EMBLEMS[rank]?.(color)}</g>
      <RankGlyph rank={rank} cx={CENTER_X} top={170} height={52} color={color} />
      <SuitIcon suit={suit} x={CENTER_X} y={254} size={36} color={color} />
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

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import type { Suit } from '../engine/cards';

/**
 * Suit symbols drawn as SVG paths in a 100×100 box. Paths rather than
 * Unicode glyphs, because iOS renders ♥ and ♦ as color emoji.
 */
function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case 'H':
      return (
        <path d="M50 90 C20 68 4 50 4 31 C4 15 16 5 29 5 C38 5 46 10 50 20 C54 10 62 5 71 5 C84 5 96 15 96 31 C96 50 80 68 50 90 Z" />
      );
    case 'D':
      return <path d="M50 3 L87 50 L50 97 L13 50 Z" />;
    case 'S':
      return (
        <path d="M50 4 C40 22 6 40 6 62 C6 76 17 85 29 85 C38 85 45 80 48 74 C47 84 43 91 35 96 L65 96 C57 91 53 84 52 74 C55 80 62 85 71 85 C83 85 94 76 94 62 C94 40 60 22 50 4 Z" />
      );
    case 'C':
      return (
        <g>
          <circle cx="50" cy="27" r="20" />
          <circle cx="26" cy="58" r="20" />
          <circle cx="74" cy="58" r="20" />
          <circle cx="50" cy="52" r="11" />
          <path d="M46 58 C45 78 40 88 32 96 L68 96 C60 88 55 78 54 58 Z" />
        </g>
      );
  }
}

interface SuitIconProps {
  readonly suit: Suit;
  /** Center of the icon in the parent's user units. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: string;
  /** Draw upside down, as on the lower half of a card. */
  readonly inverted?: boolean;
}

export function SuitIcon({ suit, x, y, size, color, inverted = false }: SuitIconProps) {
  const scale = size / 100;
  const flip = inverted ? ' rotate(180 50 50)' : '';
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})${flip}`}
      fill={color}
      data-suit={suit}
    >
      <SuitShape suit={suit} />
    </g>
  );
}

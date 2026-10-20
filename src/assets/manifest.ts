/**
 * Asset manifest — Technical Spec §9.5.
 *
 * Components ask the manifest how to present a card rather than
 * hard-coding art. v1 card faces are drawn in code from this data, so
 * replacing them with an illustrated deck later is a manifest change.
 *
 * Pure module: plain data and lookups.
 */

import { rankOf, suitOf, type CardId, type Rank, type Suit } from '../engine/cards';

export type DeckVariant = 'standard' | 'fourColor';

export const SUIT_NAMES: Record<Suit, string> = {
  C: 'clubs',
  D: 'diamonds',
  H: 'hearts',
  S: 'spades',
};

export const RANK_NAMES: Record<Rank, string> = {
  '9': 'Nine',
  T: 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
  A: 'Ace',
};

/** The index printed in a card's corner. */
export const RANK_LABELS: Record<Rank, string> = {
  '9': '9',
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

/** CSS custom property holding each suit's ink, per deck variant (VP-3). */
const SUIT_COLOR_TOKENS: Record<DeckVariant, Record<Suit, string>> = {
  standard: {
    C: '--suit-black',
    S: '--suit-black',
    D: '--suit-red',
    H: '--suit-red',
  },
  fourColor: {
    C: '--suit-green',
    S: '--suit-black',
    D: '--suit-blue',
    H: '--suit-red',
  },
};

export function suitColor(suit: Suit, variant: DeckVariant): string {
  return `var(${SUIT_COLOR_TOKENS[variant][suit]})`;
}

/** The accessible name of a card, e.g. "Jack of hearts". */
export function cardLabel(card: CardId): string {
  return `${RANK_NAMES[rankOf(card)]} of ${SUIT_NAMES[suitOf(card)]}`;
}

/** Every sound the table can make (SA-2). */
export type SoundId = 'shuffle' | 'deal' | 'card' | 'sweep' | 'trump' | 'euchre' | 'flourish';

export interface SoundAsset {
  /** Path under the site root (`public/`). */
  readonly file: string;
  /** Playback gain, 0 to 1, balancing the sounds against each other. */
  readonly gain: number;
}

export const SOUNDS: Record<SoundId, SoundAsset> = {
  shuffle: { file: 'sounds/shuffle.mp3', gain: 0.7 },
  deal: { file: 'sounds/deal.mp3', gain: 0.6 },
  card: { file: 'sounds/card.mp3', gain: 0.8 },
  sweep: { file: 'sounds/sweep.mp3', gain: 0.6 },
  trump: { file: 'sounds/trump.mp3', gain: 0.5 },
  euchre: { file: 'sounds/euchre.mp3', gain: 0.6 },
  flourish: { file: 'sounds/flourish.mp3', gain: 0.6 },
};

export interface AssetCredit {
  readonly work: string;
  readonly author: string;
  readonly url: string;
  readonly license: string;
  readonly licenseUrl: string;
  /** What the project uses it for. */
  readonly usedFor: string;
}

/** Shown in About (Sprint 8); mirrored in CREDITS.md (VP-2, ADR-0005). */
export const CREDITS: readonly AssetCredit[] = [
  {
    work: 'Casino Audio',
    author: 'Kenney Vleugels (kenney.nl)',
    url: 'https://kenney.nl/assets/casino-audio',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    usedFor: 'Shuffle, deal, card and trick sweep sounds',
  },
  {
    work: 'Music Jingles',
    author: 'Kenney Vleugels (kenney.nl)',
    url: 'https://kenney.nl/assets/music-jingles',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    usedFor: 'Trump call, euchre sting and loner or march flourish',
  },
];

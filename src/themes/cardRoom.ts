/**
 * The v1 card-room theme — VP-4.
 *
 * Felt, worn card stock and brass. Themes are plain data: a map of CSS
 * custom properties applied at the app root, so more themes can be
 * added without touching components.
 */

export interface Theme {
  readonly id: string;
  readonly name: string;
  readonly vars: Readonly<Record<`--${string}`, string>>;
}

export const CARD_ROOM: Theme = {
  id: 'card-room',
  name: 'Card room',
  vars: {
    '--felt': '#1d3b2a',
    '--felt-light': '#2a5139',
    '--felt-shadow': '#122619',
    '--ink-on-felt': '#efe6cf',
    '--ink-muted': '#b9b097',
    '--brass': '#c9a45c',
    '--card-stock': '#f6efdc',
    '--card-edge': '#cbbf9f',
    '--card-back': '#6e2a2a',
    '--card-back-trim': '#d9b878',
    '--suit-black': '#201b17',
    '--suit-red': '#ad2f2a',
    '--suit-blue': '#255a9b',
    '--suit-green': '#2d7a3e',
    '--persona-partner': '#c9a45c',
    '--persona-soopy': '#7f9fb8',
    '--persona-shrubs': '#8fae6b',
    '--persona-rusty': '#c4703f',
    '--persona-smooth': '#a58bc2',
  },
};

/**
 * Player actions — Technical Spec §4.4.
 *
 * Every action, human or bot, is one of these small serializable values.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { CardId, Suit } from './cards';

export type BidAction =
  | { readonly type: 'pass' }
  /** Round one, any seat. The dealer's "pick it up" is the same action. */
  | { readonly type: 'orderUp'; readonly alone: boolean }
  /** Round two: name any suit except the turned-down one. */
  | { readonly type: 'callTrump'; readonly suit: Suit; readonly alone: boolean };

export type Action =
  | BidAction
  /** A farmer's hand (RU-15): the three cards to swap for the kitty, or none to keep the hand. */
  | { readonly type: 'farmerExchange'; readonly cards: readonly CardId[] }
  | { readonly type: 'discard'; readonly card: CardId }
  /** A defender's choice whether to play alone against the makers (RU-13). */
  | { readonly type: 'defendAlone'; readonly accept: boolean }
  | { readonly type: 'play'; readonly card: CardId };

/** A canonical string for an action, used for equality and React keys. */
export function actionKey(action: Action): string {
  switch (action.type) {
    case 'pass':
      return 'pass';
    case 'orderUp':
      return `orderUp${action.alone ? ':alone' : ''}`;
    case 'callTrump':
      return `callTrump:${action.suit}${action.alone ? ':alone' : ''}`;
    case 'farmerExchange':
      return `farmerExchange:${[...action.cards].sort().join(',')}`;
    case 'discard':
      return `discard:${action.card}`;
    case 'defendAlone':
      return `defendAlone:${action.accept ? 'yes' : 'no'}`;
    case 'play':
      return `play:${action.card}`;
  }
}

export function sameAction(a: Action, b: Action): boolean {
  return actionKey(a) === actionKey(b);
}

export function isBidAction(action: Action): action is BidAction {
  return action.type === 'pass' || action.type === 'orderUp' || action.type === 'callTrump';
}

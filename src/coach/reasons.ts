/**
 * The words for every reason a bot gives — CO-2; Technical Spec §7.
 *
 * All player-facing strategy wording lives here, so the bots carry only
 * codes and a wording change never touches strategy.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Reason, ReasonCode } from '../bots/bot';
import { SUIT_NAMES_PLAIN } from './words';
import type { PlayerView } from '../engine/view';

type Render = (reason: Reason, view: PlayerView) => string;

const trumpName = (view: PlayerView) =>
  view.contract === null ? 'trump' : SUIT_NAMES_PLAIN[view.contract.trump];

/** One line each, written as advice to the player holding the cards. */
export const REASON_TEXT: Record<ReasonCode, Render> = {
  'bid-strong-hand': () =>
    'Make it trump: with your partner’s usual help, this hand should take three tricks.',
  'bid-call-next': () =>
    'Call “next”: left of the dealer, the suit of the same color as the turned-down card is a good bet.',
  'bid-best-suit': () =>
    'Call your strongest suit: with your partner’s help it should take three tricks.',
  'bid-stuck': () => 'The dealer is stuck and must call: name the strongest suit.',
  'bid-pass-weak': () => 'Pass: even with your partner’s help, this hand is short of three tricks.',
  'bid-forced-alone': () =>
    'Your partner deals, so you may order it up only by going alone: do it only with a hand that can win alone.',
  'loner-strong': () => 'Go alone: this hand can take the tricks without your partner.',
  'loner-not-strong-enough': () => 'Play with your partner: this hand needs the help.',
  'defend-alone-strong': () =>
    'Defend alone: this hand can stop the makers by itself, and a lone euchre scores 4.',
  'defend-alone-not-strong-enough': () =>
    'Defend with your partner: stopping the makers will take you both.',
  'farmer-swap': () =>
    'Swap your three lowest cards: almost any three cards beat a hand of 9s and 10s.',
  'farmer-keep': () => 'Keep your hand.',
  'discard-make-void': () => 'Discard a lone card to empty that suit, so you can trump it later.',
  'discard-lowest': () => 'Discard your lowest card, and keep your trump.',
  'lead-boss-trump': (_r, view) =>
    `Lead your highest ${trumpName(view)}: as the maker, draw out the other side’s trump.`,
  'lead-trump-to-partner': () => 'Lead trump: your partner called it.',
  'lead-off-ace': () => 'Cash an off-suit ace before anyone can trump it.',
  'lead-short-suit': () => 'Lead from your shortest suit, to empty it so you can trump later.',
  'lead-lowest': () => 'Lead low, and keep your winners for later.',
  'follow-partner-winning': () => 'Your partner is winning this trick: play low.',
  'follow-save-trump': () => 'Save your trump: your partner may still win this trick.',
  'follow-win-cheaply': () => 'Take the trick with your cheapest winning card.',
  'follow-throw-low': () => 'You can’t win this trick: throw your cheapest card.',
  'play-simulated': (reason) =>
    `Best on average over ${reason.params?.samples ?? 'many'} ways the hidden cards could lie.`,
};

export function renderReason(reason: Reason, view: PlayerView): string {
  return REASON_TEXT[reason.code](reason, view);
}

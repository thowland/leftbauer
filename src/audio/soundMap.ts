/**
 * Which sounds an event makes — SA-2; Technical Spec §9.3.
 *
 * Pure function: no audio, no DOM, so every mapping is unit-tested.
 */

import type { GameEvent } from '../engine/events';
import type { GameState } from '../engine/state';
import type { SoundId } from '../assets/manifest';

/**
 * The sounds for one event, given the state after it. Leading a new
 * trick also sweeps the last one off the table, so it makes both sounds.
 */
export function soundsFor(event: GameEvent, state: GameState): readonly SoundId[] {
  switch (event.type) {
    case 'handDealt':
      return ['shuffle'];
    case 'trumpSet':
      return ['trump'];
    case 'upcardPickedUp':
    case 'upcardTurnedDown':
    case 'dealerDiscarded':
    case 'farmerSwapped':
      return ['deal'];
    case 'cardPlayed': {
      const leading = state.hand.currentTrick?.plays.length === 1;
      return leading && event.trickIndex > 0 ? ['sweep', 'card'] : ['card'];
    }
    case 'handScored':
      if (event.result.kind !== 'scored') return [];
      switch (event.result.outcome) {
        case 'euchred':
        case 'euchredAlone':
        case 'euchredByLoneDefender':
          return ['euchre'];
        case 'march':
        case 'lonerSweep':
          return ['flourish'];
        default:
          return [];
      }
    default:
      return [];
  }
}

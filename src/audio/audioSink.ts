/**
 * Plays each event's sounds as the driver emits it — SA-2; Technical
 * Spec §9.3. It never waits: sounds start with their animations.
 */

import type { GameEvent } from '../engine/events';
import type { GameState } from '../engine/state';
import type { SoundId } from '../assets/manifest';
import { soundsFor } from './soundMap';

/** Anything that can play a sound; the AudioEngine in the app. */
export interface SoundPlayer {
  play(id: SoundId): void;
}

/** A session `EventSink` (structurally; `audio/` does not import `session/`). */
export class AudioSink {
  constructor(private readonly player: SoundPlayer) {}

  handle(events: readonly GameEvent[], state: GameState): void {
    for (const event of events) {
      for (const id of soundsFor(event, state)) this.player.play(id);
    }
  }
}

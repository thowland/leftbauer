// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Sound playback — SA-2, SA-3; Technical Spec §9.3.
 *
 * Plays the manifest's sounds through Web Audio. Browsers (iOS above all)
 * only let audio start inside a user gesture, so the engine stays silent
 * until `unlock` runs from one; `unlockOn` wires that to the first tap or
 * key press. Sounds load on unlock, and a sound that has not loaded yet is
 * skipped rather than played late.
 */

import { SOUNDS, type SoundId } from '../assets/manifest';

/** The slice of Web Audio the engine uses, so tests can supply a fake. */
export interface AudioContextLike {
  readonly state: string;
  readonly destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
  createBuffer(channels: number, length: number, sampleRate: number): unknown;
  createBufferSource(): {
    buffer: unknown;
    connect(node: unknown): unknown;
    start(): void;
  };
  createGain(): { gain: { value: number }; connect(node: unknown): unknown };
}

export interface AudioDeps {
  /** A new audio context, or `null` where Web Audio is unavailable. */
  readonly createContext: () => AudioContextLike | null;
  /** The bytes of a manifest file. */
  readonly load: (file: string) => Promise<ArrayBuffer>;
}

/** Events that count as a user gesture for unlocking audio. */
const GESTURES = ['pointerup', 'touchend', 'keydown'] as const;

export class AudioEngine {
  private context: AudioContextLike | null = null;
  private readonly buffers = new Map<SoundId, unknown>();
  private muted: boolean;

  constructor(
    private readonly deps: AudioDeps,
    { muted = false }: { muted?: boolean } = {}
  ) {
    this.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** True once a gesture has started audio. */
  get unlocked(): boolean {
    return this.context?.state === 'running';
  }

  /**
   * Start audio from inside a user gesture. The first call creates the
   * context and loads every sound; later calls resume a suspended context
   * (iOS suspends it when the app is backgrounded).
   */
  unlock(): void {
    if (this.context === null) {
      this.context = this.deps.createContext();
      if (this.context === null) return;
      void this.loadAll(this.context);
    }
    const context = this.context;
    if (context.state !== 'running') {
      // Playing a silent buffer inside the gesture is what older iOS needs.
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, 22050);
      source.connect(context.destination);
      source.start();
      context.resume().catch(() => {});
    }
  }

  /** Unlock on every gesture on `target`; returns a function that stops listening. */
  unlockOn(target: EventTarget): () => void {
    const unlock = () => this.unlock();
    for (const type of GESTURES) target.addEventListener(type, unlock);
    return () => {
      for (const type of GESTURES) target.removeEventListener(type, unlock);
    };
  }

  play(id: SoundId): void {
    const context = this.context;
    const buffer = this.buffers.get(id);
    if (this.muted || context === null || context.state !== 'running' || buffer === undefined) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = SOUNDS[id].gain;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  private async loadAll(context: AudioContextLike): Promise<void> {
    await Promise.all(
      (Object.keys(SOUNDS) as SoundId[]).map(async (id) => {
        try {
          const data = await this.deps.load(SOUNDS[id].file);
          this.buffers.set(id, await context.decodeAudioData(data));
        } catch {
          // A missing or undecodable sound stays silent; the game goes on.
        }
      })
    );
  }
}

type AudioContextConstructor = new () => AudioContextLike;

/** The browser's Web Audio, loading sounds from the site root. */
export function browserAudioDeps(scope: typeof globalThis = globalThis, base = '/'): AudioDeps {
  const holder = scope as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Context = holder.AudioContext ?? holder.webkitAudioContext;
  return {
    createContext: () => (Context === undefined ? null : new Context()),
    load: async (file) => {
      const response = await scope.fetch(`${base}${file}`);
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.arrayBuffer();
    },
  };
}

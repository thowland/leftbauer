import { describe, expect, it, vi } from 'vitest';
import {
  AudioEngine,
  browserAudioDeps,
  LOAD_GRACE_S,
  type AudioContextLike,
  type AudioDeps,
} from '../../../src/audio/audioEngine';
import { AudioSink } from '../../../src/audio/audioSink';
import { SOUNDS } from '../../../src/assets/manifest';
import { gameFromDeck } from '../../helpers/engine';

/** A Web Audio stand-in that records what was started, and at what gain. */
class FakeContext implements AudioContextLike {
  state = 'suspended';
  currentTime = 0;
  readonly destination = 'speakers';
  readonly started: { buffer: unknown; gain: number | null }[] = [];

  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  decodeAudioData(data: ArrayBuffer): Promise<unknown> {
    return Promise.resolve(`decoded:${new TextDecoder().decode(data)}`);
  }

  createBuffer(): unknown {
    return 'silence';
  }

  createBufferSource() {
    const entry: { buffer: unknown; gain: number | null } = { buffer: null, gain: null };
    const source = {
      buffer: null as unknown,
      connect: (node: unknown) => {
        if (node !== this.destination)
          entry.gain = (node as { gain: { value: number } }).gain.value;
        return node;
      },
      start: () => {
        entry.buffer = source.buffer;
        this.started.push(entry);
      },
    };
    return source;
  }

  createGain() {
    return { gain: { value: 1 }, connect: (node: unknown) => node };
  }
}

function setup(
  load: AudioDeps['load'] = (file) => Promise.resolve(new TextEncoder().encode(file).buffer)
) {
  const context = new FakeContext();
  const engine = new AudioEngine({ createContext: () => context, load });
  return { context, engine };
}

/** Let the sounds finish loading. */
const loaded = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AudioEngine (SA-2, SA-3)', () => {
  it('stays silent until a gesture unlocks it', async () => {
    const { context, engine } = setup();
    engine.play('card');
    expect(engine.unlocked).toBe(false);

    engine.unlock();
    await loaded();
    expect(engine.unlocked).toBe(true);
    // The unlock itself plays one silent buffer, as older iOS requires.
    expect(context.started).toEqual([{ buffer: 'silence', gain: null }]);

    engine.play('card');
    expect(context.started.at(-1)).toEqual({
      buffer: `decoded:${SOUNDS.card.file}`,
      gain: SOUNDS.card.gain,
    });
  });

  it('honors mute', async () => {
    const { context, engine } = setup();
    engine.setMuted(true);
    expect(engine.isMuted).toBe(true);
    engine.unlock();
    await loaded();
    engine.play('shuffle');
    expect(context.started).toHaveLength(1);
    engine.setMuted(false);
    engine.play('shuffle');
    expect(context.started).toHaveLength(2);
  });

  it('starts muted when asked', () => {
    expect(
      new AudioEngine({ createContext: () => null, load: vi.fn() }, { muted: true }).isMuted
    ).toBe(true);
  });

  it('plays a sound asked for while it loads, unless it arrives too late', async () => {
    const pending: Record<string, () => void> = {};
    const { context, engine } = setup(
      (file) =>
        new Promise((resolve) => {
          pending[file] = () => resolve(new TextEncoder().encode(file).buffer);
        })
    );
    engine.unlock();
    engine.play('shuffle');
    engine.play('card');
    pending[SOUNDS.shuffle.file]!();
    await loaded();
    expect(context.started.at(-1)?.buffer).toBe(`decoded:${SOUNDS.shuffle.file}`);

    context.currentTime = LOAD_GRACE_S + 0.1;
    pending[SOUNDS.card.file]!();
    await loaded();
    expect(context.started).toHaveLength(2);

    for (const resolve of Object.values(pending)) resolve();
    await loaded();
    engine.play('deal');
    expect(context.started).toHaveLength(3);
  });

  it('skips a sound that failed to load', async () => {
    const { context, engine } = setup((file) =>
      file.includes('euchre')
        ? Promise.reject(new Error('404'))
        : Promise.resolve(new ArrayBuffer(1))
    );
    engine.unlock();
    await loaded();
    engine.play('euchre');
    engine.play('trump');
    expect(context.started).toHaveLength(2);
  });

  it('resumes a context the system suspended, without reloading', async () => {
    const load = vi.fn(() => Promise.resolve(new ArrayBuffer(1)));
    const { context, engine } = setup(load);
    engine.unlock();
    await loaded();
    context.state = 'interrupted';
    engine.play('card');
    expect(context.started).toHaveLength(1);
    engine.unlock();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(Object.keys(SOUNDS).length);
    engine.unlock();
    expect(context.resume).toHaveBeenCalledTimes(2);
  });

  it('does nothing where Web Audio is missing', () => {
    const engine = new AudioEngine({ createContext: () => null, load: vi.fn() });
    engine.unlock();
    engine.play('card');
    expect(engine.unlocked).toBe(false);
  });

  it('unlocks on the first tap or key press, until told to stop listening', () => {
    const { engine } = setup();
    const target = new EventTarget();
    const unlock = vi.spyOn(engine, 'unlock');
    const stop = engine.unlockOn(target);
    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('pointerup'));
    expect(unlock).toHaveBeenCalledTimes(2);
    stop();
    target.dispatchEvent(new Event('touchend'));
    expect(unlock).toHaveBeenCalledTimes(2);
  });
});

describe('browserAudioDeps', () => {
  it('uses AudioContext, or webkitAudioContext on older Safari', () => {
    class Ctx {}
    const modern = browserAudioDeps({ AudioContext: Ctx } as unknown as typeof globalThis);
    expect(modern.createContext()).toBeInstanceOf(Ctx);
    const webkit = browserAudioDeps({ webkitAudioContext: Ctx } as unknown as typeof globalThis);
    expect(webkit.createContext()).toBeInstanceOf(Ctx);
    expect(browserAudioDeps({} as typeof globalThis).createContext()).toBeNull();
  });

  it('fetches sounds from the site root, and fails on an HTTP error', async () => {
    const bytes = new ArrayBuffer(3);
    const fetch = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('ok.mp3')
          ? { ok: true, status: 200, arrayBuffer: () => Promise.resolve(bytes) }
          : { ok: false, status: 404 }
      )
    );
    const deps = browserAudioDeps({ fetch } as unknown as typeof globalThis, '/app/');
    await expect(deps.load('sounds/ok.mp3')).resolves.toBe(bytes);
    expect(fetch).toHaveBeenCalledWith('/app/sounds/ok.mp3');
    await expect(deps.load('sounds/gone.mp3')).rejects.toThrow('HTTP 404');
  });
});

describe('AudioSink', () => {
  it('plays every sound for every event, in order', () => {
    const played: string[] = [];
    const sink = new AudioSink({ play: (id) => played.push(id) });
    sink.handle(
      [
        { type: 'handDealt', dealer: 3, handNumber: 1, upcard: 'JD' },
        {
          type: 'trumpSet',
          contract: { trump: 'H', maker: 0, round: 1, alone: false, loneDefender: null },
        },
      ],
      gameFromDeck()
    );
    expect(played).toEqual(['shuffle', 'trump']);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { BotSpec, Decision } from '../../../src/bots/bot';
import type { BotReply, BotRequest } from '../../../src/bots/protocol';
import { legalActions } from '../../../src/engine/game';
import { toPlayerView } from '../../../src/engine/view';
import { AbortedError } from '../../../src/session/abort';
import type { BotRunner } from '../../../src/session/botRunner';
import { WorkerBotRunner, type WorkerLike } from '../../../src/session/workerRunner';
import { createBotHost } from '../../../src/workers/botHost';
import { gameFromDeck } from '../../helpers/engine';

const SPEC: BotSpec = { role: 'opponent', personaId: 'smooth', skill: 'standard' };
const state = gameFromDeck();
const view = toPlayerView(state, 0);
const legal = legalActions(state, 0);
const signal = () => new AbortController().signal;

/** A worker that answers through the real host, when told to. */
class FakeWorker implements WorkerLike {
  readonly sent: BotRequest[] = [];
  private onMessage: (event: { data: BotReply }) => void = () => {};
  private onError: (event: unknown) => void = () => {};
  readonly terminate = vi.fn();
  private readonly host = createBotHost();

  postMessage(message: BotRequest): void {
    this.sent.push(message);
  }

  addEventListener(type: 'message' | 'error', listener: (event: { data: BotReply }) => void): void {
    if (type === 'message') this.onMessage = listener;
    else this.onError = listener as (event: unknown) => void;
  }

  reply(index = 0, override?: Partial<BotReply>): void {
    this.onMessage({ data: { ...this.host(this.sent[index]!), ...override } as BotReply });
  }

  crash(): void {
    this.onError(new Event('error'));
  }
}

function fallback(): BotRunner & { decide: ReturnType<typeof vi.fn> } {
  const decision: Decision = { action: legal[0]!, reason: { code: 'bid-pass-weak' } };
  return { decide: vi.fn(() => Promise.resolve(decision)) };
}

describe('WorkerBotRunner (§9.4)', () => {
  it('asks the worker and returns its decision', async () => {
    const worker = new FakeWorker();
    const runner = new WorkerBotRunner(() => worker);
    expect(runner.usingWorker).toBe(true);
    const decision = runner.decide(SPEC, view, legal, signal());
    worker.reply();
    await expect(decision).resolves.toMatchObject({ action: expect.anything() });
    expect(worker.sent[0]).toMatchObject({ spec: SPEC, view, legal });
  });

  it('matches answers to requests by id, and drops an aborted one', async () => {
    const worker = new FakeWorker();
    const runner = new WorkerBotRunner(() => worker);
    const abort = new AbortController();
    const first = runner.decide(SPEC, view, legal, abort.signal);
    const second = runner.decide(SPEC, view, legal, signal());
    abort.abort();
    await expect(first).rejects.toBeInstanceOf(AbortedError);
    worker.reply(0);
    worker.reply(1);
    await expect(second).resolves.toBeDefined();
    await expect(runner.decide(SPEC, view, legal, abort.signal)).rejects.toBeInstanceOf(
      AbortedError
    );
  });

  it('reports a bot that failed in the worker', async () => {
    const worker = new FakeWorker();
    const runner = new WorkerBotRunner(() => worker);
    const decision = runner.decide(SPEC, view, legal, signal());
    worker.reply(0, { ok: false, error: 'boom' } as Partial<BotReply>);
    await expect(decision).rejects.toThrow('Bot failed in the worker: boom');
  });

  it('answers inline when the worker cannot start', async () => {
    const inline = fallback();
    const runner = new WorkerBotRunner(() => {
      throw new Error('no workers here');
    }, inline);
    await runner.decide(SPEC, view, legal, signal());
    expect(inline.decide).toHaveBeenCalledOnce();
    expect(runner.usingWorker).toBe(false);
  });

  it('answers what a crashed worker owed inline, and stays inline', async () => {
    const worker = new FakeWorker();
    const inline = fallback();
    const runner = new WorkerBotRunner(() => worker, inline);
    const owed = runner.decide(SPEC, view, legal, signal());
    worker.crash();
    await expect(owed).resolves.toBeDefined();
    expect(worker.terminate).toHaveBeenCalled();
    await runner.decide(SPEC, view, legal, signal());
    expect(inline.decide).toHaveBeenCalledTimes(2);
    expect(worker.sent).toHaveLength(1);
  });

  it('can be stopped', () => {
    const worker = new FakeWorker();
    const runner = new WorkerBotRunner(() => worker);
    expect(runner.usingWorker).toBe(true);
    runner.dispose();
    expect(worker.terminate).toHaveBeenCalled();
    expect(runner.usingWorker).toBe(false);
  });
});

describe('the worker’s bot host', () => {
  it('decides like the bot itself, and reports errors as data', () => {
    const host = createBotHost();
    const reply = host({ id: 3, spec: SPEC, view, legal });
    expect(reply).toMatchObject({ id: 3, ok: true });
    expect(host({ id: 4, spec: SPEC, view, legal })).toEqual({ ...reply, id: 4 });
    expect(host({ id: 5, spec: SPEC, view, legal: [] })).toMatchObject({ id: 5, ok: false });
    const odd = host({ id: 6, spec: { ...SPEC, personaId: 'nobody' as never }, view, legal });
    expect(odd).toMatchObject({ ok: false, error: expect.stringContaining('nobody') });
  });
});

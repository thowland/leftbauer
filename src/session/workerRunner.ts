/**
 * Runs bots in a Web Worker — Technical Spec §9.4.
 *
 * Requests go to the worker by id; an aborted request is forgotten (its
 * late answer is dropped). If the worker cannot start, or fails, every
 * open and future request is answered inline instead, so the game never
 * stalls (NF-2).
 *
 * Pure module: no DOM, no React, no storage. The worker is injected.
 */

import type { BotSpec, Decision } from '../bots/bot';
import type { BotReply, BotRequest } from '../bots/protocol';
import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import { abortable, AbortedError } from './abort';
import { InlineBotRunner, type BotRunner } from './botRunner';

/** The slice of `Worker` the runner uses. */
export interface WorkerLike {
  postMessage(message: BotRequest): void;
  addEventListener(type: 'message', listener: (event: { data: BotReply }) => void): void;
  addEventListener(type: 'error', listener: (event: unknown) => void): void;
  terminate(): void;
}

interface Pending {
  readonly request: BotRequest;
  readonly signal: AbortSignal;
  readonly resolve: (decision: Decision) => void;
  readonly reject: (error: unknown) => void;
}

export class WorkerBotRunner implements BotRunner {
  private worker: WorkerLike | null = null;
  private failed = false;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(
    private readonly createWorker: () => WorkerLike,
    private readonly fallback: BotRunner = new InlineBotRunner()
  ) {}

  /** True while decisions are going to the worker. */
  get usingWorker(): boolean {
    return this.connect() !== null;
  }

  decide(
    spec: BotSpec,
    view: PlayerView,
    legal: readonly Action[],
    signal: AbortSignal
  ): Promise<Decision> {
    if (signal.aborted) return Promise.reject(new AbortedError());
    const worker = this.connect();
    if (worker === null) return this.fallback.decide(spec, view, legal, signal);
    const request: BotRequest = { id: this.nextId++, spec, view, legal };
    return abortable<Decision>(signal, (resolve, reject) => {
      this.pending.set(request.id, { request, signal, resolve, reject });
      worker.postMessage(request);
      return () => this.pending.delete(request.id);
    });
  }

  /** Stop the worker; later decisions run inline. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.failed = true;
  }

  private connect(): WorkerLike | null {
    if (this.failed) return null;
    if (this.worker !== null) return this.worker;
    try {
      const worker = this.createWorker();
      worker.addEventListener('message', ({ data }) => this.answer(data));
      worker.addEventListener('error', () => this.fail());
      this.worker = worker;
      return worker;
    } catch {
      this.failed = true;
      return null;
    }
  }

  private answer(reply: BotReply): void {
    const pending = this.pending.get(reply.id);
    if (pending === undefined) return;
    this.pending.delete(reply.id);
    if (reply.ok) pending.resolve(reply.decision);
    else pending.reject(new Error(`Bot failed in the worker: ${reply.error}`));
  }

  /** The worker died: answer what it owed inline, and stop using it. */
  private fail(): void {
    this.dispose();
    const owed = [...this.pending.values()];
    this.pending.clear();
    for (const { request, signal, resolve, reject } of owed) {
      this.fallback.decide(request.spec, request.view, request.legal, signal).then(resolve, reject);
    }
  }
}

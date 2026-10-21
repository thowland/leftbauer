// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Runs bot decisions — Technical Spec §9.4.
 *
 * `InlineBotRunner` decides on the calling thread. Sprint 7 adds a
 * `WorkerBotRunner` behind the same interface for the Sharp level.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { specKey, type Bot, type BotSpec, type Decision } from '../bots/bot';
import { createBot } from '../bots/factory';
import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import { AbortedError } from './abort';

export interface BotRunner {
  decide(
    spec: BotSpec,
    view: PlayerView,
    legal: readonly Action[],
    signal: AbortSignal
  ): Promise<Decision>;
}

export class InlineBotRunner implements BotRunner {
  private readonly bots = new Map<string, Bot>();

  async decide(
    spec: BotSpec,
    view: PlayerView,
    legal: readonly Action[],
    signal: AbortSignal
  ): Promise<Decision> {
    if (signal.aborted) throw new AbortedError();
    const key = specKey(spec);
    let bot = this.bots.get(key);
    if (bot === undefined) {
      bot = createBot(spec);
      this.bots.set(key, bot);
    }
    return bot.decide(view, legal);
  }
}

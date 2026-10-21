// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Answers bot requests inside the Web Worker — Technical Spec §9.4.
 *
 * Bots are rebuilt from their serializable spec and cached, so the
 * worker plays exactly as the same bot would on the main thread.
 *
 * Pure module: no DOM, no React, no storage.
 */

import { specKey, type Bot } from '../bots/bot';
import { createBot } from '../bots/factory';
import type { BotReply, BotRequest } from '../bots/protocol';

export function createBotHost(): (request: BotRequest) => BotReply {
  const bots = new Map<string, Bot>();
  return ({ id, spec, view, legal }) => {
    try {
      const key = specKey(spec);
      let bot = bots.get(key);
      if (bot === undefined) {
        bot = createBot(spec);
        bots.set(key, bot);
      }
      return { id, ok: true, decision: bot.decide(view, legal) };
    } catch (error) {
      return { id, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  };
}

/**
 * The only public way to construct a bot — Technical Spec §6.8.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Bot, BotSpec } from './bot';
import { PlaceholderBot } from './placeholder';

export function createBot(spec: BotSpec): Bot {
  return new PlaceholderBot(spec);
}

/**
 * The bot Web Worker entry — Technical Spec §9.4. Sharp's simulation
 * runs here, off the main thread, so animation stays smooth (NF-2, NF-3).
 */

import type { BotRequest } from '../bots/protocol';
import { createBotHost } from './botHost';

const host = createBotHost();

self.addEventListener('message', (event: MessageEvent<BotRequest>) => {
  self.postMessage(host(event.data));
});

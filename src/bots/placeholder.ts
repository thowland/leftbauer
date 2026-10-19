/**
 * A temporary bot for Sprint 3: picks a legal action at random. Replaced
 * by the conventional bots in Sprint 4.
 *
 * Its randomness is seeded from the view and the spec (Technical Spec
 * §5), so the same situation always produces the same choice (PB-3).
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Action } from '../engine/actions';
import type { PlayerView } from '../engine/view';
import { hashSeed, seededRng } from '../util/rng';
import { specKey, type Bot, type BotSpec, type Decision } from './bot';

export class PlaceholderBot implements Bot {
  constructor(readonly spec: BotSpec) {}

  decide(view: PlayerView, legal: readonly Action[]): Decision {
    if (legal.length === 0) throw new Error('A bot was asked to act with no legal actions');
    const rng = seededRng(hashSeed(JSON.stringify(view), specKey(this.spec)));
    return { action: legal[rng.nextInt(legal.length)]!, reason: { code: 'random-legal' } };
  }
}

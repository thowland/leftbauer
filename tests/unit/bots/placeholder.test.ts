import { describe, expect, it } from 'vitest';
import { specKey, type BotSpec } from '../../../src/bots/bot';
import { createBot } from '../../../src/bots/factory';
import { legalActions } from '../../../src/engine/game';
import { toPlayerView } from '../../../src/engine/view';
import { gameFromDeck } from '../../helpers/engine';

const SPEC: BotSpec = { role: 'opponent', personaId: 'placeholder', skill: 'standard' };

describe('placeholder bot', () => {
  const state = gameFromDeck();
  const view = toPlayerView(state, 0);
  const legal = legalActions(state, 0);

  it('always chooses a legal action', () => {
    const { action, reason } = createBot(SPEC).decide(view, legal);
    expect(legal).toContainEqual(action);
    expect(reason.code).toBe('random-legal');
  });

  it('decides the same way every time for the same view (PB-3)', () => {
    const a = createBot(SPEC).decide(view, legal);
    const b = createBot(SPEC).decide(view, legal);
    expect(a).toEqual(b);
  });

  it('refuses to act with nothing legal', () => {
    expect(() => createBot(SPEC).decide(view, [])).toThrow(/no legal actions/);
  });

  it('keys specs stably', () => {
    expect(specKey(SPEC)).toBe('opponent/placeholder/standard');
  });
});

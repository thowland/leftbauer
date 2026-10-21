import { describe, expect, it } from 'vitest';
import { OPPONENT_IDS } from '../../../src/bots/personas';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { load, memoryStorage, save } from '../../../src/state/persistence';
import {
  DEFAULT_SETTINGS,
  isSettings,
  PACING_OPTIONS,
  pacingFor,
  resolveOpponents,
  SETTINGS_STORE,
} from '../../../src/state/settings';
import { seededRng } from '../../../src/util/rng';

describe('settings (UI-1, PE-3)', () => {
  it('defaults to random opponents at Standard, normal pace, two-tap play, sound on and standard rules', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      opponents: { left: 'random', right: 'random' },
      skill: 'standard',
      pacingMs: 650,
      oneTapPlay: false,
      soundOn: true,
      hintsOn: true,
      pendingRules: STANDARD_RULES,
      deck: 'standard',
    });
    expect(PACING_OPTIONS.map((p) => p.ms)).toContain(DEFAULT_SETTINGS.pacingMs);
  });

  it('migrates version 1 settings, turning hints on', () => {
    const { hintsOn: _, pendingRules: _r, deck: _d, ...v1 } = DEFAULT_SETTINGS;
    const storage = memoryStorage({
      'leftbauer:settings': JSON.stringify({ schemaVersion: 1, ...v1, oneTapPlay: true }),
    });
    expect(load(storage, SETTINGS_STORE)).toEqual({ ...DEFAULT_SETTINGS, oneTapPlay: true });
  });

  it('migrates version 2 settings to standard rules and the two-color deck', () => {
    const { pendingRules: _r, deck: _d, ...v2 } = DEFAULT_SETTINGS;
    const storage = memoryStorage({
      'leftbauer:settings': JSON.stringify({ schemaVersion: 2, ...v2, hintsOn: false }),
    });
    expect(load(storage, SETTINGS_STORE)).toEqual({ ...DEFAULT_SETTINGS, hintsOn: false });
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const mine = {
      ...DEFAULT_SETTINGS,
      skill: 'casual' as const,
      oneTapPlay: true,
      pendingRules: { ...STANDARD_RULES, farmersHand: true, targetScore: 5 as const },
      deck: 'fourColor' as const,
    };
    save(storage, SETTINGS_STORE, mine);
    expect(load(storage, SETTINGS_STORE)).toEqual(mine);
  });

  it('rejects malformed settings', () => {
    const bad: unknown[] = [
      null,
      { ...DEFAULT_SETTINGS, opponents: null },
      { ...DEFAULT_SETTINGS, opponents: { left: 'partner', right: 'random' } },
      { ...DEFAULT_SETTINGS, opponents: { left: 'rusty', right: 'rusty' } },
      { ...DEFAULT_SETTINGS, skill: 'expert' },
      { ...DEFAULT_SETTINGS, pacingMs: '650' },
      { ...DEFAULT_SETTINGS, pacingMs: Infinity },
      { ...DEFAULT_SETTINGS, pacingMs: -1 },
      { ...DEFAULT_SETTINGS, pacingMs: 60_000 },
      { ...DEFAULT_SETTINGS, oneTapPlay: 'yes' },
      { ...DEFAULT_SETTINGS, soundOn: 1 },
      { ...DEFAULT_SETTINGS, pendingRules: null },
      { ...DEFAULT_SETTINGS, pendingRules: { ...STANDARD_RULES, targetScore: 12 } },
      { ...DEFAULT_SETTINGS, deck: 'sixColor' },
    ];
    for (const value of bad) expect(isSettings(value)).toBe(false);
    expect(isSettings({ ...DEFAULT_SETTINGS, skill: 'sharp' })).toBe(true);
    expect(isSettings({ ...DEFAULT_SETTINGS, opponents: { left: 'random', right: 'rusty' } })).toBe(
      true
    );
  });

  it('scales the pause after a trick with the pace (GF-4)', () => {
    expect(pacingFor(650)).toEqual({ botMs: 650, trickMs: 900 });
    expect(pacingFor(350).trickMs).toBeLessThan(pacingFor(1000).trickMs);
  });
});

describe('resolveOpponents (OP-4)', () => {
  it('keeps named opponents', () => {
    expect(resolveOpponents({ left: 'rusty', right: 'soopy' }, seededRng(1))).toEqual([
      'rusty',
      'soopy',
    ]);
  });

  it('fills random seats with different opponents from the rest', () => {
    for (let seed = 0; seed < 50; seed++) {
      const [left, right] = resolveOpponents({ left: 'random', right: 'random' }, seededRng(seed));
      expect(left).not.toBe(right);
      expect(OPPONENT_IDS).toContain(left);

      const [, other] = resolveOpponents({ left: 'shrubs', right: 'random' }, seededRng(seed));
      expect(other).not.toBe('shrubs');
      const [first] = resolveOpponents({ left: 'random', right: 'smooth' }, seededRng(seed));
      expect(first).not.toBe('smooth');
    }
  });

  it('can draw Johnny Blue for a random seat, like any opponent', () => {
    const drawn = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      drawn.add(resolveOpponents({ left: 'random', right: 'rusty' }, seededRng(seed))[0]);
    }
    expect([...drawn].sort()).toEqual(['johnny', 'shrubs', 'smooth', 'soopy']);
  });
});

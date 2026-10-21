import { describe, expect, it, vi } from 'vitest';
import { load, memoryStorage } from '../../../src/state/persistence';
import { GAME_STORE } from '../../../src/state/savedGame';
import { DEFAULT_SETTINGS, type Settings } from '../../../src/state/settings';
import { newTable, resumeTable, type TableOptions } from '../../../src/ui/game/createTable';

const FAST: TableOptions = {
  fast: true,
  pacingMs: 650,
  storage: null,
  motion: null,
  sound: null,
};

const settings = (change: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...change });

describe('newTable', () => {
  it('seats the human with three bots and an idle driver', () => {
    const table = newTable(settings(), 1, FAST);
    expect(table.humanSeat).toBe(0);
    expect(table.driver.snapshot().status).toBe('idle');
    expect(table.initialEvents[0]).toMatchObject({ type: 'handDealt', handNumber: 1 });
  });

  it('reproduces a seeded game, and shuffles with crypto otherwise', () => {
    const a = newTable(settings(), 9, FAST).driver.snapshot().state;
    const b = newTable(settings(), 9, FAST).driver.snapshot().state;
    expect(a).toEqual(b);
    const c = newTable(settings(), null, { ...FAST, fast: false }).driver.snapshot().state;
    expect(c.hand.hands.every((h) => h.length === 5)).toBe(true);
  });
});

describe('newTable seating (OP-4)', () => {
  it('seats the partner across and two different named opponents', () => {
    const { seats } = newTable(settings(), 4, FAST);
    expect(seats[0]).toEqual({ name: 'You', persona: null });
    expect(seats[2].persona?.id).toBe('partner');
    expect(seats[1].persona?.id).not.toBe(seats[3].persona?.id);
    expect(['Soopy', 'Shrubs', 'Rusty', 'Smooth']).toContain(seats[1].name);
  });

  it('honors chosen opponents and skill', () => {
    const table = newTable(
      settings({ opponents: { left: 'rusty', right: 'soopy' }, skill: 'casual' }),
      4,
      FAST
    );
    expect(table.seats.map((s) => s.name)).toEqual(['You', 'Rusty', 'Partner', 'Soopy']);
    expect(table.setup.seats.bots[1]).toEqual({
      role: 'opponent',
      personaId: 'rusty',
      skill: 'casual',
    });
  });

  it('chooses opponents without changing the deal', () => {
    const a = newTable(settings({ opponents: { left: 'rusty', right: 'soopy' } }), 8, FAST);
    const b = newTable(settings({ opponents: { left: 'smooth', right: 'shrubs' } }), 8, FAST);
    expect(a.driver.snapshot().state).toEqual(b.driver.snapshot().state);
  });
});

describe('saving and resuming (PE-1)', () => {
  it('saves the game as soon as it starts, and resumes it with the same seats', async () => {
    const storage = memoryStorage();
    const table = newTable(settings(), 3, { ...FAST, storage });
    expect(load(storage, GAME_STORE)).toBeNull();

    const run = table.driver.start(table.initialEvents);
    await new Promise<void>((resolve) => {
      const off = table.driver.subscribe(() => {
        if (table.driver.snapshot().awaiting?.seat === 0) {
          off();
          resolve();
        }
      });
    });
    table.driver.stop();
    await run;

    const saved = load(storage, GAME_STORE)!;
    expect(saved.game).toEqual(table.driver.snapshot().state);
    expect(saved.seed).toBe(3);

    const resumed = resumeTable(saved, FAST);
    expect(resumed.initialEvents).toEqual([]);
    expect(resumed.seats).toEqual(table.seats);
    expect(resumed.driver.snapshot().state).toEqual(saved.game);
  });
});

describe('the app table recovers from failures (CR-1)', () => {
  const reaches = (table: ReturnType<typeof newTable>, seat: number) =>
    new Promise<void>((resolve) => {
      const check = () => table.driver.snapshot().awaiting?.seat === seat && resolve();
      table.driver.subscribe(check);
      check();
    });

  it('plays on when sounds fail and every bot decision fails', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const table = newTable(settings({ opponents: { left: 'rusty', right: 'soopy' } }), 3, {
      ...FAST,
      sound: {
        play: () => {
          throw new Error('audio suspended');
        },
      },
      runner: { decide: () => Promise.reject(new Error('bot broke')) },
    });
    void table.driver.start(table.initialEvents);
    await reaches(table, 0);
    table.driver.stop();
    expect(table.driver.snapshot().status).toBe('stopped');
    const reported = quiet.mock.calls.map((call) => String(call[1]));
    expect(reported).toContain('Error: audio suspended');
    expect(reported).toContain('Error: bot broke');
    quiet.mockRestore();
  });
});

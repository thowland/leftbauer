import { describe, expect, it } from 'vitest';
import {
  clear,
  isRecord,
  load,
  memoryStorage,
  migrate,
  save,
  type StorageLike,
  type VersionedStore,
} from '../../../src/state/persistence';

interface Note {
  readonly text: string;
  readonly pinned: boolean;
}

/** A store at version 3 whose chain upgrades v1 (no `pinned`) and renames v2's `body`. */
const NOTES: VersionedStore<Note> = {
  key: 'test:note',
  schemaVersion: 3,
  migrations: {
    1: (blob) => ({ ...blob, schemaVersion: 2, pinned: false }),
    2: ({ body, ...rest }) => ({ ...rest, schemaVersion: 3, text: body }),
  },
  isValid: (v): v is Note =>
    isRecord(v) && typeof v.text === 'string' && typeof v.pinned === 'boolean',
};

const stored = (value: unknown) => memoryStorage({ [NOTES.key]: JSON.stringify(value) });

const broken: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('versioned storage (PE-1, PE-3)', () => {
  it('round-trips a value with its schema version', () => {
    const storage = memoryStorage();
    expect(save(storage, NOTES, { text: 'hi', pinned: true })).toBe(true);
    expect(JSON.parse(storage.getItem(NOTES.key)!)).toEqual({
      schemaVersion: 3,
      text: 'hi',
      pinned: true,
    });
    expect(load(storage, NOTES)).toEqual({ text: 'hi', pinned: true });
    clear(storage, NOTES);
    expect(load(storage, NOTES)).toBeNull();
  });

  it('migrates an old save forward one version at a time', () => {
    expect(load(stored({ schemaVersion: 1, body: 'old' }), NOTES)).toEqual({
      text: 'old',
      pinned: false,
    });
    expect(load(stored({ schemaVersion: 2, body: 'mid', pinned: true }), NOTES)).toEqual({
      text: 'mid',
      pinned: true,
    });
  });

  it('discards what it cannot read', () => {
    const discarded = [
      memoryStorage({ [NOTES.key]: '{not json' }),
      stored({ schemaVersion: 4, text: 'future', pinned: true }),
      stored({ schemaVersion: 0, body: 'no path' }),
      stored({ schemaVersion: 1.5, text: 'x', pinned: true }),
      stored({ text: 'unversioned', pinned: true }),
      stored([1, 2, 3]),
      stored(null),
      stored({ schemaVersion: 3, text: 7, pinned: true }),
    ];
    for (const storage of discarded) expect(load(storage, NOTES)).toBeNull();
    expect(load(memoryStorage(), NOTES)).toBeNull();
  });

  it('gives up on a migration that never advances', () => {
    const stuck = { 1: (blob: Record<string, unknown>) => blob };
    expect(migrate({ schemaVersion: 1 }, 3, stuck)).toBeNull();
  });

  it('survives storage that refuses every call', () => {
    expect(load(broken, NOTES)).toBeNull();
    expect(save(broken, NOTES, { text: 'x', pinned: false })).toBe(false);
    expect(() => clear(broken, NOTES)).not.toThrow();
  });
});

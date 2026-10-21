// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Versioned storage — PE-1, PE-3; Technical Spec §10.1.
 *
 * Each stored value lives under its own key with its own schema version
 * and forward-migration chain (the gammon ADR-0027 pattern). On load, an
 * older blob is migrated one version at a time; a blob from a newer
 * build, a gap in the chain, or anything that fails validation is
 * discarded, so a bad save degrades to "start fresh", never to "load
 * garbage".
 *
 * Storage is injected (`StorageLike`), and every read and write is
 * guarded: a full or blocked `localStorage` (Safari private browsing)
 * must never break a game.
 *
 * Pure module: no DOM, no React, no storage of its own.
 */

/** The part of the Web Storage interface this app uses. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Blob = Record<string, unknown>;

/** Upgrades a blob from schema version N (its key in the chain) to N + 1. */
export type Migration = (blob: Blob) => Blob;

export interface VersionedStore<T> {
  readonly key: string;
  readonly schemaVersion: number;
  /** Keyed by the version each migration upgrades from. */
  readonly migrations: Readonly<Record<number, Migration>>;
  /** The final gate: anything that fails it is discarded. */
  readonly isValid: (value: unknown) => value is T;
}

/** Bring a blob up to `target`, or `null` when there is no way to. */
export function migrate(
  parsed: unknown,
  target: number,
  migrations: Readonly<Record<number, Migration>>
): Blob | null {
  if (!isRecord(parsed)) return null;
  let blob = parsed;
  for (let guard = 0; blob.schemaVersion !== target; guard++) {
    const version = blob.schemaVersion;
    if (typeof version !== 'number' || !Number.isInteger(version) || version > target) return null;
    const step = migrations[version];
    // A gap in the chain, or a migration that fails to advance the version.
    if (step === undefined || guard >= target) return null;
    blob = step(blob);
  }
  return blob;
}

export function load<T>(storage: StorageLike, store: VersionedStore<T>): T | null {
  let raw: string | null;
  try {
    raw = storage.getItem(store.key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const blob = migrate(parsed, store.schemaVersion, store.migrations);
  if (blob === null) return null;
  const { schemaVersion: _version, ...value } = blob;
  return store.isValid(value) ? value : null;
}

/** Write a value. Returns `false` if storage refused it (full or blocked). */
export function save<T>(storage: StorageLike, store: VersionedStore<T>, value: T): boolean {
  try {
    storage.setItem(store.key, JSON.stringify({ schemaVersion: store.schemaVersion, ...value }));
    return true;
  } catch {
    return false;
  }
}

export function clear(storage: StorageLike, store: VersionedStore<unknown>): void {
  try {
    storage.removeItem(store.key);
  } catch {
    // Nothing to do: a blocked store has nothing saved either.
  }
}

/** In-memory storage: tests, and the fallback when `localStorage` is unavailable. */
export function memoryStorage(initial: Readonly<Record<string, string>> = {}): StorageLike {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

export function isRecord(value: unknown): value is Blob {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

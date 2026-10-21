// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { memoryStorage, type StorageLike } from '../state/persistence';

/**
 * `localStorage` when the browser allows it; otherwise (blocked cookies,
 * some private modes) an in-memory store, so the game still plays and
 * simply is not kept between visits.
 */
export function browserStorage(scope: { localStorage?: Storage } = globalThis): StorageLike {
  try {
    const storage = scope.localStorage;
    if (storage === undefined) return memoryStorage();
    const probe = 'leftbauer:probe';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return memoryStorage();
  }
}

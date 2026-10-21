// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

/**
 * Randomness — Technical Spec §5.
 *
 * Every consumer of randomness takes an injected {@link Rng}. Production
 * shuffles use {@link cryptoRng}; tests, bots and tournaments use
 * {@link seededRng} so results are reproducible.
 *
 * Pure module: no DOM, no React, no storage.
 */

/** A source of uniformly distributed integers. */
export interface Rng {
  /** A uniform integer in `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
}

const UINT32_RANGE = 0x1_0000_0000;

function assertBound(maxExclusive: number): void {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`nextInt bound must be a positive integer, got ${maxExclusive}`);
  }
}

/**
 * Cryptographically strong RNG over `crypto.getRandomValues`. Uses
 * rejection sampling so every value in range is exactly equally likely.
 */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  return {
    nextInt(maxExclusive) {
      assertBound(maxExclusive);
      const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
      for (;;) {
        globalThis.crypto.getRandomValues(buf);
        const draw = buf[0]!;
        if (draw < limit) return draw % maxExclusive;
      }
    },
  };
}

/** Deterministic RNG (mulberry32). Not for production shuffles. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
  return {
    nextInt(maxExclusive) {
      assertBound(maxExclusive);
      return Math.floor(next() * maxExclusive);
    },
  };
}

/**
 * FNV-1a over a canonical encoding of the parts. Each part is tagged with
 * its type and terminated, so `('ab','c')`, `('a','bc')` and `('1')` vs
 * `(1)` all hash differently.
 */
export function hashSeed(...parts: (string | number)[]): number {
  let hash = 0x811c9dc5;
  const encoded = parts.map((p) => `${typeof p === 'number' ? 'n' : 's'}:${p}\u0000`).join('');
  for (let i = 0; i < encoded.length; i++) {
    hash ^= encoded.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

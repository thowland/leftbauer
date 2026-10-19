import { afterEach, describe, expect, it, vi } from 'vitest';
import { cryptoRng, hashSeed, seededRng } from '../../../src/util/rng';

describe('seededRng', () => {
  it('is deterministic for a given seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const seqA = Array.from({ length: 20 }, () => a.nextInt(1000));
    const seqB = Array.from({ length: 20 }, () => b.nextInt(1000));
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = seededRng(1);
    const b = seededRng(2);
    const seqA = Array.from({ length: 10 }, () => a.nextInt(1_000_000));
    const seqB = Array.from({ length: 10 }, () => b.nextInt(1_000_000));
    expect(seqA).not.toEqual(seqB);
  });

  it('stays within [0, max)', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 10_000; i++) {
      const n = rng.nextInt(6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('is roughly uniform (chi-squared, 6 buckets)', () => {
    const rng = seededRng(12345);
    const counts = new Array<number>(6).fill(0);
    const n = 60_000;
    for (let i = 0; i < n; i++) counts[rng.nextInt(6)]!++;
    const expected = n / 6;
    const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    // df = 5; p = 0.001 critical value ≈ 20.5
    expect(chi2).toBeLessThan(20.5);
  });

  it('rejects a non-positive or non-integer bound', () => {
    const rng = seededRng(1);
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(2.5)).toThrow(RangeError);
  });
});

describe('cryptoRng', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws from crypto.getRandomValues within [0, max)', () => {
    const rng = cryptoRng();
    for (let i = 0; i < 1000; i++) {
      const n = rng.nextInt(24);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(24);
    }
  });

  it('rejects draws in the biased tail and retries (no modulo bias)', () => {
    // For max = 3, the largest unbiased limit is 2^32 - (2^32 % 3) = 4294967295.
    // 0xFFFFFFFF (4294967295) must be rejected; the next draw (5) gives 5 % 3 = 2.
    const draws = [0xffffffff, 5];
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint32Array) => {
        arr[0] = draws.shift()!;
        return arr;
      },
    });
    const rng = cryptoRng();
    expect(rng.nextInt(3)).toBe(2);
    expect(draws).toHaveLength(0);
  });

  it('rejects a non-positive or non-integer bound', () => {
    const rng = cryptoRng();
    expect(() => rng.nextInt(-1)).toThrow(RangeError);
    expect(() => rng.nextInt(1.5)).toThrow(RangeError);
  });
});

describe('hashSeed', () => {
  it('is stable for equal inputs', () => {
    expect(hashSeed('view', 3, 'partner')).toBe(hashSeed('view', 3, 'partner'));
  });

  it('distinguishes order, type and boundaries', () => {
    expect(hashSeed('a', 'b')).not.toBe(hashSeed('b', 'a'));
    expect(hashSeed('1')).not.toBe(hashSeed(1));
    expect(hashSeed('ab', 'c')).not.toBe(hashSeed('a', 'bc'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = hashSeed('anything', 99);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

import { describe, expect, it } from 'vitest';
import { parseLaunchOptions } from '../../../src/ui/launchOptions';

describe('parseLaunchOptions', () => {
  it('defaults to normal play with a random seed', () => {
    expect(parseLaunchOptions('')).toEqual({ dev: false, seed: null, fast: false });
  });

  it('reads ?dev and ?seed', () => {
    expect(parseLaunchOptions('?dev&seed=12')).toEqual({ dev: true, seed: 12, fast: false });
  });

  it('ignores a malformed seed', () => {
    expect(parseLaunchOptions('?seed=abc').seed).toBeNull();
    expect(parseLaunchOptions('?seed=-3').seed).toBeNull();
  });
});

describe('parseLaunchOptions ?e2e', () => {
  it('turns off pacing for end-to-end tests', () => {
    expect(parseLaunchOptions('?e2e').fast).toBe(true);
    expect(parseLaunchOptions('?seed=3').fast).toBe(false);
  });
});

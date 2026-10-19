import { describe, expect, it } from 'vitest';
import { parseLaunchOptions } from '../../../src/ui/launchOptions';

describe('parseLaunchOptions', () => {
  it('defaults to normal play with a random seed', () => {
    expect(parseLaunchOptions('')).toEqual({ dev: false, seed: null });
  });

  it('reads ?dev and ?seed', () => {
    expect(parseLaunchOptions('?dev&seed=12')).toEqual({ dev: true, seed: 12 });
  });

  it('ignores a malformed seed', () => {
    expect(parseLaunchOptions('?seed=abc').seed).toBeNull();
    expect(parseLaunchOptions('?seed=-3').seed).toBeNull();
  });
});

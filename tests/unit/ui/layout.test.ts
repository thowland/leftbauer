import { describe, expect, it } from 'vitest';
import { screenPosition } from '../../../src/ui/layout';

describe('screenPosition', () => {
  it('seats the human at the bottom and the rest clockwise', () => {
    expect(screenPosition(0, 0)).toBe('bottom');
    expect(screenPosition(1, 0)).toBe('left');
    expect(screenPosition(2, 0)).toBe('top');
    expect(screenPosition(3, 0)).toBe('right');
  });

  it('works for any human seat', () => {
    expect(screenPosition(2, 2)).toBe('bottom');
    expect(screenPosition(3, 2)).toBe('left');
    expect(screenPosition(0, 2)).toBe('top');
    expect(screenPosition(1, 2)).toBe('right');
  });
});

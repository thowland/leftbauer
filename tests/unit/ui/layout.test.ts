import { describe, expect, it } from 'vitest';
import { screenPosition, seatName, teamName } from '../../../src/ui/layout';

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

describe('seat and team names', () => {
  it('names seats by where they sit', () => {
    expect(seatName(0, 0)).toBe('You');
    expect(seatName(1, 0)).toBe('Left opponent');
    expect(seatName(2, 0)).toBe('Partner');
    expect(seatName(3, 0)).toBe('Right opponent');
    expect(seatName(0, 2)).toBe('Partner');
  });

  it('names teams relative to the human', () => {
    expect(teamName(0, 0)).toBe('Us');
    expect(teamName(1, 0)).toBe('Them');
    expect(teamName(1, 3)).toBe('Us');
  });
});

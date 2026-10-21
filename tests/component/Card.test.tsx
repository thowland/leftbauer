import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../src/ui/Card';
import type { CardId } from '../../src/engine/cards';

function suitIcons(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('[data-suit]'));
}

describe('Card', () => {
  it('labels a face-up card for assistive technology', () => {
    render(<Card card="JH" />);
    expect(screen.getByRole('img', { name: 'Jack of hearts' })).toHaveAttribute('data-card', 'JH');
  });

  it.each<[CardId, number]>([
    ['9S', 9 + 2],
    ['TD', 10 + 2],
    ['AC', 1 + 2],
    ['KH', 1 + 2],
  ])('draws the right number of suit symbols on %s', (card, expected) => {
    const { container } = render(<Card card={card} />);
    expect(suitIcons(container)).toHaveLength(expected);
  });

  it('draws 10 in both corners of a ten, as strokes rather than text', () => {
    const { container } = render(<Card card="TS" />);
    expect(container.querySelectorAll('[data-rank="10"]')).toHaveLength(2);
    expect(container.querySelector('text')).toBeNull();
  });

  it('draws a court card’s rank in its panel too', () => {
    const { container } = render(<Card card="QH" />);
    expect(container.querySelectorAll('[data-rank="Q"]')).toHaveLength(3);
  });

  it('inks suits by deck variant (VP-3)', () => {
    const { container: standard } = render(<Card card="AC" />);
    const { container: fourColor } = render(<Card card="AC" deck="fourColor" />);
    expect(suitIcons(standard)[0]).toHaveAttribute('fill', 'var(--suit-black)');
    expect(suitIcons(fourColor)[0]).toHaveAttribute('fill', 'var(--suit-green)');
  });

  it('turns the lower-half pips upside down', () => {
    const { container } = render(<Card card="9H" />);
    const inverted = suitIcons(container).filter((g) =>
      g.getAttribute('transform')?.includes('rotate(180')
    );
    // Four lower pips plus the lower corner symbol.
    expect(inverted).toHaveLength(5);
  });

  it('draws a face-down card without revealing its identity', () => {
    const { container } = render(<Card card={null} className="extra" />);
    const back = screen.getByRole('img', { name: 'Face-down card' });
    expect(back).not.toHaveAttribute('data-card');
    expect(back).toHaveClass('card', 'extra');
    expect(suitIcons(container)).toHaveLength(0);
  });

  it('gives each card back its own pattern id', () => {
    const { container } = render(
      <>
        <Card card={null} />
        <Card card={null} />
      </>
    );
    const ids = Array.from(container.querySelectorAll('pattern')).map((p) => p.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

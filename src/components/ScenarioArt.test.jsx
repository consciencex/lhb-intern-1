import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioArt from './ScenarioArt.jsx';
import { SCENARIOS } from '../content/scenarios.js';

afterEach(cleanup);

describe('ScenarioArt', () => {
  it('renders an <svg> illustration for every scenario id', () => {
    SCENARIOS.forEach((s) => {
      const { container, unmount } = render(<ScenarioArt id={s.id} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      unmount();
    });
  });

  it('renders distinct artwork per id (not the same markup for every scenario)', () => {
    const markups = SCENARIOS.map((s) => {
      const { container, unmount } = render(<ScenarioArt id={s.id} />);
      const html = container.querySelector('svg').innerHTML;
      unmount();
      return html;
    });
    // All six illustrations must be unique — no copy-paste duplicates.
    expect(new Set(markups).size).toBe(markups.length);
  });

  it('falls back to a default illustration for an unknown id', () => {
    const { container } = render(<ScenarioArt id="does-not-exist" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders at the given size (width + height applied to the svg)', () => {
    const { container } = render(<ScenarioArt id="loan" size={120} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('defaults to a sensible compact size when none is given', () => {
    const { container } = render(<ScenarioArt id="loan" />);
    const svg = container.querySelector('svg');
    const w = Number(svg.getAttribute('width'));
    expect(w).toBeGreaterThanOrEqual(96);
    expect(w).toBeLessThanOrEqual(120);
  });
});

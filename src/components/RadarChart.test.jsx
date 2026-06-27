import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import RadarChart from './RadarChart.jsx';
import { COLORS } from '../theme.js';

afterEach(cleanup);

// Pull the data polygon's "points" attribute out of the rendered SVG.
function polygonPoints(container) {
  const poly = container.querySelector('[data-testid="radar-polygon"]');
  return poly.getAttribute('points');
}

// Parse "x1,y1 x2,y2 ..." into an array of [x, y] number pairs.
function parsePoints(str) {
  return str
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
}

describe('RadarChart', () => {
  const metrics = { eff: 70, acc: 60, risk: 40, comp: 80 };

  it('renders an <svg> element', () => {
    const { container } = render(<RadarChart metrics={metrics} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders all four axis labels', () => {
    render(<RadarChart metrics={metrics} />);
    expect(screen.getByText('Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('renders the four current metric values', () => {
    render(<RadarChart metrics={metrics} />);
    expect(screen.getByTestId('radar-value-eff')).toHaveTextContent('70');
    expect(screen.getByTestId('radar-value-acc')).toHaveTextContent('60');
    expect(screen.getByTestId('radar-value-risk')).toHaveTextContent('40');
    expect(screen.getByTestId('radar-value-comp')).toHaveTextContent('80');
  });

  it('colors each value via meterColor (high risk shows red, the rest by their bands)', () => {
    // eff 70 -> green, acc 60 -> green, risk 80 -> red, comp 30 -> red
    render(<RadarChart metrics={{ eff: 70, acc: 60, risk: 80, comp: 30 }} />);
    expect(screen.getByTestId('radar-value-eff')).toHaveStyle({ color: COLORS.green });
    expect(screen.getByTestId('radar-value-acc')).toHaveStyle({ color: COLORS.green });
    expect(screen.getByTestId('radar-value-risk')).toHaveStyle({ color: COLORS.red });
    expect(screen.getByTestId('radar-value-comp')).toHaveStyle({ color: COLORS.red });
  });

  it('shows a "lower is better" hint on the Risk axis', () => {
    render(<RadarChart metrics={metrics} />);
    expect(screen.getByText(/lower is better/i)).toBeInTheDocument();
  });

  it('renders a data polygon with exactly four vertices', () => {
    const { container } = render(<RadarChart metrics={metrics} />);
    const pts = parsePoints(polygonPoints(container));
    expect(pts).toHaveLength(4);
  });

  it('places a 100 vertex at the chart edge and a 0 vertex at the center', () => {
    const size = 200;
    const { container } = render(
      <RadarChart metrics={{ eff: 100, acc: 0, risk: 0, comp: 0 }} size={size} />,
    );
    const pts = parsePoints(polygonPoints(container));
    // Axis order top, right, bottom, left = eff, acc, risk, comp.
    const [eff, acc, risk, comp] = pts;
    const center = size / 2;

    // eff=100 sits at the TOP edge: same x as center, y is well above center.
    expect(eff[0]).toBeCloseTo(center, 5);
    expect(eff[1]).toBeLessThan(center);

    // acc/risk/comp are all 0 -> all three vertices collapse onto the center.
    for (const p of [acc, risk, comp]) {
      expect(p[0]).toBeCloseTo(center, 5);
      expect(p[1]).toBeCloseTo(center, 5);
    }
  });

  it('distinct metrics produce distinct polygon points (magnitudes drive geometry)', () => {
    const { container: c1 } = render(<RadarChart metrics={{ eff: 20, acc: 20, risk: 20, comp: 20 }} />);
    const small = polygonPoints(c1);
    cleanup();
    const { container: c2 } = render(<RadarChart metrics={{ eff: 90, acc: 90, risk: 90, comp: 90 }} />);
    const big = polygonPoints(c2);
    expect(small).not.toEqual(big);
  });

  it('strokes the data polygon in brand blue', () => {
    const { container } = render(<RadarChart metrics={metrics} />);
    const poly = container.querySelector('[data-testid="radar-polygon"]');
    expect(poly.getAttribute('stroke')).toBe(COLORS.blue);
  });

  it('honors a custom size for the svg', () => {
    const { container } = render(<RadarChart metrics={metrics} size={260} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('260');
    expect(svg.getAttribute('height')).toBe('260');
  });

  // The light variant (player view, white card) is the default and must keep
  // using the opaque light-card grid color.
  it('defaults to the light variant: grid rings stroked in COLORS.border', () => {
    const { container } = render(<RadarChart metrics={metrics} />);
    const ring = container.querySelector('polygon:not([data-testid="radar-polygon"])');
    expect(ring.getAttribute('stroke')).toBe(COLORS.border);
  });
});

describe('RadarChart — contained axis labels (no overflow into siblings)', () => {
  const metrics = { eff: 70, acc: 60, risk: 40, comp: 80 };

  // Helper: read an axis label's <text> x and textAnchor.
  function labelText(container, label) {
    const nodes = Array.from(container.querySelectorAll('text'));
    return nodes.find((n) => n.textContent === label);
  }

  it('clips to its own box (overflow hidden) so labels never bleed into neighbors', () => {
    const { container } = render(<RadarChart metrics={metrics} size={150} dark />);
    const svg = container.querySelector('svg');
    // overflow:visible would let the left/right labels spill into adjacent
    // radars — the redesign must clip to the component footprint.
    expect(svg.style.overflow).toBe('hidden');
  });

  it('keeps every axis-label anchor x within the SVG box at a small size', () => {
    const size = 150;
    const { container } = render(<RadarChart metrics={metrics} size={size} dark />);
    ['Efficiency', 'Accuracy', 'Risk', 'Compliance'].forEach((label) => {
      const node = labelText(container, label);
      const x = Number(node.getAttribute('x'));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(size);
    });
  });

  it('insets the side labels (Accuracy/Compliance) so their text stays inside the box', () => {
    const size = 150;
    const { container } = render(<RadarChart metrics={metrics} size={size} dark />);
    // Accuracy is anchored "start" on the right — its x must leave room to the
    // right edge for the word to render inside the box.
    const acc = labelText(container, 'Accuracy');
    expect(acc.getAttribute('text-anchor')).toBe('start');
    expect(Number(acc.getAttribute('x'))).toBeLessThan(size * 0.62);
    // Compliance is anchored "end" on the left — its x must leave room to the
    // left edge for the word.
    const comp = labelText(container, 'Compliance');
    expect(comp.getAttribute('text-anchor')).toBe('end');
    expect(Number(comp.getAttribute('x'))).toBeGreaterThan(size * 0.38);
  });

  it('scales the label font down at small sizes and up at large sizes', () => {
    const small = render(<RadarChart metrics={metrics} size={120} dark />);
    const smallFont = parseFloat(labelText(small.container, 'Efficiency').style.fontSize);
    cleanup();
    const large = render(<RadarChart metrics={metrics} size={260} dark />);
    const largeFont = parseFloat(labelText(large.container, 'Efficiency').style.fontSize);
    expect(largeFont).toBeGreaterThan(smallFont);
  });
});

describe('RadarChart — dark variant (projector)', () => {
  const metrics = { eff: 70, acc: 60, risk: 40, comp: 80 };

  it('strokes grid rings and spokes in a translucent light color (not COLORS.border)', () => {
    const { container } = render(<RadarChart metrics={metrics} dark />);
    const rings = container.querySelectorAll('polygon:not([data-testid="radar-polygon"])');
    expect(rings.length).toBeGreaterThan(0);
    rings.forEach((ring) => {
      const stroke = ring.getAttribute('stroke');
      expect(stroke).not.toBe(COLORS.border);
      // A translucent white grid is legible on the dark projector.
      expect(stroke).toMatch(/rgba\(255\s*,\s*255\s*,\s*255/);
    });
    const spoke = container.querySelector('line');
    expect(spoke.getAttribute('stroke')).toMatch(/rgba\(255\s*,\s*255\s*,\s*255/);
  });

  it('keeps the data polygon in brand blue (unchanged from light)', () => {
    const { container } = render(<RadarChart metrics={metrics} dark />);
    const poly = container.querySelector('[data-testid="radar-polygon"]');
    expect(poly.getAttribute('stroke')).toBe(COLORS.blue);
  });

  it('renders all four axis labels in the dark variant too', () => {
    render(<RadarChart metrics={metrics} dark />);
    expect(screen.getByText('Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('renders axis labels in a light color for the dark background', () => {
    render(<RadarChart metrics={metrics} dark />);
    const label = screen.getByText('Efficiency');
    // Light label, distinctly not the light-card slate label color.
    expect(label).not.toHaveStyle({ fill: COLORS.slate500 });
  });

  it('still shows the four metric values (colored via meterColor)', () => {
    render(<RadarChart metrics={{ eff: 70, acc: 60, risk: 80, comp: 30 }} dark />);
    expect(screen.getByTestId('radar-value-eff')).toHaveStyle({ color: COLORS.green });
    expect(screen.getByTestId('radar-value-risk')).toHaveStyle({ color: COLORS.red });
  });
});

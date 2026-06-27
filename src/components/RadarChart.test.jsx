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
});

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Meters from './Meters.jsx';
import { COLORS } from '../theme.js';

afterEach(cleanup);

describe('Meters', () => {
  it('renders the three numeric meter values', () => {
    render(<Meters meters={{ eff: 65, risk: 30, comp: 70 }} />);
    expect(screen.getByTestId('meter-value-eff')).toHaveTextContent('65');
    expect(screen.getByTestId('meter-value-risk')).toHaveTextContent('30');
    expect(screen.getByTestId('meter-value-comp')).toHaveTextContent('70');
  });

  it('sets each bar width to value% and color from meterColor (green band)', () => {
    render(<Meters meters={{ eff: 65, risk: 30, comp: 70 }} />);
    // eff 65 -> >=60 green
    const effBar = screen.getByTestId('meter-bar-eff');
    expect(effBar).toHaveStyle({ width: '65%' });
    expect(effBar).toHaveStyle({ background: COLORS.green });
    // risk 30 -> <=40 green
    const riskBar = screen.getByTestId('meter-bar-risk');
    expect(riskBar).toHaveStyle({ width: '30%' });
    expect(riskBar).toHaveStyle({ background: COLORS.green });
    // comp 70 -> >=60 green
    const compBar = screen.getByTestId('meter-bar-comp');
    expect(compBar).toHaveStyle({ width: '70%' });
    expect(compBar).toHaveStyle({ background: COLORS.green });
  });

  it('uses amber/red colors per thresholds', () => {
    render(<Meters meters={{ eff: 40, risk: 80, comp: 20 }} />);
    // eff 40 -> >=38 amber
    expect(screen.getByTestId('meter-bar-eff')).toHaveStyle({ background: COLORS.amber });
    // risk 80 -> >65 red
    expect(screen.getByTestId('meter-bar-risk')).toHaveStyle({ background: COLORS.red });
    // comp 20 -> <38 red
    expect(screen.getByTestId('meter-bar-comp')).toHaveStyle({ background: COLORS.red });
    expect(screen.getByTestId('meter-bar-eff')).toHaveStyle({ width: '40%' });
    expect(screen.getByTestId('meter-bar-risk')).toHaveStyle({ width: '80%' });
    expect(screen.getByTestId('meter-bar-comp')).toHaveStyle({ width: '20%' });
  });
});

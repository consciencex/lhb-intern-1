import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReportCard from './ReportCard';

afterEach(cleanup);

describe('ReportCard', () => {
  const baseProps = {
    score: 30,
    maxScore: 60,
    playerName: 'Asha',
    correctCount: 3,
    totalQ: 6,
    breachCount: 0,
    meters: { eff: 70, risk: 30, comp: 80 },
    onRestart: () => {},
  };

  it('renders score, maxScore, player name, and the optimal-decisions line', () => {
    render(<ReportCard {...baseProps} />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('/ 60 pts')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('3 of 6 optimal decisions')).toBeInTheDocument();
  });

  it('does NOT render the breach pill when breachCount is 0', () => {
    render(<ReportCard {...baseProps} breachCount={0} />);
    expect(screen.queryByText(/compliance breach/)).not.toBeInTheDocument();
  });

  it('renders the breach pill with singular wording when breachCount is 1', () => {
    render(<ReportCard {...baseProps} breachCount={1} />);
    expect(screen.getByText('🚨 1 compliance breach triggered')).toBeInTheDocument();
  });

  it('renders the breach pill with plural suffix "es" when breachCount is not 1', () => {
    render(<ReportCard {...baseProps} breachCount={2} />);
    expect(screen.getByText('🚨 2 compliance breaches triggered')).toBeInTheDocument();
  });

  it('renders the three profile bars and sets the Risk Control bar width to (100 - risk)%', () => {
    render(<ReportCard {...baseProps} meters={{ eff: 70, risk: 30, comp: 80 }} />);
    // Efficiency bar -> eff pct (70%)
    const effBar = screen.getByTestId('report-bar-eff');
    expect(effBar).toHaveStyle({ width: '70%' });
    // Risk Control bar -> safePct = 100 - risk = 70%
    const riskBar = screen.getByTestId('report-bar-risk');
    expect(riskBar).toHaveStyle({ width: '70%' });
    // Compliance bar -> comp pct (80%)
    const compBar = screen.getByTestId('report-bar-comp');
    expect(compBar).toHaveStyle({ width: '80%' });
  });

  it('calls onRestart when Play Again is clicked', () => {
    const onRestart = vi.fn();
    render(<ReportCard {...baseProps} onRestart={onRestart} />);
    // Regex matcher is whitespace-agnostic: the rendered button text
    // '↺  Play Again' (two spaces) is normalized by testing-library to a
    // single space, so an exact two-space string literal would not match.
    fireEvent.click(screen.getByText(/Play Again/));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

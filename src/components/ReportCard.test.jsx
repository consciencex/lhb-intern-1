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
    meters: { eff: 70, acc: 65, risk: 30, comp: 80 },
    onRestart: () => {},
  };

  it('renders score, maxScore, player name, and the optimal-decisions line', () => {
    render(<ReportCard {...baseProps} />);
    // Scope to the big debrief score so it isn't confused with a radar axis value.
    expect(screen.getByTestId('debrief-score')).toHaveTextContent('30');
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

  it('renders a 4-axis performance-profile radar (labels + raw values), not the old bars', () => {
    const { container } = render(
      <ReportCard {...baseProps} meters={{ eff: 70, acc: 65, risk: 30, comp: 80 }} />,
    );
    // Radar is an SVG with all four axis labels.
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Risk')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    // Raw meter values are shown on each axis (no safePct inversion).
    expect(screen.getByTestId('radar-value-eff')).toHaveTextContent('70');
    expect(screen.getByTestId('radar-value-acc')).toHaveTextContent('65');
    expect(screen.getByTestId('radar-value-risk')).toHaveTextContent('30');
    expect(screen.getByTestId('radar-value-comp')).toHaveTextContent('80');
    // The old per-metric bars are gone.
    expect(screen.queryByTestId('report-bar-eff')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-bar-risk')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-bar-comp')).not.toBeInTheDocument();
  });

  it('keeps the PERFORMANCE PROFILE heading', () => {
    render(<ReportCard {...baseProps} />);
    expect(screen.getByText(/PERFORMANCE PROFILE/)).toBeInTheDocument();
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

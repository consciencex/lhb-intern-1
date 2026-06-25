import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsequenceCard from './ConsequenceCard';

afterEach(cleanup);

// Minimal scenario fixture, values copied verbatim from the prototype 'loan' object.
const loan = {
  id: 'loan',
  title: 'Personal Loan Approval',
  desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
  attrs: ['High Risk', 'Regulated', 'Medium Volume'],
  choices: {
    automate: { eff: 30, risk: 30, comp: -35, breach: true, msg: 'Automated approvals triggered a BOT regulatory audit. Decisions cannot be explained to the regulator — full portfolio review ordered.' },
    hitl: { eff: 15, risk: -10, comp: 20, breach: false, msg: 'AI pre-scores all applications. Officer reviews flagged cases and signs off. Complete audit trail — regulators satisfied.' },
    manual: { eff: -20, risk: -5, comp: 10, breach: false, msg: 'Officers review each case by hand. Backlog reaches 3 days. Customer satisfaction drops significantly.' },
  },
  best: 'hitl',
};

describe('ConsequenceCard', () => {
  it('renders the red COMPLIANCE BREACH card with msg and Optimal line when the choice breaches', () => {
    render(<ConsequenceCard scenario={loan} choice="automate" />);
    expect(screen.getByText('COMPLIANCE BREACH')).toBeInTheDocument();
    expect(screen.getByText(loan.choices.automate.msg)).toBeInTheDocument();
    // Optimal line shows the best choice label ('Human-in-Loop' for loan).
    expect(screen.getByText('Optimal:')).toBeInTheDocument();
    expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
  });

  it('renders the neutral/green consequence WITHOUT an Optimal line for a non-breach best choice', () => {
    render(<ConsequenceCard scenario={loan} choice="hitl" />);
    expect(screen.queryByText('COMPLIANCE BREACH')).not.toBeInTheDocument();
    expect(screen.getByText(loan.choices.hitl.msg)).toBeInTheDocument();
    // Best choice => no Optimal line.
    expect(screen.queryByText('Optimal:')).not.toBeInTheDocument();
  });

  it('renders the neutral consequence WITH an Optimal line for a non-breach non-best choice', () => {
    render(<ConsequenceCard scenario={loan} choice="manual" />);
    expect(screen.queryByText('COMPLIANCE BREACH')).not.toBeInTheDocument();
    expect(screen.getByText(loan.choices.manual.msg)).toBeInTheDocument();
    expect(screen.getByText('Optimal:')).toBeInTheDocument();
    // best label for loan is 'Human-in-Loop'
    expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
  });
});

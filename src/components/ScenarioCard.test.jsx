import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioCard from './ScenarioCard.jsx';

afterEach(cleanup);

const scenario = {
  id: 'loan',
  title: 'Personal Loan Approval',
  desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
  attrs: ['High Risk', 'Regulated', 'Medium Volume'],
  choices: {},
  best: 'hitl',
};

describe('ScenarioCard', () => {
  it('renders the Q{qNum} of {qTotal} pill', () => {
    render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.getByText('Q1 of 6')).toBeInTheDocument();
  });

  it('renders the player name pill', () => {
    render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Asha" />);
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });

  it('renders the title and description', () => {
    render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.getByText('Personal Loan Approval')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.'
      )
    ).toBeInTheDocument();
  });

  it('renders all attr tags', () => {
    render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Regulated')).toBeInTheDocument();
    expect(screen.getByText('Medium Volume')).toBeInTheDocument();
  });

  it('renders the scenario illustration keyed by the scenario id', () => {
    const { container } = render(
      <ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />
    );
    const art = container.querySelector('[data-testid="scenario-art"]');
    expect(art).toBeInTheDocument();
    expect(art).toHaveAttribute('data-art-id', 'loan');
  });
});

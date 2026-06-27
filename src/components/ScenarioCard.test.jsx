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
  context: [
    'Volume: ~80 applications/day — officers are the bottleneck',
    'Regulated: BOT requires every credit decision to be explainable & auditable',
    'Income mis-statement & fraud risk on retail loans is real',
  ],
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

  it('renders the KEY CONSIDERATIONS label and every context bullet', () => {
    render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.getByText('KEY CONSIDERATIONS')).toBeInTheDocument();
    for (const line of scenario.context) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it('omits the KEY CONSIDERATIONS section when context is empty, without crashing', () => {
    const noContext = { ...scenario, context: [] };
    render(<ScenarioCard scenario={noContext} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.queryByText('KEY CONSIDERATIONS')).not.toBeInTheDocument();
    // The rest of the card still renders.
    expect(screen.getByText('Personal Loan Approval')).toBeInTheDocument();
  });

  it('omits the KEY CONSIDERATIONS section when context is undefined, without crashing', () => {
    const { context, ...noContext } = scenario;
    void context;
    render(<ScenarioCard scenario={noContext} qNum={1} qTotal={6} playerName="Team Lead" />);
    expect(screen.queryByText('KEY CONSIDERATIONS')).not.toBeInTheDocument();
    expect(screen.getByText('Personal Loan Approval')).toBeInTheDocument();
  });
});

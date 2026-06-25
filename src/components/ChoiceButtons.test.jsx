import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChoiceButtons from './ChoiceButtons.jsx';
import { COLORS } from '../theme.js';

afterEach(cleanup);

const scenario = {
  id: 'loan',
  title: 'Personal Loan Approval',
  desc: 'desc',
  attrs: ['High Risk', 'Regulated', 'Medium Volume'],
  choices: {
    automate: { eff: 30, risk: 30, comp: -35, breach: true, msg: 'a' },
    hitl: { eff: 15, risk: -10, comp: 20, breach: false, msg: 'h' },
    manual: { eff: -20, risk: -5, comp: 10, breach: false, msg: 'm' },
  },
  best: 'hitl',
};

describe('ChoiceButtons', () => {
  it('renders 3 labels and sublabels in order', () => {
    render(
      <ChoiceButtons scenario={scenario} answered={false} choice={null} onPick={() => {}} />
    );
    expect(screen.getByText('Automate Fully')).toBeInTheDocument();
    expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
    expect(screen.getByText('Manual Review')).toBeInTheDocument();
    expect(screen.getByText('Fully automated — no human step')).toBeInTheDocument();
    expect(screen.getByText('AI recommends, human reviews and approves')).toBeInTheDocument();
    expect(screen.getByText('Officer handles the entire process by hand')).toBeInTheDocument();
  });

  it('calls onPick with the choice key when not answered', () => {
    const onPick = vi.fn();
    render(
      <ChoiceButtons scenario={scenario} answered={false} choice={null} onPick={onPick} />
    );
    fireEvent.click(screen.getByTestId('choice-automate'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('automate');

    fireEvent.click(screen.getByTestId('choice-hitl'));
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(onPick).toHaveBeenLastCalledWith('hitl');

    fireEvent.click(screen.getByTestId('choice-manual'));
    expect(onPick).toHaveBeenCalledTimes(3);
    expect(onPick).toHaveBeenLastCalledWith('manual');
  });

  it('does NOT call onPick once answered', () => {
    const onPick = vi.fn();
    render(
      <ChoiceButtons scenario={scenario} answered={true} choice="hitl" onPick={onPick} />
    );
    fireEvent.click(screen.getByTestId('choice-automate'));
    fireEvent.click(screen.getByTestId('choice-hitl'));
    fireEvent.click(screen.getByTestId('choice-manual'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('highlights selected best choice with green border and dims others', () => {
    render(
      <ChoiceButtons scenario={scenario} answered={true} choice="hitl" onPick={() => {}} />
    );
    const selected = screen.getByTestId('choice-hitl');
    expect(selected).toHaveStyle({ borderColor: COLORS.green });
    expect(selected).toHaveStyle({ opacity: '1' });

    expect(screen.getByTestId('choice-automate')).toHaveStyle({ opacity: '0.4' });
    expect(screen.getByTestId('choice-manual')).toHaveStyle({ opacity: '0.4' });
  });

  it('highlights selected non-best choice with red border and dims others', () => {
    render(
      <ChoiceButtons scenario={scenario} answered={true} choice="automate" onPick={() => {}} />
    );
    const selected = screen.getByTestId('choice-automate');
    expect(selected).toHaveStyle({ borderColor: COLORS.red });
    expect(selected).toHaveStyle({ opacity: '1' });
    expect(screen.getByTestId('choice-hitl')).toHaveStyle({ opacity: '0.4' });
    expect(screen.getByTestId('choice-manual')).toHaveStyle({ opacity: '0.4' });
  });
});

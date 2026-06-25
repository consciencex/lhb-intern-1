import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import SegmentedBars from './SegmentedBars.jsx';
import { aggregate } from '../game/gameLogic.js';

afterEach(cleanup);

describe('SegmentedBars', () => {
  it('renders three rows from aggregate bars with correct pctStr text', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    render(<SegmentedBars bars={agg.bars} respondents={4} />);

    const rows = screen.getAllByTestId('seg-row');
    expect(rows).toHaveLength(3);

    // automate 2/4=50%, hitl 1/4=25%, manual 1/4=25%
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(2);
    expect(screen.getByText('Automate Fully')).toBeInTheDocument();
    expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
    expect(screen.getByText('Manual Review')).toBeInTheDocument();
  });

  it('renders the respondents count in the header', () => {
    const agg = aggregate([{ choice: 'hitl' }]);
    render(<SegmentedBars bars={agg.bars} respondents={1} />);
    expect(screen.getByText('ROOM RESPONSE — 1 PLAYERS')).toBeInTheDocument();
  });

  it('sets each fill bar width to its pctStr', () => {
    const agg = aggregate([{ choice: 'automate' }, { choice: 'hitl' }]);
    render(<SegmentedBars bars={agg.bars} respondents={2} />);
    const fills = screen.getAllByTestId('seg-fill');
    expect(fills).toHaveLength(3);
    // automate 1/2=50%, hitl 1/2=50%, manual 0%
    expect(fills[0]).toHaveStyle({ width: '50%' });
    expect(fills[1]).toHaveStyle({ width: '50%' });
    expect(fills[2]).toHaveStyle({ width: '0%' });
  });
});

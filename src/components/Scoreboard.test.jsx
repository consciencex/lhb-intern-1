import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scoreboard from './Scoreboard.jsx';
import { buildScoreboard } from '../game/gameLogic.js';

afterEach(cleanup);

describe('Scoreboard', () => {
  it('renders team rows sorted by score descending', () => {
    const players = [
      { name: 'A1', team: 'Alpha', score: 10 },
      { name: 'A2', team: 'Alpha', score: 20 },
      { name: 'B1', team: 'Beta', score: 5 },
      { name: 'G1', team: 'Gamma', score: 40 },
    ];
    const teams = buildScoreboard(players);
    render(<Scoreboard teams={teams} />);

    const rows = screen.getAllByTestId('score-row');
    // Gamma 40, Alpha 30, Beta 5
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Gamma')).toBeInTheDocument();
    expect(within(rows[0]).getByText('40')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alpha')).toBeInTheDocument();
    expect(within(rows[1]).getByText('30')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Beta')).toBeInTheDocument();
    expect(within(rows[2]).getByText('5')).toBeInTheDocument();
  });

  it('renders the SCOREBOARD header', () => {
    render(<Scoreboard teams={buildScoreboard([])} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
  });
});

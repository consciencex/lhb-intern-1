import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './ScreenView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

afterEach(cleanup);

describe('ScreenView', () => {
  it('shows the current scenario title from the seeded station', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    const expectedTitle = SCENARIOS[station.currentIdx].title;
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
  });

  it('renders three response bars with at least one non-zero percentage', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);

    const rows = screen.getAllByTestId('seg-row');
    expect(rows).toHaveLength(3);

    const fills = screen.getAllByTestId('seg-fill');
    const widths = fills.map((f) => f.style.width);
    // seeded spread must produce at least one bar wider than 0%
    const hasNonZero = widths.some((w) => w !== '0%' && w !== '' && w !== '0');
    expect(hasNonZero).toBe(true);
  });

  it('renders the scoreboard with at least one team row', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
    expect(screen.getAllByTestId('score-row').length).toBeGreaterThan(0);
  });

  it('shows the CURRENT SCENARIO header with the question number', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    const qNum = station.currentIdx + 1;
    expect(
      screen.getByText(`CURRENT SCENARIO · Q${qNum} / ${SCENARIOS.length}`)
    ).toBeInTheDocument();
  });
});

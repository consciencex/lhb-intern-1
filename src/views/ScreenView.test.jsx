import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './ScreenView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

afterEach(cleanup);

// Seeded + revealed: the projector shows live bars only once the host reveals.
function revealedScreen() {
  const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
  gameAPI.setReveal(true);
  return gameAPI;
}

describe('ScreenView', () => {
  it('shows the current scenario title from the seeded station (regardless of reveal)', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    const expectedTitle = SCENARIOS[station.currentIdx].title;
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
  });

  it('renders three response bars with at least one non-zero percentage when revealed', () => {
    const gameAPI = revealedScreen();
    render(<ScreenView gameAPI={gameAPI} />);

    const rows = screen.getAllByTestId('seg-row');
    expect(rows).toHaveLength(3);

    const fills = screen.getAllByTestId('seg-fill');
    const widths = fills.map((f) => f.style.width);
    // seeded spread must produce at least one bar wider than 0%
    const hasNonZero = widths.some((w) => w !== '0%' && w !== '' && w !== '0');
    expect(hasNonZero).toBe(true);
  });

  it('renders the scoreboard with at least one team row (regardless of reveal)', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
    expect(screen.getAllByTestId('score-row').length).toBeGreaterThan(0);
  });

  it('shows the CURRENT SCENARIO header with the question number (regardless of reveal)', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    const qNum = station.currentIdx + 1;
    expect(
      screen.getByText(`CURRENT SCENARIO · Q${qNum} / ${SCENARIOS.length}`)
    ).toBeInTheDocument();
  });

  it('hides the response bars until the host reveals, showing a locked placeholder', () => {
    // seed:true leaves reveal:false (responses come in hidden).
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);

    // No bars while hidden.
    expect(screen.queryAllByTestId('seg-row')).toHaveLength(0);
    // Locked placeholder shows responded / total + a waiting message.
    expect(screen.getByText(/Responses hidden/i)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${station.respondedCount}\\s*/\\s*${station.players.length}`))
    ).toBeInTheDocument();
  });

  it('reveals the bars when the host toggles reveal on', async () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);
    // Hidden first.
    expect(screen.queryAllByTestId('seg-row')).toHaveLength(0);

    await act(async () => {
      await gameAPI.setReveal(true);
    });

    expect(screen.getAllByTestId('seg-row')).toHaveLength(3);
    expect(screen.queryByText(/Responses hidden/i)).not.toBeInTheDocument();
  });

  it('shows the room code prominently so players know which room to join', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);
    // The header line reads "Join: room DEMO" (distinct from the QR's "Scan to join").
    expect(screen.getByText(/Join: room DEMO/i)).toBeInTheDocument();
    expect(screen.getAllByText(/DEMO/).length).toBeGreaterThan(0);
  });

  it('shows a join QR code so players can scan to join the room', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const { container } = render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText(/Scan to join/i)).toBeInTheDocument();
    // The encoded join URL is also printed for typing; it targets the play view.
    expect(screen.getByText(/view=play/)).toHaveTextContent('room=DEMO');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

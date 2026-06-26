import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './ScreenView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';
import { CHOICE_LABELS } from '../content/scenarios.js';
import { optimalRate } from '../game/gameLogic.js';

afterEach(cleanup);

function seededScreen() {
  return createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
}

describe('ScreenView — live all-scenarios dashboard (no reveal gating)', () => {
  it('renders a live results card for EVERY scenario, each titled', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    const cards = screen.getAllByTestId('scenario-result');
    expect(cards).toHaveLength(SCENARIOS.length);
    SCENARIOS.forEach((s) => {
      expect(screen.getByText(s.title)).toBeInTheDocument();
    });
  });

  it('shows response breakdown bars with non-zero data for MULTIPLE scenarios immediately (no reveal needed)', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    const cards = screen.getAllByTestId('scenario-result');

    let scenariosWithNonZeroBar = 0;
    cards.forEach((card) => {
      const fills = within(card).getAllByTestId('scenario-bar-fill');
      // each scenario has exactly the 3 approach bars
      expect(fills).toHaveLength(3);
      const widths = fills.map((f) => f.style.width);
      if (widths.some((w) => w !== '0%' && w !== '' && w !== '0')) {
        scenariosWithNonZeroBar += 1;
      }
    });
    expect(scenariosWithNonZeroBar).toBeGreaterThan(1);
  });

  it('marks the BEST/optimal answer on each scenario card', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    const cards = screen.getAllByTestId('scenario-result');
    cards.forEach((card, i) => {
      const best = SCENARIOS[i].best;
      const marker = within(card).getByTestId('best-marker');
      // The marker names the optimal approach's label.
      expect(marker).toHaveTextContent(CHOICE_LABELS[best]);
    });
  });

  it('shows a per-scenario response count', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    const cards = screen.getAllByTestId('scenario-result');
    cards.forEach((card, i) => {
      const count = station.decisions.filter((d) => d.scenarioIdx === i).length;
      const countEl = within(card).getByTestId('scenario-count');
      expect(countEl).toHaveTextContent(String(count));
    });
  });

  it('shows live totals: players joined and total responses', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByTestId('total-players')).toHaveTextContent(
      String(station.players.length),
    );
    expect(screen.getByTestId('total-responses')).toHaveTextContent(
      String(station.decisions.length),
    );
  });

  it('shows the overall optimal-choice rate summary', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    const pct = Math.round(optimalRate(station.decisions) * 100);
    expect(screen.getByTestId('optimal-rate')).toHaveTextContent(`${pct}%`);
  });

  it('renders the scoreboard with at least one team row', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
    expect(screen.getAllByTestId('score-row').length).toBeGreaterThan(0);
  });

  it('shows the room code prominently so players know which room to join', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.getByText(/room DEMO/i)).toBeInTheDocument();
  });

  it('shows a join QR code so players can scan to join the room', () => {
    const { container } = render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.getByText(/Scan to join/i)).toBeInTheDocument();
    // The encoded join URL targets the play view.
    expect(screen.getByText(/view=play/)).toHaveTextContent('room=DEMO');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('updates live as a new answer arrives (totals rise, no reveal step)', async () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: false });
    render(<ScreenView gameAPI={gameAPI} />);

    // Empty to start.
    expect(screen.getByTestId('total-responses')).toHaveTextContent('0');

    await act(async () => {
      const { playerId } = await gameAPI.joinRoom({ name: 'Dana' });
      await gameAPI.emit('decision', {
        playerId,
        scenarioId: SCENARIOS[0].id,
        scenarioIdx: 0,
        choice: SCENARIOS[0].best,
        isBest: true,
        breach: false,
      });
    });

    // The dashboard reflects the new answer immediately — no reveal needed.
    expect(screen.getByTestId('total-players')).toHaveTextContent('1');
    expect(screen.getByTestId('total-responses')).toHaveTextContent('1');
    expect(screen.getByTestId('optimal-rate')).toHaveTextContent('100%');
  });
});

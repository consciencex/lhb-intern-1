// src/views/HostView.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostView from './HostView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';
import { CHOICE_LABELS } from '../content/scenarios.js';

afterEach(() => {
  cleanup();
});

function renderHost() {
  const gameAPI = createMockGameAPI({ view: 'host', roomCode: 'DEMO', seed: true });
  const advanceSpy = vi.spyOn(gameAPI, 'advance');
  const setRevealSpy = vi.spyOn(gameAPI, 'setReveal');
  const utils = render(<HostView gameAPI={gameAPI} />);
  return { gameAPI, advanceSpy, setRevealSpy, ...utils };
}

describe('HostView', () => {
  it('displays the room code near the header so the facilitator can read it out', () => {
    renderHost();
    // Room is DEMO (renderHost seeds roomCode 'DEMO'). The header badge reads
    // exactly "Room DEMO" with a capital R; the QR card below uses lowercase
    // "room DEMO" inside a longer line, so match the header badge's exact text.
    const headerBadge = screen.getByText(
      (_content, el) => el.tagName === 'DIV' && el.textContent === 'Room DEMO'
    );
    expect(headerBadge).toHaveTextContent('Room');
    expect(headerBadge).toHaveTextContent('DEMO');
  });

  it('shows the SCENARIO stat card as 1 over the total scenario count', () => {
    renderHost();
    const scenarioCard = screen.getByText('SCENARIO').parentElement;
    expect(scenarioCard).toHaveTextContent('1');
    expect(scenarioCard).toHaveTextContent('/' + SCENARIOS.length);
    expect(scenarioCard).toHaveTextContent('/6');
  });

  it('shows the RESPONDED stat card with the seeded counts', () => {
    const { gameAPI } = renderHost();
    const station = gameAPI.getStation();
    expect(station.players.length).toBeGreaterThan(0);
    const respondedCard = screen.getByText('RESPONDED').parentElement;
    expect(respondedCard).toHaveTextContent(String(station.respondedCount));
    expect(respondedCard).toHaveTextContent('/' + station.players.length);
  });

  it('shows NOW PLAYING with the current scenario title and its attr tags', () => {
    renderHost();
    expect(screen.getByText('NOW PLAYING')).toBeInTheDocument();
    expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
    SCENARIOS[0].attrs.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('advances the scenario when Advance is clicked', () => {
    const { advanceSpy } = renderHost();
    expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Advance to Next Scenario'));

    expect(advanceSpy).toHaveBeenCalledTimes(1);
    const scenarioCard = screen.getByText('SCENARIO').parentElement;
    expect(scenarioCard).toHaveTextContent('2');
    expect(screen.getByText(SCENARIOS[1].title)).toBeInTheDocument();
    expect(screen.queryByText(SCENARIOS[0].title)).not.toBeInTheDocument();
  });

  it('toggles the Reveal Aggregate label from OFF to ON', () => {
    const { setRevealSpy } = renderHost();
    const revealBtn = screen
      .getByText('Reveal Aggregate on Screen', { exact: false })
      .closest('button');
    expect(within(revealBtn).getByText('OFF')).toBeInTheDocument();

    fireEvent.click(revealBtn);

    expect(setRevealSpy).toHaveBeenCalledWith(true);
    const revealBtnAfter = screen
      .getByText('Reveal Aggregate on Screen', { exact: false })
      .closest('button');
    expect(within(revealBtnAfter).getByText('ON')).toBeInTheDocument();
    expect(within(revealBtnAfter).queryByText('OFF')).not.toBeInTheDocument();
  });

  it('shows a join QR code so the host can display it for players to scan', () => {
    const { container } = renderHost();
    expect(screen.getByText(/Scan to join/i)).toBeInTheDocument();
    // The encoded join URL targets the player view for this room.
    expect(screen.getByText(/view=play/)).toHaveTextContent('room=DEMO');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the LIVE RESULTS panel with the three response labels and a responded count, even when reveal is OFF', () => {
    const { gameAPI } = renderHost();
    const station = gameAPI.getStation();
    // Reveal defaults OFF for a seeded host station — the host still sees data.
    expect(station.reveal).toBe(false);

    expect(screen.getByText(/LIVE RESULTS/i)).toBeInTheDocument();
    expect(screen.getByText(CHOICE_LABELS.automate)).toBeInTheDocument();
    expect(screen.getByText(CHOICE_LABELS.hitl)).toBeInTheDocument();
    expect(screen.getByText(CHOICE_LABELS.manual)).toBeInTheDocument();

    // "{responded} / {players} answered" appears in the live panel.
    expect(
      screen.getByText(
        new RegExp(`${station.respondedCount}\\s*/\\s*${station.players.length}\\s*answered`)
      )
    ).toBeInTheDocument();
  });

  it('renders the live result bars with NON-ZERO percentages, proving the host sees backend data with reveal OFF', () => {
    renderHost();
    const rows = screen.getAllByTestId('host-result-row');
    expect(rows).toHaveLength(3);

    const fills = screen.getAllByTestId('host-result-fill');
    const widths = fills.map((f) => f.style.width);
    const hasNonZero = widths.some((w) => w !== '0%' && w !== '' && w !== '0');
    expect(hasNonZero).toBe(true);
  });

  it('renders the team scoreboard rows in the live panel', () => {
    renderHost();
    expect(screen.getAllByTestId('host-score-row').length).toBeGreaterThan(0);
  });
});

// src/views/HostView.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostView from './HostView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

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
    // Room is DEMO (renderHost seeds roomCode 'DEMO').
    expect(screen.getByText(/Room/i)).toBeInTheDocument();
    expect(screen.getByText(/DEMO/)).toBeInTheDocument();
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
});

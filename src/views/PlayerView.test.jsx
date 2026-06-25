// src/views/PlayerView.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerView from './PlayerView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

function makeApi() {
  return createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false });
}

async function startGameAs(name) {
  const api = makeApi();
  render(<PlayerView gameAPI={api} />);
  const input = screen.getByPlaceholderText('Enter your name…');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByText('Start Simulation →'));
  await screen.findByText(SCENARIOS[0].title);
  return api;
}

describe('PlayerView — intro / join', () => {
  it('shows the intro Start button and stats, and no scenario before starting', () => {
    const api = makeApi();
    render(<PlayerView gameAPI={api} />);
    expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
    expect(screen.getByText('BREACH RISKS')).toBeInTheDocument();
    expect(screen.queryByText(SCENARIOS[0].title)).not.toBeInTheDocument();
  });

  it('starts scenario 1 (loan) after entering a name and clicking Start', async () => {
    await startGameAs('Dana');
    expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
    expect(screen.getByText('Dana')).toBeInTheDocument();
  });
});

describe('PlayerView — play / pick', () => {
  it('best choice on loan awards 10 and emits the decision payload, then shows consequence', async () => {
    const api = makeApi();
    const awardSpy = vi.spyOn(api, 'award');
    const emitSpy = vi.spyOn(api, 'emit');

    render(<PlayerView gameAPI={api} />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    fireEvent.click(screen.getByText('Start Simulation →'));
    await screen.findByText(SCENARIOS[0].title);

    // SCENARIOS[0].best === 'hitl' -> click the Human-in-Loop choice.
    fireEvent.click(screen.getByText('Human-in-Loop'));

    expect(awardSpy).toHaveBeenCalledTimes(1);
    expect(awardSpy).toHaveBeenCalledWith(10);
    expect(emitSpy).toHaveBeenCalledWith('decision', {
      scenarioId: 'loan',
      scenarioIdx: 0,
      choice: 'hitl',
      isBest: true,
      breach: false,
    });

    // Consequence shown -> Next button appears.
    expect(screen.getByText('Next Scenario →')).toBeInTheDocument();
  });

  it('ignores a second pick after the scenario is answered', async () => {
    const api = makeApi();
    const awardSpy = vi.spyOn(api, 'award');
    const emitSpy = vi.spyOn(api, 'emit');

    render(<PlayerView gameAPI={api} />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    fireEvent.click(screen.getByText('Start Simulation →'));
    await screen.findByText(SCENARIOS[0].title);

    fireEvent.click(screen.getByText('Human-in-Loop'));
    // A second click on any choice must be ignored.
    fireEvent.click(screen.getByText('Automate Fully'));

    expect(awardSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('advancing through all scenarios reaches the ReportCard with the correct count', async () => {
    const api = makeApi();
    render(<PlayerView gameAPI={api} />);
    fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    fireEvent.click(screen.getByText('Start Simulation →'));

    // Answer every scenario with its best choice, then advance.
    for (let i = 0; i < SCENARIOS.length; i++) {
      await screen.findByText(SCENARIOS[i].title);
      const best = SCENARIOS[i].best; // 'automate' | 'hitl' | 'manual'
      const label =
        best === 'automate'
          ? 'Automate Fully'
          : best === 'hitl'
          ? 'Human-in-Loop'
          : 'Manual Review';
      fireEvent.click(screen.getByText(label));
      fireEvent.click(screen.getByText('Next Scenario →'));
    }

    // ReportCard debrief header + perfect optimal count (every best choice picked).
    await screen.findByText('MISSION DEBRIEF');
    expect(
      screen.getByText(
        `${SCENARIOS.length} of ${SCENARIOS.length} optimal decisions`,
      ),
    ).toBeInTheDocument();
  });
});

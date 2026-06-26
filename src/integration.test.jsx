// src/integration.test.jsx
//
// Cross-consumer integration: ONE shared GameAPI instance (hosted simulation,
// solo:false) drives HostView, ScreenView, and PlayerView at once. This locks
// the realtime "heart of the game" — a player's pick propagates to the screen,
// the host's reveal flips the projector, and the host's advance pulls every
// device to the next scenario — all through the single notification seam.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostView from './views/HostView.jsx';
import ScreenView from './views/ScreenView.jsx';
import PlayerView from './views/PlayerView.jsx';
import { createMockGameAPI } from './game/mockGameAPI.js';
import { SCENARIOS } from './content/scenarios.js';

afterEach(cleanup);

// Render all three consumers against the SAME api so notifications fan out to
// every subscriber. Each gets its own container to keep queries scoped.
function renderAll(api) {
  const host = render(<HostView gameAPI={api} />).container;
  const screenC = render(<ScreenView gameAPI={api} />).container;
  const player = render(<PlayerView gameAPI={api} />).container;
  return { host, screenC, player };
}

describe('integration — one shared hosted GameAPI across all three views', () => {
  it('a player pick updates the screen aggregate (live across consumers)', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false, solo: false });
    const { screenC, player } = renderAll(api);

    // Screen starts hidden with 0 responded.
    expect(within(screenC).getByText(/0\s*\/\s*0 answered/i)).toBeInTheDocument();

    // Drive the player: join then pick the best choice for scenario 1.
    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });

    // Screen's responded count rose to 1/1 even while still hidden.
    expect(within(screenC).getByText(/1\s*\/\s*1 answered/i)).toBeInTheDocument();
    // And the underlying aggregate recorded the decision.
    const cur = api.getStation().decisions.filter((d) => d.scenarioIdx === 0);
    expect(cur).toHaveLength(1);
    expect(cur[0].choice).toBe('hitl');
  });

  it('with solo:false the player shows a waiting-for-host state and NO advancing button', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false, solo: false });
    const { player } = renderAll(api);

    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });

    expect(within(player).getByText(/waiting for the host/i)).toBeInTheDocument();
    expect(within(player).queryByText('Next Scenario →')).not.toBeInTheDocument();
  });

  it('host Reveal toggle reveals the screen bars (previously hidden)', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false, solo: false });
    const { host, screenC, player } = renderAll(api);

    // A pick so the bars have data to show.
    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });

    // Hidden before reveal.
    expect(within(screenC).queryAllByTestId('seg-row')).toHaveLength(0);

    // Host flips reveal on (via the host control button).
    await act(async () => {
      fireEvent.click(within(host).getByText('Reveal Aggregate on Screen', { exact: false }));
    });

    // Screen now shows the segmented bars.
    expect(within(screenC).getAllByTestId('seg-row')).toHaveLength(3);
  });

  it('host advance pulls the player to the next scenario and re-hides the screen', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false, solo: false });
    const { host, screenC, player } = renderAll(api);

    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });

    // Reveal so we can prove advance re-hides it.
    await act(async () => {
      fireEvent.click(within(host).getByText('Reveal Aggregate on Screen', { exact: false }));
    });
    expect(within(screenC).getAllByTestId('seg-row')).toHaveLength(3);

    // Host advances the room.
    await act(async () => {
      fireEvent.click(within(host).getByText('Advance to Next Scenario'));
    });

    // Player follows to scenario 2 with a fresh (unanswered) screen.
    await within(player).findByText(SCENARIOS[1].title);
    expect(within(player).queryByText(/waiting for the host/i)).not.toBeInTheDocument();

    // Screen shows the next scenario title and is hidden again (reveal reset).
    expect(within(screenC).getByText(SCENARIOS[1].title)).toBeInTheDocument();
    expect(within(screenC).queryAllByTestId('seg-row')).toHaveLength(0);
    expect(within(screenC).getByText(/Responses hidden/i)).toBeInTheDocument();
  });
});

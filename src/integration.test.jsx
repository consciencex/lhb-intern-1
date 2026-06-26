// src/integration.test.jsx
//
// Cross-consumer integration: ONE shared GameAPI instance drives both the
// Screen (projector) and a Player (phone) at once. This locks the realtime
// "heart of the game" with NO host: a player's self-paced pick propagates
// instantly to the Screen's live per-scenario results, through the single
// notification seam.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './views/ScreenView.jsx';
import PlayerView from './views/PlayerView.jsx';
import { createMockGameAPI } from './game/mockGameAPI.js';
import { SCENARIOS } from './content/scenarios.js';

afterEach(cleanup);

// Render both consumers against the SAME api so notifications fan out to every
// subscriber. Each gets its own container to keep queries scoped.
function renderBoth(api) {
  const screenC = render(<ScreenView gameAPI={api} />).container;
  const player = render(<PlayerView gameAPI={api} />).container;
  return { screenC, player };
}

describe('integration — one shared GameAPI, Screen + Player, no host', () => {
  it('a self-paced player pick fans out to the Screen live results (non-zero), no host needed', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false });
    const { screenC, player } = renderBoth(api);

    // Screen starts empty: 0 players, 0 responses — but already live (no reveal).
    expect(within(screenC).getByTestId('total-players')).toHaveTextContent('0');
    expect(within(screenC).getByTestId('total-responses')).toHaveTextContent('0');

    // Drive the player: join then pick the best choice for scenario 1.
    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    // A squad must be chosen before Start is enabled.
    fireEvent.click(within(player).getByTestId('team-option-Team Alpha'));
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });

    // The Screen reflects the answer instantly — totals rose with no host step.
    expect(within(screenC).getByTestId('total-players')).toHaveTextContent('1');
    expect(within(screenC).getByTestId('total-responses')).toHaveTextContent('1');
    // Best choice -> optimal rate is 100%.
    expect(within(screenC).getByTestId('optimal-rate')).toHaveTextContent('100%');

    // Scenario 1's live card shows a non-zero bar for the chosen approach.
    const cards = within(screenC).getAllByTestId('scenario-result');
    const firstCardFills = within(cards[0]).getAllByTestId('scenario-bar-fill');
    const widths = firstCardFills.map((f) => f.style.width);
    expect(widths.some((w) => w !== '0%' && w !== '' && w !== '0')).toBe(true);

    // The underlying aggregate recorded the decision for scenario 0.
    const cur = api.getStation().decisions.filter((d) => d.scenarioIdx === 0);
    expect(cur).toHaveLength(1);
    expect(cur[0].choice).toBe('hitl');
  });

  it('the player self-advances locally; the room index never moves', async () => {
    const api = createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false });
    const { player } = renderBoth(api);

    fireEvent.change(within(player).getByPlaceholderText('Enter your name…'), {
      target: { value: 'Dana' },
    });
    // A squad must be chosen before Start is enabled.
    fireEvent.click(within(player).getByTestId('team-option-Team Alpha'));
    await act(async () => {
      fireEvent.click(within(player).getByText('Start Simulation →'));
    });
    await within(player).findByText(SCENARIOS[0].title);
    await act(async () => {
      fireEvent.click(within(player).getByText('Human-in-Loop'));
    });
    await act(async () => {
      fireEvent.click(within(player).getByText('Next Scenario →'));
    });

    // Player moved to scenario 2 locally; the shared room index stayed at 0.
    await within(player).findByText(SCENARIOS[1].title);
    expect(api.getStation().currentIdx).toBe(0);
  });
});

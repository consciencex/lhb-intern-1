import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './ScreenView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';
import { CHOICE_LABELS } from '../content/scenarios.js';
import { optimalRate, teamStandings, teamMeters } from '../game/gameLogic.js';

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

  it('shows the cohesive scenario illustration on each per-scenario card', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    const cards = screen.getAllByTestId('scenario-result');
    cards.forEach((card, i) => {
      const art = card.querySelector('[data-testid="scenario-art"]');
      expect(art).not.toBeNull();
      expect(art).toHaveAttribute('data-art-id', SCENARIOS[i].id);
    });
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

describe('ScreenView — TEAMS (cohesive per-team cards: standing + radar)', () => {
  it('renders a TEAMS section heading', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.getByText(/^Teams$/i)).toBeInTheDocument();
  });

  it('renders one team CARD per team from real station data', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    const standings = teamStandings(station.players, station.decisions);
    render(<ScreenView gameAPI={gameAPI} />);

    const cards = screen.getAllByTestId('team-card');
    expect(cards).toHaveLength(standings.length);
    expect(standings.length).toBeGreaterThan(1); // seeded demo spans 4 squads
  });

  it('orders the team cards by teamStandings (score desc)', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    const standings = teamStandings(station.players, station.decisions);
    render(<ScreenView gameAPI={gameAPI} />);

    const cards = screen.getAllByTestId('team-card');
    standings.forEach((s, i) => {
      expect(within(cards[i]).getByTestId('team-card-name')).toHaveTextContent(s.team);
    });
  });

  it('each team card shows name, avg-pts/player score, optimal % and answered count', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    const standings = teamStandings(station.players, station.decisions);
    const profiles = teamMeters(station.players, station.decisions, SCENARIOS);
    const byTeam = new Map(profiles.map((p) => [p.team, p]));
    render(<ScreenView gameAPI={gameAPI} />);
    const cards = screen.getAllByTestId('team-card');

    // Cards render in teamStandings order (score desc). Assert each card's
    // content matches the corresponding standings + meters derived from real data.
    standings.forEach((s, i) => {
      const card = cards[i];
      expect(within(card).getByTestId('team-card-name')).toHaveTextContent(s.team);
      expect(within(card).getByTestId('team-card-score')).toHaveTextContent(String(s.score));
      expect(within(card).getByTestId('team-card-optimal')).toHaveTextContent(
        `${Math.round(s.optimalRate * 100)}%`,
      );
      const profile = byTeam.get(s.team);
      expect(within(card).getByTestId('team-card-answered')).toHaveTextContent(
        `${profile.answered}/${s.players} answered`,
      );
    });
  });

  it('renders each team card with its average-meter radar as an <svg>', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    const cards = screen.getAllByTestId('team-card');
    cards.forEach((card) => {
      expect(card.querySelector('svg')).not.toBeNull();
    });
  });

  it('uses the dark radar variant (translucent grid) for the projector', () => {
    const { container } = render(<ScreenView gameAPI={seededScreen()} />);
    const card = screen.getAllByTestId('team-card')[0];
    // Dark variant strokes its grid rings in translucent white.
    const ring = card.querySelector('polygon:not([data-testid="radar-polygon"])');
    expect(ring.getAttribute('stroke')).toMatch(/rgba\(255\s*,\s*255\s*,\s*255/);
    expect(container).toBeTruthy();
  });

  it('still renders a team card when a team has players but no answers', () => {
    // A fresh (unseeded) room: join two players to the same squad, no decisions.
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: false });
    return act(async () => {
      await gameAPI.joinRoom({ name: 'Ana', team: 'Team Alpha' });
      await gameAPI.joinRoom({ name: 'Bo', team: 'Team Alpha' });
    }).then(() => {
      render(<ScreenView gameAPI={gameAPI} />);
      const cards = screen.getAllByTestId('team-card');
      expect(cards).toHaveLength(1);
      // No answers yet -> 0/2 answered, radar still renders (START_METERS).
      expect(within(cards[0]).getByTestId('team-card-answered')).toHaveTextContent(
        '0/2 answered',
      );
      expect(cards[0].querySelector('svg')).not.toBeNull();
    });
  });
});

describe('ScreenView — facilitator Reset room (confirm modal)', () => {
  it('renders a Reset button in the header', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.getByTestId('reset-room-button')).toBeInTheDocument();
  });

  it('does NOT show the confirm modal until the Reset button is clicked', () => {
    render(<ScreenView gameAPI={seededScreen()} />);
    expect(screen.queryByTestId('reset-confirm-modal')).not.toBeInTheDocument();
  });

  it('clicking Reset opens a confirm modal showing the players + responses counts', () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);

    fireEvent.click(screen.getByTestId('reset-room-button'));

    const modal = screen.getByTestId('reset-confirm-modal');
    expect(modal).toBeInTheDocument();
    // Counts are read from the live station.
    expect(within(modal).getByText(String(station.players.length), { exact: false })).toBeInTheDocument();
    expect(within(modal).getByText(String(station.decisions.length), { exact: false })).toBeInTheDocument();
    // Names the room being reset.
    expect(within(modal).getByText(/DEMO/)).toBeInTheDocument();
  });

  it('Cancel closes the modal WITHOUT calling resetRoom', () => {
    const gameAPI = seededScreen();
    const spy = vi.spyOn(gameAPI, 'resetRoom');
    render(<ScreenView gameAPI={gameAPI} />);

    fireEvent.click(screen.getByTestId('reset-room-button'));
    expect(screen.getByTestId('reset-confirm-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reset-cancel-button'));

    expect(screen.queryByTestId('reset-confirm-modal')).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('Reset (confirm) calls gameAPI.resetRoom() once and closes the modal', async () => {
    const gameAPI = seededScreen();
    const spy = vi.spyOn(gameAPI, 'resetRoom');
    render(<ScreenView gameAPI={gameAPI} />);

    fireEvent.click(screen.getByTestId('reset-room-button'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('reset-confirm-button'));
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('reset-confirm-modal')).not.toBeInTheDocument();
  });

  it('after confirming Reset the dashboard totals return to 0', async () => {
    const gameAPI = seededScreen();
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    // Pre-condition: non-zero totals (seeded room).
    expect(station.decisions.length).toBeGreaterThan(0);
    expect(screen.getByTestId('total-responses')).toHaveTextContent(
      String(station.decisions.length),
    );

    fireEvent.click(screen.getByTestId('reset-room-button'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('reset-confirm-button'));
    });

    expect(screen.getByTestId('total-players')).toHaveTextContent('0');
    expect(screen.getByTestId('total-responses')).toHaveTextContent('0');
  });
});

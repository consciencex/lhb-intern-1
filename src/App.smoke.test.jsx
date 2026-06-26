// src/App.smoke.test.jsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App.jsx';
import { SCENARIOS } from './content/scenarios.js';

// PRECONDITION (what makes this deterministic, with no vi.mock): under Vitest the
// Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are unset, so
// getSupabase() returns null and buildGameAPI falls through to the in-memory
// mock — the seam this test deliberately exercises.

// Rewrite the URL the App reads on mount (via URLSearchParams), then render fresh.
function renderAppWith(search) {
  window.history.pushState({}, '', search);
  return render(<App />);
}

describe('App — view wiring smoke test', () => {
  const originalSearch = window.location.search;

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', originalSearch || '/');
  });

  it('mounts the Player view (explicit ?view=play) without crashing', () => {
    renderAppWith('/?view=play&room=DEMO');
    // Player intro screen signature button (exact prototype copy).
    expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
  });

  it('mounts the Screen view without crashing', () => {
    renderAppWith('/?view=screen&room=DEMO');
    // Projector signature: the join line and the live-results header are
    // always present (everything is live — no reveal gating).
    expect(screen.getByText(/Join: room/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Results/i)).toBeInTheDocument();
    // Every scenario title is shown on the live dashboard.
    expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
    expect(screen.getByText(SCENARIOS[SCENARIOS.length - 1].title)).toBeInTheDocument();
  });

  it('falls back to the Player view for a stale ?view=host link', () => {
    renderAppWith('/?view=host&room=DEMO');
    // Host has been removed — the player intro renders instead of a host panel.
    expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
  });

  it('defaults to the Player view when no view param is present', () => {
    renderAppWith('/?room=DEMO');
    expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
  });
});

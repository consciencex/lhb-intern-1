import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Force the mock GameAPI: getSupabase() returns null in all tests.
// Path must match App.jsx's import specifier exactly: './game/supabaseClient.js'.
vi.mock('./game/supabaseClient.js', () => ({
  getSupabase: () => null,
}));

import App from './App.jsx';

function setSearch(search) {
  window.history.replaceState({}, '', '/' + (search ? '?' + search : ''));
}

afterEach(() => cleanup());
beforeEach(() => setSearch(''));

describe('App routing', () => {
  it('defaults to the player intro when no view param is present', () => {
    setSearch('');
    render(<App />);
    // PlayerView intro renders the BANK TRAINING SIMULATION eyebrow copy
    expect(screen.getByText(/BANK TRAINING SIMULATION/i)).toBeInTheDocument();
    // The player Start control is present (label "Start Simulation →")
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
  });

  it('renders the Host view when ?view=host', () => {
    setSearch('view=host');
    render(<App />);
    expect(screen.getByText(/Host Controls/i)).toBeInTheDocument();
  });

  it('renders the Screen view when ?view=screen', () => {
    setSearch('view=screen');
    render(<App />);
    expect(screen.getByText(/ROOM RESPONSE/i)).toBeInTheDocument();
  });

  it('switches the rendered view when a TopNav tab is clicked', () => {
    setSearch('');
    render(<App />);
    // Starts on the player intro
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    // Click the Host tab in the nav
    fireEvent.click(screen.getByRole('button', { name: /Host/i }));
    // Host view now renders and the intro Start button is gone
    expect(screen.getByText(/Host Controls/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start/i })).toBeNull();
    // URL reflects the new view
    expect(new URLSearchParams(window.location.search).get('view')).toBe('host');
  });

  it('resyncs the rendered view on browser Back/Forward (popstate)', () => {
    setSearch('');
    render(<App />);
    // Starts on the player intro
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    // Simulate Back/Forward navigating to ?view=host: the URL changes via the
    // history stack and the browser fires popstate (no click handler runs).
    window.history.pushState({}, '', '?view=host');
    fireEvent(window, new PopStateEvent('popstate'));
    // App resyncs view state from the URL and renders the Host view
    expect(screen.getByText(/Host Controls/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start/i })).toBeNull();
  });
});

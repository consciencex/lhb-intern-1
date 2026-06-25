// src/game/GameAPI.test.js
import { describe, it, expect } from 'vitest';
import { buildGameAPI } from './GameAPI.js';

const METHODS = ['getView', 'getRoomCode', 'joinRoom', 'emit', 'award', 'advance', 'setReveal', 'subscribe', 'getStation'];

describe('buildGameAPI', () => {
  it('returns the mock impl exposing the full interface when no supabase client is provided', () => {
    const api = buildGameAPI({ view: 'screen', roomCode: 'WXYZ', supabase: null });
    for (const m of METHODS) {
      expect(typeof api[m]).toBe('function');
    }
    expect(api.getView()).toBe('screen');
    expect(api.getRoomCode()).toBe('WXYZ');
  });

  it('defaults to play/DEMO via the mock when view/roomCode omitted', () => {
    const api = buildGameAPI({ supabase: null });
    expect(api.getView()).toBe('play');
    expect(api.getRoomCode()).toBe('DEMO');
  });

  it('mock impl returned by buildGameAPI is functional (joinRoom adds a player)', async () => {
    const api = buildGameAPI({ supabase: null });
    const { playerId } = await api.joinRoom({ name: 'Z' });
    expect(playerId).toBeTruthy();
    expect(api.getStation().players).toHaveLength(1);
  });
});

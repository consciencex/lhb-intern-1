// src/game/mockGameAPI.test.js
import { describe, it, expect, vi } from 'vitest';
import { createMockGameAPI } from './mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

describe('createMockGameAPI — construction & initial station', () => {
  it('defaults view to play and roomCode to DEMO', () => {
    const api = createMockGameAPI({});
    expect(api.getView()).toBe('play');
    expect(api.getRoomCode()).toBe('DEMO');
  });

  it('honors explicit view and roomCode', () => {
    const api = createMockGameAPI({ view: 'host', roomCode: 'ABCD' });
    expect(api.getView()).toBe('host');
    expect(api.getRoomCode()).toBe('ABCD');
  });

  it('starts with an empty lobby station', () => {
    const api = createMockGameAPI({});
    const s = api.getStation();
    expect(s.roomCode).toBe('DEMO');
    expect(s.currentIdx).toBe(0);
    expect(s.reveal).toBe(false);
    expect(s.status).toBe('lobby');
    expect(s.players).toEqual([]);
    expect(s.decisions).toEqual([]);
    expect(s.respondedCount).toBe(0);
  });
});

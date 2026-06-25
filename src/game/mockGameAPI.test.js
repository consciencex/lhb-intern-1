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

describe('createMockGameAPI — joinRoom, emit, respondedCount', () => {
  it('joinRoom returns a playerId and adds a player', async () => {
    const api = createMockGameAPI({});
    const { playerId } = await api.joinRoom({ name: 'Aisha' });
    expect(playerId).toBeTruthy();
    const s = api.getStation();
    expect(s.players).toHaveLength(1);
    expect(s.players[0].id).toBe(playerId);
    expect(s.players[0].name).toBe('Aisha');
    expect(s.players[0].team).toBe(null);
    expect(s.players[0].score).toBe(0);
    expect(s.status).toBe('active');
  });

  it('emit(decision) appends a decision and respondedCount reflects distinct players for currentIdx', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    const { playerId: p2 } = await api.joinRoom({ name: 'Two' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.emit('decision', { playerId: p2, scenarioId: 'loan', scenarioIdx: 0, choice: 'automate', isBest: false, breach: true });
    const s = api.getStation();
    expect(s.decisions).toHaveLength(2);
    // scenarioId is persisted alongside scenarioIdx (maps to the Supabase
    // scenario_id column); it must not silently drop from the stored decision.
    expect(s.decisions[0]).toEqual({ playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    expect(s.decisions[0].scenarioId).toBe('loan');
    expect(s.respondedCount).toBe(2);
  });

  it('duplicate emit for same player+idx does not double-count', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'manual', isBest: false, breach: false });
    const s = api.getStation();
    expect(s.decisions).toHaveLength(1);
    expect(s.decisions[0].choice).toBe('hitl');
    expect(s.respondedCount).toBe(1);
  });

  it('respondedCount only counts decisions for the current scenario index', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.advance(); // currentIdx -> 1
    expect(api.getStation().respondedCount).toBe(0);
  });
});

describe('createMockGameAPI — award, advance-to-end, setReveal', () => {
  it('award increments the first player score', async () => {
    const api = createMockGameAPI({});
    await api.joinRoom({ name: 'One' });
    await api.award(10);
    await api.award(10);
    expect(api.getStation().players[0].score).toBe(20);
  });

  it('advance increments currentIdx up to the last scenario', async () => {
    const api = createMockGameAPI({});
    expect(api.getStation().currentIdx).toBe(0);
    await api.advance();
    expect(api.getStation().currentIdx).toBe(1);
    expect(api.getStation().status).not.toBe('ended');
  });

  it('advance past the last scenario sets status to ended without incrementing past the end', async () => {
    const api = createMockGameAPI({});
    for (let i = 0; i < SCENARIOS.length - 1; i++) {
      await api.advance();
    }
    expect(api.getStation().currentIdx).toBe(SCENARIOS.length - 1);
    expect(api.getStation().status).not.toBe('ended');
    await api.advance(); // one more from the last index
    expect(api.getStation().status).toBe('ended');
    expect(api.getStation().currentIdx).toBe(SCENARIOS.length - 1);
  });

  it('setReveal toggles the reveal flag', async () => {
    const api = createMockGameAPI({});
    expect(api.getStation().reveal).toBe(false);
    await api.setReveal(true);
    expect(api.getStation().reveal).toBe(true);
    await api.setReveal(false);
    expect(api.getStation().reveal).toBe(false);
  });
});

describe('createMockGameAPI — subscribe', () => {
  it('subscribe callback fires on change; unsubscribe stops it', async () => {
    const api = createMockGameAPI({});
    const cb = vi.fn();
    const unsub = api.subscribe(cb);
    await api.joinRoom({ name: 'One' });
    expect(cb).toHaveBeenCalledTimes(1);
    const stationArg = cb.mock.calls[0][0];
    expect(stationArg).toBe(api.getStation());
    unsub();
    await api.joinRoom({ name: 'Two' });
    expect(cb).toHaveBeenCalledTimes(1); // no further calls after unsubscribe
  });
});

describe('createMockGameAPI — seed', () => {
  it('seed:true pre-populates 30 players across Alpha/Beta/Gamma/Delta', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    expect(s.players.length).toBeGreaterThan(0);
    expect(s.players.length).toBe(30);
    const teams = new Set(s.players.map((p) => p.team));
    expect(teams).toEqual(new Set(['Alpha', 'Beta', 'Gamma', 'Delta']));
    expect(s.status).toBe('active');
  });

  it('seed:true produces decisions for the current scenario that are aggregate-able', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    const forCurrent = s.decisions.filter((d) => d.scenarioIdx === s.currentIdx);
    expect(forCurrent.length).toBe(s.players.length);
    const choices = new Set(forCurrent.map((d) => d.choice));
    expect(choices).toEqual(new Set(['automate', 'hitl', 'manual']));
    expect(s.respondedCount).toBe(s.players.length);
  });

  it('seed:true scores players who picked the best choice for the current scenario', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    const best = SCENARIOS[s.currentIdx].best;
    s.players.forEach((p, i) => {
      const dec = s.decisions.find((d) => d.playerId === p.id && d.scenarioIdx === s.currentIdx);
      expect(p.score).toBe(dec.choice === best ? 10 : 0);
    });
  });

  it('seed is deterministic — two instances produce identical decision choices', () => {
    const a = createMockGameAPI({ seed: true });
    const b = createMockGameAPI({ seed: true });
    const ca = a.getStation().decisions.map((d) => d.choice);
    const cbChoices = b.getStation().decisions.map((d) => d.choice);
    expect(ca).toEqual(cbChoices);
  });
});

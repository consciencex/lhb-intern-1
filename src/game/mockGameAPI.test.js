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

describe('createMockGameAPI — isSolo capability', () => {
  it('defaults isSolo to true (single-device solo play)', () => {
    const api = createMockGameAPI({});
    expect(api.isSolo()).toBe(true);
  });

  it('honors solo:false for a hosted (multiplayer) simulation', () => {
    const api = createMockGameAPI({ solo: false });
    expect(api.isSolo()).toBe(false);
  });

  it('honors explicit solo:true', () => {
    const api = createMockGameAPI({ solo: true });
    expect(api.isSolo()).toBe(true);
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
    // Fix 3: joinRoom assigns a deterministic squad team so buildScoreboard's
    // team branch fires in solo/non-seeded play too.
    expect(s.players[0].team).toMatch(/^Team (Alpha|Beta|Gamma|Delta)$/);
    expect(s.players[0].score).toBe(0);
    expect(s.status).toBe('active');
  });

  it('assigns a deterministic team from the generated id (every joiner has a team)', async () => {
    const api = createMockGameAPI({});
    await api.joinRoom({ name: 'One' });
    await api.joinRoom({ name: 'Two' });
    await api.joinRoom({ name: 'Three' });
    const s = api.getStation();
    expect(s.players.every((p) => /^Team (Alpha|Beta|Gamma|Delta)$/.test(p.team))).toBe(true);
  });

  it('stores the explicitly chosen team verbatim when one is supplied', async () => {
    const api = createMockGameAPI({});
    // 'Team Delta' deliberately differs from the id-hash fallback for the first
    // player so this only passes if the chosen team is honored, not the hash.
    await api.joinRoom({ name: 'Dana', team: 'Team Delta' });
    const s = api.getStation();
    expect(s.players[0].team).toBe('Team Delta');
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

  it('advance resets reveal to false (each new scenario starts hidden)', async () => {
    const api = createMockGameAPI({});
    await api.setReveal(true);
    expect(api.getStation().reveal).toBe(true);
    await api.advance();
    expect(api.getStation().reveal).toBe(false);
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

  it('seed:true spreads decisions across MULTIPLE scenario indices, each aggregate-able', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    // Decisions span several scenarios (not just idx 0) so the all-scenarios
    // dashboard shows live data across the board in demo/screen mode.
    const idxsWithData = new Set(s.decisions.map((d) => d.scenarioIdx));
    expect(idxsWithData.size).toBeGreaterThan(1);
    // Every scenario has a spread of choices (all three approaches present).
    for (let i = 0; i < SCENARIOS.length; i++) {
      const forI = s.decisions.filter((d) => d.scenarioIdx === i);
      expect(forI.length).toBeGreaterThan(0);
      const choices = new Set(forI.map((d) => d.choice));
      expect(choices).toEqual(new Set(['automate', 'hitl', 'manual']));
    }
  });

  it('seed:true scores players 10 for each best choice they picked across scenarios', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    s.players.forEach((p) => {
      const myBest = s.decisions.filter((d) => d.playerId === p.id && d.isBest).length;
      expect(p.score).toBe(myBest * 10);
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

describe('createMockGameAPI — resetRoom (facilitator wipe)', () => {
  it('clears players + decisions, resets currentIdx/reveal/status, and recomputes respondedCount', async () => {
    const api = createMockGameAPI({ seed: true });
    // Pre-condition: the seeded room has live data.
    let s = api.getStation();
    expect(s.players.length).toBeGreaterThan(0);
    expect(s.decisions.length).toBeGreaterThan(0);

    // Advance + reveal so we can prove reset returns these to defaults too.
    await api.advance();
    await api.setReveal(true);
    expect(api.getStation().currentIdx).toBe(1);
    expect(api.getStation().reveal).toBe(true);

    await api.resetRoom();

    s = api.getStation();
    expect(s.players).toEqual([]);
    expect(s.decisions).toEqual([]);
    expect(s.respondedCount).toBe(0);
    expect(s.currentIdx).toBe(0);
    expect(s.reveal).toBe(false);
    expect(s.status).toBe('lobby');
  });

  it('also clears a non-seeded room built up via joinRoom/emit', async () => {
    const api = createMockGameAPI({});
    const { playerId } = await api.joinRoom({ name: 'Dana' });
    await api.emit('decision', { playerId, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    expect(api.getStation().players).toHaveLength(1);
    expect(api.getStation().decisions).toHaveLength(1);

    await api.resetRoom();

    const s = api.getStation();
    expect(s.players).toEqual([]);
    expect(s.decisions).toEqual([]);
    expect(s.respondedCount).toBe(0);
  });

  it('notifies subscribers so the live dashboard updates', async () => {
    const api = createMockGameAPI({ seed: true });
    const cb = vi.fn();
    api.subscribe(cb);
    await api.resetRoom();
    expect(cb).toHaveBeenCalled();
    // Subscribers receive the wiped station.
    const stationArg = cb.mock.calls[cb.mock.calls.length - 1][0];
    expect(stationArg.players).toEqual([]);
    expect(stationArg.decisions).toEqual([]);
  });

  it('returns a resolved Promise', async () => {
    const api = createMockGameAPI({ seed: true });
    await expect(api.resetRoom()).resolves.toBeUndefined();
  });
});

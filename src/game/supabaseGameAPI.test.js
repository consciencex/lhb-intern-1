// src/game/supabaseGameAPI.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseGameAPI } from './supabaseGameAPI.js';

// A chainable query-builder stub. Every terminal method resolves to a
// PostgREST-shaped { data, error } result. select()/eq()/order()/limit() are
// awaitable AND chainable by returning the same kind of thenable object.
function makeQueryBuilder(result) {
  const qb = {
    insert: vi.fn(() => makeQueryBuilder(result)),
    upsert: vi.fn(() => makeQueryBuilder(result)),
    update: vi.fn(() => makeQueryBuilder(result)),
    select: vi.fn(() => makeQueryBuilder(result)),
    eq: vi.fn(() => makeQueryBuilder(result)),
    order: vi.fn(() => makeQueryBuilder(result)),
    limit: vi.fn(() => makeQueryBuilder(result)),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    // Make the builder itself awaitable.
    then: (resolve) => resolve(result),
  };
  return qb;
}

function makeChannel(record) {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((cb) => {
      record.subscribed += 1;
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    unsubscribe: vi.fn(() => Promise.resolve('ok')),
  };
  return channel;
}

function makeSupabaseStub() {
  const record = { channels: 0, subscribed: 0 };
  return {
    record,
    from: vi.fn(() => makeQueryBuilder({ data: [], error: null })),
    // award() calls supabase.rpc('increment_score', ...). The stub resolves
    // PostgREST-shaped so the atomic-increment path runs without a real DB.
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => {
      record.channels += 1;
      return makeChannel(record);
    }),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
}

const INTERFACE_METHODS = [
  'getView',
  'getRoomCode',
  'joinRoom',
  'emit',
  'award',
  'advance',
  'setReveal',
  'subscribe',
  'getStation',
  'destroy',
  'isSolo',
];

beforeEach(() => {
  localStorage.clear();
});

describe('createSupabaseGameAPI — structural contract', () => {
  it('exposes every GameAPI interface method as a function', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'host',
      roomCode: 'DEMO',
      supabase,
    });
    for (const m of INTERFACE_METHODS) {
      expect(typeof api[m]).toBe('function');
    }
  });

  it('isSolo() is false (real multiplayer is host-paced)', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({ view: 'play', roomCode: 'DEMO', supabase });
    expect(api.isSolo()).toBe(false);
  });

  it('getView and getRoomCode reflect the constructor args', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'screen',
      roomCode: 'WXYZ',
      supabase,
    });
    expect(api.getView()).toBe('screen');
    expect(api.getRoomCode()).toBe('WXYZ');
  });

  it('getStation returns a Station-shaped object with sane defaults', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'play',
      roomCode: 'DEMO',
      supabase,
    });
    const s = api.getStation();
    expect(s).toMatchObject({
      roomCode: 'DEMO',
      currentIdx: 0,
      reveal: false,
      status: 'lobby',
    });
    expect(Array.isArray(s.players)).toBe(true);
    expect(Array.isArray(s.decisions)).toBe(true);
    expect(typeof s.respondedCount).toBe('number');
  });

  it('opens a realtime channel and subscribes on construction', () => {
    const supabase = makeSupabaseStub();
    createSupabaseGameAPI({ view: 'screen', roomCode: 'DEMO', supabase });
    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(supabase.record.subscribed).toBe(1);
  });

  it('subscribe pushes the current station and returns a callable unsubscribe', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'screen',
      roomCode: 'DEMO',
      supabase,
    });
    const cb = vi.fn();
    const unsub = api.subscribe(cb);
    // New subscribers get the current snapshot immediately.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toMatchObject({ roomCode: 'DEMO', currentIdx: 0 });
    expect(typeof unsub).toBe('function');
    // Unsubscribing must not throw.
    expect(() => unsub()).not.toThrow();
  });

  it('resolves every async interface method without throwing against the stub', async () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'play',
      roomCode: 'DEMO',
      supabase,
    });
    // joinRoom resolves to a { playerId } shape.
    await expect(api.joinRoom({ name: 'Dana' })).resolves.toHaveProperty('playerId');
    // emit('decision', ...) resolves (insert against the stub).
    await expect(
      api.emit('decision', {
        scenarioId: 'loan',
        scenarioIdx: 0,
        choice: 'hitl',
        isBest: true,
        breach: false,
      }),
    ).resolves.toBeUndefined();
    // award/advance/setReveal resolve.
    await expect(api.award(10)).resolves.toBeUndefined();
    await expect(api.advance()).resolves.toBeUndefined();
    await expect(api.setReveal(true)).resolves.toBeUndefined();
  });

  it('destroy() removes the realtime channel and clears subscribers', () => {
    const supabase = makeSupabaseStub();
    const api = createSupabaseGameAPI({
      view: 'screen',
      roomCode: 'DEMO',
      supabase,
    });
    const cb = vi.fn();
    api.subscribe(cb);
    cb.mockClear(); // ignore the immediate snapshot push
    api.destroy();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    // After destroy the listener set is cleared, so a manual notify path could
    // no longer reach it. (We can't trigger realtime here; clearing is asserted
    // via removeChannel + the absence of further snapshot pushes.)
    expect(cb).not.toHaveBeenCalled();
  });
});

// A supabase stub whose decisions.insert() returns a configurable error, and
// whose rooms lookup resolves to a real room so emit() reaches the insert.
function makeEmitStub(insertResult) {
  const channel = {
    on() { return channel; },
    subscribe(cb) { if (cb) cb('SUBSCRIBED'); return channel; },
    unsubscribe() { return Promise.resolve('ok'); },
  };
  const room = { id: 'room-1', code: 'DEMO', current_idx: 0, reveal: false, status: 'lobby' };
  return {
    from: vi.fn((table) => {
      if (table === 'rooms') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle() { return Promise.resolve({ data: room, error: null }); },
          update() { return { eq() { return Promise.resolve({ error: null }); } }; },
        };
      }
      if (table === 'decisions') {
        return {
          insert: vi.fn(() => Promise.resolve(insertResult)),
          select() { return this; },
          eq() { return Promise.resolve({ data: [], error: null }); },
        };
      }
      // players (loadPlayers): resolve empty.
      return {
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: [], error: null }); },
      };
    }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
}

const DECISION_PAYLOAD = {
  scenarioId: 'loan',
  scenarioIdx: 0,
  choice: 'hitl',
  isBest: true,
  breach: false,
};

// A stub that captures rooms.update() payloads and players.upsert() rows so we
// can assert advance() resets reveal and joinRoom() assigns a team.
function makeCaptureStub(captured) {
  const channel = {
    on() { return channel; },
    subscribe(cb) { if (cb) cb('SUBSCRIBED'); return channel; },
    unsubscribe() { return Promise.resolve('ok'); },
  };
  const room = { id: 'room-1', code: 'DEMO', current_idx: 0, reveal: false, status: 'lobby' };
  return {
    from: vi.fn((table) => {
      if (table === 'rooms') {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle() { return Promise.resolve({ data: room, error: null }); },
          update(patch) {
            captured.roomUpdates.push(patch);
            return { eq() { return Promise.resolve({ error: null }); } };
          },
        };
      }
      if (table === 'players') {
        return {
          upsert(row) {
            captured.playerUpserts.push(row);
            return {
              select() { return this; },
              single() { return Promise.resolve({ data: { id: 'player-1' }, error: null }); },
            };
          },
          select() { return this; },
          eq() { return this; },
          order() { return Promise.resolve({ data: [], error: null }); },
        };
      }
      return {
        insert: vi.fn(() => Promise.resolve({ error: null })),
        select() { return this; },
        eq() { return Promise.resolve({ data: [], error: null }); },
      };
    }),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
}

describe('createSupabaseGameAPI — advance resets reveal & joinRoom assigns team', () => {
  beforeEach(() => localStorage.clear());

  it('advance() sets reveal:false in the same rooms update', async () => {
    const captured = { roomUpdates: [], playerUpserts: [] };
    const supabase = makeCaptureStub(captured);
    const api = createSupabaseGameAPI({ view: 'host', roomCode: 'DEMO', supabase });
    await api.advance();
    expect(captured.roomUpdates.length).toBeGreaterThan(0);
    const last = captured.roomUpdates[captured.roomUpdates.length - 1];
    expect(last.reveal).toBe(false);
    expect(last.current_idx).toBe(1);
  });

  it('joinRoom() includes a deterministic Team in the upserted row', async () => {
    const captured = { roomUpdates: [], playerUpserts: [] };
    const supabase = makeCaptureStub(captured);
    const api = createSupabaseGameAPI({ view: 'play', roomCode: 'DEMO', supabase });
    await api.joinRoom({ name: 'Dana' });
    expect(captured.playerUpserts.length).toBeGreaterThan(0);
    const row = captured.playerUpserts[captured.playerUpserts.length - 1];
    expect(row.team).toMatch(/^Team (Alpha|Beta|Gamma|Delta)$/);
    expect(row.name).toBe('Dana');
  });
});

describe('createSupabaseGameAPI — emit error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    // A player id must be present for emit() to reach the insert.
    localStorage.setItem('aon_player_id:DEMO', 'player-1');
  });

  it('swallows the 23505 duplicate as success with no console.error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = makeEmitStub({ error: { code: '23505' } });
    const api = createSupabaseGameAPI({ view: 'play', roomCode: 'DEMO', supabase });

    await expect(api.emit('decision', DECISION_PAYLOAD)).resolves.toBeUndefined();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('resolves (does not reject) on a non-duplicate error AND logs it', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = makeEmitStub({ error: { code: 'XYZ', message: 'boom' } });
    const api = createSupabaseGameAPI({ view: 'play', roomCode: 'DEMO', supabase });

    await expect(api.emit('decision', DECISION_PAYLOAD)).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

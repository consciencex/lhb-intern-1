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
});

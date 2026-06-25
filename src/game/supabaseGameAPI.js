// src/game/supabaseGameAPI.js
import { SCENARIOS } from '../content/scenarios.js';

/**
 * Supabase-backed implementation of the GameAPI interface.
 *
 * Tables: rooms(code, current_idx, reveal, status), players(room_id, name,
 * team, score, client_id), decisions(room_id, player_id, scenario_id,
 * scenario_idx, choice, is_best, breach). Realtime via postgres_changes keeps
 * an in-memory Station that subscribers read through getStation()/subscribe().
 *
 * @param {{ view:'play'|'screen'|'host', roomCode:string, supabase:object }} args
 * @returns {object} GameAPI
 */
export function createSupabaseGameAPI({ view, roomCode, supabase }) {
  const CLIENT_ID_KEY = 'aon_client_id';
  const PLAYER_ID_KEY = 'aon_player_id';
  // Derived from the scenario content so the advance boundary stays in sync
  // with the deck (matches mockGameAPI, which also uses SCENARIOS.length).
  const SCENARIO_COUNT = SCENARIOS.length; // currentIdx 0..SCENARIO_COUNT-1

  // Stable per-device client id (used for the unique(room_id, client_id) join).
  let clientId = safeGet(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = makeClientId();
    safeSet(CLIENT_ID_KEY, clientId);
  }
  let playerId = safeGet(PLAYER_ID_KEY) || null;

  let roomId = null;

  // In-memory Station mirror. respondedCount is derived in recompute().
  const station = {
    roomCode,
    currentIdx: 0,
    reveal: false,
    status: 'lobby',
    players: [],
    decisions: [],
    respondedCount: 0,
  };

  const listeners = new Set();

  function notify() {
    const snapshot = getStation();
    for (const cb of listeners) cb(snapshot);
  }

  function recompute() {
    // respondedCount = DISTINCT players with a decision for the current idx.
    const ids = new Set();
    for (const d of station.decisions) {
      if (d.scenarioIdx === station.currentIdx) ids.add(d.playerId);
    }
    station.respondedCount = ids.size;
  }

  function getStation() {
    // Return a shallow copy so consumers can't mutate internal arrays.
    return {
      roomCode: station.roomCode,
      currentIdx: station.currentIdx,
      reveal: station.reveal,
      status: station.status,
      players: station.players.slice(),
      decisions: station.decisions.slice(),
      respondedCount: station.respondedCount,
    };
  }

  // ---- hydration ----------------------------------------------------------

  async function loadRoom() {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, code, current_idx, reveal, status')
      .eq('code', roomCode)
      .maybeSingle();
    if (error || !data) return;
    roomId = data.id;
    station.roomCode = data.code;
    station.currentIdx = data.current_idx ?? 0;
    station.reveal = data.reveal ?? false;
    station.status = data.status ?? 'lobby';
  }

  async function loadPlayers() {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('players')
      .select('id, name, team, score')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error || !data) return;
    station.players = data.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team ?? null,
      score: p.score ?? 0,
    }));
  }

  async function loadDecisions() {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('decisions')
      .select('player_id, scenario_idx, choice, is_best, breach')
      .eq('room_id', roomId);
    if (error || !data) return;
    station.decisions = data.map((d) => ({
      playerId: d.player_id,
      scenarioIdx: d.scenario_idx,
      choice: d.choice,
      isBest: d.is_best,
      breach: d.breach,
    }));
  }

  async function refresh() {
    await loadRoom();
    await Promise.all([loadPlayers(), loadDecisions()]);
    recompute();
    notify();
  }

  // ---- realtime -----------------------------------------------------------
  // One channel listening to all three tables for this room. Any change
  // triggers a full refresh (simple + correct for ~30 players / 6 rounds).
  const channel = supabase
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms' },
      () => { refresh(); },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players' },
      () => { refresh(); },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'decisions' },
      () => { refresh(); },
    )
    .subscribe(() => { refresh(); });

  // Kick an initial load even before the SUBSCRIBED callback fires.
  refresh();

  // ---- interface methods --------------------------------------------------

  function getView() {
    return view;
  }

  function getRoomCode() {
    return roomCode;
  }

  async function joinRoom({ name }) {
    if (!roomId) await loadRoom();
    if (!roomId) return { playerId: null };

    // Idempotent: one player row per (room_id, client_id). Upsert on conflict
    // so a reconnecting device reuses its existing row instead of erroring.
    const { data, error } = await supabase
      .from('players')
      .upsert(
        { room_id: roomId, name, client_id: clientId },
        { onConflict: 'room_id,client_id' },
      )
      .select('id')
      .single();

    if (!error && data) {
      playerId = data.id;
      safeSet(PLAYER_ID_KEY, playerId);
    }
    await refresh();
    return { playerId };
  }

  async function emit(event, payload) {
    if (event !== 'decision') return;
    if (!roomId) await loadRoom();
    const pid = playerId || safeGet(PLAYER_ID_KEY);
    if (!roomId || !pid) return;

    const { error } = await supabase.from('decisions').insert({
      room_id: roomId,
      player_id: pid,
      scenario_id: payload.scenarioId,
      scenario_idx: payload.scenarioIdx,
      choice: payload.choice,
      is_best: payload.isBest,
      breach: payload.breach,
    });

    // Swallow the unique(player_id, scenario_idx) duplicate as success.
    if (error && error.code !== '23505') {
      // Non-duplicate errors are surfaced for the caller / console.
      throw error;
    }
  }

  async function award(points) {
    const pid = playerId || safeGet(PLAYER_ID_KEY);
    if (!pid || !points) return;

    // Read current score, then write the incremented value.
    const { data } = await supabase
      .from('players')
      .select('score')
      .eq('id', pid)
      .single();
    const current = data && typeof data.score === 'number' ? data.score : 0;
    await supabase
      .from('players')
      .update({ score: current + points })
      .eq('id', pid);
  }

  async function advance() {
    if (!roomId) await loadRoom();
    if (!roomId) return;
    const last = station.currentIdx;
    // Past the last index, end the room; otherwise step to the next scenario.
    if (last >= SCENARIO_COUNT - 1) {
      await supabase
        .from('rooms')
        .update({ status: 'ended' })
        .eq('id', roomId);
    } else {
      await supabase
        .from('rooms')
        .update({ current_idx: last + 1, status: 'active' })
        .eq('id', roomId);
    }
  }

  async function setReveal(on) {
    if (!roomId) await loadRoom();
    if (!roomId) return;
    await supabase
      .from('rooms')
      .update({ reveal: !!on })
      .eq('id', roomId);
  }

  function subscribe(cb) {
    listeners.add(cb);
    // Push the current snapshot immediately so new subscribers aren't blank.
    cb(getStation());
    return () => {
      listeners.delete(cb);
    };
  }

  return {
    getView,
    getRoomCode,
    joinRoom,
    emit,
    award,
    advance,
    setReveal,
    subscribe,
    getStation,
    // Exposed for teardown by callers that own the API lifecycle.
    _channel: channel,
  };
}

// ---- localStorage helpers (jsdom-safe) ------------------------------------

function safeGet(key) {
  try {
    return globalThis.localStorage ? globalThis.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (globalThis.localStorage) globalThis.localStorage.setItem(key, value);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

function makeClientId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: timestamp + random suffix (only used where crypto is absent).
  return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}

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
  // Scope the player-id slot by room so a device that joins room A then room B
  // does not reuse A's player_id and mis-attribute decisions across rooms.
  // (aon_client_id stays global as the stable per-device identity.)
  const PLAYER_ID_KEY = `aon_player_id:${roomCode}`;
  // Derived from the scenario content so the advance boundary stays in sync
  // with the deck (matches mockGameAPI, which also uses SCENARIOS.length).
  const SCENARIO_COUNT = SCENARIOS.length; // currentIdx 0..SCENARIO_COUNT-1

  // Deterministic squad teams assigned from the stable client_id so the team
  // scoreboard (buildScoreboard) groups by squad in production. Every joiner
  // gets a truthy team; the same device always lands in the same squad.
  const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta'];

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

  function isSolo() {
    // Real multiplayer is host-paced: players follow station.currentIdx and
    // must not advance the whole room.
    return false;
  }

  function getRoomCode() {
    return roomCode;
  }

  // Stable 32-bit string hash → squad. Mirrors mockGameAPI.teamFor so both
  // backends assign the same squad for the same id.
  function teamFor(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return 'Team ' + TEAMS[hash % TEAMS.length];
  }

  async function joinRoom({ name, team }) {
    if (!roomId) await loadRoom();
    if (!roomId) return { playerId: null };

    // Honor the squad the player picked on the intro screen. teamFor(clientId)
    // remains only as a deterministic fallback if no team is supplied.
    const chosenTeam = team || teamFor(clientId);

    // Idempotent: one player row per (room_id, client_id). Upsert on conflict
    // so a reconnecting device reuses its existing row instead of erroring.
    const { data, error } = await supabase
      .from('players')
      .upsert(
        { room_id: roomId, name, client_id: clientId, team: chosenTeam },
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
    try {
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

      // Swallow the unique(player_id, scenario_idx) duplicate as success —
      // that's expected idempotency (re-pick / reconnect), not an error.
      if (error && error.code !== '23505') {
        // Views call emit() fire-and-forget; log non-duplicate errors so they
        // stay visible for debugging but resolve rather than reject (avoids an
        // unhandledrejection).
        console.error('[supabaseGameAPI] emit(decision) failed:', error);
      }
    } catch (err) {
      console.error('[supabaseGameAPI] emit(decision) threw:', err);
    }
  }

  async function award(points) {
    const pid = playerId || safeGet(PLAYER_ID_KEY);
    if (!pid || !points) return;

    try {
      // Atomic server-side increment (see increment_score in schema.sql).
      // Avoids the lost-update race of a select-then-update round trip when
      // awards land concurrently or interleave with a refresh.
      const { error } = await supabase.rpc('increment_score', {
        p_player_id: pid,
        p_points: points,
      });
      if (error) {
        console.error('[supabaseGameAPI] award failed:', error);
      }
    } catch (err) {
      console.error('[supabaseGameAPI] award threw:', err);
    }
  }

  async function advance() {
    try {
      if (!roomId) await loadRoom();
      if (!roomId) return;
      const last = station.currentIdx;
      // Past the last index, end the room; otherwise step to next scenario.
      // Reset reveal to false in the SAME update so each new scenario starts
      // hidden (answers come in hidden → host reveals → discuss → advance).
      const patch =
        last >= SCENARIO_COUNT - 1
          ? { status: 'ended', reveal: false }
          : { current_idx: last + 1, status: 'active', reveal: false };
      const { error } = await supabase
        .from('rooms')
        .update(patch)
        .eq('id', roomId);
      if (error) {
        console.error('[supabaseGameAPI] advance failed:', error);
      }
    } catch (err) {
      console.error('[supabaseGameAPI] advance threw:', err);
    }
  }

  async function setReveal(on) {
    try {
      if (!roomId) await loadRoom();
      if (!roomId) return;
      const { error } = await supabase
        .from('rooms')
        .update({ reveal: !!on })
        .eq('id', roomId);
      if (error) {
        console.error('[supabaseGameAPI] setReveal failed:', error);
      }
    } catch (err) {
      console.error('[supabaseGameAPI] setReveal threw:', err);
    }
  }

  function subscribe(cb) {
    listeners.add(cb);
    // Push the current snapshot immediately so new subscribers aren't blank.
    cb(getStation());
    return () => {
      listeners.delete(cb);
    };
  }

  function destroy() {
    // Tear down the realtime channel and drop all subscribers. Callers that
    // own the API lifecycle (App.jsx) invoke this when the gameAPI changes or
    // unmounts so the channel is not orphaned (it is opened at construction).
    try {
      if (supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    } catch (err) {
      console.error('[supabaseGameAPI] destroy (removeChannel) failed:', err);
    }
    listeners.clear();
  }

  return {
    getView,
    isSolo,
    getRoomCode,
    joinRoom,
    emit,
    award,
    advance,
    setReveal,
    subscribe,
    getStation,
    destroy,
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

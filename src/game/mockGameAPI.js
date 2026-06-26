// src/game/mockGameAPI.js
import { SCENARIOS } from '../content/scenarios.js';

/**
 * In-memory implementation of the GameAPI interface (see GameAPI.js for the
 * full interface JSDoc). Deterministic: no Math.random anywhere. All methods
 * return resolved Promises and synchronously mutate the in-memory Station
 * before notifying subscribers.
 *
 * @param {{ view?: 'play'|'screen'|'host', roomCode?: string, seed?: boolean, solo?: boolean }} opts
 *        solo defaults true (single-device solo play). Pass solo:false to
 *        simulate a hosted/multiplayer room where the host paces scenarios.
 * @returns {import('./GameAPI.js').GameAPI}
 */
export function createMockGameAPI({ view = 'play', roomCode = 'DEMO', seed = false, solo = true } = {}) {
  // Deterministic squad teams. joinRoom assigns one from a stable hash of the
  // generated player id so buildScoreboard's team branch fires in solo play too
  // (it requires every player to have a truthy team).
  const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  const station = {
    roomCode,
    currentIdx: 0,
    reveal: false,
    status: 'lobby',
    players: [],
    decisions: [],
    respondedCount: 0,
  };

  const subscribers = new Set();
  let nextId = 0;
  const makeId = (prefix) => `${prefix}_${++nextId}`;

  // Stable 32-bit string hash so a given id always maps to the same team.
  // Mirrors the supabaseGameAPI joinRoom hash so the two backends agree.
  function teamFor(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return 'Team ' + TEAMS[hash % TEAMS.length];
  }

  function recomputeResponded() {
    const ids = new Set();
    for (const d of station.decisions) {
      if (d.scenarioIdx === station.currentIdx) ids.add(d.playerId);
    }
    station.respondedCount = ids.size;
  }

  function notify() {
    recomputeResponded();
    for (const cb of subscribers) cb(station);
  }

  const api = {
    getView() {
      return view;
    },
    isSolo() {
      return solo;
    },
    getRoomCode() {
      return roomCode;
    },
    getStation() {
      return station;
    },
    joinRoom({ name }) {
      const id = makeId('p');
      const player = { id, name, team: teamFor(id), score: 0 };
      station.players.push(player);
      if (station.status === 'lobby') station.status = 'active';
      notify();
      return Promise.resolve({ playerId: player.id });
    },
    emit(event, payload) {
      if (event === 'decision') {
        const { scenarioId, scenarioIdx, choice, isBest, breach, playerId } = payload;
        const pid = playerId != null ? playerId : (station.players[0] && station.players[0].id);
        const exists = station.decisions.some(
          (d) => d.playerId === pid && d.scenarioIdx === scenarioIdx
        );
        if (!exists) {
          station.decisions.push({ playerId: pid, scenarioId, scenarioIdx, choice, isBest, breach });
        }
      }
      notify();
      return Promise.resolve();
    },
    advance() {
      if (station.currentIdx >= SCENARIOS.length - 1) {
        station.status = 'ended';
      } else {
        station.currentIdx += 1;
      }
      // Each new scenario starts hidden: answers come in hidden → host reveals
      // → discuss → advance resets to hidden for the next scenario.
      station.reveal = false;
      notify();
      return Promise.resolve();
    },
    award(points) {
      const p = station.players[0];
      if (p) p.score += points;
      notify();
      return Promise.resolve();
    },
    setReveal(on) {
      station.reveal = !!on;
      notify();
      return Promise.resolve();
    },
    subscribe(cb) {
      subscribers.add(cb);
      return function unsubscribe() {
        subscribers.delete(cb);
      };
    },
    destroy() {
      // No realtime channel to release (in-memory), but clear subscribers so
      // the interface is uniform with the Supabase API and App.jsx can call
      // destroy() on either backend when the gameAPI changes/unmounts.
      subscribers.clear();
    },
  };

  function seedStation() {
    const teams = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const choiceCycle = ['automate', 'hitl', 'manual'];
    const NAMES = [
      'Aisha', 'Ben', 'Chloe', 'Darren', 'Elena', 'Faisal', 'Grace', 'Hugo',
      'Ivy', 'Jamal', 'Kira', 'Leon', 'Mona', 'Nadia', 'Omar', 'Priya',
      'Quentin', 'Rosa', 'Sami', 'Tara', 'Umar', 'Vera', 'Wei', 'Xena',
      'Yusuf', 'Zoe', 'Amir', 'Bella', 'Cyrus', 'Dana',
    ];
    const scenario = SCENARIOS[station.currentIdx];
    NAMES.forEach((name, i) => {
      const player = {
        id: makeId('p'),
        name,
        team: teams[i % teams.length],
        score: 0,
      };
      station.players.push(player);
      const choice = choiceCycle[i % choiceCycle.length];
      const isBest = choice === scenario.best;
      const breach = !!scenario.choices[choice].breach;
      if (isBest) player.score += 10;
      station.decisions.push({
        playerId: player.id,
        scenarioIdx: station.currentIdx,
        choice,
        isBest,
        breach,
      });
    });
    station.status = 'active';
    recomputeResponded();
  }

  if (seed) seedStation();

  return api;
}

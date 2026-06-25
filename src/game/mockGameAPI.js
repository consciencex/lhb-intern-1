// src/game/mockGameAPI.js
import { SCENARIOS } from '../content/scenarios.js';

/**
 * In-memory implementation of the GameAPI interface (see GameAPI.js for the
 * full interface JSDoc). Deterministic: no Math.random anywhere. All methods
 * return resolved Promises and synchronously mutate the in-memory Station
 * before notifying subscribers.
 *
 * @param {{ view?: 'play'|'screen'|'host', roomCode?: string, seed?: boolean }} opts
 * @returns {import('./GameAPI.js').GameAPI}
 */
export function createMockGameAPI({ view = 'play', roomCode = 'DEMO', seed = false } = {}) {
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
    getRoomCode() {
      return roomCode;
    },
    getStation() {
      return station;
    },
  };

  return api;
}

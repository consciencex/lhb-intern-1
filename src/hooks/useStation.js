// src/hooks/useStation.js
import { useEffect, useState } from 'react';

// Shallow snapshot so a backend that mutates and re-emits the SAME Station
// object reference (e.g. the in-memory mock) still produces a new top-level
// reference and triggers a React re-render.
// NOTE: this is a SHALLOW copy — the inner `decisions`/`players` arrays keep
// their identity when the backend mutates them in place. Consumers must
// recompute over them each render (e.g. call aggregate(station.decisions)
// directly) rather than identity-memoizing on those arrays.
function snapshot(s) {
  return s ? { ...s } : s;
}

/**
 * Subscribe to a GameAPI's Station and re-render on every change.
 *
 * @param {{ getStation: () => object, subscribe: (cb: (s: object) => void) => (() => void) }} gameAPI
 * @returns {object} the latest Station
 */
export function useStation(gameAPI) {
  const [station, setStation] = useState(() => snapshot(gameAPI.getStation()));

  useEffect(() => {
    // Re-sync immediately in case the station changed between the initial
    // useState and this effect running.
    setStation(snapshot(gameAPI.getStation()));
    const unsubscribe = gameAPI.subscribe((next) => {
      setStation(snapshot(next));
    });
    return unsubscribe;
  }, [gameAPI]);

  return station;
}

// src/hooks/useStation.js
import { useEffect, useState } from 'react';

/**
 * Subscribe to a GameAPI's Station and re-render on every change.
 *
 * @param {{ getStation: () => object, subscribe: (cb: (s: object) => void) => (() => void) }} gameAPI
 * @returns {object} the latest Station
 */
export function useStation(gameAPI) {
  const [station, setStation] = useState(() => gameAPI.getStation());

  useEffect(() => {
    // Re-sync immediately in case the station changed between the initial
    // useState and this effect running.
    setStation(gameAPI.getStation());
    const unsubscribe = gameAPI.subscribe((next) => {
      setStation(next);
    });
    return unsubscribe;
  }, [gameAPI]);

  return station;
}

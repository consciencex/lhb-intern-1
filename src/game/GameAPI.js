// src/game/GameAPI.js
import { createMockGameAPI } from './mockGameAPI.js';
import { createSupabaseGameAPI } from './supabaseGameAPI.js';

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {string|null} team
 * @property {number} score
 */

/**
 * @typedef {Object} Decision
 * @property {string} playerId
 * @property {string} scenarioId       // stable scenario id (maps to Supabase scenario_id)
 * @property {number} scenarioIdx
 * @property {string} choice           // 'automate' | 'hitl' | 'manual'
 * @property {boolean} isBest
 * @property {boolean} breach
 */

/**
 * @typedef {Object} Station
 * @property {string} roomCode
 * @property {number} currentIdx
 * @property {boolean} reveal
 * @property {'lobby'|'active'|'ended'} status
 * @property {Player[]} players
 * @property {Decision[]} decisions
 * @property {number} respondedCount   // DISTINCT players with a decision for currentIdx
 */

/**
 * The single realtime seam. Views and game code NEVER touch Supabase directly;
 * they only call methods on a GameAPI object.
 *
 * @typedef {Object} GameAPI
 * @property {() => 'play'|'screen'|'host'} getView
 * @property {() => string|null} getRoomCode
 * @property {(args: { name: string }) => Promise<{ playerId: string }>} joinRoom
 * @property {(event: string, payload: object) => Promise<void>} emit
 *           emit('decision', { scenarioId, scenarioIdx, choice, isBest, breach })
 * @property {(points: number) => Promise<void>} award
 * @property {() => Promise<void>} advance      // host: currentIdx++ or status->'ended'
 * @property {(on: boolean) => Promise<void>} setReveal  // host: toggle aggregate reveal
 * @property {(cb: (station: Station) => void) => (() => void)} subscribe
 *           subscribe returns an unsubscribe function.
 * @property {() => Station} getStation
 * @property {() => void} destroy
 *           Release the realtime channel (Supabase) and drop all subscribers.
 *           Callers that own the API lifecycle must call this when the GameAPI
 *           is replaced or the app unmounts, or the channel is orphaned.
 */

/**
 * Factory: returns the Supabase-backed GameAPI when a live supabase client is
 * present, otherwise the in-memory mock.
 *
 * @param {{ view: 'play'|'screen'|'host', roomCode: string|null, supabase: object|null }} args
 * @returns {GameAPI}
 */
export function buildGameAPI({ view, roomCode, supabase }) {
  if (supabase) {
    return createSupabaseGameAPI({ view, roomCode, supabase });
  }
  return createMockGameAPI({ view, roomCode });
}

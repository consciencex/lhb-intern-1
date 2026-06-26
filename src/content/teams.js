// src/content/teams.js
// The four squads a player can join. Defined centrally so the PlayerView
// picker, the GameAPI joinRoom layer, and the Screen team-standings panel all
// agree on the same keys, display names and accent colors.
import { COLORS } from '../theme.js';

export const TEAMS = [
  { key: 'alpha', name: 'Team Alpha', color: COLORS.blue },
  { key: 'beta', name: 'Team Beta', color: COLORS.purple },
  { key: 'gamma', name: 'Team Gamma', color: COLORS.green },
  { key: 'delta', name: 'Team Delta', color: COLORS.amber },
];

/**
 * Look up a team by its display name (e.g. 'Team Alpha').
 * @param {string} name
 * @returns {{key:string,name:string,color:string}|undefined}
 */
export function teamByName(name) {
  return TEAMS.find((t) => t.name === name);
}

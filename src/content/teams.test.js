import { describe, it, expect } from 'vitest';
import { TEAMS, teamByName } from './teams.js';
import { COLORS } from '../theme.js';

describe('TEAMS content', () => {
  it('defines exactly the four squads in order with key + name', () => {
    expect(TEAMS.map((t) => t.key)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
    expect(TEAMS.map((t) => t.name)).toEqual([
      'Team Alpha',
      'Team Beta',
      'Team Gamma',
      'Team Delta',
    ]);
  });

  it('every team has a readable theme color', () => {
    const palette = new Set(Object.values(COLORS));
    for (const t of TEAMS) {
      expect(typeof t.color).toBe('string');
      expect(t.color.length).toBeGreaterThan(0);
      expect(palette.has(t.color)).toBe(true);
    }
  });

  it('team colors are distinct so squads are visually separable', () => {
    const colors = TEAMS.map((t) => t.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('teamByName looks up a team by its display name', () => {
    expect(teamByName('Team Alpha')).toEqual(TEAMS[0]);
    expect(teamByName('Team Delta')).toEqual(TEAMS[3]);
  });

  it('teamByName returns undefined for an unknown name', () => {
    expect(teamByName('Team Omega')).toBeUndefined();
    expect(teamByName(null)).toBeUndefined();
  });
});

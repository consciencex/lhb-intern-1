import {
  START_METERS,
  POINTS_PER_BEST,
  clamp,
  applyChoice,
  isBest,
  scoreDelta,
  meterColor,
  meterLabel,
  reportProfile,
  aggregate,
  aggregateByScenario,
  optimalRate,
  isRoomSplit,
  buildScoreboard,
  teamStandings,
} from './gameLogic';
import { COLORS } from '../theme';

describe('constants', () => {
  it('START_METERS starts every meter at 50', () => {
    expect(START_METERS).toEqual({ eff: 50, risk: 50, comp: 50 });
  });

  it('POINTS_PER_BEST is 10', () => {
    expect(POINTS_PER_BEST).toBe(10);
  });
});

describe('clamp', () => {
  it('rounds to the nearest integer', () => {
    expect(clamp(49.4)).toBe(49);
    expect(clamp(49.5)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it('clamps values above 100 down to 100', () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(250)).toBe(100);
    expect(clamp(100)).toBe(100);
  });

  it('clamps values below 0 up to 0', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-50)).toBe(0);
    expect(clamp(0)).toBe(0);
  });

  it('rounds before bounding (99.6 -> 100)', () => {
    expect(clamp(99.6)).toBe(100);
  });
});

describe('applyChoice', () => {
  it('adds deltas to each meter', () => {
    const result = applyChoice({ eff: 50, risk: 50, comp: 50 }, { eff: 10, risk: -5, comp: 20 });
    expect(result).toEqual({ eff: 60, risk: 45, comp: 70 });
  });

  it('clamps results to 0..100', () => {
    const result = applyChoice({ eff: 95, risk: 5, comp: 50 }, { eff: 30, risk: -30, comp: 0 });
    expect(result).toEqual({ eff: 100, risk: 0, comp: 50 });
  });

  it('does not mutate the input meters object', () => {
    const meters = { eff: 50, risk: 50, comp: 50 };
    applyChoice(meters, { eff: 10, risk: 10, comp: 10 });
    expect(meters).toEqual({ eff: 50, risk: 50, comp: 50 });
  });

  it('does not mutate the input deltas object', () => {
    const deltas = { eff: 10, risk: 10, comp: 10 };
    applyChoice({ eff: 50, risk: 50, comp: 50 }, deltas);
    expect(deltas).toEqual({ eff: 10, risk: 10, comp: 10 });
  });

  it('returns a new object reference each call', () => {
    const meters = { eff: 50, risk: 50, comp: 50 };
    const result = applyChoice(meters, { eff: 0, risk: 0, comp: 0 });
    expect(result).not.toBe(meters);
  });
});

describe('isBest / scoreDelta', () => {
  const scenario = { best: 'hitl' };

  it('isBest is true when choiceKey equals scenario.best', () => {
    expect(isBest('hitl', scenario)).toBe(true);
  });

  it('isBest is false when choiceKey differs from scenario.best', () => {
    expect(isBest('automate', scenario)).toBe(false);
    expect(isBest('manual', scenario)).toBe(false);
  });

  it('scoreDelta is POINTS_PER_BEST (10) for the best choice', () => {
    expect(scoreDelta('hitl', scenario)).toBe(10);
    expect(scoreDelta('hitl', scenario)).toBe(POINTS_PER_BEST);
  });

  it('scoreDelta is 0 for a non-best choice', () => {
    expect(scoreDelta('automate', scenario)).toBe(0);
    expect(scoreDelta('manual', scenario)).toBe(0);
  });
});

describe('meterColor', () => {
  it('eff: >=60 green, exact 60 is green', () => {
    expect(meterColor('eff', 60)).toBe(COLORS.green);
    expect(meterColor('eff', 100)).toBe(COLORS.green);
  });

  it('eff: 38..59 amber, exact 38 is amber, 59 is amber', () => {
    expect(meterColor('eff', 38)).toBe(COLORS.amber);
    expect(meterColor('eff', 59)).toBe(COLORS.amber);
  });

  it('eff: <38 red, exact 37 is red', () => {
    expect(meterColor('eff', 37)).toBe(COLORS.red);
    expect(meterColor('eff', 0)).toBe(COLORS.red);
  });

  it('comp uses the same thresholds as eff', () => {
    expect(meterColor('comp', 60)).toBe(COLORS.green);
    expect(meterColor('comp', 38)).toBe(COLORS.amber);
    expect(meterColor('comp', 37)).toBe(COLORS.red);
  });

  it('risk: <=40 green, exact 40 is green', () => {
    expect(meterColor('risk', 40)).toBe(COLORS.green);
    expect(meterColor('risk', 0)).toBe(COLORS.green);
  });

  it('risk: 41..65 amber, exact 41 is amber, 65 is amber', () => {
    expect(meterColor('risk', 41)).toBe(COLORS.amber);
    expect(meterColor('risk', 65)).toBe(COLORS.amber);
  });

  it('risk: >65 red, exact 66 is red', () => {
    expect(meterColor('risk', 66)).toBe(COLORS.red);
    expect(meterColor('risk', 100)).toBe(COLORS.red);
  });
});

describe('meterLabel', () => {
  it('eff: >=65 High Efficiency, exact 65', () => {
    expect(meterLabel('eff', 65)).toBe('High Efficiency');
    expect(meterLabel('eff', 100)).toBe('High Efficiency');
  });

  it('eff: 42..64 Balanced, exact 42 and 64', () => {
    expect(meterLabel('eff', 42)).toBe('Balanced');
    expect(meterLabel('eff', 64)).toBe('Balanced');
  });

  it('eff: <42 Low Efficiency, exact 41', () => {
    expect(meterLabel('eff', 41)).toBe('Low Efficiency');
    expect(meterLabel('eff', 0)).toBe('Low Efficiency');
  });

  it('risk: <=38 Risk-Aware, exact 38', () => {
    expect(meterLabel('risk', 38)).toBe('Risk-Aware');
    expect(meterLabel('risk', 0)).toBe('Risk-Aware');
  });

  it('risk: 39..62 Moderate Risk, exact 39 and 62', () => {
    expect(meterLabel('risk', 39)).toBe('Moderate Risk');
    expect(meterLabel('risk', 62)).toBe('Moderate Risk');
  });

  it('risk: >62 High Risk, exact 63', () => {
    expect(meterLabel('risk', 63)).toBe('High Risk');
    expect(meterLabel('risk', 100)).toBe('High Risk');
  });

  it('comp: >=65 Compliant, 42..64 Marginal, <42 At Risk', () => {
    expect(meterLabel('comp', 65)).toBe('Compliant');
    expect(meterLabel('comp', 42)).toBe('Marginal');
    expect(meterLabel('comp', 64)).toBe('Marginal');
    expect(meterLabel('comp', 41)).toBe('At Risk');
  });
});

describe('reportProfile', () => {
  it('maps eff and comp to {pct,color,label} and risk to {safePct,color,label}', () => {
    const profile = reportProfile({ eff: 72, risk: 30, comp: 50 });
    expect(profile.eff).toEqual({ pct: 72, color: COLORS.green, label: 'High Efficiency' });
    expect(profile.comp).toEqual({ pct: 50, color: COLORS.amber, label: 'Marginal' });
    expect(profile.risk).toEqual({ safePct: 70, color: COLORS.green, label: 'Risk-Aware' });
  });

  it('risk safePct is 100 minus the raw risk value', () => {
    const profile = reportProfile({ eff: 50, risk: 80, comp: 50 });
    expect(profile.risk.safePct).toBe(20);
  });

  it('risk color and label use the RAW risk value, not safePct', () => {
    // raw risk 80 -> safePct 20. color/label must reflect raw 80 (High Risk / red), not 20.
    const profile = reportProfile({ eff: 50, risk: 80, comp: 50 });
    expect(profile.risk.color).toBe(COLORS.red);
    expect(profile.risk.label).toBe('High Risk');
  });
});

describe('aggregate', () => {
  it('returns zeroed counts and 0% bars with no divide-by-zero when total is 0', () => {
    const agg = aggregate([]);
    expect(agg.total).toBe(0);
    expect(agg.counts).toEqual({ automate: 0, hitl: 0, manual: 0 });
    expect(agg.bars.map((b) => b.pct)).toEqual([0, 0, 0]);
    expect(agg.bars.map((b) => b.pctStr)).toEqual(['0%', '0%', '0%']);
  });

  it('counts decisions by choice and keeps CHOICE_ORDER (automate, hitl, manual)', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    expect(agg.total).toBe(4);
    expect(agg.counts).toEqual({ automate: 2, hitl: 1, manual: 1 });
    expect(agg.bars.map((b) => b.key)).toEqual(['automate', 'hitl', 'manual']);
  });

  it('computes rounded pct, pctStr, label, and color per bar', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    expect(agg.bars[0]).toEqual({
      key: 'automate',
      label: 'Automate Fully',
      pct: 50,
      pctStr: '50%',
      color: COLORS.barAutomate,
    });
    expect(agg.bars[1]).toEqual({
      key: 'hitl',
      label: 'Human-in-Loop',
      pct: 25,
      pctStr: '25%',
      color: COLORS.barHitl,
    });
    expect(agg.bars[2]).toEqual({
      key: 'manual',
      label: 'Manual Review',
      pct: 25,
      pctStr: '25%',
      color: COLORS.barManual,
    });
  });

  it('rounds pct to the nearest integer (1 of 3 -> 33%)', () => {
    const decisions = [{ choice: 'automate' }, { choice: 'hitl' }, { choice: 'manual' }];
    const agg = aggregate(decisions);
    expect(agg.bars.map((b) => b.pct)).toEqual([33, 33, 33]);
  });
});

describe('aggregateByScenario', () => {
  it('returns one aggregate per scenario index (length === scenarioCount)', () => {
    const result = aggregateByScenario([], 6);
    expect(result).toHaveLength(6);
    // Every slot is a fully-formed (zeroed) aggregate — no divide-by-zero.
    result.forEach((agg) => {
      expect(agg.total).toBe(0);
      expect(agg.bars.map((b) => b.pct)).toEqual([0, 0, 0]);
    });
  });

  it('buckets decisions into their scenarioIdx slot', () => {
    const decisions = [
      { scenarioIdx: 0, choice: 'automate', isBest: false },
      { scenarioIdx: 0, choice: 'hitl', isBest: true },
      { scenarioIdx: 2, choice: 'manual', isBest: false },
    ];
    const result = aggregateByScenario(decisions, 3);
    expect(result).toHaveLength(3);
    expect(result[0].total).toBe(2);
    expect(result[0].counts).toEqual({ automate: 1, hitl: 1, manual: 0 });
    expect(result[1].total).toBe(0);
    expect(result[2].total).toBe(1);
    expect(result[2].counts).toEqual({ automate: 0, hitl: 0, manual: 1 });
  });

  it('ignores decisions whose scenarioIdx is out of range', () => {
    const decisions = [
      { scenarioIdx: 5, choice: 'hitl', isBest: true },
      { scenarioIdx: 0, choice: 'automate', isBest: false },
    ];
    const result = aggregateByScenario(decisions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].total).toBe(1);
    expect(result[1].total).toBe(0);
  });
});

describe('optimalRate', () => {
  it('is 0 when there are no decisions (no divide-by-zero)', () => {
    expect(optimalRate([])).toBe(0);
  });

  it('is the fraction of decisions with isBest === true', () => {
    const decisions = [
      { isBest: true },
      { isBest: false },
      { isBest: true },
      { isBest: false },
    ];
    expect(optimalRate(decisions)).toBe(0.5);
  });

  it('is 1 when every decision is best', () => {
    expect(optimalRate([{ isBest: true }, { isBest: true }])).toBe(1);
  });

  it('treats only strictly true isBest as optimal', () => {
    // 1 of 3 best -> 1/3
    const decisions = [{ isBest: true }, { isBest: false }, { isBest: undefined }];
    expect(optimalRate(decisions)).toBeCloseTo(1 / 3, 10);
  });
});

describe('isRoomSplit', () => {
  it('is false when total is 0', () => {
    const agg = aggregate([]);
    expect(isRoomSplit(agg)).toBe(false);
  });

  it('is true when the top two bar pcts are within 15 points (50/50)', () => {
    const agg = aggregate([{ choice: 'automate' }, { choice: 'hitl' }]);
    // pcts: 50, 50, 0 -> top two are 50 and 50, diff 0 <= 15
    expect(isRoomSplit(agg)).toBe(true);
  });

  it('is true when top two differ by exactly 15 points (50 vs 35)', () => {
    // 20 decisions: 10 automate (50%), 7 hitl (35%), 3 manual (15%)
    const decisions = [];
    for (let i = 0; i < 10; i++) decisions.push({ choice: 'automate' });
    for (let i = 0; i < 7; i++) decisions.push({ choice: 'hitl' });
    for (let i = 0; i < 3; i++) decisions.push({ choice: 'manual' });
    const agg = aggregate(decisions);
    // pcts: 50, 35, 15 -> top two 50 and 35, diff 15 <= 15
    expect(isRoomSplit(agg)).toBe(true);
  });

  it('is false when the top bar dominates (top two differ by more than 15)', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
    ];
    // pcts: 75, 25, 0 -> top two 75 and 25, diff 50 > 15
    const agg = aggregate(decisions);
    expect(isRoomSplit(agg)).toBe(false);
  });
});

describe('buildScoreboard', () => {
  it('groups by team and sums score per team', () => {
    const players = [
      { name: 'Ann', team: 'Alpha', score: 10 },
      { name: 'Ben', team: 'Beta', score: 30 },
      { name: 'Cara', team: 'Alpha', score: 25 },
      { name: 'Dan', team: 'Beta', score: 5 },
    ];
    const rows = buildScoreboard(players);
    // Alpha = 10 + 25 = 35, Beta = 30 + 5 = 35; both rows present
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.score === 35)).toBe(true);
    expect(rows.map((r) => r.name).sort()).toEqual(['Alpha', 'Beta']);
  });

  it('sorts teams by descending summed score', () => {
    const players = [
      { name: 'Ann', team: 'Alpha', score: 10 },
      { name: 'Ben', team: 'Beta', score: 30 },
      { name: 'Cara', team: 'Gamma', score: 50 },
    ];
    const rows = buildScoreboard(players);
    expect(rows).toEqual([
      { name: 'Gamma', score: 50 },
      { name: 'Beta', score: 30 },
      { name: 'Alpha', score: 10 },
    ]);
  });

  it('falls back to per-player rows when players have no team', () => {
    const players = [
      { name: 'Ann', score: 10 },
      { name: 'Ben', score: 30 },
      { name: 'Cara', score: 20 },
    ];
    const rows = buildScoreboard(players);
    expect(rows).toEqual([
      { name: 'Ben', score: 30 },
      { name: 'Cara', score: 20 },
      { name: 'Ann', score: 10 },
    ]);
  });

  it('caps the result at 6 rows, highest scores first', () => {
    const players = [];
    for (let i = 0; i < 10; i++) {
      players.push({ name: 'P' + i, team: 'T' + i, score: i });
    }
    const rows = buildScoreboard(players);
    expect(rows.length).toBe(6);
    // each player on a distinct team; teams T9..T4 are the 6 highest
    expect(rows.map((r) => r.name)).toEqual(['T9', 'T8', 'T7', 'T6', 'T5', 'T4']);
  });

  it('returns an empty array for no players', () => {
    expect(buildScoreboard([])).toEqual([]);
  });
});

describe('teamStandings', () => {
  it('returns [] for empty players and empty decisions', () => {
    expect(teamStandings([], [])).toEqual([]);
  });

  it('returns [] when there are no players (even if stray decisions exist)', () => {
    const decisions = [{ playerId: 'ghost', isBest: true }];
    expect(teamStandings([], decisions)).toEqual([]);
  });

  it('aggregates one row per team: player count, summed score, response count, optimalRate', () => {
    const players = [
      { id: 'a', name: 'Ann', team: 'Team Alpha', score: 20 },
      { id: 'b', name: 'Ben', team: 'Team Alpha', score: 10 },
      { id: 'c', name: 'Cara', team: 'Team Beta', score: 30 },
    ];
    const decisions = [
      { playerId: 'a', isBest: true },
      { playerId: 'a', isBest: false },
      { playerId: 'b', isBest: true },
      { playerId: 'c', isBest: true },
      { playerId: 'c', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    const alpha = rows.find((r) => r.team === 'Team Alpha');
    const beta = rows.find((r) => r.team === 'Team Beta');

    expect(alpha).toEqual({
      team: 'Team Alpha',
      players: 2,
      score: 30,
      responses: 3,
      optimalRate: 2 / 3,
    });
    expect(beta).toEqual({
      team: 'Team Beta',
      players: 1,
      score: 30,
      responses: 2,
      optimalRate: 1,
    });
  });

  it('sorts by score desc', () => {
    const players = [
      { id: 'a', team: 'Team Alpha', score: 10 },
      { id: 'b', team: 'Team Beta', score: 50 },
      { id: 'c', team: 'Team Gamma', score: 30 },
    ];
    const rows = teamStandings(players, []);
    expect(rows.map((r) => r.team)).toEqual([
      'Team Beta',
      'Team Gamma',
      'Team Alpha',
    ]);
  });

  it('breaks score ties by optimalRate desc', () => {
    const players = [
      { id: 'a', team: 'Team Alpha', score: 20 },
      { id: 'b', team: 'Team Beta', score: 20 },
    ];
    const decisions = [
      // Alpha: 1 of 2 best -> 0.5
      { playerId: 'a', isBest: true },
      { playerId: 'a', isBest: false },
      // Beta: 2 of 2 best -> 1.0
      { playerId: 'b', isBest: true },
      { playerId: 'b', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    expect(rows.map((r) => r.team)).toEqual(['Team Beta', 'Team Alpha']);
  });

  it('optimalRate is 0 (no divide-by-zero) for a team with players but no responses', () => {
    const players = [{ id: 'a', team: 'Team Alpha', score: 0 }];
    const rows = teamStandings(players, []);
    expect(rows).toHaveLength(1);
    expect(rows[0].responses).toBe(0);
    expect(rows[0].optimalRate).toBe(0);
  });

  it('only includes teams that have at least one player', () => {
    const players = [{ id: 'a', team: 'Team Alpha', score: 0 }];
    // A decision from a player NOT in the roster must not invent a team row.
    const decisions = [{ playerId: 'zzz', isBest: true }];
    const rows = teamStandings(players, decisions);
    expect(rows.map((r) => r.team)).toEqual(['Team Alpha']);
    expect(rows[0].responses).toBe(0);
  });

  it('attributes each decision to its player\'s team via playerId', () => {
    const players = [
      { id: 'a', team: 'Team Alpha', score: 0 },
      { id: 'b', team: 'Team Beta', score: 0 },
    ];
    const decisions = [
      { playerId: 'a', isBest: true },
      { playerId: 'b', isBest: false },
      { playerId: 'b', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    const alpha = rows.find((r) => r.team === 'Team Alpha');
    const beta = rows.find((r) => r.team === 'Team Beta');
    expect(alpha.responses).toBe(1);
    expect(beta.responses).toBe(2);
  });

  it('ignores players without a team (no undefined team row)', () => {
    const players = [
      { id: 'a', team: 'Team Alpha', score: 5 },
      { id: 'b', score: 99 }, // no team
    ];
    const rows = teamStandings(players, []);
    expect(rows.map((r) => r.team)).toEqual(['Team Alpha']);
  });
});

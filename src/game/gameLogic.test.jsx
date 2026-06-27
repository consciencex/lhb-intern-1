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
  accumulateMeters,
  teamMeters,
} from './gameLogic';
import { COLORS } from '../theme';

describe('constants', () => {
  it('START_METERS starts every one of the four meters at 50', () => {
    expect(START_METERS).toEqual({ eff: 50, acc: 50, risk: 50, comp: 50 });
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
  it('adds deltas to all four meters', () => {
    const result = applyChoice(
      { eff: 50, acc: 50, risk: 50, comp: 50 },
      { eff: 10, acc: -5, risk: -5, comp: 20 },
    );
    expect(result).toEqual({ eff: 60, acc: 45, risk: 45, comp: 70 });
  });

  it('clamps each of the four meters to 0..100', () => {
    const result = applyChoice(
      { eff: 95, acc: 5, risk: 5, comp: 50 },
      { eff: 30, acc: -30, risk: -30, comp: 0 },
    );
    expect(result).toEqual({ eff: 100, acc: 0, risk: 0, comp: 50 });
  });

  it('does not mutate the input meters object', () => {
    const meters = { eff: 50, acc: 50, risk: 50, comp: 50 };
    applyChoice(meters, { eff: 10, acc: 10, risk: 10, comp: 10 });
    expect(meters).toEqual({ eff: 50, acc: 50, risk: 50, comp: 50 });
  });

  it('does not mutate the input deltas object', () => {
    const deltas = { eff: 10, acc: 10, risk: 10, comp: 10 };
    applyChoice({ eff: 50, acc: 50, risk: 50, comp: 50 }, deltas);
    expect(deltas).toEqual({ eff: 10, acc: 10, risk: 10, comp: 10 });
  });

  it('returns a new object reference each call', () => {
    const meters = { eff: 50, acc: 50, risk: 50, comp: 50 };
    const result = applyChoice(meters, { eff: 0, acc: 0, risk: 0, comp: 0 });
    expect(result).not.toBe(meters);
  });

  it('generalizes over the keys present in the meters object', () => {
    // Only the keys present in meters are carried through and updated.
    const result = applyChoice(
      { eff: 50, acc: 50, risk: 50, comp: 50 },
      { eff: 5, acc: 5, risk: 5, comp: 5 },
    );
    expect(Object.keys(result).sort()).toEqual(['acc', 'comp', 'eff', 'risk']);
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

  it('acc uses the same higher-is-better thresholds as eff/comp', () => {
    expect(meterColor('acc', 60)).toBe(COLORS.green);
    expect(meterColor('acc', 100)).toBe(COLORS.green);
    expect(meterColor('acc', 38)).toBe(COLORS.amber);
    expect(meterColor('acc', 59)).toBe(COLORS.amber);
    expect(meterColor('acc', 37)).toBe(COLORS.red);
    expect(meterColor('acc', 0)).toBe(COLORS.red);
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

  it('acc: >=65 High Accuracy, exact 65', () => {
    expect(meterLabel('acc', 65)).toBe('High Accuracy');
    expect(meterLabel('acc', 100)).toBe('High Accuracy');
  });

  it('acc: 42..64 Balanced, exact 42 and 64', () => {
    expect(meterLabel('acc', 42)).toBe('Balanced');
    expect(meterLabel('acc', 64)).toBe('Balanced');
  });

  it('acc: <42 Low Accuracy, exact 41', () => {
    expect(meterLabel('acc', 41)).toBe('Low Accuracy');
    expect(meterLabel('acc', 0)).toBe('Low Accuracy');
  });
});

describe('reportProfile', () => {
  it('returns all four dimensions as {value,color,label} with the RAW meter value', () => {
    const profile = reportProfile({ eff: 72, acc: 30, risk: 30, comp: 50 });
    expect(profile.eff).toEqual({ value: 72, color: COLORS.green, label: 'High Efficiency' });
    expect(profile.acc).toEqual({ value: 30, color: COLORS.red, label: 'Low Accuracy' });
    expect(profile.risk).toEqual({ value: 30, color: COLORS.green, label: 'Risk-Aware' });
    expect(profile.comp).toEqual({ value: 50, color: COLORS.amber, label: 'Marginal' });
  });

  it('value is the raw meter for every axis (radar plots raw values), including risk', () => {
    // The radar plots raw values: high risk reaches further out on its axis.
    const profile = reportProfile({ eff: 50, acc: 88, risk: 80, comp: 50 });
    expect(profile.eff.value).toBe(50);
    expect(profile.acc.value).toBe(88);
    expect(profile.risk.value).toBe(80);
    expect(profile.comp.value).toBe(50);
  });

  it('risk color and label use the raw risk value (high risk is red / High Risk)', () => {
    const profile = reportProfile({ eff: 50, acc: 50, risk: 80, comp: 50 });
    expect(profile.risk.color).toBe(COLORS.red);
    expect(profile.risk.label).toBe('High Risk');
  });

  it('acc color and label reflect the raw accuracy value', () => {
    const profile = reportProfile({ eff: 50, acc: 90, risk: 50, comp: 50 });
    expect(profile.acc.color).toBe(COLORS.green);
    expect(profile.acc.label).toBe('High Accuracy');
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

  it('aggregates one row per team: player count, AVERAGE score per player, response count, optimalRate', () => {
    const players = [
      // Player .score columns are intentionally NOT multiples of the derived
      // score below; teamStandings must derive score from decisions, not these.
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

    // Alpha: 2 is_best decisions across 2 players -> avg per player
    // round(2 * POINTS_PER_BEST / 2) = round(20 / 2) = 10.
    expect(alpha).toEqual({
      team: 'Team Alpha',
      players: 2,
      score: Math.round((2 * POINTS_PER_BEST) / 2),
      responses: 3,
      optimalRate: 2 / 3,
    });
    // Beta: 2 is_best decisions across 1 player -> avg per player
    // round(2 * POINTS_PER_BEST / 1) = round(20 / 1) = 20.
    expect(beta).toEqual({
      team: 'Team Beta',
      players: 1,
      score: Math.round((2 * POINTS_PER_BEST) / 1),
      responses: 2,
      optimalRate: 1,
    });
  });

  it('derives team score from decisions, NOT the (replay-inflated) players.score column', () => {
    // Regression for the scoring-consistency bug: award() double-counts on
    // replay so players.score inflates (e.g. 30) while emit('decision') stays
    // deduped (only 1 is_best row). Team score must reflect the decisions (10),
    // not the inflated column, and stay consistent with optimalRate.
    const players = [{ id: 'a', team: 'Team Alpha', score: 30 }];
    const decisions = [{ playerId: 'a', scenarioIdx: 0, isBest: true }];
    const rows = teamStandings(players, decisions);
    expect(rows).toHaveLength(1);
    // Single-player team: avg per player = round(1 * 10 / 1) = 10, not the
    // inflated 30 from the players.score column.
    expect(rows[0].score).toBe(Math.round((1 * POINTS_PER_BEST) / 1)); // 10
    expect(rows[0].responses).toBe(1);
    expect(rows[0].optimalRate).toBe(1);
  });

  it('sorts by AVERAGE-per-player score desc (each team here has 1 player)', () => {
    const players = [
      { id: 'a', team: 'Team Alpha' },
      { id: 'b', team: 'Team Beta' },
      { id: 'c', team: 'Team Gamma' },
    ];
    const decisions = [
      // Alpha: 1 best / 1 player -> avg 10
      { playerId: 'a', isBest: true },
      // Beta: 3 best / 1 player -> avg 30 (highest)
      { playerId: 'b', isBest: true },
      { playerId: 'b', isBest: true },
      { playerId: 'b', isBest: true },
      // Gamma: 2 best / 1 player -> avg 20
      { playerId: 'c', isBest: true },
      { playerId: 'c', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    expect(rows.map((r) => r.team)).toEqual([
      'Team Beta',
      'Team Gamma',
      'Team Alpha',
    ]);
  });

  it('score is the AVERAGE points per player (fair across team sizes)', () => {
    const players = [
      // Team Alpha: 4 players
      { id: 'a1', team: 'Team Alpha' },
      { id: 'a2', team: 'Team Alpha' },
      { id: 'a3', team: 'Team Alpha' },
      { id: 'a4', team: 'Team Alpha' },
    ];
    // 3 optimal decisions across the 4 players -> 3 * 10 / 4 = 7.5 -> round 8.
    const decisions = [
      { playerId: 'a1', isBest: true },
      { playerId: 'a2', isBest: true },
      { playerId: 'a3', isBest: true },
      { playerId: 'a4', isBest: false },
    ];
    const rows = teamStandings(players, decisions);
    expect(rows[0].players).toBe(4);
    expect(rows[0].score).toBe(8); // round(30 / 4)
  });

  it('two teams with the same TOTAL but different sizes: the smaller team ranks higher', () => {
    const players = [
      // Big team: 4 players, 4 optimal decisions -> total 40, avg round(40/4)=10
      { id: 'b1', team: 'Team Big' },
      { id: 'b2', team: 'Team Big' },
      { id: 'b3', team: 'Team Big' },
      { id: 'b4', team: 'Team Big' },
      // Small team: 2 players, 4 optimal decisions -> total 40, avg round(40/2)=20
      { id: 's1', team: 'Team Small' },
      { id: 's2', team: 'Team Small' },
    ];
    const decisions = [
      { playerId: 'b1', isBest: true },
      { playerId: 'b2', isBest: true },
      { playerId: 'b3', isBest: true },
      { playerId: 'b4', isBest: true },
      { playerId: 's1', isBest: true },
      { playerId: 's1', isBest: true },
      { playerId: 's2', isBest: true },
      { playerId: 's2', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    const big = rows.find((r) => r.team === 'Team Big');
    const small = rows.find((r) => r.team === 'Team Small');
    // Same raw total (40), but per-player average differs.
    expect(big.score).toBe(10);
    expect(small.score).toBe(20);
    // The smaller team with the same total ranks higher (sorted first).
    expect(rows[0].team).toBe('Team Small');
  });

  it('breaks score ties by optimalRate desc', () => {
    const players = [
      { id: 'a', team: 'Team Alpha' },
      { id: 'b', team: 'Team Beta' },
    ];
    const decisions = [
      // Alpha: 1 of 2 best -> score 10, optimalRate 0.5
      { playerId: 'a', isBest: true },
      { playerId: 'a', isBest: false },
      // Beta: 1 of 1 best -> score 10, optimalRate 1.0 (same score, higher rate)
      { playerId: 'b', isBest: true },
    ];
    const rows = teamStandings(players, decisions);
    expect(rows.map((r) => r.score)).toEqual([10, 10]); // tied score
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

describe('accumulateMeters', () => {
  // A deterministic 2-scenario fixture. Scenario 0 pushes every meter UP hard
  // (so it clamps at 100), scenario 1 pulls every meter DOWN. The order in which
  // they apply changes the clamped result, which is what these tests pin down.
  const fixture = [
    { choices: { up: { eff: 60, acc: 60, risk: 60, comp: 60 } } },
    { choices: { down: { eff: -30, acc: -30, risk: -30, comp: -30 } } },
  ];

  it('starts from START_METERS (50s) and returns them unchanged for no decisions', () => {
    expect(accumulateMeters([], fixture)).toEqual(START_METERS);
    // Must be a fresh object, not the shared START_METERS reference.
    expect(accumulateMeters([], fixture)).not.toBe(START_METERS);
  });

  it('applies choice deltas in ASCENDING scenarioIdx order, clamping each step', () => {
    // Provided OUT of order; accumulateMeters must sort by scenarioIdx.
    // Order 0 then 1: 50 +60 ->100 (clamp), then -30 -> 70 for every meter.
    const decisions = [
      { scenarioIdx: 1, choice: 'down' },
      { scenarioIdx: 0, choice: 'up' },
    ];
    expect(accumulateMeters(decisions, fixture)).toEqual({
      eff: 70, acc: 70, risk: 70, comp: 70,
    });
  });

  it('order matters: the reverse sequence clamps to a different result', () => {
    // If 1 applied before 0: 50 -30 ->20, then +60 ->80. The function always
    // sorts ascending, so this is what a [0]=down,[1]=up fixture would yield —
    // here we prove the ascending sort by swapping the fixture's deltas.
    const reversed = [
      { choices: { down: { eff: -30, acc: -30, risk: -30, comp: -30 } } },
      { choices: { up: { eff: 60, acc: 60, risk: 60, comp: 60 } } },
    ];
    const decisions = [
      { scenarioIdx: 1, choice: 'up' },
      { scenarioIdx: 0, choice: 'down' },
    ];
    // 50 -30 ->20 (idx0), then +60 ->80 (idx1).
    expect(accumulateMeters(decisions, reversed)).toEqual({
      eff: 80, acc: 80, risk: 80, comp: 80,
    });
  });

  it('ignores a decision whose scenario index is out of range', () => {
    const decisions = [
      { scenarioIdx: 0, choice: 'up' },
      { scenarioIdx: 99, choice: 'up' }, // no such scenario
    ];
    // Only idx0 applies: 50 +60 -> 100 (clamped).
    expect(accumulateMeters(decisions, fixture)).toEqual({
      eff: 100, acc: 100, risk: 100, comp: 100,
    });
  });

  it('ignores a decision whose choice key does not exist on the scenario', () => {
    const decisions = [
      { scenarioIdx: 0, choice: 'up' },
      { scenarioIdx: 1, choice: 'nonexistent' }, // unknown choice
    ];
    // idx0 applies (-> 100), idx1's unknown choice is skipped -> stays 100.
    expect(accumulateMeters(decisions, fixture)).toEqual({
      eff: 100, acc: 100, risk: 100, comp: 100,
    });
  });

  it('does not mutate START_METERS', () => {
    accumulateMeters([{ scenarioIdx: 0, choice: 'up' }], fixture);
    expect(START_METERS).toEqual({ eff: 50, acc: 50, risk: 50, comp: 50 });
  });
});

describe('teamMeters', () => {
  // Reuse a fixture whose deltas are easy to reason about per player.
  const fixture = [
    { choices: { a: { eff: 20, acc: 0, risk: 0, comp: 0 } } },   // idx 0
    { choices: { b: { eff: 0, acc: 10, risk: 0, comp: 0 } } },   // idx 1
  ];

  it('returns [] for empty players', () => {
    expect(teamMeters([], [], fixture)).toEqual([]);
  });

  it('averages each answering member\'s accumulated meters, rounded', () => {
    const players = [
      { id: 'p1', team: 'Team Alpha' },
      { id: 'p2', team: 'Team Alpha' },
    ];
    const decisions = [
      // p1 answers idx0 (a): eff 50 +20 = 70; others 50.
      { playerId: 'p1', scenarioIdx: 0, choice: 'a' },
      // p2 answers idx1 (b): acc 50 +10 = 60; others 50.
      { playerId: 'p2', scenarioIdx: 1, choice: 'b' },
    ];
    const rows = teamMeters(players, decisions, fixture);
    expect(rows).toHaveLength(1);
    // p1 = {eff:70, acc:50, risk:50, comp:50}; p2 = {eff:50, acc:60, risk:50, comp:50}
    // average: eff (70+50)/2=60, acc (50+60)/2=55, risk 50, comp 50
    expect(rows[0]).toEqual({
      team: 'Team Alpha',
      players: 2,
      answered: 2,
      meters: { eff: 60, acc: 55, risk: 50, comp: 50 },
    });
  });

  it('rounds the averaged metrics to integers', () => {
    const players = [
      { id: 'p1', team: 'Team Alpha' },
      { id: 'p2', team: 'Team Alpha' },
      { id: 'p3', team: 'Team Alpha' },
    ];
    // Only p1 raises eff by 20 -> 70; p2, p3 answer with no-op-ish deltas.
    // eff values: 70, 50, 50 -> avg 170/3 = 56.67 -> round 57.
    const decisions = [
      { playerId: 'p1', scenarioIdx: 0, choice: 'a' },
      { playerId: 'p2', scenarioIdx: 1, choice: 'b' }, // acc 50->60
      { playerId: 'p3', scenarioIdx: 1, choice: 'b' }, // acc 50->60
    ];
    const rows = teamMeters(players, decisions, fixture);
    // eff: (70+50+50)/3 = 56.67 -> 57; acc: (50+60+60)/3 = 56.67 -> 57
    expect(rows[0].meters.eff).toBe(57);
    expect(rows[0].meters.acc).toBe(57);
  });

  it('averages only over members who answered (answered < players)', () => {
    const players = [
      { id: 'p1', team: 'Team Alpha' },
      { id: 'p2', team: 'Team Alpha' }, // never answers
    ];
    const decisions = [
      { playerId: 'p1', scenarioIdx: 0, choice: 'a' }, // eff -> 70
    ];
    const rows = teamMeters(players, decisions, fixture);
    expect(rows[0].players).toBe(2);
    expect(rows[0].answered).toBe(1);
    // Average over the 1 answering member only: eff 70, rest 50.
    expect(rows[0].meters).toEqual({ eff: 70, acc: 50, risk: 50, comp: 50 });
  });

  it('uses START_METERS (50s) for a team with players but no answers', () => {
    const players = [
      { id: 'p1', team: 'Team Alpha' },
      { id: 'p2', team: 'Team Alpha' },
    ];
    const rows = teamMeters(players, [], fixture);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      team: 'Team Alpha',
      players: 2,
      answered: 0,
      meters: { eff: 50, acc: 50, risk: 50, comp: 50 },
    });
  });

  it('excludes teams with zero players (and players with no team)', () => {
    const players = [
      { id: 'p1', team: 'Team Alpha' },
      { id: 'p2' }, // no team -> contributes no team row
    ];
    const decisions = [
      // A decision by a non-roster player must not invent a team.
      { playerId: 'ghost', scenarioIdx: 0, choice: 'a' },
    ];
    const rows = teamMeters(players, decisions, fixture);
    expect(rows.map((r) => r.team)).toEqual(['Team Alpha']);
  });

  it('emits one row per team, matching the teamStandings team set', () => {
    const players = [
      { id: 'a', team: 'Team Alpha' },
      { id: 'b', team: 'Team Beta' },
    ];
    const decisions = [
      { playerId: 'a', scenarioIdx: 0, choice: 'a' },
      { playerId: 'b', scenarioIdx: 1, choice: 'b' },
    ];
    const meterTeams = teamMeters(players, decisions, fixture).map((r) => r.team).sort();
    const standingTeams = teamStandings(players, decisions).map((r) => r.team).sort();
    expect(meterTeams).toEqual(standingTeams);
  });
});

import { COLORS } from '../theme';
import { CHOICE_ORDER, CHOICE_LABELS } from '../content/scenarios';

export const START_METERS = { eff: 50, acc: 50, risk: 50, comp: 50 };
export const POINTS_PER_BEST = 10;

export function clamp(v) {
  const r = Math.round(v);
  if (r > 100) return 100;
  if (r < 0) return 0;
  return r;
}

// Add the choice deltas to each meter, generalizing over whatever keys the
// meters object carries (eff/acc/risk/comp). Pure: never mutates the inputs,
// returns a fresh object, and clamps every result to 0..100. A missing delta
// for a present key is treated as 0.
export function applyChoice(meters, deltas) {
  const next = {};
  for (const key of Object.keys(meters)) {
    next[key] = clamp(meters[key] + (deltas[key] || 0));
  }
  return next;
}

export function isBest(choiceKey, scenario) {
  return choiceKey === scenario.best;
}

export function scoreDelta(choiceKey, scenario) {
  return isBest(choiceKey, scenario) ? POINTS_PER_BEST : 0;
}

export function meterColor(type, value) {
  if (type === 'risk') {
    if (value <= 40) return COLORS.green;
    if (value <= 65) return COLORS.amber;
    return COLORS.red;
  }
  // 'eff', 'acc' or 'comp' — higher is better.
  if (value >= 60) return COLORS.green;
  if (value >= 38) return COLORS.amber;
  return COLORS.red;
}

export function meterLabel(type, value) {
  if (type === 'eff') {
    if (value >= 65) return 'High Efficiency';
    if (value >= 42) return 'Balanced';
    return 'Low Efficiency';
  }
  if (type === 'acc') {
    if (value >= 65) return 'High Accuracy';
    if (value >= 42) return 'Balanced';
    return 'Low Accuracy';
  }
  if (type === 'risk') {
    if (value <= 38) return 'Risk-Aware';
    if (value <= 62) return 'Moderate Risk';
    return 'High Risk';
  }
  // 'comp'
  if (value >= 65) return 'Compliant';
  if (value >= 42) return 'Marginal';
  return 'At Risk';
}

// Build a per-axis profile for the radar. Each of the four dimensions reports
// the RAW meter value (0..100 — the radar plots raw magnitudes on every axis),
// plus a color and label derived from that raw value via meterColor/meterLabel.
export function reportProfile(meters) {
  const axis = (type) => ({
    value: meters[type],
    color: meterColor(type, meters[type]),
    label: meterLabel(type, meters[type]),
  });
  return {
    eff: axis('eff'),
    acc: axis('acc'),
    risk: axis('risk'),
    comp: axis('comp'),
  };
}

export function aggregate(decisions) {
  const counts = { automate: 0, hitl: 0, manual: 0 };
  for (const d of decisions) {
    if (counts[d.choice] !== undefined) counts[d.choice] += 1;
  }
  const total = decisions.length;
  const barColors = {
    automate: COLORS.barAutomate,
    hitl: COLORS.barHitl,
    manual: COLORS.barManual,
  };
  const bars = CHOICE_ORDER.map((key) => {
    const count = counts[key];
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return {
      key,
      label: CHOICE_LABELS[key],
      pct,
      pctStr: pct + '%',
      color: barColors[key],
    };
  });
  return { counts, total, bars };
}

/**
 * Bucket decisions by scenarioIdx and aggregate each bucket.
 * @param {Array<{scenarioIdx:number, choice:string}>} decisions
 * @param {number} scenarioCount
 * @returns {Array} length === scenarioCount, each an aggregate() result.
 */
export function aggregateByScenario(decisions, scenarioCount) {
  const buckets = Array.from({ length: scenarioCount }, () => []);
  for (const d of decisions) {
    if (d.scenarioIdx >= 0 && d.scenarioIdx < scenarioCount) {
      buckets[d.scenarioIdx].push(d);
    }
  }
  return buckets.map((b) => aggregate(b));
}

/**
 * Fraction (0..1) of decisions that chose the scenario's best approach.
 * Returns 0 for an empty list (no divide-by-zero).
 * @param {Array<{isBest:boolean}>} decisions
 * @returns {number}
 */
export function optimalRate(decisions) {
  if (decisions.length === 0) return 0;
  const best = decisions.filter((d) => d.isBest === true).length;
  return best / decisions.length;
}

export function isRoomSplit(agg) {
  if (agg.total === 0) return false;
  const pcts = agg.bars.map((b) => b.pct).sort((a, b) => b - a);
  return pcts[0] - pcts[1] <= 15;
}

/**
 * Aggregate standings BY TEAM for the Screen.
 *
 * Pure: derives everything from the raw players + decisions arrays each call
 * (no caching/identity-memo — matches useStation's shallow-snapshot contract).
 *
 * Score is derived from the DECISIONS (POINTS_PER_BEST per is_best answer), NOT
 * from the players.score DB column. emit('decision') is idempotent (deduped on
 * (player_id, scenario_idx)) but award() is not, so the score column inflates on
 * replay/re-answer and diverges from the decisions. Deriving score here keeps
 * score, responses, and optimalRate mutually consistent and replay-safe.
 *
 * @param {Array<{id:string, team?:string}>} players (score column intentionally unused)
 * @param {Array<{playerId:string, isBest:boolean}>} decisions
 * @returns {Array<{team:string, players:number, score:number, responses:number, optimalRate:number}>}
 *          One row per team that has >= 1 player, sorted by score desc then
 *          optimalRate desc. optimalRate is 0..1 over that team's decisions
 *          (0 when the team has no responses — no divide-by-zero).
 */
export function teamStandings(players, decisions) {
  // Build team rows from players only, so teams with zero players never appear
  // and a stray decision can't invent a team. Map playerId -> team for routing.
  const rows = new Map(); // team -> { team, players, responses, best }
  const playerTeam = new Map(); // playerId -> team
  for (const p of players) {
    if (!p.team) continue; // skip players with no chosen squad
    playerTeam.set(p.id, p.team);
    const row = rows.get(p.team) || {
      team: p.team,
      players: 0,
      responses: 0,
      best: 0,
    };
    row.players += 1;
    rows.set(p.team, row);
  }

  for (const d of decisions) {
    const team = playerTeam.get(d.playerId);
    if (team === undefined) continue; // decision by a non-roster player
    const row = rows.get(team);
    row.responses += 1;
    if (d.isBest === true) row.best += 1;
  }

  const result = Array.from(rows.values()).map((r) => ({
    team: r.team,
    players: r.players,
    // Derived from decisions (replay-safe), not the inflatable players.score.
    score: r.best * POINTS_PER_BEST,
    responses: r.responses,
    optimalRate: r.responses === 0 ? 0 : r.best / r.responses,
  }));

  result.sort((a, b) => b.score - a.score || b.optimalRate - a.optimalRate);
  return result;
}

export function buildScoreboard(players) {
  const hasTeams = players.length > 0 && players.every((p) => p.team);
  let rows;
  if (hasTeams) {
    const totals = {};
    for (const p of players) {
      totals[p.team] = (totals[p.team] || 0) + (p.score || 0);
    }
    rows = Object.keys(totals).map((team) => ({ name: team, score: totals[team] }));
  } else {
    rows = players.map((p) => ({ name: p.name, score: p.score || 0 }));
  }
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 6);
}

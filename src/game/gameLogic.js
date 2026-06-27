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
 * Score is the AVERAGE points per player (total is_best points / player count,
 * rounded). This keeps the competition fair across team sizes: a bigger team no
 * longer wins on headcount, and two teams with the same total are ranked by the
 * smaller (higher per-player average) one.
 *
 * @param {Array<{id:string, team?:string}>} players (score column intentionally unused)
 * @param {Array<{playerId:string, isBest:boolean}>} decisions
 * @returns {Array<{team:string, players:number, score:number, responses:number, optimalRate:number}>}
 *          One row per team that has >= 1 player, sorted by score desc then
 *          optimalRate desc. score is the average points per player (rounded).
 *          optimalRate is 0..1 over that team's decisions (0 when the team has
 *          no responses — no divide-by-zero).
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
    // Average points per player (rounded): fair across team sizes. Derived from
    // decisions (replay-safe), not the inflatable players.score. r.players is
    // always >= 1 here (rows are built from players), so the guard is defensive.
    score: r.players > 0 ? Math.round((r.best * POINTS_PER_BEST) / r.players) : 0,
    responses: r.responses,
    optimalRate: r.responses === 0 ? 0 : r.best / r.responses,
  }));

  result.sort((a, b) => b.score - a.score || b.optimalRate - a.optimalRate);
  return result;
}

/**
 * Replay one player's decisions into their accumulated 4-meter profile.
 *
 * Starts from START_METERS (50 each) and applies each decision's choice deltas
 * IN ASCENDING scenarioIdx ORDER. Order matters because applyChoice clamps every
 * step to 0..100, so a meter that saturates at 100 (or floors at 0) "forgets"
 * later deltas in a way that depends on the sequence.
 *
 * Decisions whose scenario index or choice key can't be resolved against
 * `scenarios` are skipped. Pure: never mutates inputs, returns a fresh object.
 *
 * @param {Array<{scenarioIdx:number, choice:string}>} playerDecisions
 * @param {Array<{choices:Object}>} scenarios
 * @returns {{eff:number, acc:number, risk:number, comp:number}}
 */
export function accumulateMeters(playerDecisions, scenarios) {
  // Copy + sort ascending so we never mutate the caller's array and always
  // replay in the order the meters were actually moved during play.
  const ordered = [...playerDecisions].sort((a, b) => a.scenarioIdx - b.scenarioIdx);
  let meters = { ...START_METERS };
  for (const d of ordered) {
    const scenario = scenarios[d.scenarioIdx];
    if (!scenario || !scenario.choices) continue; // unresolved scenario
    const deltas = scenario.choices[d.choice];
    if (!deltas) continue; // unresolved choice
    meters = applyChoice(meters, deltas);
  }
  return meters;
}

/**
 * Per-team AVERAGE meter profile for the Screen, derived purely from decisions.
 *
 * For each team that has >= 1 player: take the members who answered >= 1
 * scenario, replay each one's accumulateMeters, and average the 4 metrics across
 * those answering members (rounded to integers). A team with players but no
 * answers yet falls back to START_METERS (50s) so its radar still renders.
 *
 * One row per team in the same team set as teamStandings (teams with zero
 * players, and players with no team, are excluded). Rows are ordered to match
 * teamStandings (score desc) as a nicety so the Screen's radars line up with the
 * standings.
 *
 * @param {Array<{id:string, team?:string}>} players
 * @param {Array<{playerId:string, scenarioIdx:number, choice:string}>} decisions
 * @param {Array<{choices:Object}>} scenarios
 * @returns {Array<{team:string, players:number, answered:number, meters:{eff:number,acc:number,risk:number,comp:number}}>}
 */
export function teamMeters(players, decisions, scenarios) {
  // Group players by team and route decisions to their player, preserving the
  // same "team must have a player" rule as teamStandings.
  const teams = new Map(); // team -> { team, playerIds:Set, byPlayer:Map<id, decisions[]> }
  const playerTeam = new Map(); // playerId -> team
  for (const p of players) {
    if (!p.team) continue;
    playerTeam.set(p.id, p.team);
    const t = teams.get(p.team) || { team: p.team, playerIds: new Set(), byPlayer: new Map() };
    t.playerIds.add(p.id);
    teams.set(p.team, t);
  }

  for (const d of decisions) {
    const team = playerTeam.get(d.playerId);
    if (team === undefined) continue; // decision by a non-roster player
    const t = teams.get(team);
    const list = t.byPlayer.get(d.playerId) || [];
    list.push(d);
    t.byPlayer.set(d.playerId, list);
  }

  const rows = Array.from(teams.values()).map((t) => {
    const answeringIds = Array.from(t.byPlayer.keys());
    const answered = answeringIds.length;

    let meters;
    if (answered === 0) {
      // Team has players but nobody answered yet — render a neutral baseline.
      meters = { ...START_METERS };
    } else {
      const sum = { eff: 0, acc: 0, risk: 0, comp: 0 };
      for (const id of answeringIds) {
        const m = accumulateMeters(t.byPlayer.get(id), scenarios);
        sum.eff += m.eff;
        sum.acc += m.acc;
        sum.risk += m.risk;
        sum.comp += m.comp;
      }
      meters = {
        eff: Math.round(sum.eff / answered),
        acc: Math.round(sum.acc / answered),
        risk: Math.round(sum.risk / answered),
        comp: Math.round(sum.comp / answered),
      };
    }

    return { team: t.team, players: t.playerIds.size, answered, meters };
  });

  // Order rows to match teamStandings (score desc) so the Screen's team radars
  // line up with the standings panel. Nice-to-have, not relied on by callers.
  const order = new Map(
    teamStandings(players, decisions).map((s, i) => [s.team, i]),
  );
  rows.sort((a, b) => (order.get(a.team) ?? 0) - (order.get(b.team) ?? 0));
  return rows;
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

import { COLORS } from '../theme';
import { CHOICE_ORDER, CHOICE_LABELS } from '../content/scenarios';

export const START_METERS = { eff: 50, risk: 50, comp: 50 };
export const POINTS_PER_BEST = 10;

export function clamp(v) {
  const r = Math.round(v);
  if (r > 100) return 100;
  if (r < 0) return 0;
  return r;
}

export function applyChoice(meters, deltas) {
  return {
    eff: clamp(meters.eff + deltas.eff),
    risk: clamp(meters.risk + deltas.risk),
    comp: clamp(meters.comp + deltas.comp),
  };
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
  // 'eff' or 'comp'
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

export function reportProfile(meters) {
  return {
    eff: {
      pct: meters.eff,
      color: meterColor('eff', meters.eff),
      label: meterLabel('eff', meters.eff),
    },
    risk: {
      safePct: 100 - meters.risk,
      color: meterColor('risk', meters.risk),
      label: meterLabel('risk', meters.risk),
    },
    comp: {
      pct: meters.comp,
      color: meterColor('comp', meters.comp),
      label: meterLabel('comp', meters.comp),
    },
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

export function isRoomSplit(agg) {
  if (agg.total === 0) return false;
  const pcts = agg.bars.map((b) => b.pct).sort((a, b) => b - a);
  return pcts[0] - pcts[1] <= 15;
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

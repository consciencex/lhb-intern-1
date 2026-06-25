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

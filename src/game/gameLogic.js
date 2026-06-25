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

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
  isRoomSplit,
  buildScoreboard,
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

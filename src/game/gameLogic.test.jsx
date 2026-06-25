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

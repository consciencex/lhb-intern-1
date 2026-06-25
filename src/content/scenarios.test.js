import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  CHOICE_ORDER,
  CHOICE_LABELS,
  CHOICE_SUBLABELS,
  CHOICE_ICONS,
} from './scenarios';

describe('scenario content constants', () => {
  it('CHOICE_ORDER has the three approach keys in order', () => {
    expect(CHOICE_ORDER).toEqual(['automate', 'hitl', 'manual']);
  });

  it('CHOICE_LABELS match the contract exactly', () => {
    expect(CHOICE_LABELS).toEqual({
      automate: 'Automate Fully',
      hitl: 'Human-in-Loop',
      manual: 'Manual Review',
    });
  });

  it('CHOICE_SUBLABELS match the contract exactly', () => {
    expect(CHOICE_SUBLABELS).toEqual({
      automate: 'Fully automated — no human step',
      hitl: 'AI recommends, human reviews and approves',
      manual: 'Officer handles the entire process by hand',
    });
  });

  it('CHOICE_ICONS match the contract exactly', () => {
    expect(CHOICE_ICONS).toEqual({
      automate: '⚡',
      hitl: '👤',
      manual: '✋',
    });
  });
});

describe('SCENARIOS schema integrity', () => {
  it('is an array of exactly 6 scenarios', () => {
    expect(Array.isArray(SCENARIOS)).toBe(true);
    expect(SCENARIOS).toHaveLength(6);
  });

  it('has the exact ids in the exact order', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'loan',
      'faq',
      'aml',
      'statement',
      'kyc',
      'complaint',
    ]);
  });

  it('every scenario has a non-empty id, title and desc', () => {
    for (const s of SCENARIOS) {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
      expect(typeof s.title).toBe('string');
      expect(s.title.length).toBeGreaterThan(0);
      expect(typeof s.desc).toBe('string');
      expect(s.desc.length).toBeGreaterThan(0);
    }
  });

  it('every scenario has exactly 3 non-empty attr strings', () => {
    for (const s of SCENARIOS) {
      expect(Array.isArray(s.attrs)).toBe(true);
      expect(s.attrs).toHaveLength(3);
      for (const tag of s.attrs) {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      }
    }
  });

  it('every scenario has all CHOICE_ORDER keys in choices', () => {
    for (const s of SCENARIOS) {
      for (const key of CHOICE_ORDER) {
        expect(s.choices[key]).toBeDefined();
      }
    }
  });

  it('every choice has numeric eff/risk/comp, boolean breach and a non-empty msg', () => {
    for (const s of SCENARIOS) {
      for (const key of CHOICE_ORDER) {
        const c = s.choices[key];
        expect(typeof c.eff).toBe('number');
        expect(Number.isNaN(c.eff)).toBe(false);
        expect(typeof c.risk).toBe('number');
        expect(Number.isNaN(c.risk)).toBe(false);
        expect(typeof c.comp).toBe('number');
        expect(Number.isNaN(c.comp)).toBe(false);
        expect(typeof c.breach).toBe('boolean');
        expect(typeof c.msg).toBe('string');
        expect(c.msg.length).toBeGreaterThan(0);
      }
    }
  });

  it('best is one of CHOICE_ORDER and is never a breach option', () => {
    for (const s of SCENARIOS) {
      expect(CHOICE_ORDER).toContain(s.best);
      expect(s.choices[s.best].breach).toBe(false);
    }
  });

  it('loan, aml, kyc and complaint each have at least one breach option', () => {
    const mustBreach = ['loan', 'aml', 'kyc', 'complaint'];
    for (const id of mustBreach) {
      const s = SCENARIOS.find((x) => x.id === id);
      expect(s).toBeDefined();
      const hasBreach = CHOICE_ORDER.some((k) => s.choices[k].breach === true);
      expect(hasBreach).toBe(true);
    }
  });
});

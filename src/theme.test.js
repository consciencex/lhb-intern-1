import { describe, it, expect } from 'vitest';
import { COLORS, FONT, KEYFRAMES } from './theme.js';

describe('theme COLORS', () => {
  it('exports the exact brand hex tokens', () => {
    expect(COLORS.navy).toBe('#0F2554');
    expect(COLORS.red).toBe('#DC2626');
    expect(COLORS.green).toBe('#16A34A');
    expect(COLORS.screenBg).toBe('#08121E');
    expect(COLORS.barHitl).toBe('#8B5CF6');
  });

  it('exports every required color key as an uppercase 6-digit hex string', () => {
    const keys = [
      'bg', 'navy', 'blue', 'blueAccent', 'screenBg', 'hostBg',
      'white', 'ink', 'slate700', 'slate500', 'slate400', 'border',
      'track', 'green', 'amber', 'red', 'purple',
      'barAutomate', 'barHitl', 'barManual',
    ];
    keys.forEach((k) => {
      expect(COLORS).toHaveProperty(k);
      expect(typeof COLORS[k]).toBe('string');
      expect(COLORS[k]).toMatch(/^#[0-9A-F]{6}$/);
    });
    expect(Object.keys(COLORS).sort()).toEqual([...keys].sort());
  });

  it('matches the full canonical token set', () => {
    expect(COLORS).toEqual({
      bg: '#D8DFE8',
      navy: '#0F2554',
      blue: '#2563EB',
      blueAccent: '#3B82F6',
      screenBg: '#08121E',
      hostBg: '#F1F5F9',
      white: '#FFFFFF',
      ink: '#1E293B',
      slate700: '#374151',
      slate500: '#64748B',
      slate400: '#94A3B8',
      border: '#E2E8F0',
      track: '#F1F5F9',
      green: '#16A34A',
      amber: '#D97706',
      red: '#DC2626',
      purple: '#7C3AED',
      barAutomate: '#3B82F6',
      barHitl: '#8B5CF6',
      barManual: '#475569',
    });
  });
});

describe('theme FONT', () => {
  it('is the DM Sans font stack string', () => {
    expect(FONT).toBe("'DM Sans', system-ui, sans-serif");
    expect(FONT).toContain('DM Sans');
  });
});

describe('theme KEYFRAMES', () => {
  it('exposes the global keyframe animation names', () => {
    expect(KEYFRAMES).toEqual({
      slideInUp: 'slideInUp',
      shake: 'shake',
      pulseRed: 'pulseRed',
    });
  });
});

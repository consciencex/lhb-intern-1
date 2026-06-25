import { COLORS, FONT } from '../theme';
import { CHOICE_LABELS } from '../content/scenarios';
import { isBest } from '../game/gameLogic';

export default function ConsequenceCard({ scenario, choice }) {
  const c = scenario.choices[choice];
  const best = isBest(choice, scenario);
  const bestLabel = CHOICE_LABELS[scenario.best];

  if (c.breach) {
    return (
      <div
        style={{
          background: '#FEF2F2',
          border: '2px solid ' + COLORS.red,
          borderRadius: '14px',
          padding: '17px',
          marginBottom: '8px',
          fontFamily: FONT,
          animation: 'shake 0.5s ease 0.1s, pulseRed 1.5s ease 0.6s 2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
          <span style={{ fontSize: '20px' }}>🚨</span>
          <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.red, letterSpacing: '0.06em' }}>
            COMPLIANCE BREACH
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.6, marginBottom: '10px' }}>
          {c.msg}
        </div>
        <div
          style={{
            borderTop: '1px solid rgba(220,38,38,0.15)',
            paddingTop: '9px',
            fontSize: '12px',
            color: '#B91C1C',
          }}
        >
          <span style={{ fontWeight: 500 }}>Optimal: </span>
          <span style={{ fontWeight: 700 }}>{bestLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: best ? '#F0FDF4' : '#F8FAFC',
        border: '2px solid ' + (best ? '#86EFAC' : COLORS.border),
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '8px',
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: '13px', color: COLORS.ink, lineHeight: 1.6 }}>{c.msg}</div>
      {!best && (
        <div
          style={{
            borderTop: '1px solid ' + COLORS.border,
            paddingTop: '9px',
            marginTop: '10px',
            fontSize: '12px',
            color: COLORS.slate500,
          }}
        >
          <span style={{ fontWeight: 500 }}>Optimal: </span>
          <span style={{ fontWeight: 700, color: COLORS.blue }}>{bestLabel}</span>
        </div>
      )}
    </div>
  );
}

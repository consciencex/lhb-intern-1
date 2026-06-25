import { COLORS, FONT } from '../theme.js';
import { meterColor } from '../game/gameLogic.js';

const ROWS = [
  { type: 'eff', label: '⚡ Efficiency' },
  { type: 'risk', label: '⚠️ Risk' },
  { type: 'comp', label: '🛡️ Compliance' },
];

export default function Meters({ meters }) {
  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: '16px',
        padding: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: COLORS.slate400,
          letterSpacing: '0.1em',
          marginBottom: '14px',
        }}
      >
        TEAM METRICS
      </div>
      {ROWS.map((row, i) => {
        const value = meters[row.type];
        const color = meterColor(row.type, value);
        return (
          <div
            key={row.type}
            style={{ marginBottom: i < ROWS.length - 1 ? '12px' : 0 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: COLORS.slate700,
                }}
              >
                {row.label}
              </div>
              <div
                data-testid={`meter-value-${row.type}`}
                style={{ fontSize: '13px', fontWeight: 700, color }}
              >
                {value}
              </div>
            </div>
            <div
              style={{
                height: '8px',
                background: COLORS.track,
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                data-testid={`meter-bar-${row.type}`}
                style={{
                  height: '100%',
                  width: `${value}%`,
                  background: color,
                  borderRadius: '4px',
                  transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

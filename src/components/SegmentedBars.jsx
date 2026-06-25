import { FONT } from '../theme.js';

export default function SegmentedBars({ bars, respondents }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
          letterSpacing: '0.15em',
          marginBottom: 22,
        }}
      >
        ROOM RESPONSE — {respondents} PLAYERS
      </div>
      {bars.map((bar) => (
        <div key={bar.key} data-testid="seg-row" style={{ marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                color: '#CBD5E1',
              }}
            >
              {bar.label}
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {bar.pctStr}
            </span>
          </div>
          <div
            style={{
              height: 16,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="seg-fill"
              style={{
                height: '100%',
                width: bar.pctStr,
                background: bar.color,
                borderRadius: 8,
                transition: 'width 1.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

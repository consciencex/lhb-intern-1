import { COLORS, FONT } from '../theme.js';

export default function ScenarioCard({ scenario, qNum, qTotal, playerName }) {
  return (
    <div
      style={{
        background: COLORS.navy,
        borderRadius: '18px',
        padding: '20px',
        marginBottom: '10px',
        boxShadow: '0 4px 20px rgba(15,37,84,0.25)',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            background: 'rgba(59,130,246,0.28)',
            borderRadius: '6px',
            padding: '4px 10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.06em',
            }}
          >
            Q{qNum} of {qTotal}
          </span>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '20px',
            padding: '4px 12px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {playerName}
          </span>
        </div>
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.3,
          marginBottom: '9px',
        }}
      >
        {scenario.title}
      </div>
      <div
        style={{
          fontSize: '13.5px',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6,
          marginBottom: '14px',
        }}
      >
        {scenario.desc}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {scenario.attrs.map((tag) => (
          <span
            key={tag}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: '5px',
              padding: '3px 10px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

import { COLORS, FONT } from '../theme.js';

const TABS = [
  { key: 'play', label: '📱 Player' },
  { key: 'screen', label: '🖥 Screen' },
  { key: 'host', label: '🎛 Host' },
];

export default function TopNav({ view, onChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: COLORS.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.13em',
        }}
      >
        AUTOMATE OR NOT?
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {TABS.map((tab) => {
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                background: active ? COLORS.blue : 'rgba(255,255,255,0.1)',
                color: '#fff',
                transition: 'background 0.2s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

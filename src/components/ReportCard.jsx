import { COLORS, FONT } from '../theme';
import { reportProfile } from '../game/gameLogic';

export default function ReportCard({
  score,
  maxScore,
  playerName,
  correctCount,
  totalQ,
  breachCount,
  meters,
  onRestart,
}) {
  const profile = reportProfile(meters);
  const breachSuffix = breachCount !== 1 ? 'es' : '';

  const barTrack = {
    height: '9px',
    background: COLORS.track,
    borderRadius: '5px',
    overflow: 'hidden',
  };
  const barFill = (pct, color) => ({
    height: '100%',
    width: pct + '%',
    background: color,
    borderRadius: '5px',
    transition: 'width 1.1s cubic-bezier(0.34,1.56,0.64,1)',
  });
  const rowHead = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '7px',
  };
  const rowLabel = { fontSize: '13px', fontWeight: 500, color: COLORS.slate700 };
  const rowValue = (color) => ({ fontSize: '13px', fontWeight: 700, color });

  return (
    <div style={{ animation: 'slideInUp 0.45s ease', fontFamily: FONT }}>
      <div
        style={{
          background: COLORS.navy,
          borderRadius: '20px',
          padding: '28px 24px',
          marginBottom: '10px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.13em',
            marginBottom: '12px',
          }}
        >
          MISSION DEBRIEF
        </div>
        <div style={{ fontSize: '62px', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
          {score}
        </div>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
          / {maxScore} pts
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
          {playerName}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
          {correctCount} of {totalQ} optimal decisions
        </div>
        {breachCount > 0 && (
          <div
            style={{
              background: 'rgba(220,38,38,0.2)',
              border: '1px solid rgba(220,38,38,0.4)',
              borderRadius: '8px',
              padding: '9px 16px',
              marginTop: '14px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FCA5A5',
            }}
          >
            🚨 {breachCount} compliance breach{breachSuffix} triggered
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: COLORS.slate400,
            letterSpacing: '0.1em',
            marginBottom: '18px',
          }}
        >
          TEAM PERFORMANCE PROFILE
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={rowHead}>
            <div style={rowLabel}>⚡ Efficiency</div>
            <div style={rowValue(profile.eff.color)}>{profile.eff.label}</div>
          </div>
          <div style={barTrack}>
            <div data-testid="report-bar-eff" style={barFill(profile.eff.pct, profile.eff.color)} />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={rowHead}>
            <div style={rowLabel}>⚠️ Risk Control</div>
            <div style={rowValue(profile.risk.color)}>{profile.risk.label}</div>
          </div>
          <div style={barTrack}>
            <div data-testid="report-bar-risk" style={barFill(profile.risk.safePct, profile.risk.color)} />
          </div>
        </div>

        <div>
          <div style={rowHead}>
            <div style={rowLabel}>🛡️ Compliance</div>
            <div style={rowValue(profile.comp.color)}>{profile.comp.label}</div>
          </div>
          <div style={barTrack}>
            <div data-testid="report-bar-comp" style={barFill(profile.comp.pct, profile.comp.color)} />
          </div>
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '14px',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '16px',
          fontWeight: 700,
          background: COLORS.blue,
          color: '#fff',
          letterSpacing: '0.02em',
        }}
      >
        ↺  Play Again
      </button>
    </div>
  );
}

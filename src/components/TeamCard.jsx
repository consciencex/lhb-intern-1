// src/components/TeamCard.jsx
import { FONT, COLORS } from '../theme.js';
import { TEAMS } from '../content/teams.js';
import RadarChart from './RadarChart.jsx';

// Resolve a squad's accent color from its display name. Tolerant of both the
// full name ('Team Alpha') and the bare squad word ('Alpha') so the seeded demo
// (bare names) and live play (full names) both get the right accent.
export function teamColor(name) {
  const t = TEAMS.find(
    (x) =>
      x.name === name ||
      x.key.toLowerCase() === String(name).toLowerCase().replace(/^team\s+/i, ''),
  );
  return t ? t.color : COLORS.slate400;
}

/**
 * One cohesive card per team for the Screen TEAMS zone. Merges what used to be
 * two disconnected panels (TEAM STANDINGS + TEAM PROFILES) into a single,
 * scannable card: the team name (accent-colored), the big avg-pts/player score,
 * the optimal %, the "{answered}/{players} answered" line, AND the team's
 * average 4-axis radar — all together.
 *
 * @param {{
 *   standing: { team:string, players:number, score:number, responses:number, optimalRate:number },
 *   meters: { eff:number, acc:number, risk:number, comp:number },
 *   answered: number,
 *   rank: number,
 * }} props
 */
export default function TeamCard({ standing, meters, answered, rank }) {
  const color = teamColor(standing.team);
  const optimalPct = Math.round(standing.optimalRate * 100);

  return (
    <div
      data-testid="team-card"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: `3px solid ${color}`,
        borderRadius: 16,
        padding: 'clamp(14px, 1.4vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
      }}
    >
      {/* Header row: rank + accent dot + team name, optimal% badge on the right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            minWidth: 0,
          }}
        >
          {typeof rank === 'number' && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#64748B',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              #{rank}
            </span>
          )}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: color,
              flexShrink: 0,
            }}
          />
          <span
            data-testid="team-card-name"
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(15px, 1.3vw, 18px)',
              fontWeight: 700,
              color: '#E2E8F0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {standing.team}
          </span>
        </span>
        <span
          data-testid="team-card-optimal"
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: '#4ADE80',
            background: 'rgba(74,222,128,0.10)',
            border: '1px solid rgba(74,222,128,0.20)',
            borderRadius: 999,
            padding: '3px 9px',
            letterSpacing: '0.02em',
          }}
        >
          {optimalPct}% optimal
        </span>
      </div>

      {/* Big score + caption + answered line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span
            data-testid="team-card-score"
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            {standing.score}
          </span>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            avg pts/player
          </span>
        </span>
        <span
          data-testid="team-card-answered"
          style={{
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.03em',
            flexShrink: 0,
          }}
        >
          {answered}/{standing.players} answered
        </span>
      </div>

      {/* The team's average decision profile, dark radar, centered. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        <RadarChart metrics={meters} size={196} dark />
      </div>
    </div>
  );
}

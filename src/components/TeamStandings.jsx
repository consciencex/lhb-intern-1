// src/components/TeamStandings.jsx
import { FONT, COLORS } from '../theme.js';
import { TEAMS } from '../content/teams.js';

// Resolve a squad's accent color from its display name. Tolerant of both the
// full name ('Team Alpha') and the bare squad word ('Alpha') so the seeded demo
// (bare names) and live play (full names) both get the right accent.
function teamColor(name) {
  const t = TEAMS.find(
    (x) => x.name === name || x.key.toLowerCase() === String(name).toLowerCase().replace(/^team\s+/i, ''),
  );
  return t ? t.color : COLORS.slate400;
}

/**
 * Projector-legible TEAM STANDINGS panel.
 * @param {{ standings: Array<{team:string, players:number, score:number, responses:number, optimalRate:number}> }} props
 */
export default function TeamStandings({ standings }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
          letterSpacing: '0.15em',
          marginBottom: 16,
        }}
      >
        TEAM STANDINGS
      </div>
      {standings.map((row) => {
        const color = teamColor(row.team);
        return (
          <div
            key={row.team}
            data-testid="team-standing-row"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: `3px solid ${color}`,
              borderRadius: 10,
              padding: '11px 13px',
              marginBottom: 9,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#E2E8F0',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                {row.team}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 5,
                }}
              >
                <span
                  data-testid="team-score"
                  style={{
                    fontFamily: FONT,
                    fontSize: 19,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {row.score}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  avg pts/player
                </span>
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span data-testid="team-players" style={{ color: '#64748B' }}>
                {row.players} player{row.players === 1 ? '' : 's'}
              </span>
              <span data-testid="team-optimal" style={{ color: '#4ADE80' }}>
                {Math.round(row.optimalRate * 100)}% optimal
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

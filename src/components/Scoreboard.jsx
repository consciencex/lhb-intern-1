import { FONT } from '../theme.js';

export default function Scoreboard({ teams }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
          letterSpacing: '0.15em',
          marginBottom: 20,
        }}
      >
        SCOREBOARD
      </div>
      {teams.map((team) => (
        <div
          key={team.name}
          data-testid="score-row"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 500,
              color: '#94A3B8',
            }}
          >
            {team.name}
          </span>
          <span
            style={{
              fontFamily: FONT,
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            {team.score}
          </span>
        </div>
      ))}
    </div>
  );
}

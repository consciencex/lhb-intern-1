import { COLORS, FONT } from '../theme.js';
import { SCENARIOS, CHOICE_LABELS } from '../content/scenarios.js';
import {
  aggregateByScenario,
  optimalRate,
  buildScoreboard,
} from '../game/gameLogic.js';
import { useStation } from '../hooks/useStation.js';
import Scoreboard from '../components/Scoreboard.jsx';
import JoinQR from '../components/JoinQR.jsx';

/**
 * Live, real-time results dashboard for the projector. Everything is always
 * visible (no host, no reveal gating): whoever answers shows up instantly.
 *
 * IMPORTANT: recompute over the raw decisions array every render. useStation
 * shallow-snapshots, so station.decisions keeps its identity when the backend
 * mutates it in place — do NOT identity-memoize on it.
 */
export default function ScreenView({ gameAPI }) {
  const station = useStation(gameAPI);

  const players = station ? station.players : [];
  const decisions = station ? station.decisions : [];
  const roomCode = station ? station.roomCode : gameAPI.getRoomCode();

  const perScenario = aggregateByScenario(decisions, SCENARIOS.length);
  const teams = buildScoreboard(players);
  const optimalPct = Math.round(optimalRate(decisions) * 100);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 52px)',
        background: COLORS.screenBg,
        display: 'flex',
        fontFamily: FONT,
        color: '#FFFFFF',
      }}
    >
      {/* MAIN: summary bar + per-scenario live results */}
      <div
        style={{
          flex: 1,
          padding: '40px 48px',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Summary bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#93C5FD',
                letterSpacing: '0.12em',
                marginBottom: 8,
              }}
            >
              Join: room {roomCode}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.1,
              }}
            >
              Automate or Not? — Live Results
            </div>
          </div>
        </div>

        {/* Live totals + optimal-rate teaching takeaway */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 34 }}>
          <SummaryStat
            testid="total-players"
            value={players.length}
            label="PLAYERS JOINED"
            color="#FFFFFF"
          />
          <SummaryStat
            testid="total-responses"
            value={decisions.length}
            label="TOTAL RESPONSES"
            color="#FFFFFF"
          />
          <SummaryStat
            testid="optimal-rate"
            value={`${optimalPct}%`}
            label="CHOSE THE OPTIMAL APPROACH"
            color="#4ADE80"
          />
        </div>

        {/* Per-scenario live results */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {SCENARIOS.map((scenario, i) => {
            const agg = perScenario[i];
            return (
              <div
                key={scenario.id}
                data-testid="scenario-result"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '16px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#334155',
                      letterSpacing: '0.13em',
                    }}
                  >
                    Q{i + 1}
                  </span>
                  <span
                    data-testid="scenario-count"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {agg.total} response{agg.total === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.25,
                    marginBottom: 12,
                  }}
                >
                  {scenario.title}
                </div>

                {agg.bars.map((bar) => {
                  const optimal = bar.key === scenario.best;
                  return (
                    <div key={bar.key} style={{ marginBottom: 9 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: optimal ? 700 : 500,
                            color: optimal ? '#4ADE80' : '#CBD5E1',
                          }}
                        >
                          {optimal ? '★ ' : ''}
                          {bar.label}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {bar.pctStr}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 5,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          data-testid="scenario-bar-fill"
                          style={{
                            height: '100%',
                            width: bar.pctStr,
                            background: optimal ? '#22C55E' : bar.color,
                            borderRadius: 5,
                            transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div
                  data-testid="best-marker"
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#4ADE80',
                    letterSpacing: '0.04em',
                  }}
                >
                  ★ Best: {CHOICE_LABELS[scenario.best]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SIDEBAR: QR + scoreboard */}
      <div style={{ width: 272, padding: '40px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <JoinQR roomCode={roomCode} size={180} />
        </div>
        <Scoreboard teams={teams} />
      </div>
    </div>
  );
}

function SummaryStat({ testid, value, label, color }) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '16px 18px',
        textAlign: 'center',
      }}
    >
      <div
        data-testid={testid}
        style={{ fontSize: 34, fontWeight: 800, color, letterSpacing: '-1px' }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#64748B',
          letterSpacing: '0.1em',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

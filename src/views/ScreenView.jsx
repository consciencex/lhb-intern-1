import { useState } from 'react';
import { COLORS, FONT } from '../theme.js';
import { SCENARIOS, CHOICE_LABELS } from '../content/scenarios.js';
import {
  aggregateByScenario,
  optimalRate,
  teamStandings,
  teamMeters,
} from '../game/gameLogic.js';
import { useStation } from '../hooks/useStation.js';
import TeamStandings from '../components/TeamStandings.jsx';
import JoinQR from '../components/JoinQR.jsx';
import ScenarioArt from '../components/ScenarioArt.jsx';
import RadarChart from '../components/RadarChart.jsx';
import { TEAMS } from '../content/teams.js';

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

  // Facilitator "Reset room" confirmation modal (Screen-only control).
  const [confirmReset, setConfirmReset] = useState(false);

  const players = station ? station.players : [];
  const decisions = station ? station.decisions : [];
  const roomCode = station ? station.roomCode : gameAPI.getRoomCode();

  function handleConfirmReset() {
    // Fire-and-forget: the backend wipes the room and notifies subscribers, so
    // the dashboard returns to 0 via the station update. Close the modal now.
    gameAPI.resetRoom();
    setConfirmReset(false);
  }

  // Recompute over the raw arrays every render — useStation shallow-snapshots,
  // so decisions/players keep identity when the backend mutates in place.
  const perScenario = aggregateByScenario(decisions, SCENARIOS.length);
  const standings = teamStandings(players, decisions);
  // Per-team AVERAGE meter profile, derived from decisions (no identity-memo —
  // recompute every render per useStation's shallow-snapshot contract).
  const profiles = teamMeters(players, decisions, SCENARIOS);
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

          {/* Subtle facilitator control: reset the room before a fresh session.
              Muted styling so it never dominates the projector. */}
          <button
            type="button"
            data-testid="reset-room-button"
            onClick={() => setConfirmReset(true)}
            title="Reset room — clear all players and responses"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(59,130,246,0.10)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ScenarioArt id={scenario.id} size={30} />
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#FFFFFF',
                      lineHeight: 1.25,
                    }}
                  >
                    {scenario.title}
                  </div>
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

        {/* TEAM PROFILES: each team's AVERAGE decision profile as a dark radar.
            Recomputed every render (no identity-memo) per useStation's
            shallow-snapshot contract. Up to 4 radars laid out as a clean row. */}
        {profiles.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#93C5FD',
                letterSpacing: '0.15em',
                marginBottom: 18,
              }}
            >
              TEAM PROFILES
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              {profiles.map((row) => (
                <TeamProfileCard key={row.team} row={row} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SIDEBAR: QR + scoreboard */}
      <div style={{ width: 272, padding: '40px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <JoinQR roomCode={roomCode} size={180} />
        </div>
        <TeamStandings standings={standings} />
      </div>

      {confirmReset && (
        <ResetConfirmModal
          roomCode={roomCode}
          playerCount={players.length}
          responseCount={decisions.length}
          onCancel={() => setConfirmReset(false)}
          onConfirm={handleConfirmReset}
        />
      )}
    </div>
  );
}

function ResetConfirmModal({ roomCode, playerCount, responseCount, onCancel, onConfirm }) {
  return (
    <div
      data-testid="reset-confirm-modal"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,9,16,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: FONT,
      }}
    >
      <div
        // Stop backdrop clicks (which cancel) from bubbling out of the card.
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, calc(100vw - 48px))',
          background: '#0F1B2B',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '28px 30px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          color: '#FFFFFF',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          Reset room {roomCode}?
        </div>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.72)',
            marginBottom: 24,
          }}
        >
          {playerCount} player{playerCount === 1 ? '' : 's'} ·{' '}
          {responseCount} response{responseCount === 1 ? '' : 's'} will be cleared.
          This cannot be undone.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            data-testid="reset-cancel-button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#FFFFFF',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 600,
              padding: '9px 18px',
              borderRadius: 9,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="reset-confirm-button"
            onClick={onConfirm}
            style={{
              background: COLORS.red,
              border: '1px solid transparent',
              color: '#FFFFFF',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 700,
              padding: '9px 18px',
              borderRadius: 9,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// Resolve a squad's accent color from its display name. Tolerant of both the
// full name ('Team Alpha') and the bare squad word ('Alpha') so the seeded demo
// (bare names) and live play (full names) both get the right accent. Mirrors the
// helper in TeamStandings so the profile accent matches the standings accent.
function teamColor(name) {
  const t = TEAMS.find(
    (x) =>
      x.name === name ||
      x.key.toLowerCase() === String(name).toLowerCase().replace(/^team\s+/i, ''),
  );
  return t ? t.color : COLORS.slate400;
}

// One team's AVERAGE decision profile, rendered as a compact dark radar with the
// team name (in its accent color) and an "{answered}/{players} answered" caption.
function TeamProfileCard({ row }) {
  const color = teamColor(row.team);
  return (
    <div
      data-testid="team-profile"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: `3px solid ${color}`,
        borderRadius: 14,
        padding: '14px 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 190,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          alignSelf: 'flex-start',
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#E2E8F0',
          }}
        >
          {row.team}
        </span>
      </div>
      <RadarChart metrics={row.meters} size={150} dark />
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: '#64748B',
          letterSpacing: '0.04em',
          alignSelf: 'flex-start',
          marginTop: 2,
        }}
      >
        {row.answered}/{row.players} answered
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

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
import JoinQR from '../components/JoinQR.jsx';
import ScenarioArt from '../components/ScenarioArt.jsx';
import TeamCard from '../components/TeamCard.jsx';

/**
 * Live, real-time results dashboard for the projector. Everything is always
 * visible (no host, no reveal gating): whoever answers shows up instantly.
 *
 * Layout flows top → bottom in three grouped, responsive sections so it scales
 * from a ~1280px laptop up to a wide projector with no fixed side column:
 *   1. HEADER       — brand/title + room code + Reset + JoinQR, then the 3
 *                     summary stat tiles as a wrapping row.
 *   2. ROOM RESPONSES — the 6 per-scenario cards (auto-fit, 2-up on wide).
 *   3. TEAMS        — one cohesive card per team merging the standing (avg
 *                     pts/player, optimal%, answered) with that team's average
 *                     radar (auto-fit grid, sorted by score desc).
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

  // Join the standings (score order) with each team's average meters by name so
  // each TeamCard shows both halves together. teamStandings is the canonical
  // ordering; teamMeters provides the radar profile + answered count.
  const metersByTeam = new Map(profiles.map((p) => [p.team, p]));

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 52px)',
        background: COLORS.screenBg,
        fontFamily: FONT,
        color: '#FFFFFF',
        padding: 'clamp(20px, 2.6vw, 44px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(26px, 3vw, 44px)',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {/* Brand + room code */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 'clamp(11px, 0.9vw, 13px)',
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
                fontSize: 'clamp(24px, 2.6vw, 38px)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.05,
              }}
            >
              Automate or Not? — Live Results
            </div>
          </div>

          {/* Right cluster: Reset control + the join QR so players can scan. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'clamp(14px, 1.4vw, 22px)',
              flexShrink: 0,
            }}
          >
            {/* Subtle facilitator control: reset the room before a fresh
                session. Muted styling so it never dominates the projector. */}
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
            <JoinQR roomCode={roomCode} size={132} />
          </div>
        </div>

        {/* Live totals + optimal-rate teaching takeaway — a responsive row that
            wraps on narrow viewports. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
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
      </header>

      {/* ── 2. ROOM RESPONSES ──────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Room Responses</SectionHeading>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: 16,
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
                  borderRadius: 16,
                  padding: 'clamp(16px, 1.4vw, 22px)',
                  minWidth: 0,
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
                      color: '#64748B',
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
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: 11,
                      background: 'rgba(59,130,246,0.10)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ScenarioArt id={scenario.id} size={32} />
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(15px, 1.2vw, 18px)',
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
                    <div key={bar.key} style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: optimal ? 700 : 500,
                            color: optimal ? '#4ADE80' : '#CBD5E1',
                          }}
                        >
                          {optimal ? '★ ' : ''}
                          {bar.label}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {bar.pctStr}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 9,
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
                    marginTop: 10,
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
      </section>

      {/* ── 3. TEAMS ───────────────────────────────────────────────────────── */}
      {standings.length > 0 && (
        <section>
          <SectionHeading>Teams</SectionHeading>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {standings.map((standing, i) => {
              const profile = metersByTeam.get(standing.team);
              return (
                <TeamCard
                  key={standing.team}
                  standing={standing}
                  meters={profile ? profile.meters : { eff: 50, acc: 50, risk: 50, comp: 50 }}
                  answered={profile ? profile.answered : 0}
                  rank={i + 1}
                />
              );
            })}
          </div>
        </section>
      )}

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

// Consistent section heading for the grouped Screen zones.
function SectionHeading({ children }) {
  return (
    <div
      style={{
        fontSize: 'clamp(11px, 0.95vw, 13px)',
        fontWeight: 700,
        color: '#93C5FD',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}
    >
      {children}
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

function SummaryStat({ testid, value, label, color }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 'clamp(16px, 1.6vw, 22px)',
        textAlign: 'center',
        minWidth: 0,
      }}
    >
      <div
        data-testid={testid}
        style={{
          fontSize: 'clamp(30px, 3.4vw, 44px)',
          fontWeight: 800,
          color,
          letterSpacing: '-1px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'clamp(9px, 0.8vw, 11px)',
          fontWeight: 700,
          color: '#64748B',
          letterSpacing: '0.1em',
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

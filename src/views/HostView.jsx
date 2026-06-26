// src/views/HostView.jsx
import React from 'react';
import { COLORS, FONT } from '../theme.js';
import { SCENARIOS } from '../content/scenarios.js';
import { aggregate, buildScoreboard, isRoomSplit } from '../game/gameLogic.js';
import { useStation } from '../hooks/useStation.js';
import JoinQR from '../components/JoinQR.jsx';

export default function HostView({ gameAPI }) {
  const station = useStation(gameAPI);

  if (!station) {
    return null;
  }

  const total = SCENARIOS.length;
  const rawIdx = station.currentIdx;
  const safeIdx = Math.max(0, Math.min(rawIdx, total - 1));
  const scenario = SCENARIOS[safeIdx];
  const scenarioNum = safeIdx + 1;
  const respondedCount = station.respondedCount;
  const playerCount = station.players.length;
  const reveal = station.reveal;
  const roomCode = station.roomCode || gameAPI.getRoomCode();

  // Live results: recompute every render over the raw decisions array. useStation
  // shallow-snapshots, so the inner decisions array keeps its identity when the
  // backend mutates in place — do NOT useMemo on it. The host monitors these
  // live, BEFORE (and independent of) revealing them on the projector.
  const currentDecisions = station.decisions.filter(
    (d) => d.scenarioIdx === station.currentIdx
  );
  const agg = aggregate(currentDecisions);
  const split = isRoomSplit(agg);
  const teams = buildScoreboard(station.players);

  const onAdvance = () => {
    gameAPI.advance();
  };

  const onToggleReveal = () => {
    gameAPI.setReveal(!reveal);
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 52px)',
        background: COLORS.hostBg,
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: FONT,
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: COLORS.navy,
            }}
          >
            Host Controls
          </div>
          <div
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.navy,
              letterSpacing: '0.04em',
            }}
          >
            Room{' '}
            <span style={{ letterSpacing: '0.12em' }}>{roomCode}</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: COLORS.slate500,
            marginBottom: 28,
          }}
        >
          Automate or Not — Facilitation Panel
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div
            style={{
              flex: 1,
              background: COLORS.white,
              borderRadius: 14,
              padding: 18,
              border: `1px solid ${COLORS.border}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: COLORS.navy,
                letterSpacing: '-1px',
              }}
            >
              {scenarioNum}
              <span
                style={{
                  fontSize: 17,
                  color: COLORS.slate400,
                  fontWeight: 400,
                }}
              >
                /{total}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.09em',
                marginTop: 3,
              }}
            >
              SCENARIO
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: COLORS.white,
              borderRadius: 14,
              padding: 18,
              border: `1px solid ${COLORS.border}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: COLORS.green,
                letterSpacing: '-1px',
              }}
            >
              {respondedCount}
              <span
                style={{
                  fontSize: 17,
                  color: COLORS.slate400,
                  fontWeight: 400,
                }}
              >
                /{playerCount}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.09em',
                marginTop: 3,
              }}
            >
              RESPONDED
            </div>
          </div>
        </div>

        <div
          style={{
            background: COLORS.white,
            borderRadius: 14,
            padding: 20,
            marginBottom: 14,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.slate400,
              letterSpacing: '0.09em',
              marginBottom: 7,
            }}
          >
            NOW PLAYING
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.ink,
              marginBottom: 8,
            }}
          >
            {scenario.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {scenario.attrs.map((tag) => (
              <span
                key={tag}
                style={{
                  background: COLORS.track,
                  color: COLORS.slate700,
                  borderRadius: 4,
                  padding: '3px 9px',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onAdvance}
            style={{
              padding: '17px 20px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 700,
              background: COLORS.navy,
              color: COLORS.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Advance to Next Scenario</span>
            <span>→</span>
          </button>

          <button
            onClick={onToggleReveal}
            style={{
              padding: '17px 20px',
              borderRadius: 12,
              border: `2px solid ${COLORS.border}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              background: COLORS.white,
              color: COLORS.slate700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>📊 Reveal Aggregate on Screen</span>
            <span
              style={{
                background: COLORS.border,
                borderRadius: 20,
                padding: '2px 9px',
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate500,
              }}
            >
              {reveal ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            style={{
              padding: '17px 20px',
              borderRadius: 12,
              border: `2px solid ${COLORS.border}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              background: COLORS.white,
              color: COLORS.slate700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>⏸ Pause Timer</span>
            <span
              style={{
                fontSize: 12,
                color: COLORS.slate400,
                fontWeight: 500,
              }}
            >
              2:30 left
            </span>
          </button>
        </div>

        {/* LIVE RESULTS — always visible (NOT gated by reveal). The facilitator
            monitors incoming answers here before deciding to reveal on the
            projector. Light-themed to match the host panel. */}
        <div
          style={{
            background: COLORS.white,
            borderRadius: 14,
            padding: 20,
            marginTop: 14,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.09em',
              }}
            >
              ผลสด / LIVE RESULTS
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.slate500,
              }}
            >
              {respondedCount} / {playerCount} answered
            </div>
          </div>

          {agg.bars.map((bar) => (
            <div key={bar.key} data-testid="host-result-row" style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.slate700,
                  }}
                >
                  {bar.label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.ink,
                  }}
                >
                  {bar.pctStr}
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  background: COLORS.track,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  data-testid="host-result-fill"
                  style={{
                    height: '100%',
                    width: bar.pctStr,
                    background: bar.color,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          ))}

          {split && (
            <div
              style={{
                background: 'rgba(217,119,6,0.08)',
                border: `1px solid rgba(217,119,6,0.25)`,
                borderRadius: 10,
                padding: '8px 12px',
                marginTop: 4,
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.amber,
              }}
            >
              ROOM SPLIT — good discussion point
            </div>
          )}

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.slate400,
              letterSpacing: '0.09em',
              marginTop: 18,
              marginBottom: 10,
            }}
          >
            SCOREBOARD
          </div>
          {teams.map((team) => (
            <div
              key={team.name}
              data-testid="host-score-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                borderRadius: 8,
                background: COLORS.track,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: COLORS.slate700,
                }}
              >
                {team.name}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: COLORS.navy,
                }}
              >
                {team.score}
              </span>
            </div>
          ))}
        </div>

        {/* Join QR — host can hold up / display so players scan to join. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 14,
          }}
        >
          <JoinQR roomCode={roomCode} size={140} />
        </div>
      </div>
    </div>
  );
}

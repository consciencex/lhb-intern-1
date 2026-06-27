// src/views/PlayerView.jsx
import { useState } from 'react';
import { COLORS, FONT } from '../theme.js';
import { SCENARIOS } from '../content/scenarios.js';
import { TEAMS } from '../content/teams.js';
import {
  START_METERS,
  POINTS_PER_BEST,
  applyChoice,
  isBest,
  scoreDelta,
} from '../game/gameLogic.js';
import { useStation } from '../hooks/useStation.js';
import ScenarioCard from '../components/ScenarioCard.jsx';
import ChoiceButtons from '../components/ChoiceButtons.jsx';
import RadarChart from '../components/RadarChart.jsx';
import ConsequenceCard from '../components/ConsequenceCard.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { meterColor } from '../game/gameLogic.js';

// In-game metrics legend rows (compact, beside-the-radar value readout).
const METRIC_ROWS = [
  { type: 'eff', icon: '⚡', name: 'Efficiency' },
  { type: 'acc', icon: '🎯', name: 'Accuracy' },
  { type: 'risk', icon: '⚠️', name: 'Risk' },
  { type: 'comp', icon: '🛡️', name: 'Compliance' },
];

function MetricsPanel({ meters }) {
  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.slate400,
          letterSpacing: '0.1em',
          marginBottom: 10,
        }}
      >
        TEAM METRICS
      </div>

      <RadarChart metrics={meters} size={210} />

      {/* Compact value readout. The radar already labels each axis, so the
          legend stays minimal — icon + colored value — to avoid duplicating
          the full axis names. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        {METRIC_ROWS.map((row) => {
          const value = meters[row.type];
          return (
            <div
              key={row.type}
              title={row.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span style={{ fontSize: 14 }}>{row.icon}</span>
              <span
                data-testid={`metric-legend-${row.type}`}
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: meterColor(row.type, value),
                  letterSpacing: '-0.5px',
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MAX_SCORE = SCENARIOS.length * POINTS_PER_BEST;

export default function PlayerView({ gameAPI }) {
  // Subscribe to the station only to read our own player row (for the squad
  // label + scoreboard presence). Progression is fully LOCAL and self-paced —
  // there is no host and we never read station.currentIdx or call advance().
  const station = useStation(gameAPI);

  const [phase, setPhase] = useState('intro');
  const [name, setName] = useState('');
  const [squad, setSquad] = useState(null); // chosen team NAME, e.g. 'Team Alpha'
  const [idx, setIdx] = useState(0); // LOCAL scenario index 0..SCENARIOS.length-1
  const [meters, setMeters] = useState(START_METERS);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [choice, setChoice] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  const scenario = SCENARIOS[idx];
  const ended = idx >= SCENARIOS.length;
  const playerName = name.trim() || 'Team Lead';
  const myPlayer = station && playerId
    ? station.players.find((p) => p.id === playerId)
    : null;
  const team = myPlayer ? myPlayer.team : null;
  const correctCount = history.filter((h) => h.isBest).length;
  const breachCount = history.filter((h) => h.breach).length;

  async function start() {
    // A squad must be chosen first — Start is disabled until then, but guard
    // here too so a programmatic call can't skip the requirement.
    if (!squad) return;
    const res = await gameAPI.joinRoom({ name: playerName, team: squad });
    if (res && res.playerId) setPlayerId(res.playerId);
    setPhase('play');
  }

  function restart() {
    setPhase('intro');
    setName('');
    setSquad(null);
    setIdx(0);
    setMeters(START_METERS);
    setScore(0);
    setHistory([]);
    setAnswered(false);
    setChoice(null);
  }

  function pick(choiceKey) {
    if (answered) return;
    const s = SCENARIOS[idx];
    const best = isBest(choiceKey, s);
    const delta = scoreDelta(choiceKey, s);
    const deltas = s.choices[choiceKey];
    const breach = deltas.breach === true;

    setMeters((m) => applyChoice(m, deltas));
    setScore((p) => p + delta);
    setHistory((h) => [...h, { choice: choiceKey, isBest: best, breach }]);
    setChoice(choiceKey);
    setAnswered(true);

    gameAPI.emit('decision', {
      scenarioId: s.id,
      scenarioIdx: idx,
      choice: choiceKey,
      isBest: best,
      breach,
    });
    gameAPI.award(delta);
  }

  // Self-advance to the next scenario LOCALLY (not the room).
  function next() {
    setIdx((i) => i + 1);
    setAnswered(false);
    setChoice(null);
  }

  const wrap = {
    minHeight: 'calc(100vh - 52px)',
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 16px 56px',
    background: COLORS.bg,
    fontFamily: FONT,
  };
  const col = { width: '100%', maxWidth: 420 };
  const statCard = {
    flex: 1,
    background: COLORS.white,
    borderRadius: 12,
    padding: '14px 8px',
    textAlign: 'center',
    border: `1px solid ${COLORS.border}`,
  };
  const statNum = (color) => ({
    fontSize: 26,
    fontWeight: 800,
    color,
    letterSpacing: '-1px',
  });
  const statLabel = {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.slate400,
    letterSpacing: '0.08em',
    marginTop: 2,
  };

  if (phase === 'intro') {
    return (
      <div style={wrap}>
        <div style={{ ...col, animation: 'slideInUp 0.4s ease', paddingTop: 4 }}>
          <div style={{ textAlign: 'center', padding: '28px 16px 20px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: COLORS.navy,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                margin: '0 auto 14px',
              }}
            >
              🏦
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.13em',
                marginBottom: 10,
              }}
            >
              BANK TRAINING SIMULATION
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: COLORS.navy,
                lineHeight: 1.1,
                marginBottom: 10,
                letterSpacing: '-1px',
              }}
            >
              Automate
              <br />
              or Not?
            </div>
            <div
              style={{
                fontSize: 14,
                color: COLORS.slate500,
                lineHeight: 1.55,
                maxWidth: 280,
                margin: '0 auto',
              }}
            >
              Make critical AI governance decisions as Team Lead. Every choice
              has consequences.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={statCard}>
              <div style={statNum(COLORS.navy)}>6</div>
              <div style={statLabel}>SCENARIOS</div>
            </div>
            <div style={statCard}>
              <div style={statNum(COLORS.navy)}>3</div>
              <div style={statLabel}>CHOICES</div>
            </div>
            <div style={statCard}>
              <div style={statNum(COLORS.red)}>4</div>
              <div style={statLabel}>BREACH RISKS</div>
            </div>
          </div>
          <div
            style={{
              background: COLORS.white,
              borderRadius: 16,
              padding: 18,
              marginBottom: 10,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              YOUR NAME (optional)
            </div>
            <input
              type="text"
              placeholder="Enter your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                border: `2px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: '12px 14px',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 500,
                color: COLORS.ink,
                outline: 'none',
                background: '#F8FAFC',
              }}
            />
          </div>

          {/* CHOOSE YOUR SQUAD — a team must be picked before Start is enabled. */}
          <div
            style={{
              background: COLORS.white,
              borderRadius: 16,
              padding: 18,
              marginBottom: 10,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.slate400,
                letterSpacing: '0.1em',
                marginBottom: 10,
              }}
            >
              CHOOSE YOUR SQUAD
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {TEAMS.map((t) => {
                const selected = squad === t.name;
                return (
                  <button
                    key={t.key}
                    type="button"
                    data-testid={`team-option-${t.name}`}
                    aria-pressed={selected}
                    onClick={() => setSquad(t.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '11px 12px',
                      borderRadius: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      background: selected ? `${t.color}14` : '#F8FAFC',
                      border: selected
                        ? `2px solid ${t.color}`
                        : `2px solid ${COLORS.border}`,
                      boxShadow: selected
                        ? `0 2px 10px ${t.color}33`
                        : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 5,
                        background: t.color,
                        flexShrink: 0,
                        boxShadow: selected
                          ? `0 0 0 3px ${t.color}33`
                          : 'none',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: selected ? COLORS.navy : COLORS.slate500,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={start}
            disabled={!squad}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              border: 'none',
              cursor: squad ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              fontSize: 16,
              fontWeight: 700,
              background: squad ? COLORS.navy : '#94A3B8',
              color: COLORS.white,
              letterSpacing: '0.02em',
              opacity: squad ? 1 : 0.6,
              boxShadow: squad ? '0 4px 14px rgba(15,37,84,0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Start Simulation →
          </button>
        </div>
      </div>
    );
  }

  if (ended) {
    return (
      <div style={wrap}>
        <div style={col}>
          <ReportCard
            score={score}
            maxScore={MAX_SCORE}
            playerName={playerName}
            correctCount={correctCount}
            totalQ={SCENARIOS.length}
            breachCount={breachCount}
            meters={meters}
            onRestart={restart}
          />
        </div>
      </div>
    );
  }

  const progW = `${((idx + (answered ? 1 : 0)) / SCENARIOS.length) * 100}%`;

  return (
    <div style={wrap}>
      <div style={col}>
        <div
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 2,
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: progW,
              background: COLORS.blueAccent,
              borderRadius: 2,
              transition: 'width 0.55s ease',
            }}
          />
        </div>

        <ScenarioCard
          scenario={scenario}
          qNum={idx + 1}
          qTotal={SCENARIOS.length}
          playerName={team ? `${playerName} · ${team}` : playerName}
        />

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: COLORS.slate500,
            letterSpacing: '0.1em',
            margin: '0 0 9px',
            padding: '0 2px',
          }}
        >
          CHOOSE YOUR APPROACH
        </div>

        <ChoiceButtons
          scenario={scenario}
          answered={answered}
          choice={choice}
          onPick={pick}
        />

        {answered && (
          <div style={{ animation: 'slideInUp 0.38s ease' }}>
            <ConsequenceCard scenario={scenario} choice={choice} />
            {/* Self-paced: the player always advances themselves to the next
                scenario. There is no host — progression is purely local. */}
            <button
              onClick={next}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 700,
                background: COLORS.navy,
                color: COLORS.white,
                margin: '0 0 10px',
                letterSpacing: '0.02em',
              }}
            >
              Next Scenario →
            </button>
          </div>
        )}

        <MetricsPanel meters={meters} />
      </div>
    </div>
  );
}

import { COLORS, FONT } from '../theme.js';
import { SCENARIOS } from '../content/scenarios.js';
import { aggregate, isRoomSplit, buildScoreboard } from '../game/gameLogic.js';
import { useStation } from '../hooks/useStation.js';
import SegmentedBars from '../components/SegmentedBars.jsx';
import Scoreboard from '../components/Scoreboard.jsx';

export default function ScreenView({ gameAPI }) {
  const station = useStation(gameAPI);

  const currentIdx = station ? station.currentIdx : 0;
  const players = station ? station.players : [];
  const allDecisions = station ? station.decisions : [];
  const respondents = station ? station.respondedCount : 0;

  const scenario = SCENARIOS[currentIdx] || SCENARIOS[0];
  const qNum = currentIdx + 1;
  const qTotal = SCENARIOS.length;

  const currentDecisions = allDecisions.filter((d) => d.scenarioIdx === currentIdx);
  const agg = aggregate(currentDecisions);
  const split = isRoomSplit(agg);
  const teams = buildScoreboard(players);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 52px)',
        background: COLORS.screenBg,
        display: 'flex',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          flex: 1,
          padding: '44px 48px',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.15em',
            marginBottom: 8,
          }}
        >
          CURRENT SCENARIO · Q{qNum} / {qTotal}
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.2,
            marginBottom: 12,
          }}
        >
          {scenario.title}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 42 }}>
          {scenario.attrs.map((tag) => (
            <span
              key={tag}
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.55)',
                borderRadius: 5,
                padding: '4px 11px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <SegmentedBars bars={agg.bars} respondents={respondents} />

        {split && (
          <div
            style={{
              background: 'rgba(234,179,8,0.09)',
              border: '1px solid rgba(234,179,8,0.22)',
              borderRadius: 14,
              padding: 18,
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#EAB308',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              🔥 DISCUSSION POINT
            </div>
            <div
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.78)',
                lineHeight: 1.55,
              }}
            >
              Room is split between Automate and Human-in-Loop. What changes the
              calculus when regulation and PDPA are involved?
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 272, padding: '44px 24px', flexShrink: 0 }}>
        <Scoreboard teams={teams} />
      </div>
    </div>
  );
}

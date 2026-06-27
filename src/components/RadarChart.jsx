import { COLORS, FONT } from '../theme.js';
import { meterColor } from '../game/gameLogic.js';

// Four axes, clockwise from the top. SVG y grows downward, so the angle for the
// top axis is -90deg, right 0deg, bottom +90deg, left 180deg.
const AXES = [
  { type: 'eff', label: 'Efficiency', angle: -90 },
  { type: 'acc', label: 'Accuracy', angle: 0 },
  { type: 'risk', label: 'Risk', angle: 90 },
  { type: 'comp', label: 'Compliance', angle: 180 },
];

const RING_LEVELS = [25, 50, 75, 100];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Point on an axis at the given 0..100 value: 0 at center, 100 at radius R.
function pointFor(cx, cy, R, angle, value) {
  const r = (value / 100) * R;
  return [cx + r * Math.cos(toRad(angle)), cy + r * Math.sin(toRad(angle))];
}

// Round to keep the rendered SVG markup compact and stable.
function fmt(n) {
  return Math.round(n * 100) / 100;
}

export default function RadarChart({ metrics, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  // Leave room around the chart for the axis labels + values.
  const R = size / 2 - 34;

  const vertices = AXES.map((a) => pointFor(cx, cy, R, a.angle, metrics[a.type]));
  const polygonPoints = vertices
    .map(([x, y]) => `${fmt(x)},${fmt(y)}`)
    .join(' ');

  // Where each axis label sits — just outside the outermost ring.
  const labelRadius = R + 18;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Team metrics radar: Efficiency, Accuracy, Risk, Compliance"
        style={{ overflow: 'visible' }}
      >
        {/* Concentric grid rings */}
        {RING_LEVELS.map((level) => {
          const ringPts = AXES.map((a) => pointFor(cx, cy, R, a.angle, level))
            .map(([x, y]) => `${fmt(x)},${fmt(y)}`)
            .join(' ');
          return (
            <polygon
              key={`ring-${level}`}
              points={ringPts}
              fill="none"
              stroke={COLORS.border}
              strokeWidth={1}
            />
          );
        })}

        {/* Axis spokes from the center to the outer ring */}
        {AXES.map((a) => {
          const [x, y] = pointFor(cx, cy, R, a.angle, 100);
          return (
            <line
              key={`spoke-${a.type}`}
              x1={cx}
              y1={cy}
              x2={fmt(x)}
              y2={fmt(y)}
              stroke={COLORS.border}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon: translucent brand-blue fill, solid blue stroke */}
        <polygon
          data-testid="radar-polygon"
          points={polygonPoints}
          fill={COLORS.blue}
          fillOpacity={0.18}
          stroke={COLORS.blue}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertex dots */}
        {vertices.map(([x, y], i) => (
          <circle
            key={`dot-${AXES[i].type}`}
            cx={fmt(x)}
            cy={fmt(y)}
            r={3.5}
            fill={COLORS.white}
            stroke={COLORS.blue}
            strokeWidth={2}
          />
        ))}

        {/* Axis labels + current values, positioned around the chart */}
        {AXES.map((a) => {
          const [lx, ly] = pointFor(cx, cy, labelRadius, a.angle, 100);
          const value = metrics[a.type];
          const valueColor = meterColor(a.type, value);
          // Anchor text so labels never overhang the chart edge.
          let anchor = 'middle';
          if (a.angle === 0) anchor = 'start';
          else if (a.angle === 180) anchor = 'end';

          return (
            <g key={`label-${a.type}`}>
              <text
                x={fmt(lx)}
                y={fmt(ly) - 4}
                textAnchor={anchor}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: COLORS.slate500,
                  fontFamily: FONT,
                }}
              >
                {a.label}
              </text>
              <text
                data-testid={`radar-value-${a.type}`}
                x={fmt(lx)}
                y={fmt(ly) + 10}
                textAnchor={anchor}
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: valueColor,
                  fill: valueColor,
                  fontFamily: FONT,
                }}
              >
                {value}
              </text>
              {a.type === 'risk' && (
                <text
                  x={fmt(lx)}
                  y={fmt(ly) + 22}
                  textAnchor={anchor}
                  style={{
                    fontSize: 8.5,
                    fontWeight: 600,
                    fill: COLORS.slate400,
                    letterSpacing: '0.02em',
                    fontFamily: FONT,
                  }}
                >
                  lower is better
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

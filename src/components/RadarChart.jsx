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

// Palette per variant. The light variant (default) is unchanged — opaque slate
// grid + labels for the white player-view card. The dark variant uses
// translucent-white grid/spokes and light labels so the radar reads on the dark
// projector. The blue data polygon and meterColor-driven values are shared.
const PALETTE = {
  light: {
    grid: COLORS.border,
    spoke: COLORS.border,
    label: COLORS.slate500,
    hint: COLORS.slate400,
    dot: COLORS.white,
  },
  dark: {
    grid: 'rgba(255,255,255,0.14)',
    spoke: 'rgba(255,255,255,0.22)',
    label: '#CBD5E1',
    hint: '#64748B',
    dot: COLORS.white,
  },
};

export default function RadarChart({ metrics, size = 200, dark = false }) {
  const palette = dark ? PALETTE.dark : PALETTE.light;
  const cx = size / 2;
  const cy = size / 2;
  // Reserve a margin around the polygon for the four axis labels + values.
  // The polygon radius is unchanged from the original (size/2 - 34) so the
  // player-view + report-card radars render identically; the containment fix
  // lives entirely in how/where the labels are placed and that the box clips.
  const R = size / 2 - 34;

  const vertices = AXES.map((a) => pointFor(cx, cy, R, a.angle, metrics[a.type]));
  const polygonPoints = vertices
    .map(([x, y]) => `${fmt(x)},${fmt(y)}`)
    .join(' ');

  // Font sizes scale gently with `size` so labels stay legible at the small
  // dark radars on the Screen and don't dominate. Clamped to sane bounds.
  const k = size / 200; // 1 at the canonical 200px size
  const clampPx = (lo, base, hi) => Math.max(lo, Math.min(hi, base * k));
  const labelFont = clampPx(8.5, 11, 13);
  const valueFont = clampPx(10, 13, 16);
  const hintFont = clampPx(7, 8.5, 10);

  // Where each axis label sits. The TOP/BOTTOM labels (Efficiency/Risk) are
  // centered, so they only need a little vertical clearance. The LEFT/RIGHT
  // labels (Compliance/Accuracy) carry the WIDEST words, so their anchor x is
  // pulled inward — far enough from the edge that the whole word renders inside
  // the box. This is the fix for adjacent radars colliding: every glyph stays
  // within [0, size].
  const vLabelRadius = R + 16; // top/bottom: just outside the outer ring
  // Side labels: keep the anchor a fixed inset from the box edge. ~26% of the
  // box on each side leaves room for "Compliance"/"Accuracy" to fit at these
  // font sizes without overrunning the edge.
  const sideInset = Math.max(0.2 * size, 30);

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
        style={{ overflow: 'hidden' }}
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
              stroke={palette.grid}
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
              stroke={palette.spoke}
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
            fill={palette.dot}
            stroke={COLORS.blue}
            strokeWidth={2}
          />
        ))}

        {/* Axis labels + current values, positioned around the chart and kept
            fully inside the box so they never collide with an adjacent radar. */}
        {AXES.map((a) => {
          const value = metrics[a.type];
          const valueColor = meterColor(a.type, value);

          // Anchor + position per axis. Side labels (left/right) are anchored to
          // a fixed inset from the box edge so the wide words stay contained;
          // top/bottom labels are centered just outside the outer ring.
          let anchor = 'middle';
          let lx;
          let ly;
          if (a.angle === 0) {
            // right: Accuracy — sits on the RIGHT half (matching the right-
            // pointing spoke/vertex). Anchored "end" near the right edge so the
            // word extends leftward into the box and stays fully contained.
            anchor = 'end';
            lx = size - sideInset;
            ly = cy;
          } else if (a.angle === 180) {
            // left: Compliance — sits on the LEFT half (matching the left-
            // pointing spoke/vertex). Anchored "start" near the left edge so the
            // word extends rightward into the box and stays fully contained.
            anchor = 'start';
            lx = sideInset;
            ly = cy;
          } else {
            // top/bottom: centered on the vertical axis.
            [lx, ly] = pointFor(cx, cy, vLabelRadius, a.angle, 100);
          }

          return (
            <g key={`label-${a.type}`}>
              <text
                x={fmt(lx)}
                y={fmt(ly) - 4}
                textAnchor={anchor}
                style={{
                  fontSize: labelFont,
                  fontWeight: 600,
                  fill: palette.label,
                  fontFamily: FONT,
                }}
              >
                {a.label}
              </text>
              <text
                data-testid={`radar-value-${a.type}`}
                x={fmt(lx)}
                y={fmt(ly) + labelFont + 2}
                textAnchor={anchor}
                style={{
                  fontSize: valueFont,
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
                  y={fmt(ly) + labelFont + valueFont + 4}
                  textAnchor={anchor}
                  style={{
                    fontSize: hintFont,
                    fontWeight: 600,
                    fill: palette.hint,
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

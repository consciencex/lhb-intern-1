// src/components/ScenarioArt.jsx
//
// Cohesive, professional flat-line illustrations — one per scenario id — that
// sit inside the navy ScenarioCard. They share ONE visual language:
//   * a single 48×48 viewBox and a centered composition
//   * consistent 2px stroke, round caps + joins, rounded corners
//   * a small cohesive palette that reads on navy: a light slate line, a blue
//     fill/stroke, and ONE warm amber accent for the focal mark.
// Geometric and restrained — control-room, not childish.

const STROKE = '#CBD8EF'; // light line on navy
const BLUE = '#3B82F6'; // primary accent (matches theme blueAccent)
const BLUE_SOFT = 'rgba(59,130,246,0.20)'; // subtle blue fill
const ACCENT = '#F5B544'; // single warm focal accent (amber)
const ACCENT_SOFT = 'rgba(245,181,68,0.22)';

const DEFAULT_SIZE = 108;

// Shared stroke defaults so every illustration matches weight + joins.
const L = {
  fill: 'none',
  stroke: STROKE,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ── per-id illustrations ────────────────────────────────────────────────────

// loan — document/contract with an approval check + stamp.
function Loan() {
  return (
    <>
      <rect x="11" y="7" width="22" height="30" rx="3" fill={BLUE_SOFT} {...L} />
      <line x1="16" y1="14" x2="28" y2="14" {...L} />
      <line x1="16" y1="19" x2="28" y2="19" {...L} />
      <line x1="16" y1="24" x2="24" y2="24" {...L} />
      {/* approval stamp + check */}
      <circle cx="31" cy="32" r="8" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="2" />
      <path d="M27.5 32l2.6 2.6L35 29.8" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// faq — overlapping chat bubbles.
function Faq() {
  return (
    <>
      <path d="M9 11h20a3 3 0 013 3v9a3 3 0 01-3 3H17l-6 5v-5H9a3 3 0 01-3-3v-9a3 3 0 013-3z" fill={BLUE_SOFT} {...L} />
      <circle cx="15" cy="19" r="1.5" fill={STROKE} stroke="none" />
      <circle cx="20" cy="19" r="1.5" fill={STROKE} stroke="none" />
      <circle cx="25" cy="19" r="1.5" fill={STROKE} stroke="none" />
      {/* small accent reply bubble */}
      <path d="M30 28h9a3 3 0 013 3v5a3 3 0 01-3 3h-1v4l-5-4h-3a3 3 0 01-3-3" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// aml — magnifying glass over a transaction row + alert.
function Aml() {
  return (
    <>
      <rect x="6" y="10" width="24" height="16" rx="3" fill={BLUE_SOFT} {...L} />
      <line x1="10" y1="16" x2="20" y2="16" {...L} />
      <line x1="10" y1="21" x2="16" y2="21" {...L} />
      {/* magnifier */}
      <circle cx="28" cy="28" r="8" fill="none" stroke={BLUE} strokeWidth="2.4" />
      <line x1="34" y1="34" x2="41" y2="41" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />
      {/* alert mark */}
      <line x1="28" y1="24.5" x2="28" y2="28.5" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="28" cy="32" r="1.3" fill={ACCENT} stroke="none" />
    </>
  );
}

// statement — envelope being sent (motion lines).
function Statement() {
  return (
    <>
      <rect x="12" y="12" width="28" height="20" rx="3" fill={BLUE_SOFT} {...L} />
      <path d="M12 15l14 10 14-10" {...L} />
      {/* send motion lines */}
      <line x1="4" y1="19" x2="9" y2="19" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="25" x2="9" y2="25" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="31" x2="9" y2="31" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

// kyc — ID card with a portrait + verified check.
function Kyc() {
  return (
    <>
      <rect x="7" y="12" width="34" height="24" rx="3" fill={BLUE_SOFT} {...L} />
      {/* portrait */}
      <circle cx="17" cy="21" r="3.4" {...L} />
      <path d="M11.5 30c0-3.3 2.4-5.5 5.5-5.5s5.5 2.2 5.5 5.5" {...L} />
      {/* detail lines */}
      <line x1="27" y1="20" x2="36" y2="20" {...L} />
      <line x1="27" y1="25" x2="36" y2="25" {...L} />
      {/* verified badge */}
      <circle cx="35" cy="33" r="6.5" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="2" />
      <path d="M32 33l2.2 2.2L38 31.4" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// complaint — speech bubble with an exclamation, plus a resolution check.
function Complaint() {
  return (
    <>
      <path d="M9 9h26a3 3 0 013 3v14a3 3 0 01-3 3H21l-8 6v-6h-4a3 3 0 01-3-3V12a3 3 0 013-3z" fill={BLUE_SOFT} {...L} />
      {/* exclamation */}
      <line x1="22" y1="14" x2="22" y2="21" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22" cy="25" r="1.5" fill={ACCENT} stroke="none" />
      {/* resolution check */}
      <circle cx="36" cy="36" r="7" fill="none" stroke={BLUE} strokeWidth="2.2" />
      <path d="M33 36l2 2 4-4.5" fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// default — a generic decision/branch node for unknown ids.
function Fallback() {
  return (
    <>
      <circle cx="12" cy="24" r="5" fill={BLUE_SOFT} {...L} />
      <circle cx="34" cy="13" r="5" fill={ACCENT_SOFT} stroke={ACCENT} strokeWidth="2" />
      <circle cx="34" cy="35" r="5" fill={BLUE_SOFT} {...L} />
      <path d="M16.5 21l13-6" {...L} />
      <path d="M16.5 27l13 6" {...L} />
    </>
  );
}

const ART = {
  loan: Loan,
  faq: Faq,
  aml: Aml,
  statement: Statement,
  kyc: Kyc,
  complaint: Complaint,
};

/**
 * Flat SVG illustration keyed by scenario id.
 * @param {{ id: string, size?: number }} props
 */
export default function ScenarioArt({ id, size = DEFAULT_SIZE }) {
  const Art = ART[id] || Fallback;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-hidden="true"
      data-testid="scenario-art"
      data-art-id={id}
    >
      <Art />
    </svg>
  );
}

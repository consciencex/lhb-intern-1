# Automate or Not? — Realtime Multiplayer Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live, multi-device workshop game where ~30 bank interns each play "Team Lead" on their phones, choosing how to handle banking work scenarios (Automate Fully / Human-in-Loop / Manual Review), while a projector shows live room aggregates and a host advances the round — teaching where AI belongs plus governance/PDPA.

**Architecture:** A Vite + React (JavaScript) single-page app with three URL-selected views — `?view=play` (phone), `?view=screen` (projector), `?view=host` (facilitator) — all joined to a room by code. The game logic is pure and unit-tested; all networking goes through one `GameAPI` seam with two interchangeable implementations: an in-memory mock (tests + single-device demo) and a Supabase implementation (Postgres + Realtime) that powers the real activity. The live room aggregates (response %, scoreboard, responded count) — the heart of the game — are computed client-side from a realtime subscription on the `decisions` table.

**Tech Stack:** Vite, React 18 (plain JavaScript / JSX), Vitest + @testing-library/react + jsdom (testing), @supabase/supabase-js v2 (Postgres + Realtime), npm, Node 18+. Styling is inline style objects pixel-faithful to the Claude Design prototype, driven by tokens in `src/theme.js`.

## Global Constraints

- **Language:** JavaScript + JSX only — **no TypeScript**. Files are `.jsx`/`.js`.
- **UI copy:** English, reusing the prototype's existing content verbatim (do not paraphrase scenario or consequence text).
- **Source of truth for visuals + scenario data:** `project/AutomateOrNot.dc.html` — recreate colors, pixel values, and copy faithfully. `project/support.js` is the Claude Design runtime — **ignore it, do not port it**.
- **The `GameAPI` seam is mandatory:** views and the game never call Supabase directly; they only call `GameAPI` (`emit` / `award` / `advance` / `setReveal` / `subscribe` / `getStation`). The game must not change when swapping mock ↔ Supabase.
- **Pure game logic:** everything in `src/game/gameLogic.js` is pure (no I/O, no React, no `Math.random`, no `Date.now`) so it is fully unit-testable and deterministic.
- **Meters are clamped 0–100** at every update (never overflow/underflow). Start value is 50 each.
- **One answer per scenario per player** is enforced at the UI (ignore further picks once answered) and in the database (`unique(player_id, scenario_idx)`).
- **The live aggregate is the product**, not the score — it must come from real `decisions` data via realtime subscribe, never from hardcoded values.
- **Meter color thresholds (exact):** efficiency/compliance — `≥60` green `#16A34A`, `≥38` amber `#D97706`, else red `#DC2626`; risk — `≤40` green, `≤65` amber, else red.
- **Scoring:** `+10` points when the chosen approach equals the scenario's `best`.
- **TDD throughout:** for every code unit, write the failing test first, watch it fail, implement minimally, watch it pass, commit. Frequent commits. DRY. YAGNI.

## File Structure

Each file has one clear responsibility; files that change together live together.

```
package.json                  npm scripts + deps (react, react-dom, @supabase/supabase-js; dev: vite, vitest, RTL, jsdom)
vite.config.js                React plugin + Vitest config (jsdom, globals, setup)
index.html                    DM Sans font, global keyframes (slideInUp/shake/pulseRed), #root, body bg
.env.example                  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
.gitignore                    node_modules, dist, .env

src/
  main.jsx                    React 18 createRoot → <App/>
  App.jsx                     reads ?view & ?room, builds GameAPI, renders TopNav + active view
  theme.js                    COLORS + FONT design tokens (from prototype)
  content/
    scenarios.js              SCENARIOS (6, verbatim) + CHOICE_ORDER/LABELS/SUBLABELS/ICONS
  game/
    gameLogic.js              PURE: clamp, applyChoice, isBest, scoreDelta, meterColor, meterLabel,
                              reportProfile, aggregate, isRoomSplit, buildScoreboard
    GameAPI.js                interface JSDoc + buildGameAPI() selector (mock vs supabase)
    mockGameAPI.js            in-memory implementation (tests + single-device demo, deterministic seed)
    supabaseClient.js         getSupabase() from env (null when unset)
    supabaseGameAPI.js        Supabase + Realtime implementation of the same interface
  hooks/
    useStation.js             subscribe → latest Station, unsubscribe on unmount
  views/
    PlayerView.jsx            phone: intro/join → play → report; owns local meters/score/history
    ScreenView.jsx            projector: scenario + live response bars + discussion point + scoreboard
    HostView.jsx              facilitator: stats + Advance + Reveal Aggregate
  components/
    TopNav.jsx                dev view switcher
    ScenarioCard.jsx          navy scenario card (play/host)
    ChoiceButtons.jsx         3 approach buttons + answered states
    Meters.jsx                3-meter TEAM METRICS panel
    ConsequenceCard.jsx       consequence / red breach card
    ReportCard.jsx            end-of-game personal debrief
    SegmentedBars.jsx         screen room-response bars
    Scoreboard.jsx            screen team scoreboard

supabase/
  schema.sql                  rooms/players/decisions + constraints + RLS + realtime publication + DEMO seed
```

This structure locks the decomposition: pure logic (Task 4) and the `GameAPI` contract (Task 5) are built and tested before any view consumes them, so each view task has stable, known interfaces.

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/package.json`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/vite.config.js`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/src/test/setup.js`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/index.html`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/src/App.jsx`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/src/main.jsx`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/.env.example`
- Create: `/Users/waiywaiy/interactive-games-digital-training/project/.gitignore`
- Test: `/Users/waiywaiy/interactive-games-digital-training/project/src/App.test.jsx`

**Interfaces:**
- Consumes: nothing (this is the first task — no earlier tasks). Assumes only Node 18+ and npm are installed.
- Produces (later tasks rely on these EXACTLY):
  - A working `npm install`, `npm run dev`, `npm run build`, `npm run preview`, and `npm test` toolchain.
  - Vitest configured with `environment: 'jsdom'`, `globals: true`, and `setupFiles: './src/test/setup.js'` (so later test files can use `render`, `screen`, `expect(...).toBeInTheDocument()` without importing globals).
  - `src/main.jsx` mounting `<App/>` via React 18 `createRoot` into `#root`.
  - `src/App.jsx` exporting `default function App()` (a placeholder later tasks REPLACE — its only guaranteed export is a default React component).
  - `index.html` containing the DM Sans font link, the `slideInUp` / `shake` / `pulseRed` keyframes, `body { background: #D8DFE8 }`, and a `<div id="root">`.

---

- [ ] **Step 1: Create the directory layout and initialize git**

  Run from the project root. This makes the `src/test` folder and initializes a git repo if one is not already present (no `package.json` is written here — Step 2 creates it).

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && mkdir -p src/test && git init 2>/dev/null; node -v && npm -v
  ```

  Expected output (versions may differ; Node MUST be 18+ — this environment reports v20.19.0 / npm 10.8.2):
  ```
  v20.19.0
  10.8.2
  ```

- [ ] **Step 2: Write the package.json**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/package.json` with EXACTLY this content:

  ```json
  {
    "name": "automate-or-not",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "test": "vitest run"
    },
    "dependencies": {
      "@supabase/supabase-js": "^2.45.4",
      "react": "^18.3.1",
      "react-dom": "^18.3.1"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.5.0",
      "@testing-library/react": "^16.0.1",
      "@vitejs/plugin-react": "^4.3.1",
      "jsdom": "^25.0.0",
      "vite": "^5.4.8",
      "vitest": "^2.1.2"
    }
  }
  ```

- [ ] **Step 3: Install dependencies**

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && npm install
  ```

  Expected output (final lines; exact package count may differ):
  ```
  added 300+ packages, and audited 300+ packages in Ns

  found 0 vulnerabilities
  ```

  If `npm install` fails, STOP and fix the network/registry before continuing — every later step depends on these packages.

- [ ] **Step 4: Write the failing smoke test FIRST**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/src/App.test.jsx` with EXACTLY this content. This test renders `App` and asserts the title text is on screen. It will fail right now because neither the Vitest config, the test setup file, nor `App.jsx` exist yet.

  ```jsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import App from './App.jsx';

  describe('App smoke test', () => {
    it('renders the game title', () => {
      render(<App />);
      expect(screen.getByText('Automate or Not?')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 5: Run the smoke test and watch it FAIL**

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && npm test
  ```

  Expected: FAIL. Vitest cannot resolve `./App.jsx` (it does not exist yet), and there is no Vitest config or setup file, so `toBeInTheDocument` is also undefined. Expected output contains a line like:
  ```
  Error: Failed to resolve import "./App.jsx" from "src/App.test.jsx". Does the file exist?
  ```
  (or a `Cannot find module './App.jsx'` failure). Either way the run ends with `Test Files  1 failed`. This confirms the test is wired to real, missing behavior.

- [ ] **Step 6: Write the Vitest test setup file**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/src/test/setup.js` with EXACTLY this content. It registers the jest-dom matchers (e.g. `toBeInTheDocument`) for every test.

  ```js
  import '@testing-library/jest-dom';
  ```

- [ ] **Step 7: Write the Vite + Vitest config**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/vite.config.js` with EXACTLY this content. It wires the React plugin and the Vitest test config (jsdom environment, global test APIs, and the setup file from Step 6). The contract permits the test config to live inside `vite.config.js`.

  ```js
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  });
  ```

- [ ] **Step 8: Write the placeholder App component**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/src/App.jsx` with EXACTLY this content. Later tasks REPLACE this file with the real router/views; for now it just renders the title the smoke test asserts. Colors/font are hardcoded here (not from `src/theme.js`) on purpose — `src/theme.js` does not exist until a later task, and this placeholder is throwaway. The hardcoded values match the contract tokens (`COLORS.navy` `#0F2554`, `FONT` `'DM Sans', system-ui, sans-serif`).

  ```jsx
  export default function App() {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: '#0F2554',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>
          Automate or Not?
        </h1>
      </div>
    );
  }
  ```

- [ ] **Step 9: Run the smoke test and watch it PASS**

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && npm test
  ```

  Expected: PASS. Final lines look like:
  ```
   ✓ src/App.test.jsx (1 test) Nms
     ✓ App smoke test > renders the game title

   Test Files  1 passed (1)
        Tests  1 passed (1)
  ```

- [ ] **Step 10: Write index.html with the font link, keyframes, and #root**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/index.html` with EXACTLY this content. The font `<link>`, the three `@keyframes` (`slideInUp`, `shake`, `pulseRed`), the `*, *::before, *::after { box-sizing: border-box; }` reset, and `body { margin: 0; font-family: 'DM Sans', system-ui, sans-serif; background: #D8DFE8; }` are copied VERBATIM from the prototype `AutomateOrNot.dc.html` lines 11 and 14–18. The `<script type="module" src="/src/main.jsx">` is what Vite serves.

  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Automate or Not?</title>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap"
      />
      <style>
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'DM Sans', system-ui, sans-serif; background: #D8DFE8; }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100%{ transform: translateX(0); } 18%{ transform: translateX(-7px); } 36%{ transform: translateX(7px); } 54%{ transform: translateX(-5px); } 72%{ transform: translateX(5px); } 90%{ transform: translateX(-2px); } }
        @keyframes pulseRed { 0%,100%{ box-shadow: 0 0 0 0 rgba(220,38,38,0); } 50%{ box-shadow: 0 0 0 6px rgba(220,38,38,0.15); } }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.jsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 11: Write main.jsx (React 18 createRoot mount)**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/src/main.jsx` with EXACTLY this content.

  ```jsx
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import App from './App.jsx';

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

- [ ] **Step 12: Write .env.example**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/.env.example` with EXACTLY this content. Later tasks read these via `import.meta.env`. They are intentionally blank — copy this file to `.env` and fill values for real Supabase use; left blank, the app runs in mock mode.

  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  ```

- [ ] **Step 13: Write .gitignore**

  Create `/Users/waiywaiy/interactive-games-digital-training/project/.gitignore` with EXACTLY this content. (`package-lock.json` is deliberately NOT ignored — it is committed in Step 16.)

  ```
  node_modules
  dist
  .env
  ```

- [ ] **Step 14: Verify the dev server boots, then the production build**

  Boot the dev server, confirm it prints a Local URL, then stop it and run the production build. `timeout 8` ends `vite` after 8 seconds; `|| true` swallows timeout's non-zero exit so the build still runs.

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && (timeout 8 npm run dev || true) && npm run build
  ```

  Expected: the dev portion prints a Vite banner with a Local URL, e.g.:
  ```
    VITE v5.4.8  ready in N ms

    ➜  Local:   http://localhost:5173/
  ```
  Then the build portion ends with:
  ```
  ✓ built in Nms
  ```
  and a `dist/` directory now exists. (macOS does not ship GNU `timeout` by default. If `timeout: command not found` appears, run `npm run dev` in a separate terminal, confirm the Local URL, Ctrl+C it, then run `npm run build` on its own. If `gtimeout` is installed via coreutils, substitute it for `timeout`.)

- [ ] **Step 15: Re-run the full test suite to confirm green before committing**

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && npm test
  ```

  Expected: PASS.
  ```
   Test Files  1 passed (1)
        Tests  1 passed (1)
  ```

- [ ] **Step 16: Commit the scaffold**

  ```bash
  cd /Users/waiywaiy/interactive-games-digital-training/project && git add package.json package-lock.json vite.config.js index.html .env.example .gitignore src/main.jsx src/App.jsx src/App.test.jsx src/test/setup.js && git commit -m "Task 1: Vite + React + Vitest scaffold with passing smoke test

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected output (the branch name is `main` or `master` depending on your git `init.defaultBranch`; file count may differ slightly):
  ```
  [main (root-commit) abc1234] Task 1: Vite + React + Vitest scaffold with passing smoke test
   10 files changed, NNN insertions(+)
  ```


---

### Task 2: Design tokens (theme.js) & global styles

**Files:**
- Create: `src/theme.js`
- Create: `src/theme.test.js`
- Modify: `index.html` (read-only verification only — confirm the global keyframes + DM Sans font link from Task 1 are present; no edit if already correct)
- Test: `src/theme.test.js`

**Interfaces:**

Consumes:
- From Task 1: a scaffolded Vite + React 18 project with `npm` dependencies installed, Vitest configured (`npm run test` runs `vitest run`, environment `jsdom`), and `index.html` already containing the DM Sans `<link>` and the `slideInUp` / `shake` / `pulseRed` `@keyframes` plus `body { background:#D8DFE8 }` inside a `<style>` in `<head>` (copied verbatim from prototype lines 11-19).
- Vitest globals are NOT assumed; the test imports `describe`/`it`/`expect` from `'vitest'` explicitly so it passes regardless of Task 1's `globals` setting.

Produces (relied on by every later task that styles JSX):
- `export const COLORS` — object of exact hex string tokens (keys: `bg, navy, blue, blueAccent, screenBg, hostBg, white, ink, slate700, slate500, slate400, border, track, green, amber, red, purple, barAutomate, barHitl, barManual`).
- `export const FONT` — the string `"'DM Sans', system-ui, sans-serif"`.
- `export const KEYFRAMES` — object exposing the global keyframe animation names (defined in `index.html`) as constants for JS consumers: `{ slideInUp:'slideInUp', shake:'shake', pulseRed:'pulseRed' }`. (Permitted by scope: "if global styles need to be referenced from JS, expose keyframe names as constants.")

---

- [ ] **Step 1: Verify the global styles exist in index.html (read-only)**

  This step is a read-only confirmation — it makes NO change to `index.html`. Open `index.html` and confirm the `<head>` contains the DM Sans link and the three keyframes exactly as below (these were added in Task 1, copied verbatim from prototype lines 11-19):

  ```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: 'DM Sans', system-ui, sans-serif; background: #D8DFE8; }
    @keyframes slideInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shake { 0%,100%{ transform: translateX(0); } 18%{ transform: translateX(-7px); } 36%{ transform: translateX(7px); } 54%{ transform: translateX(-5px); } 72%{ transform: translateX(5px); } 90%{ transform: translateX(-2px); } }
    @keyframes pulseRed { 0%,100%{ box-shadow: 0 0 0 0 rgba(220,38,38,0); } 50%{ box-shadow: 0 0 0 6px rgba(220,38,38,0.15); } }
  </style>
  ```

  Run this exact command to confirm all three keyframe names are present in `index.html` (each `@keyframes` rule is on its own line, so `grep -c` counts 3 matching lines):

  ```bash
  grep -c -E '@keyframes (slideInUp|shake|pulseRed)' index.html
  ```

  Expected output:

  ```
  3
  ```

  If the count is not `3`, stop and fix `index.html` to match the block above before continuing. Do not proceed to Step 2 until the count is `3`.

- [ ] **Step 2: Write the failing test for theme.js**

  Create `src/theme.test.js` with the COMPLETE contents below. It imports `COLORS`, `FONT`, and `KEYFRAMES` (which do not exist yet) and asserts the exact tokens named in the contract plus the keyframe-name constants.

  ```js
  import { describe, it, expect } from 'vitest';
  import { COLORS, FONT, KEYFRAMES } from './theme.js';

  describe('theme COLORS', () => {
    it('exports the exact brand hex tokens', () => {
      expect(COLORS.navy).toBe('#0F2554');
      expect(COLORS.red).toBe('#DC2626');
      expect(COLORS.green).toBe('#16A34A');
      expect(COLORS.screenBg).toBe('#08121E');
      expect(COLORS.barHitl).toBe('#8B5CF6');
    });

    it('exports every required color key as an uppercase 6-digit hex string', () => {
      const keys = [
        'bg', 'navy', 'blue', 'blueAccent', 'screenBg', 'hostBg',
        'white', 'ink', 'slate700', 'slate500', 'slate400', 'border',
        'track', 'green', 'amber', 'red', 'purple',
        'barAutomate', 'barHitl', 'barManual',
      ];
      keys.forEach((k) => {
        expect(COLORS).toHaveProperty(k);
        expect(typeof COLORS[k]).toBe('string');
        expect(COLORS[k]).toMatch(/^#[0-9A-F]{6}$/);
      });
      expect(Object.keys(COLORS).sort()).toEqual([...keys].sort());
    });

    it('matches the full canonical token set', () => {
      expect(COLORS).toEqual({
        bg: '#D8DFE8',
        navy: '#0F2554',
        blue: '#2563EB',
        blueAccent: '#3B82F6',
        screenBg: '#08121E',
        hostBg: '#F1F5F9',
        white: '#FFFFFF',
        ink: '#1E293B',
        slate700: '#374151',
        slate500: '#64748B',
        slate400: '#94A3B8',
        border: '#E2E8F0',
        track: '#F1F5F9',
        green: '#16A34A',
        amber: '#D97706',
        red: '#DC2626',
        purple: '#7C3AED',
        barAutomate: '#3B82F6',
        barHitl: '#8B5CF6',
        barManual: '#475569',
      });
    });
  });

  describe('theme FONT', () => {
    it('is the DM Sans font stack string', () => {
      expect(FONT).toBe("'DM Sans', system-ui, sans-serif");
      expect(FONT).toContain('DM Sans');
    });
  });

  describe('theme KEYFRAMES', () => {
    it('exposes the global keyframe animation names', () => {
      expect(KEYFRAMES).toEqual({
        slideInUp: 'slideInUp',
        shake: 'shake',
        pulseRed: 'pulseRed',
      });
    });
  });
  ```

- [ ] **Step 3: Run the test and watch it FAIL**

  Run only the theme test file:

  ```bash
  npx vitest run src/theme.test.js
  ```

  Expected: FAIL — the test cannot resolve the import because `src/theme.js` does not exist yet. Vitest reports a failure such as:

  ```
  FAIL  src/theme.test.js [ src/theme.test.js ]
  Error: Failed to load url ./theme.js (resolved id: ./theme.js) in /.../src/theme.test.js. Does the file exist?

  Test Files  1 failed (1)
  ```

  (Exit code is non-zero.) Confirm the run failed before writing the implementation.

- [ ] **Step 4: Implement src/theme.js**

  Create `src/theme.js` with the COMPLETE contents below — the exact canonical `COLORS`, `FONT`, and the `KEYFRAMES` name constants.

  ```js
  export const COLORS = {
    bg: '#D8DFE8',
    navy: '#0F2554',
    blue: '#2563EB',
    blueAccent: '#3B82F6',
    screenBg: '#08121E',
    hostBg: '#F1F5F9',
    white: '#FFFFFF',
    ink: '#1E293B',
    slate700: '#374151',
    slate500: '#64748B',
    slate400: '#94A3B8',
    border: '#E2E8F0',
    track: '#F1F5F9',
    green: '#16A34A',
    amber: '#D97706',
    red: '#DC2626',
    purple: '#7C3AED',
    barAutomate: '#3B82F6',
    barHitl: '#8B5CF6',
    barManual: '#475569',
  };

  export const FONT = "'DM Sans', system-ui, sans-serif";

  export const KEYFRAMES = {
    slideInUp: 'slideInUp',
    shake: 'shake',
    pulseRed: 'pulseRed',
  };
  ```

- [ ] **Step 5: Run the test and watch it PASS**

  Run the theme test file again:

  ```bash
  npx vitest run src/theme.test.js
  ```

  Expected: PASS — all 5 tests green:

  ```
  ✓ src/theme.test.js (5 tests)
    ✓ theme COLORS > exports the exact brand hex tokens
    ✓ theme COLORS > exports every required color key as an uppercase 6-digit hex string
    ✓ theme COLORS > matches the full canonical token set
    ✓ theme FONT > is the DM Sans font stack string
    ✓ theme KEYFRAMES > exposes the global keyframe animation names

  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```

  (Exit code 0.) If any assertion fails, re-check `src/theme.js` against the block in Step 4 — every hex value must match the contract character-for-character (uppercase hex digits).

- [ ] **Step 6: Commit**

  `index.html` was created and committed unchanged in Task 1 and Step 1 made no edit to it, so only the two new files are staged:

  ```bash
  git add src/theme.js src/theme.test.js
  git commit -m "Add design tokens (COLORS/FONT/KEYFRAMES) in theme.js with tests"
  ```

  Expected: a single commit reporting `2 files changed`. Confirm with:

  ```bash
  git log --oneline -1
  ```

  Expected output (hash will differ):

  ```
  <hash> Add design tokens (COLORS/FONT/KEYFRAMES) in theme.js with tests
  ```


---

### Task 3: Scenario content & schema-integrity test

**Files:**
- Create: `src/content/scenarios.js`
- Test: `src/content/scenarios.test.js`

**Interfaces:**

Consumes:
- Nothing from earlier tasks at module level. This task is pure data + a co-located Vitest test. It relies only on the test runner being configured: `npm test` runs `vitest run` and Vitest resolves `*.test.js` files (provided by the Vite/Vitest setup task). No imports from other `src/` modules.

Produces (later tasks import these EXACT names from `src/content/scenarios.js`):
- `export const SCENARIOS` — array of 6 scenario objects. Each object shape: `{ id:string, title:string, desc:string, attrs:string[3], choices:{ automate:Choice, hitl:Choice, manual:Choice }, best:'automate'|'hitl'|'manual' }` where `Choice = { eff:number, risk:number, comp:number, breach:boolean, msg:string }`. Scenario ids in order: `'loan'`, `'faq'`, `'aml'`, `'statement'`, `'kyc'`, `'complaint'`.
- `export const CHOICE_ORDER = ['automate','hitl','manual']`
- `export const CHOICE_LABELS = { automate:'Automate Fully', hitl:'Human-in-Loop', manual:'Manual Review' }`
- `export const CHOICE_SUBLABELS = { automate:'Fully automated — no human step', hitl:'AI recommends, human reviews and approves', manual:'Officer handles the entire process by hand' }`
- `export const CHOICE_ICONS = { automate:'⚡', hitl:'👤', manual:'✋' }`

Consumed later by: `gameLogic.js` (`isBest`, `aggregate`), `mockGameAPI.js` (seed spreads), all three views and `ScenarioCard`/`ChoiceButtons`/`ConsequenceCard` components.

---

- [ ] **Step 1: Write the failing schema-integrity test**

  Create `src/content/scenarios.test.js` with the COMPLETE contents below. The test imports from `./scenarios` (which does not exist yet), so the run will fail to resolve the module — that is the expected first failure. It asserts: exactly 6 scenarios with the exact ids in order; every scenario has non-empty `id`/`title`/`desc`; `attrs` is an array of length 3 of non-empty strings; `choices` contains every key in `CHOICE_ORDER`; every choice has numeric `eff`/`risk`/`comp`, boolean `breach`, and a non-empty `msg`; `best` is one of `CHOICE_ORDER` and the `best` choice is never a breach option; the `loan`/`aml`/`kyc`/`complaint` scenarios each have at least one `breach:true` option; and the four content-constant exports equal their exact contracted values.

  ```javascript
  import { describe, it, expect } from 'vitest';
  import {
    SCENARIOS,
    CHOICE_ORDER,
    CHOICE_LABELS,
    CHOICE_SUBLABELS,
    CHOICE_ICONS,
  } from './scenarios';

  describe('scenario content constants', () => {
    it('CHOICE_ORDER has the three approach keys in order', () => {
      expect(CHOICE_ORDER).toEqual(['automate', 'hitl', 'manual']);
    });

    it('CHOICE_LABELS match the contract exactly', () => {
      expect(CHOICE_LABELS).toEqual({
        automate: 'Automate Fully',
        hitl: 'Human-in-Loop',
        manual: 'Manual Review',
      });
    });

    it('CHOICE_SUBLABELS match the contract exactly', () => {
      expect(CHOICE_SUBLABELS).toEqual({
        automate: 'Fully automated — no human step',
        hitl: 'AI recommends, human reviews and approves',
        manual: 'Officer handles the entire process by hand',
      });
    });

    it('CHOICE_ICONS match the contract exactly', () => {
      expect(CHOICE_ICONS).toEqual({
        automate: '⚡',
        hitl: '👤',
        manual: '✋',
      });
    });
  });

  describe('SCENARIOS schema integrity', () => {
    it('is an array of exactly 6 scenarios', () => {
      expect(Array.isArray(SCENARIOS)).toBe(true);
      expect(SCENARIOS).toHaveLength(6);
    });

    it('has the exact ids in the exact order', () => {
      expect(SCENARIOS.map((s) => s.id)).toEqual([
        'loan',
        'faq',
        'aml',
        'statement',
        'kyc',
        'complaint',
      ]);
    });

    it('every scenario has a non-empty id, title and desc', () => {
      for (const s of SCENARIOS) {
        expect(typeof s.id).toBe('string');
        expect(s.id.length).toBeGreaterThan(0);
        expect(typeof s.title).toBe('string');
        expect(s.title.length).toBeGreaterThan(0);
        expect(typeof s.desc).toBe('string');
        expect(s.desc.length).toBeGreaterThan(0);
      }
    });

    it('every scenario has exactly 3 non-empty attr strings', () => {
      for (const s of SCENARIOS) {
        expect(Array.isArray(s.attrs)).toBe(true);
        expect(s.attrs).toHaveLength(3);
        for (const tag of s.attrs) {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        }
      }
    });

    it('every scenario has all CHOICE_ORDER keys in choices', () => {
      for (const s of SCENARIOS) {
        for (const key of CHOICE_ORDER) {
          expect(s.choices[key]).toBeDefined();
        }
      }
    });

    it('every choice has numeric eff/risk/comp, boolean breach and a non-empty msg', () => {
      for (const s of SCENARIOS) {
        for (const key of CHOICE_ORDER) {
          const c = s.choices[key];
          expect(typeof c.eff).toBe('number');
          expect(Number.isNaN(c.eff)).toBe(false);
          expect(typeof c.risk).toBe('number');
          expect(Number.isNaN(c.risk)).toBe(false);
          expect(typeof c.comp).toBe('number');
          expect(Number.isNaN(c.comp)).toBe(false);
          expect(typeof c.breach).toBe('boolean');
          expect(typeof c.msg).toBe('string');
          expect(c.msg.length).toBeGreaterThan(0);
        }
      }
    });

    it('best is one of CHOICE_ORDER and is never a breach option', () => {
      for (const s of SCENARIOS) {
        expect(CHOICE_ORDER).toContain(s.best);
        expect(s.choices[s.best].breach).toBe(false);
      }
    });

    it('loan, aml, kyc and complaint each have at least one breach option', () => {
      const mustBreach = ['loan', 'aml', 'kyc', 'complaint'];
      for (const id of mustBreach) {
        const s = SCENARIOS.find((x) => x.id === id);
        expect(s).toBeDefined();
        const hasBreach = CHOICE_ORDER.some((k) => s.choices[k].breach === true);
        expect(hasBreach).toBe(true);
      }
    });
  });
  ```

- [ ] **Step 2: Run the test and confirm it FAILS**

  ```bash
  npm test -- src/content/scenarios.test.js
  ```

  Expected: FAIL — Vitest cannot resolve the import. Output contains a line like:
  ```
  Error: Failed to load url ./scenarios (resolved id: ./scenarios) in /Users/waiywaiy/interactive-games-digital-training/project/src/content/scenarios.test.js. Does the file exist?
  ```
  and the summary shows `Test Files  1 failed`. No assertions can run because the module is missing.

- [ ] **Step 3: Create `src/content/scenarios.js` with the verbatim prototype data**

  Create the file with the COMPLETE contents below. The `SCENARIOS` array is copied verbatim from the prototype (`AutomateOrNot.dc.html` lines 291–298) — every `msg` string, every numeric delta, every `breach` boolean, and every `best` value is unchanged. The four content constants are added per the contract (the prototype's labels/sublabels/icons come from the play-view markup, lines 137–155, and the `BL` map on line 341).

  ```javascript
  export const SCENARIOS = [
    {
      id: 'loan',
      title: 'Personal Loan Approval',
      desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
      attrs: ['High Risk', 'Regulated', 'Medium Volume'],
      choices: {
        automate: { eff: 30, risk: 30, comp: -35, breach: true, msg: 'Automated approvals triggered a BOT regulatory audit. Decisions cannot be explained to the regulator — full portfolio review ordered.' },
        hitl: { eff: 15, risk: -10, comp: 20, breach: false, msg: 'AI pre-scores all applications. Officer reviews flagged cases and signs off. Complete audit trail — regulators satisfied.' },
        manual: { eff: -20, risk: -5, comp: 10, breach: false, msg: 'Officers review each case by hand. Backlog reaches 3 days. Customer satisfaction drops significantly.' },
      },
      best: 'hitl',
    },
    {
      id: 'faq',
      title: 'Customer FAQ Responses',
      desc: 'Handle 500+ customer questions daily — account balance, transfer limits, fee inquiries, branch hours.',
      attrs: ['High Volume', 'Low Risk', 'Repetitive'],
      choices: {
        automate: { eff: 35, risk: 5, comp: 5, breach: false, msg: 'Chatbot resolves 94% of queries instantly. Response time drops from 4h → 30s. Staff freed for complex cases.' },
        hitl: { eff: 15, risk: 0, comp: 5, breach: false, msg: 'Bot handles standard questions, agents review edge cases. Slightly slower but high confidence on unusual queries.' },
        manual: { eff: -30, risk: 0, comp: 0, breach: false, msg: 'Staff overwhelmed — wait time rises to 4 hours. Burnout risk spikes. Dozens of queries go unanswered daily.' },
      },
      best: 'automate',
    },
    {
      id: 'aml',
      title: 'Suspicious Transaction Detection',
      desc: 'Flag and escalate potential money laundering cases from the AML monitoring system for investigation.',
      attrs: ['High Risk', 'Regulated', 'PDPA Sensitive'],
      choices: {
        automate: { eff: 25, risk: 35, comp: -40, breach: true, msg: 'Auto-blocking froze 23 legitimate accounts. PDPA violation: automated decisions on personal data without human review.' },
        hitl: { eff: 10, risk: -15, comp: 25, breach: false, msg: 'AI flags alerts, compliance officer investigates each case. STR filed correctly. Passed regulator inspection.' },
        manual: { eff: -25, risk: -10, comp: 15, breach: false, msg: '3 suspicious transactions missed due to analyst fatigue. Investigation backlog grows to 2 weeks behind.' },
      },
      best: 'hitl',
    },
    {
      id: 'statement',
      title: 'Monthly Statement Delivery',
      desc: 'Generate and send 50,000 monthly account statements to customers via email and mobile notification.',
      attrs: ['High Volume', 'Low Risk', 'Routine'],
      choices: {
        automate: { eff: 35, risk: 5, comp: 10, breach: false, msg: 'Statements auto-generated and delivered on schedule. Zero errors, all confirmed within 2 hours. Cost down 85%.' },
        hitl: { eff: 10, risk: 0, comp: 5, breach: false, msg: 'Human spot-checks a sample batch before send. Adds 6 hours — catches a rare edge-case formatting bug.' },
        manual: { eff: -40, risk: 0, comp: 0, breach: false, msg: 'Physically impossible — 50,000 statements cannot be manually processed in a monthly cycle.' },
      },
      best: 'automate',
    },
    {
      id: 'kyc',
      title: 'KYC Customer Onboarding',
      desc: 'Verify identity documents for 200 new customers applying for accounts each week under AMLA requirements.',
      attrs: ['Regulated', 'PDPA Sensitive', 'Medium Volume'],
      choices: {
        automate: { eff: 25, risk: 25, comp: -30, breach: true, msg: 'OCR incorrectly verified 3 fraudulent IDs. Regulatory breach — AMLA requires human sign-off on KYC final decisions.' },
        hitl: { eff: 20, risk: -5, comp: 20, breach: false, msg: 'AI extracts document data, officer confirms each case. Processing time cut 60%. Full compliance maintained.' },
        manual: { eff: -15, risk: -5, comp: 15, breach: false, msg: 'Officers verify every document by hand — 3 working days per application and a 2.1% error rate.' },
      },
      best: 'hitl',
    },
    {
      id: 'complaint',
      title: 'Formal Complaint Resolution',
      desc: 'Respond to 150 formal customer complaints per month: billing disputes, service failures, fraud claims.',
      attrs: ['High Risk', 'PDPA Sensitive', 'Complex'],
      choices: {
        automate: { eff: 20, risk: 30, comp: -25, breach: true, msg: 'Templated bot responses angered 40 customers who escalated to the Bank of Thailand. Regulatory notice issued.' },
        hitl: { eff: 10, risk: -5, comp: 15, breach: false, msg: 'AI drafts responses, officer reviews and personalizes each reply. Resolution time halved. Satisfaction up 15%.' },
        manual: { eff: -10, risk: -10, comp: 10, breach: false, msg: 'Thorough but slow — 8-day average resolution. High staff emotional labor. Process cannot scale.' },
      },
      best: 'hitl',
    },
  ];

  export const CHOICE_ORDER = ['automate', 'hitl', 'manual'];

  export const CHOICE_LABELS = {
    automate: 'Automate Fully',
    hitl: 'Human-in-Loop',
    manual: 'Manual Review',
  };

  export const CHOICE_SUBLABELS = {
    automate: 'Fully automated — no human step',
    hitl: 'AI recommends, human reviews and approves',
    manual: 'Officer handles the entire process by hand',
  };

  export const CHOICE_ICONS = {
    automate: '⚡',
    hitl: '👤',
    manual: '✋',
  };
  ```

- [ ] **Step 4: Run the test and confirm it PASSES**

  ```bash
  npm test -- src/content/scenarios.test.js
  ```

  Expected: PASS. Output shows `Test Files  1 passed (1)` and `Tests  12 passed (12)` (4 constant tests + 8 SCENARIOS integrity tests).

- [ ] **Step 5: Commit**

  ```bash
  git add src/content/scenarios.js src/content/scenarios.test.js
  git commit -m "Add scenario content with schema-integrity test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected: a commit is created listing 2 files changed.


---

### Task 4: Pure game logic (gameLogic.js)

**Files:**
- Create: `src/game/gameLogic.js`
- Test: `src/game/gameLogic.test.jsx`

**Interfaces:**

Consumes (from earlier tasks):
- Task 1 provides a working npm + Vitest project. Run tests with `npm test -- --run <path>` (Vitest in non-watch mode). Vitest globals (`describe`, `it`, `expect`) are enabled via `vitest.config.js` (`test.globals: true`) — do NOT import them.
- Task 2 provides `src/theme.js` exporting `export const COLORS = { ... }`. The exact hex values this task depends on:
  - `COLORS.green` === `'#16A34A'`
  - `COLORS.amber` === `'#D97706'`
  - `COLORS.red` === `'#DC2626'`
  - `COLORS.barAutomate` === `'#3B82F6'`
  - `COLORS.barHitl` === `'#8B5CF6'`
  - `COLORS.barManual` === `'#475569'`
- Task 3 provides `src/content/scenarios.js` exporting `export const SCENARIOS` (6 objects), `export const CHOICE_ORDER = ['automate','hitl','manual']`, and `export const CHOICE_LABELS = { automate:'Automate Fully', hitl:'Human-in-Loop', manual:'Manual Review' }`. The scenario `best` values this task relies on: `loan:'hitl'`, `faq:'automate'`, `aml:'hitl'`, `statement:'automate'`, `kyc:'hitl'`, `complaint:'hitl'`.

Produces (later tasks rely on these exact names/signatures from `src/game/gameLogic.js`):
- `export const START_METERS = { eff:50, risk:50, comp:50 }`
- `export const POINTS_PER_BEST = 10`
- `export function clamp(v) -> number` (Math.round, bounded 0..100)
- `export function applyChoice(meters, deltas) -> { eff, risk, comp }` (new object, never mutates inputs)
- `export function isBest(choiceKey, scenario) -> boolean`
- `export function scoreDelta(choiceKey, scenario) -> number`
- `export function meterColor(type, value) -> string` (a hex from `COLORS`)
- `export function meterLabel(type, value) -> string`
- `export function reportProfile(meters) -> { eff:{pct,color,label}, risk:{safePct,color,label}, comp:{pct,color,label} }`
- `export function aggregate(decisions) -> { counts:{automate,hitl,manual}, total:number, bars:[{key,label,pct,pctStr,color}] }`
- `export function isRoomSplit(agg) -> boolean`
- `export function buildScoreboard(players) -> Array<{name,score}>` (at most 6 rows)

NOTE ON IMPORTS: This task uses ONE fixed import block at the top of `src/game/gameLogic.test.jsx`, written in full in Step 1 and never edited again. Every later test step only appends a new `describe` block. Likewise the implementation file `src/game/gameLogic.js` is created once in Step 3 with its full import header (`COLORS`, `CHOICE_ORDER`, `CHOICE_LABELS`); later impl steps only append functions. This avoids duplicate-import churn.

---

- [ ] **Step 1: Write the full test import header + failing test for `START_METERS` and `POINTS_PER_BEST`**

Create `src/game/gameLogic.test.jsx`. This import block names every symbol used across the whole file; later steps append describe blocks only — never touch these imports again.

```jsx
import {
  START_METERS,
  POINTS_PER_BEST,
  clamp,
  applyChoice,
  isBest,
  scoreDelta,
  meterColor,
  meterLabel,
  reportProfile,
  aggregate,
  isRoomSplit,
  buildScoreboard,
} from './gameLogic';
import { COLORS } from '../theme';

describe('constants', () => {
  it('START_METERS starts every meter at 50', () => {
    expect(START_METERS).toEqual({ eff: 50, risk: 50, comp: 50 });
  });

  it('POINTS_PER_BEST is 10', () => {
    expect(POINTS_PER_BEST).toBe(10);
  });
});
```

- [ ] **Step 2: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `Failed to resolve import "./gameLogic"` (the module does not exist yet).

- [ ] **Step 3: Create `gameLogic.js` with its full import header + the two constants (minimal implementation)**

Create `src/game/gameLogic.js`. The import header lists all three external symbols used later (`COLORS`, `CHOICE_ORDER`, `CHOICE_LABELS`); later impl steps append functions only — never touch this header again.

```js
import { COLORS } from '../theme';
import { CHOICE_ORDER, CHOICE_LABELS } from '../content/scenarios';

export const START_METERS = { eff: 50, risk: 50, comp: 50 };
export const POINTS_PER_BEST = 10;
```

- [ ] **Step 4: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Test Files  1 passed`, `Tests  2 passed`.

- [ ] **Step 5: Write failing test for `clamp` (rounding + 0..100 bounds)**

Append this describe block to the end of `src/game/gameLogic.test.jsx` (imports already in place from Step 1):

```jsx
describe('clamp', () => {
  it('rounds to the nearest integer', () => {
    expect(clamp(49.4)).toBe(49);
    expect(clamp(49.5)).toBe(50);
    expect(clamp(50.6)).toBe(51);
  });

  it('clamps values above 100 down to 100', () => {
    expect(clamp(101)).toBe(100);
    expect(clamp(250)).toBe(100);
    expect(clamp(100)).toBe(100);
  });

  it('clamps values below 0 up to 0', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(-50)).toBe(0);
    expect(clamp(0)).toBe(0);
  });

  it('rounds before bounding (99.6 -> 100)', () => {
    expect(clamp(99.6)).toBe(100);
  });
});
```

- [ ] **Step 6: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: clamp is not a function` (export missing).

- [ ] **Step 7: Implement `clamp`**

Append to the end of `src/game/gameLogic.js`:

```js
export function clamp(v) {
  const r = Math.round(v);
  if (r > 100) return 100;
  if (r < 0) return 0;
  return r;
}
```

- [ ] **Step 8: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  6 passed` (2 constants + 4 clamp).

- [ ] **Step 9: Write failing test for `applyChoice` (clamping + immutability)**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('applyChoice', () => {
  it('adds deltas to each meter', () => {
    const result = applyChoice({ eff: 50, risk: 50, comp: 50 }, { eff: 10, risk: -5, comp: 20 });
    expect(result).toEqual({ eff: 60, risk: 45, comp: 70 });
  });

  it('clamps results to 0..100', () => {
    const result = applyChoice({ eff: 95, risk: 5, comp: 50 }, { eff: 30, risk: -30, comp: 0 });
    expect(result).toEqual({ eff: 100, risk: 0, comp: 50 });
  });

  it('does not mutate the input meters object', () => {
    const meters = { eff: 50, risk: 50, comp: 50 };
    applyChoice(meters, { eff: 10, risk: 10, comp: 10 });
    expect(meters).toEqual({ eff: 50, risk: 50, comp: 50 });
  });

  it('does not mutate the input deltas object', () => {
    const deltas = { eff: 10, risk: 10, comp: 10 };
    applyChoice({ eff: 50, risk: 50, comp: 50 }, deltas);
    expect(deltas).toEqual({ eff: 10, risk: 10, comp: 10 });
  });

  it('returns a new object reference each call', () => {
    const meters = { eff: 50, risk: 50, comp: 50 };
    const result = applyChoice(meters, { eff: 0, risk: 0, comp: 0 });
    expect(result).not.toBe(meters);
  });
});
```

- [ ] **Step 10: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: applyChoice is not a function`.

- [ ] **Step 11: Implement `applyChoice`**

Append to the end of `src/game/gameLogic.js`:

```js
export function applyChoice(meters, deltas) {
  return {
    eff: clamp(meters.eff + deltas.eff),
    risk: clamp(meters.risk + deltas.risk),
    comp: clamp(meters.comp + deltas.comp),
  };
}
```

- [ ] **Step 12: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  11 passed` (2 + 4 + 5).

- [ ] **Step 13: Commit constants + clamp + applyChoice**

```
git add src/game/gameLogic.js src/game/gameLogic.test.jsx
git commit -m "Add START_METERS, POINTS_PER_BEST, clamp, applyChoice to gameLogic"
```

- [ ] **Step 14: Write failing test for `isBest` and `scoreDelta`**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('isBest / scoreDelta', () => {
  const scenario = { best: 'hitl' };

  it('isBest is true when choiceKey equals scenario.best', () => {
    expect(isBest('hitl', scenario)).toBe(true);
  });

  it('isBest is false when choiceKey differs from scenario.best', () => {
    expect(isBest('automate', scenario)).toBe(false);
    expect(isBest('manual', scenario)).toBe(false);
  });

  it('scoreDelta is POINTS_PER_BEST (10) for the best choice', () => {
    expect(scoreDelta('hitl', scenario)).toBe(10);
    expect(scoreDelta('hitl', scenario)).toBe(POINTS_PER_BEST);
  });

  it('scoreDelta is 0 for a non-best choice', () => {
    expect(scoreDelta('automate', scenario)).toBe(0);
    expect(scoreDelta('manual', scenario)).toBe(0);
  });
});
```

- [ ] **Step 15: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: isBest is not a function`.

- [ ] **Step 16: Implement `isBest` and `scoreDelta`**

Append to the end of `src/game/gameLogic.js`:

```js
export function isBest(choiceKey, scenario) {
  return choiceKey === scenario.best;
}

export function scoreDelta(choiceKey, scenario) {
  return isBest(choiceKey, scenario) ? POINTS_PER_BEST : 0;
}
```

- [ ] **Step 17: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  15 passed` (11 + 4).

- [ ] **Step 18: Write failing test for `meterColor` at exact thresholds**

Append this describe block to the end of `src/game/gameLogic.test.jsx` (`COLORS` is already imported from Step 1):

```jsx
describe('meterColor', () => {
  it('eff: >=60 green, exact 60 is green', () => {
    expect(meterColor('eff', 60)).toBe(COLORS.green);
    expect(meterColor('eff', 100)).toBe(COLORS.green);
  });

  it('eff: 38..59 amber, exact 38 is amber, 59 is amber', () => {
    expect(meterColor('eff', 38)).toBe(COLORS.amber);
    expect(meterColor('eff', 59)).toBe(COLORS.amber);
  });

  it('eff: <38 red, exact 37 is red', () => {
    expect(meterColor('eff', 37)).toBe(COLORS.red);
    expect(meterColor('eff', 0)).toBe(COLORS.red);
  });

  it('comp uses the same thresholds as eff', () => {
    expect(meterColor('comp', 60)).toBe(COLORS.green);
    expect(meterColor('comp', 38)).toBe(COLORS.amber);
    expect(meterColor('comp', 37)).toBe(COLORS.red);
  });

  it('risk: <=40 green, exact 40 is green', () => {
    expect(meterColor('risk', 40)).toBe(COLORS.green);
    expect(meterColor('risk', 0)).toBe(COLORS.green);
  });

  it('risk: 41..65 amber, exact 41 is amber, 65 is amber', () => {
    expect(meterColor('risk', 41)).toBe(COLORS.amber);
    expect(meterColor('risk', 65)).toBe(COLORS.amber);
  });

  it('risk: >65 red, exact 66 is red', () => {
    expect(meterColor('risk', 66)).toBe(COLORS.red);
    expect(meterColor('risk', 100)).toBe(COLORS.red);
  });
});
```

- [ ] **Step 19: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: meterColor is not a function`.

- [ ] **Step 20: Implement `meterColor`**

Append to the end of `src/game/gameLogic.js`. Mirrors the prototype `mc(t,v)` exactly (eff/comp: `>=60` green, `>=38` amber, else red; risk: `<=40` green, `<=65` amber, else red):

```js
export function meterColor(type, value) {
  if (type === 'risk') {
    if (value <= 40) return COLORS.green;
    if (value <= 65) return COLORS.amber;
    return COLORS.red;
  }
  // 'eff' or 'comp'
  if (value >= 60) return COLORS.green;
  if (value >= 38) return COLORS.amber;
  return COLORS.red;
}
```

- [ ] **Step 21: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  22 passed` (15 + 7).

- [ ] **Step 22: Write failing test for `meterLabel` at exact thresholds**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('meterLabel', () => {
  it('eff: >=65 High Efficiency, exact 65', () => {
    expect(meterLabel('eff', 65)).toBe('High Efficiency');
    expect(meterLabel('eff', 100)).toBe('High Efficiency');
  });

  it('eff: 42..64 Balanced, exact 42 and 64', () => {
    expect(meterLabel('eff', 42)).toBe('Balanced');
    expect(meterLabel('eff', 64)).toBe('Balanced');
  });

  it('eff: <42 Low Efficiency, exact 41', () => {
    expect(meterLabel('eff', 41)).toBe('Low Efficiency');
    expect(meterLabel('eff', 0)).toBe('Low Efficiency');
  });

  it('risk: <=38 Risk-Aware, exact 38', () => {
    expect(meterLabel('risk', 38)).toBe('Risk-Aware');
    expect(meterLabel('risk', 0)).toBe('Risk-Aware');
  });

  it('risk: 39..62 Moderate Risk, exact 39 and 62', () => {
    expect(meterLabel('risk', 39)).toBe('Moderate Risk');
    expect(meterLabel('risk', 62)).toBe('Moderate Risk');
  });

  it('risk: >62 High Risk, exact 63', () => {
    expect(meterLabel('risk', 63)).toBe('High Risk');
    expect(meterLabel('risk', 100)).toBe('High Risk');
  });

  it('comp: >=65 Compliant, 42..64 Marginal, <42 At Risk', () => {
    expect(meterLabel('comp', 65)).toBe('Compliant');
    expect(meterLabel('comp', 42)).toBe('Marginal');
    expect(meterLabel('comp', 64)).toBe('Marginal');
    expect(meterLabel('comp', 41)).toBe('At Risk');
  });
});
```

- [ ] **Step 23: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: meterLabel is not a function`.

- [ ] **Step 24: Implement `meterLabel`**

Append to the end of `src/game/gameLogic.js`. Mirrors the prototype label thresholds exactly:

```js
export function meterLabel(type, value) {
  if (type === 'eff') {
    if (value >= 65) return 'High Efficiency';
    if (value >= 42) return 'Balanced';
    return 'Low Efficiency';
  }
  if (type === 'risk') {
    if (value <= 38) return 'Risk-Aware';
    if (value <= 62) return 'Moderate Risk';
    return 'High Risk';
  }
  // 'comp'
  if (value >= 65) return 'Compliant';
  if (value >= 42) return 'Marginal';
  return 'At Risk';
}
```

- [ ] **Step 25: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  29 passed` (22 + 7).

- [ ] **Step 26: Commit isBest/scoreDelta/meterColor/meterLabel**

```
git add src/game/gameLogic.js src/game/gameLogic.test.jsx
git commit -m "Add isBest, scoreDelta, meterColor, meterLabel to gameLogic"
```

- [ ] **Step 27: Write failing test for `reportProfile` (risk.safePct = 100-risk; risk color/label use RAW risk)**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('reportProfile', () => {
  it('maps eff and comp to {pct,color,label} and risk to {safePct,color,label}', () => {
    const profile = reportProfile({ eff: 72, risk: 30, comp: 50 });
    expect(profile.eff).toEqual({ pct: 72, color: COLORS.green, label: 'High Efficiency' });
    expect(profile.comp).toEqual({ pct: 50, color: COLORS.amber, label: 'Marginal' });
    expect(profile.risk).toEqual({ safePct: 70, color: COLORS.green, label: 'Risk-Aware' });
  });

  it('risk safePct is 100 minus the raw risk value', () => {
    const profile = reportProfile({ eff: 50, risk: 80, comp: 50 });
    expect(profile.risk.safePct).toBe(20);
  });

  it('risk color and label use the RAW risk value, not safePct', () => {
    // raw risk 80 -> safePct 20. color/label must reflect raw 80 (High Risk / red), not 20.
    const profile = reportProfile({ eff: 50, risk: 80, comp: 50 });
    expect(profile.risk.color).toBe(COLORS.red);
    expect(profile.risk.label).toBe('High Risk');
  });
});
```

- [ ] **Step 28: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: reportProfile is not a function`.

- [ ] **Step 29: Implement `reportProfile`**

Append to the end of `src/game/gameLogic.js`:

```js
export function reportProfile(meters) {
  return {
    eff: {
      pct: meters.eff,
      color: meterColor('eff', meters.eff),
      label: meterLabel('eff', meters.eff),
    },
    risk: {
      safePct: 100 - meters.risk,
      color: meterColor('risk', meters.risk),
      label: meterLabel('risk', meters.risk),
    },
    comp: {
      pct: meters.comp,
      color: meterColor('comp', meters.comp),
      label: meterLabel('comp', meters.comp),
    },
  };
}
```

- [ ] **Step 30: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  32 passed` (29 + 3).

- [ ] **Step 31: Write failing test for `aggregate` (total 0 + known spread + rounding)**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('aggregate', () => {
  it('returns zeroed counts and 0% bars with no divide-by-zero when total is 0', () => {
    const agg = aggregate([]);
    expect(agg.total).toBe(0);
    expect(agg.counts).toEqual({ automate: 0, hitl: 0, manual: 0 });
    expect(agg.bars.map((b) => b.pct)).toEqual([0, 0, 0]);
    expect(agg.bars.map((b) => b.pctStr)).toEqual(['0%', '0%', '0%']);
  });

  it('counts decisions by choice and keeps CHOICE_ORDER (automate, hitl, manual)', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    expect(agg.total).toBe(4);
    expect(agg.counts).toEqual({ automate: 2, hitl: 1, manual: 1 });
    expect(agg.bars.map((b) => b.key)).toEqual(['automate', 'hitl', 'manual']);
  });

  it('computes rounded pct, pctStr, label, and color per bar', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    expect(agg.bars[0]).toEqual({
      key: 'automate',
      label: 'Automate Fully',
      pct: 50,
      pctStr: '50%',
      color: COLORS.barAutomate,
    });
    expect(agg.bars[1]).toEqual({
      key: 'hitl',
      label: 'Human-in-Loop',
      pct: 25,
      pctStr: '25%',
      color: COLORS.barHitl,
    });
    expect(agg.bars[2]).toEqual({
      key: 'manual',
      label: 'Manual Review',
      pct: 25,
      pctStr: '25%',
      color: COLORS.barManual,
    });
  });

  it('rounds pct to the nearest integer (1 of 3 -> 33%)', () => {
    const decisions = [{ choice: 'automate' }, { choice: 'hitl' }, { choice: 'manual' }];
    const agg = aggregate(decisions);
    expect(agg.bars.map((b) => b.pct)).toEqual([33, 33, 33]);
  });
});
```

- [ ] **Step 32: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: aggregate is not a function`.

- [ ] **Step 33: Implement `aggregate`**

The imports `CHOICE_ORDER` and `CHOICE_LABELS` are already in the file header from Step 3. Append to the end of `src/game/gameLogic.js`:

```js
export function aggregate(decisions) {
  const counts = { automate: 0, hitl: 0, manual: 0 };
  for (const d of decisions) {
    if (counts[d.choice] !== undefined) counts[d.choice] += 1;
  }
  const total = decisions.length;
  const barColors = {
    automate: COLORS.barAutomate,
    hitl: COLORS.barHitl,
    manual: COLORS.barManual,
  };
  const bars = CHOICE_ORDER.map((key) => {
    const count = counts[key];
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return {
      key,
      label: CHOICE_LABELS[key],
      pct,
      pctStr: pct + '%',
      color: barColors[key],
    };
  });
  return { counts, total, bars };
}
```

- [ ] **Step 34: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  36 passed` (32 + 4).

- [ ] **Step 35: Write failing test for `isRoomSplit` (total 0, equal split, exact-15 boundary, dominated)**

Append this describe block to the end of `src/game/gameLogic.test.jsx`:

```jsx
describe('isRoomSplit', () => {
  it('is false when total is 0', () => {
    const agg = aggregate([]);
    expect(isRoomSplit(agg)).toBe(false);
  });

  it('is true when the top two bar pcts are within 15 points (50/50)', () => {
    const agg = aggregate([{ choice: 'automate' }, { choice: 'hitl' }]);
    // pcts: 50, 50, 0 -> top two are 50 and 50, diff 0 <= 15
    expect(isRoomSplit(agg)).toBe(true);
  });

  it('is true when top two differ by exactly 15 points (50 vs 35)', () => {
    // 20 decisions: 10 automate (50%), 7 hitl (35%), 3 manual (15%)
    const decisions = [];
    for (let i = 0; i < 10; i++) decisions.push({ choice: 'automate' });
    for (let i = 0; i < 7; i++) decisions.push({ choice: 'hitl' });
    for (let i = 0; i < 3; i++) decisions.push({ choice: 'manual' });
    const agg = aggregate(decisions);
    // pcts: 50, 35, 15 -> top two 50 and 35, diff 15 <= 15
    expect(isRoomSplit(agg)).toBe(true);
  });

  it('is false when the top bar dominates (top two differ by more than 15)', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
    ];
    // pcts: 75, 25, 0 -> top two 75 and 25, diff 50 > 15
    const agg = aggregate(decisions);
    expect(isRoomSplit(agg)).toBe(false);
  });
});
```

- [ ] **Step 36: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: isRoomSplit is not a function`.

- [ ] **Step 37: Implement `isRoomSplit`**

Append to the end of `src/game/gameLogic.js`:

```js
export function isRoomSplit(agg) {
  if (agg.total === 0) return false;
  const pcts = agg.bars.map((b) => b.pct).sort((a, b) => b - a);
  return pcts[0] - pcts[1] <= 15;
}
```

- [ ] **Step 38: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  40 passed` (36 + 4).

- [ ] **Step 39: Write failing test for `buildScoreboard` (team grouping, desc sort, cap 6, per-player fallback)**

Append this describe block to the end of `src/game/gameLogic.test.jsx`. Note: the grouping test uses teams with *distinct* totals so the assertion is fully deterministic (no tie-order ambiguity):

```jsx
describe('buildScoreboard', () => {
  it('groups by team and sums score per team', () => {
    const players = [
      { name: 'Ann', team: 'Alpha', score: 10 },
      { name: 'Ben', team: 'Beta', score: 30 },
      { name: 'Cara', team: 'Alpha', score: 25 },
      { name: 'Dan', team: 'Beta', score: 5 },
    ];
    const rows = buildScoreboard(players);
    // Alpha = 10 + 25 = 35, Beta = 30 + 5 = 35; both rows present
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.score === 35)).toBe(true);
    expect(rows.map((r) => r.name).sort()).toEqual(['Alpha', 'Beta']);
  });

  it('sorts teams by descending summed score', () => {
    const players = [
      { name: 'Ann', team: 'Alpha', score: 10 },
      { name: 'Ben', team: 'Beta', score: 30 },
      { name: 'Cara', team: 'Gamma', score: 50 },
    ];
    const rows = buildScoreboard(players);
    expect(rows).toEqual([
      { name: 'Gamma', score: 50 },
      { name: 'Beta', score: 30 },
      { name: 'Alpha', score: 10 },
    ]);
  });

  it('falls back to per-player rows when players have no team', () => {
    const players = [
      { name: 'Ann', score: 10 },
      { name: 'Ben', score: 30 },
      { name: 'Cara', score: 20 },
    ];
    const rows = buildScoreboard(players);
    expect(rows).toEqual([
      { name: 'Ben', score: 30 },
      { name: 'Cara', score: 20 },
      { name: 'Ann', score: 10 },
    ]);
  });

  it('caps the result at 6 rows, highest scores first', () => {
    const players = [];
    for (let i = 0; i < 10; i++) {
      players.push({ name: 'P' + i, team: 'T' + i, score: i });
    }
    const rows = buildScoreboard(players);
    expect(rows.length).toBe(6);
    // each player on a distinct team; teams T9..T4 are the 6 highest
    expect(rows.map((r) => r.name)).toEqual(['T9', 'T8', 'T7', 'T6', 'T5', 'T4']);
  });

  it('returns an empty array for no players', () => {
    expect(buildScoreboard([])).toEqual([]);
  });
});
```

- [ ] **Step 40: Run the test — Expected: FAIL**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: FAIL — `TypeError: buildScoreboard is not a function`.

- [ ] **Step 41: Implement `buildScoreboard`**

Append to the end of `src/game/gameLogic.js`:

```js
export function buildScoreboard(players) {
  const hasTeams = players.length > 0 && players.every((p) => p.team);
  let rows;
  if (hasTeams) {
    const totals = {};
    for (const p of players) {
      totals[p.team] = (totals[p.team] || 0) + (p.score || 0);
    }
    rows = Object.keys(totals).map((team) => ({ name: team, score: totals[team] }));
  } else {
    rows = players.map((p) => ({ name: p.name, score: p.score || 0 }));
  }
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 6);
}
```

- [ ] **Step 42: Run the test — Expected: PASS**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Tests  45 passed` (40 + 5).

- [ ] **Step 43: Run the full gameLogic test file once more — Expected: PASS (all suites green)**

```
npm test -- --run src/game/gameLogic.test.jsx
```

Expected: PASS — `Test Files  1 passed`, `Tests  45 passed`, `0 failed`. Every describe block green: `constants`, `clamp`, `applyChoice`, `isBest / scoreDelta`, `meterColor`, `meterLabel`, `reportProfile`, `aggregate`, `isRoomSplit`, `buildScoreboard`.

- [ ] **Step 44: Final commit for Task 4**

```
git add src/game/gameLogic.js src/game/gameLogic.test.jsx
git commit -m "Add reportProfile, aggregate, isRoomSplit, buildScoreboard to gameLogic"
```


---

### Task 5: GameAPI interface + in-memory mock

**Files:**
- Create: `src/game/mockGameAPI.js`
- Create: `src/game/supabaseGameAPI.js`
- Create: `src/game/GameAPI.js`
- Test: `src/game/mockGameAPI.test.js`
- Test: `src/game/GameAPI.test.js`

**Interfaces:**

Consumes (from earlier tasks):
- `src/content/scenarios.js` → `export const SCENARIOS` — array of 6 scenario objects `{ id, title, desc, attrs:[3 strings], choices:{ automate, hitl, manual }, best }`. The mock uses `SCENARIOS.length` (=== 6) to decide when `advance()` sets `status:'ended'`, and reads `SCENARIOS[currentIdx].best` + `.choices[choice].breach` when seeding.

Produces (later tasks rely on these EXACT names/signatures):
- `createMockGameAPI({ view='play', roomCode='DEMO', seed=false }) -> GameAPI` — in-memory implementation of the full GameAPI interface.
- `createSupabaseGameAPI({ view, roomCode, supabase }) -> GameAPI` — Supabase-backed implementation. Task 5 ships a throwing stub; Task 7 OVERWRITES this file with the real implementation. `GameAPI.js` statically imports it by name, so the file must exist for the import to resolve. Task 5 tests never reach the stub because they always pass `supabase: null`, so `buildGameAPI` takes the mock branch.
- `buildGameAPI({ view, roomCode, supabase }) -> GameAPI` — factory returning the Supabase impl when `supabase` is truthy, else the mock.
- `GameAPI` object shape: `{ getView, getRoomCode, joinRoom, emit, award, advance, setReveal, subscribe, getStation }`.
- `Station` object shape: `{ roomCode, currentIdx, reveal, status, players:[{id,name,team,score}], decisions:[{playerId,scenarioIdx,choice,isBest,breach}], respondedCount }`.

---

- [ ] **Step 1: Write failing test for `createMockGameAPI` construction & initial station**

Create `src/game/mockGameAPI.test.js`. This locks the constructor defaults and initial `Station` shape.

```js
// src/game/mockGameAPI.test.js
import { describe, it, expect, vi } from 'vitest';
import { createMockGameAPI } from './mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

describe('createMockGameAPI — construction & initial station', () => {
  it('defaults view to play and roomCode to DEMO', () => {
    const api = createMockGameAPI({});
    expect(api.getView()).toBe('play');
    expect(api.getRoomCode()).toBe('DEMO');
  });

  it('honors explicit view and roomCode', () => {
    const api = createMockGameAPI({ view: 'host', roomCode: 'ABCD' });
    expect(api.getView()).toBe('host');
    expect(api.getRoomCode()).toBe('ABCD');
  });

  it('starts with an empty lobby station', () => {
    const api = createMockGameAPI({});
    const s = api.getStation();
    expect(s.roomCode).toBe('DEMO');
    expect(s.currentIdx).toBe(0);
    expect(s.reveal).toBe(false);
    expect(s.status).toBe('lobby');
    expect(s.players).toEqual([]);
    expect(s.decisions).toEqual([]);
    expect(s.respondedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL (module missing)**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: FAIL — `Error: Failed to resolve import "./mockGameAPI.js" from "src/game/mockGameAPI.test.js"` (the file does not exist yet), reported as a transform/collection error. 0 tests run.

- [ ] **Step 3: Create minimal `src/game/mockGameAPI.js` (construction + getters only)**

Implement only what Step 1 asserts: in-memory station, `getView`/`getRoomCode`/`getStation`, default args, and a no-op `subscribers` set we will use later. No `joinRoom`/`emit`/`award`/`advance`/`setReveal`/`subscribe` yet — those get their own failing tests first.

```js
// src/game/mockGameAPI.js
import { SCENARIOS } from '../content/scenarios.js';

/**
 * In-memory implementation of the GameAPI interface (see GameAPI.js for the
 * full interface JSDoc). Deterministic: no Math.random anywhere. All methods
 * return resolved Promises and synchronously mutate the in-memory Station
 * before notifying subscribers.
 *
 * @param {{ view?: 'play'|'screen'|'host', roomCode?: string, seed?: boolean }} opts
 * @returns {import('./GameAPI.js').GameAPI}
 */
export function createMockGameAPI({ view = 'play', roomCode = 'DEMO', seed = false } = {}) {
  const station = {
    roomCode,
    currentIdx: 0,
    reveal: false,
    status: 'lobby',
    players: [],
    decisions: [],
    respondedCount: 0,
  };

  const subscribers = new Set();
  let nextId = 0;
  const makeId = (prefix) => `${prefix}_${++nextId}`;

  function recomputeResponded() {
    const ids = new Set();
    for (const d of station.decisions) {
      if (d.scenarioIdx === station.currentIdx) ids.add(d.playerId);
    }
    station.respondedCount = ids.size;
  }

  function notify() {
    recomputeResponded();
    for (const cb of subscribers) cb(station);
  }

  const api = {
    getView() {
      return view;
    },
    getRoomCode() {
      return roomCode;
    },
    getStation() {
      return station;
    },
  };

  return api;
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: PASS — `Test Files 1 passed (1)`, `Tests 3 passed (3)`.

- [ ] **Step 5: Commit the construction baseline**

```bash
git add src/game/mockGameAPI.js src/game/mockGameAPI.test.js
git commit -m "Add createMockGameAPI construction and initial station

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: one commit at HEAD recording both files.

- [ ] **Step 6: Write failing tests for `joinRoom`, `emit('decision')`, and `respondedCount`**

Append a new `describe` block to `src/game/mockGameAPI.test.js`.

```js
describe('createMockGameAPI — joinRoom, emit, respondedCount', () => {
  it('joinRoom returns a playerId and adds a player', async () => {
    const api = createMockGameAPI({});
    const { playerId } = await api.joinRoom({ name: 'Aisha' });
    expect(playerId).toBeTruthy();
    const s = api.getStation();
    expect(s.players).toHaveLength(1);
    expect(s.players[0].id).toBe(playerId);
    expect(s.players[0].name).toBe('Aisha');
    expect(s.players[0].team).toBe(null);
    expect(s.players[0].score).toBe(0);
    expect(s.status).toBe('active');
  });

  it('emit(decision) appends a decision and respondedCount reflects distinct players for currentIdx', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    const { playerId: p2 } = await api.joinRoom({ name: 'Two' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.emit('decision', { playerId: p2, scenarioId: 'loan', scenarioIdx: 0, choice: 'automate', isBest: false, breach: true });
    const s = api.getStation();
    expect(s.decisions).toHaveLength(2);
    expect(s.decisions[0]).toEqual({ playerId: p1, scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    expect(s.respondedCount).toBe(2);
  });

  it('duplicate emit for same player+idx does not double-count', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'manual', isBest: false, breach: false });
    const s = api.getStation();
    expect(s.decisions).toHaveLength(1);
    expect(s.decisions[0].choice).toBe('hitl');
    expect(s.respondedCount).toBe(1);
  });

  it('respondedCount only counts decisions for the current scenario index', async () => {
    const api = createMockGameAPI({});
    const { playerId: p1 } = await api.joinRoom({ name: 'One' });
    await api.emit('decision', { playerId: p1, scenarioId: 'loan', scenarioIdx: 0, choice: 'hitl', isBest: true, breach: false });
    await api.advance(); // currentIdx -> 1
    expect(api.getStation().respondedCount).toBe(0);
  });
});
```

- [ ] **Step 7: Run the new tests — expect FAIL (methods not implemented)**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: FAIL — the 3 construction tests still pass, but the 4 new tests throw `TypeError: api.joinRoom is not a function` (and `api.emit`/`api.advance` likewise). Summary: `Tests 4 failed | 3 passed (7)`.

- [ ] **Step 8: Implement `joinRoom`, `emit`, `advance`, `notify` in `src/game/mockGameAPI.js`**

Add the methods to the `api` object. `joinRoom` flips `status` to `'active'`; `emit('decision')` is idempotent on `(playerId, scenarioIdx)`; `advance` increments `currentIdx` or sets `status:'ended'` past the last scenario; every mutating call ends with `notify()`.

```js
// src/game/mockGameAPI.js
import { SCENARIOS } from '../content/scenarios.js';

/**
 * In-memory implementation of the GameAPI interface (see GameAPI.js for the
 * full interface JSDoc). Deterministic: no Math.random anywhere. All methods
 * return resolved Promises and synchronously mutate the in-memory Station
 * before notifying subscribers.
 *
 * @param {{ view?: 'play'|'screen'|'host', roomCode?: string, seed?: boolean }} opts
 * @returns {import('./GameAPI.js').GameAPI}
 */
export function createMockGameAPI({ view = 'play', roomCode = 'DEMO', seed = false } = {}) {
  const station = {
    roomCode,
    currentIdx: 0,
    reveal: false,
    status: 'lobby',
    players: [],
    decisions: [],
    respondedCount: 0,
  };

  const subscribers = new Set();
  let nextId = 0;
  const makeId = (prefix) => `${prefix}_${++nextId}`;

  function recomputeResponded() {
    const ids = new Set();
    for (const d of station.decisions) {
      if (d.scenarioIdx === station.currentIdx) ids.add(d.playerId);
    }
    station.respondedCount = ids.size;
  }

  function notify() {
    recomputeResponded();
    for (const cb of subscribers) cb(station);
  }

  const api = {
    getView() {
      return view;
    },
    getRoomCode() {
      return roomCode;
    },
    getStation() {
      return station;
    },
    joinRoom({ name }) {
      const player = { id: makeId('p'), name, team: null, score: 0 };
      station.players.push(player);
      if (station.status === 'lobby') station.status = 'active';
      notify();
      return Promise.resolve({ playerId: player.id });
    },
    emit(event, payload) {
      if (event === 'decision') {
        const { scenarioIdx, choice, isBest, breach, playerId } = payload;
        const pid = playerId != null ? playerId : (station.players[0] && station.players[0].id);
        const exists = station.decisions.some(
          (d) => d.playerId === pid && d.scenarioIdx === scenarioIdx
        );
        if (!exists) {
          station.decisions.push({ playerId: pid, scenarioIdx, choice, isBest, breach });
        }
      }
      notify();
      return Promise.resolve();
    },
    advance() {
      if (station.currentIdx >= SCENARIOS.length - 1) {
        station.status = 'ended';
      } else {
        station.currentIdx += 1;
      }
      notify();
      return Promise.resolve();
    },
  };

  return api;
}
```

- [ ] **Step 9: Run the tests — expect PASS**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: PASS — `Tests 7 passed (7)` (3 construction + 4 join/emit/responded).

- [ ] **Step 10: Write failing tests for `award` and `setReveal`**

Append another `describe` block to `src/game/mockGameAPI.test.js`. `advance` is already covered above; here we pin `award` (increments `players[0].score` in single-device mock mode) and `setReveal` (toggles `reveal`), plus the end-of-game `status:'ended'` transition using `SCENARIOS.length`.

```js
describe('createMockGameAPI — award, advance-to-end, setReveal', () => {
  it('award increments the first player score', async () => {
    const api = createMockGameAPI({});
    await api.joinRoom({ name: 'One' });
    await api.award(10);
    await api.award(10);
    expect(api.getStation().players[0].score).toBe(20);
  });

  it('advance increments currentIdx up to the last scenario', async () => {
    const api = createMockGameAPI({});
    expect(api.getStation().currentIdx).toBe(0);
    await api.advance();
    expect(api.getStation().currentIdx).toBe(1);
    expect(api.getStation().status).not.toBe('ended');
  });

  it('advance past the last scenario sets status to ended without incrementing past the end', async () => {
    const api = createMockGameAPI({});
    for (let i = 0; i < SCENARIOS.length - 1; i++) {
      await api.advance();
    }
    expect(api.getStation().currentIdx).toBe(SCENARIOS.length - 1);
    expect(api.getStation().status).not.toBe('ended');
    await api.advance(); // one more from the last index
    expect(api.getStation().status).toBe('ended');
    expect(api.getStation().currentIdx).toBe(SCENARIOS.length - 1);
  });

  it('setReveal toggles the reveal flag', async () => {
    const api = createMockGameAPI({});
    expect(api.getStation().reveal).toBe(false);
    await api.setReveal(true);
    expect(api.getStation().reveal).toBe(true);
    await api.setReveal(false);
    expect(api.getStation().reveal).toBe(false);
  });
});
```

- [ ] **Step 11: Run the new tests — expect FAIL (`award`/`setReveal` not implemented)**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: FAIL — the `award` and `setReveal` tests throw `TypeError: api.award is not a function` / `api.setReveal is not a function`; the two `advance` tests already pass. Summary: `Tests 2 failed | 9 passed (11)`.

- [ ] **Step 12: Implement `award` and `setReveal` in `src/game/mockGameAPI.js`**

Add the two methods inside the `api` object, right after `advance()`.

```js
    advance() {
      if (station.currentIdx >= SCENARIOS.length - 1) {
        station.status = 'ended';
      } else {
        station.currentIdx += 1;
      }
      notify();
      return Promise.resolve();
    },
    award(points) {
      const p = station.players[0];
      if (p) p.score += points;
      notify();
      return Promise.resolve();
    },
    setReveal(on) {
      station.reveal = !!on;
      notify();
      return Promise.resolve();
    },
```

- [ ] **Step 13: Run the tests — expect PASS**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: PASS — `Tests 11 passed (11)`.

- [ ] **Step 14: Write failing tests for `subscribe`/unsubscribe**

Append a `describe` block to `src/game/mockGameAPI.test.js`. The callback must fire with the live station on every change, and stop firing after unsubscribe.

```js
describe('createMockGameAPI — subscribe', () => {
  it('subscribe callback fires on change; unsubscribe stops it', async () => {
    const api = createMockGameAPI({});
    const cb = vi.fn();
    const unsub = api.subscribe(cb);
    await api.joinRoom({ name: 'One' });
    expect(cb).toHaveBeenCalledTimes(1);
    const stationArg = cb.mock.calls[0][0];
    expect(stationArg).toBe(api.getStation());
    unsub();
    await api.joinRoom({ name: 'Two' });
    expect(cb).toHaveBeenCalledTimes(1); // no further calls after unsubscribe
  });
});
```

- [ ] **Step 15: Run the new test — expect FAIL (`subscribe` not implemented)**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: FAIL — the new test throws `TypeError: api.subscribe is not a function`; the 11 prior tests pass. Summary: `Tests 1 failed | 11 passed (12)`.

- [ ] **Step 16: Implement `subscribe` in `src/game/mockGameAPI.js`**

Add `subscribe` to the `api` object, after `setReveal()`. It registers the callback and returns an unsubscribe function.

```js
    setReveal(on) {
      station.reveal = !!on;
      notify();
      return Promise.resolve();
    },
    subscribe(cb) {
      subscribers.add(cb);
      return function unsubscribe() {
        subscribers.delete(cb);
      };
    },
```

- [ ] **Step 17: Run the tests — expect PASS**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: PASS — `Tests 12 passed (12)`.

- [ ] **Step 18: Commit the full mock interface (pre-seed)**

```bash
git add src/game/mockGameAPI.js src/game/mockGameAPI.test.js
git commit -m "Implement mock joinRoom/emit/award/advance/setReveal/subscribe

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: one commit at HEAD recording both files.

- [ ] **Step 19: Write failing tests for `seed:true`**

Append a final `describe` block to `src/game/mockGameAPI.test.js`. `seed:true` must yield 30 players across Alpha/Beta/Gamma/Delta and a deterministic decision spread for the current scenario covering all three choices, consumable by `aggregate()`.

```js
describe('createMockGameAPI — seed', () => {
  it('seed:true pre-populates 30 players across Alpha/Beta/Gamma/Delta', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    expect(s.players.length).toBeGreaterThan(0);
    expect(s.players.length).toBe(30);
    const teams = new Set(s.players.map((p) => p.team));
    expect(teams).toEqual(new Set(['Alpha', 'Beta', 'Gamma', 'Delta']));
    expect(s.status).toBe('active');
  });

  it('seed:true produces decisions for the current scenario that are aggregate-able', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    const forCurrent = s.decisions.filter((d) => d.scenarioIdx === s.currentIdx);
    expect(forCurrent.length).toBe(s.players.length);
    const choices = new Set(forCurrent.map((d) => d.choice));
    expect(choices).toEqual(new Set(['automate', 'hitl', 'manual']));
    expect(s.respondedCount).toBe(s.players.length);
  });

  it('seed:true scores players who picked the best choice for the current scenario', () => {
    const api = createMockGameAPI({ seed: true });
    const s = api.getStation();
    const best = SCENARIOS[s.currentIdx].best;
    s.players.forEach((p, i) => {
      const dec = s.decisions.find((d) => d.playerId === p.id && d.scenarioIdx === s.currentIdx);
      expect(p.score).toBe(dec.choice === best ? 10 : 0);
    });
  });

  it('seed is deterministic — two instances produce identical decision choices', () => {
    const a = createMockGameAPI({ seed: true });
    const b = createMockGameAPI({ seed: true });
    const ca = a.getStation().decisions.map((d) => d.choice);
    const cbChoices = b.getStation().decisions.map((d) => d.choice);
    expect(ca).toEqual(cbChoices);
  });
});
```

- [ ] **Step 20: Run the new tests — expect FAIL (seed not implemented)**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: FAIL — `seed:true` is currently ignored, so `s.players.length` is 0: the seed tests fail with errors like `expected 0 to be 30` and `expected +0 to be greater than +0`. The 12 prior tests pass. Summary: `Tests 4 failed | 12 passed (16)`.

- [ ] **Step 21: Implement the deterministic `seed` path in `src/game/mockGameAPI.js`**

Add a `seedStation()` helper and invoke it when `seed` is true, placed just before `return api;`. The spread cycles the three choices by player index (no `Math.random`), so two seeded instances are byte-identical and all three choices appear.

```js
    subscribe(cb) {
      subscribers.add(cb);
      return function unsubscribe() {
        subscribers.delete(cb);
      };
    },
  };

  function seedStation() {
    const teams = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const choiceCycle = ['automate', 'hitl', 'manual'];
    const NAMES = [
      'Aisha', 'Ben', 'Chloe', 'Darren', 'Elena', 'Faisal', 'Grace', 'Hugo',
      'Ivy', 'Jamal', 'Kira', 'Leon', 'Mona', 'Nadia', 'Omar', 'Priya',
      'Quentin', 'Rosa', 'Sami', 'Tara', 'Umar', 'Vera', 'Wei', 'Xena',
      'Yusuf', 'Zoe', 'Amir', 'Bella', 'Cyrus', 'Dana',
    ];
    const scenario = SCENARIOS[station.currentIdx];
    NAMES.forEach((name, i) => {
      const player = {
        id: makeId('p'),
        name,
        team: teams[i % teams.length],
        score: 0,
      };
      station.players.push(player);
      const choice = choiceCycle[i % choiceCycle.length];
      const isBest = choice === scenario.best;
      const breach = !!scenario.choices[choice].breach;
      if (isBest) player.score += 10;
      station.decisions.push({
        playerId: player.id,
        scenarioIdx: station.currentIdx,
        choice,
        isBest,
        breach,
      });
    });
    station.status = 'active';
    recomputeResponded();
  }

  if (seed) seedStation();

  return api;
}
```

Replace the existing tail of the function (from the closing of `subscribe` through `return api;`) with the block above; the rest of the file is unchanged.

- [ ] **Step 22: Run the tests — expect PASS**

```bash
npx vitest run src/game/mockGameAPI.test.js
```

Expected: PASS — `Tests 16 passed (16)`.

- [ ] **Step 23: Commit the seed path**

```bash
git add src/game/mockGameAPI.js src/game/mockGameAPI.test.js
git commit -m "Add deterministic 30-player seed to mock GameAPI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: one commit at HEAD recording both files.

- [ ] **Step 24: Write failing test for the `buildGameAPI` factory**

Create `src/game/GameAPI.test.js`. It verifies: (a) `buildGameAPI` with `supabase: null` returns the mock impl exposing the full interface; (b) it passes `view`/`roomCode` through; (c) the returned mock is functional. It does NOT exercise the supabase branch (Task 7 owns it).

```js
// src/game/GameAPI.test.js
import { describe, it, expect } from 'vitest';
import { buildGameAPI } from './GameAPI.js';

const METHODS = ['getView', 'getRoomCode', 'joinRoom', 'emit', 'award', 'advance', 'setReveal', 'subscribe', 'getStation'];

describe('buildGameAPI', () => {
  it('returns the mock impl exposing the full interface when no supabase client is provided', () => {
    const api = buildGameAPI({ view: 'screen', roomCode: 'WXYZ', supabase: null });
    for (const m of METHODS) {
      expect(typeof api[m]).toBe('function');
    }
    expect(api.getView()).toBe('screen');
    expect(api.getRoomCode()).toBe('WXYZ');
  });

  it('defaults to play/DEMO via the mock when view/roomCode omitted', () => {
    const api = buildGameAPI({ supabase: null });
    expect(api.getView()).toBe('play');
    expect(api.getRoomCode()).toBe('DEMO');
  });

  it('mock impl returned by buildGameAPI is functional (joinRoom adds a player)', async () => {
    const api = buildGameAPI({ supabase: null });
    const { playerId } = await api.joinRoom({ name: 'Z' });
    expect(playerId).toBeTruthy();
    expect(api.getStation().players).toHaveLength(1);
  });
});
```

- [ ] **Step 25: Run the test — expect FAIL (module missing)**

```bash
npx vitest run src/game/GameAPI.test.js
```

Expected: FAIL — `Error: Failed to resolve import "./GameAPI.js" from "src/game/GameAPI.test.js"` (file does not exist), reported as a collection error. 0 tests run.

- [ ] **Step 26: Create the Supabase stub `src/game/supabaseGameAPI.js`**

`GameAPI.js` statically imports `createSupabaseGameAPI`. Task 7 OVERWRITES this file with the real Supabase-backed implementation; for now create a stub that throws if ever called. Task 5 tests never call it (they pass `supabase: null`).

```js
// src/game/supabaseGameAPI.js
/**
 * Placeholder. The real Supabase-backed implementation of the GameAPI
 * interface is delivered in Task 7, which overwrites this file. buildGameAPI
 * only reaches this function when a live supabase client is supplied.
 *
 * @param {{ view: string, roomCode: string, supabase: object }} _opts
 * @returns {never}
 */
export function createSupabaseGameAPI(_opts) {
  throw new Error('supabaseGameAPI not implemented yet');
}
```

- [ ] **Step 27: Create `src/game/GameAPI.js` (interface JSDoc + `buildGameAPI`)**

Document the full `GameAPI` and `Station` interface, then implement the branch: Supabase when a client is present, else the mock.

```js
// src/game/GameAPI.js
import { createMockGameAPI } from './mockGameAPI.js';
import { createSupabaseGameAPI } from './supabaseGameAPI.js';

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {string|null} team
 * @property {number} score
 */

/**
 * @typedef {Object} Decision
 * @property {string} playerId
 * @property {number} scenarioIdx
 * @property {string} choice           // 'automate' | 'hitl' | 'manual'
 * @property {boolean} isBest
 * @property {boolean} breach
 */

/**
 * @typedef {Object} Station
 * @property {string} roomCode
 * @property {number} currentIdx
 * @property {boolean} reveal
 * @property {'lobby'|'active'|'ended'} status
 * @property {Player[]} players
 * @property {Decision[]} decisions
 * @property {number} respondedCount   // DISTINCT players with a decision for currentIdx
 */

/**
 * The single realtime seam. Views and game code NEVER touch Supabase directly;
 * they only call methods on a GameAPI object.
 *
 * @typedef {Object} GameAPI
 * @property {() => 'play'|'screen'|'host'} getView
 * @property {() => string|null} getRoomCode
 * @property {(args: { name: string }) => Promise<{ playerId: string }>} joinRoom
 * @property {(event: string, payload: object) => Promise<void>} emit
 *           emit('decision', { scenarioId, scenarioIdx, choice, isBest, breach })
 * @property {(points: number) => Promise<void>} award
 * @property {() => Promise<void>} advance      // host: currentIdx++ or status->'ended'
 * @property {(on: boolean) => Promise<void>} setReveal  // host: toggle aggregate reveal
 * @property {(cb: (station: Station) => void) => (() => void)} subscribe
 *           subscribe returns an unsubscribe function.
 * @property {() => Station} getStation
 */

/**
 * Factory: returns the Supabase-backed GameAPI when a live supabase client is
 * present, otherwise the in-memory mock.
 *
 * @param {{ view: 'play'|'screen'|'host', roomCode: string|null, supabase: object|null }} args
 * @returns {GameAPI}
 */
export function buildGameAPI({ view, roomCode, supabase }) {
  if (supabase) {
    return createSupabaseGameAPI({ view, roomCode, supabase });
  }
  return createMockGameAPI({ view, roomCode });
}
```

- [ ] **Step 28: Run the `GameAPI.js` test — expect PASS**

```bash
npx vitest run src/game/GameAPI.test.js
```

Expected: PASS — `Tests 3 passed (3)`.

- [ ] **Step 29: Run the full game test suite — expect all green**

```bash
npx vitest run src/game
```

Expected: PASS — `src/game/mockGameAPI.test.js` (16) and `src/game/GameAPI.test.js` (3) both pass; `Test Files 2 passed (2)`, `Tests 19 passed (19)`, 0 failed.

- [ ] **Step 30: Commit the GameAPI factory and Supabase stub**

```bash
git add src/game/GameAPI.js src/game/supabaseGameAPI.js src/game/GameAPI.test.js
git commit -m "Add GameAPI interface JSDoc, buildGameAPI factory, and supabase stub

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: one commit at HEAD recording the three files. `git log --oneline -1` shows the new commit.


---

### Task 6: Active-game components: ScenarioCard, ChoiceButtons, Meters

**Files:**
- Create: `src/components/ScenarioCard.jsx`
- Create: `src/components/ChoiceButtons.jsx`
- Create: `src/components/Meters.jsx`
- Test: `src/components/ScenarioCard.test.jsx`
- Test: `src/components/ChoiceButtons.test.jsx`
- Test: `src/components/Meters.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — exact signatures):
- From `src/theme.js`: `export const COLORS = { bg, navy, blue, blueAccent, screenBg, hostBg, white, ink, slate700, slate500, slate400, border, track, green, amber, red, purple, barAutomate, barHitl, barManual }` and `export const FONT = "'DM Sans', system-ui, sans-serif"`. The exact hex values used in this task: `COLORS.navy = '#0F2554'`, `COLORS.white = '#FFFFFF'`, `COLORS.ink = '#1E293B'`, `COLORS.slate700 = '#374151'`, `COLORS.slate500 = '#64748B'`, `COLORS.slate400 = '#94A3B8'`, `COLORS.border = '#E2E8F0'`, `COLORS.track = '#F1F5F9'`, `COLORS.blue = '#2563EB'`, `COLORS.purple = '#7C3AED'`, `COLORS.green = '#16A34A'`, `COLORS.amber = '#D97706'`, `COLORS.red = '#DC2626'`.
- From `src/content/scenarios.js`: `export const CHOICE_ORDER = ['automate','hitl','manual']`, `export const CHOICE_LABELS = { automate:'Automate Fully', hitl:'Human-in-Loop', manual:'Manual Review' }`, `export const CHOICE_SUBLABELS = { automate:'Fully automated — no human step', hitl:'AI recommends, human reviews and approves', manual:'Officer handles the entire process by hand' }`, `export const CHOICE_ICONS = { automate:'⚡', hitl:'👤', manual:'✋' }`. A `scenario` object has shape `{ id, title, desc, attrs:[3 strings], choices:{ automate:{eff,risk,comp,breach,msg}, hitl:{...}, manual:{...} }, best }`.
- From `src/game/gameLogic.js`: `export function meterColor(type, value)` where `type` is `'eff'|'risk'|'comp'`; for `eff`/`comp` returns `COLORS.green` when `value>=60`, else `COLORS.amber` when `value>=38`, else `COLORS.red`; for `risk` returns `COLORS.green` when `value<=40`, else `COLORS.amber` when `value<=65`, else `COLORS.red`.
- From Task 1/Task 2: a scaffolded Vite + React 18 project with deps installed (incl. `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`), Vitest configured with the `jsdom` environment, and a git repository initialized so `git add`/`git commit` work. Vitest globals are NOT assumed; every test imports `describe`/`it`/`expect`/`vi` from `'vitest'` explicitly.

Produces (later tasks rely on these exact names/props):
- `src/components/ScenarioCard.jsx` default export `ScenarioCard({ scenario, qNum, qTotal, playerName })` — rendered by `PlayerView`.
- `src/components/ChoiceButtons.jsx` default export `ChoiceButtons({ scenario, answered, choice, onPick, variant='Standard' })` — `onPick` is called with one of `'automate'|'hitl'|'manual'`; rendered by `PlayerView`.
- `src/components/Meters.jsx` default export `Meters({ meters })` where `meters = { eff, risk, comp }` (numbers 0..100) — rendered by `PlayerView`.

---

- [ ] **Step 1: Write failing test for ScenarioCard**

  Create `src/components/ScenarioCard.test.jsx` with the full content below. It asserts the `Q{qNum} of {qTotal}` pill text, the `playerName` pill, the title, the description, and all three attr tags render.

  ```jsx
  import { describe, it, expect, afterEach } from 'vitest';
  import { render, screen, cleanup } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import ScenarioCard from './ScenarioCard.jsx';

  afterEach(cleanup);

  const scenario = {
    id: 'loan',
    title: 'Personal Loan Approval',
    desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
    attrs: ['High Risk', 'Regulated', 'Medium Volume'],
    choices: {},
    best: 'hitl',
  };

  describe('ScenarioCard', () => {
    it('renders the Q{qNum} of {qTotal} pill', () => {
      render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
      expect(screen.getByText('Q1 of 6')).toBeInTheDocument();
    });

    it('renders the player name pill', () => {
      render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Asha" />);
      expect(screen.getByText('Asha')).toBeInTheDocument();
    });

    it('renders the title and description', () => {
      render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
      expect(screen.getByText('Personal Loan Approval')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.'
        )
      ).toBeInTheDocument();
    });

    it('renders all attr tags', () => {
      render(<ScenarioCard scenario={scenario} qNum={1} qTotal={6} playerName="Team Lead" />);
      expect(screen.getByText('High Risk')).toBeInTheDocument();
      expect(screen.getByText('Regulated')).toBeInTheDocument();
      expect(screen.getByText('Medium Volume')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the ScenarioCard test — expect FAIL**

  ```
  npx vitest run src/components/ScenarioCard.test.jsx
  ```

  Expected: FAIL — the run exits non-zero and **zero tests pass** because Vitest cannot resolve the not-yet-created component module. The error is a module-resolution failure naming the missing import, e.g.:

  ```
  Error: Failed to resolve import "./ScenarioCard.jsx" from "src/components/ScenarioCard.test.jsx". Does the file exist?
  ```

  (If your Vitest version words this as `Cannot find module './ScenarioCard.jsx'`, that is the same failure.) Do not proceed until you have seen the run FAIL with no passing tests.

- [ ] **Step 3: Implement ScenarioCard**

  Create `src/components/ScenarioCard.jsx` with the full content below. Pixel-faithful to the prototype scenario card (lines 118–130): navy `#0F2554` card, `Q{qNum} of {qTotal}` pill on the left with `rgba(59,130,246,0.28)` background, player-name pill on the right with `rgba(255,255,255,0.07)` background, 20px/700 white title, 13.5px description at `rgba(255,255,255,0.65)`, and attr tags with `rgba(255,255,255,0.1)` background.

  ```jsx
  import { COLORS, FONT } from '../theme.js';

  export default function ScenarioCard({ scenario, qNum, qTotal, playerName }) {
    return (
      <div
        style={{
          background: COLORS.navy,
          borderRadius: '18px',
          padding: '20px',
          marginBottom: '10px',
          boxShadow: '0 4px 20px rgba(15,37,84,0.25)',
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              background: 'rgba(59,130,246,0.28)',
              borderRadius: '6px',
              padding: '4px 10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                letterSpacing: '0.06em',
              }}
            >
              Q{qNum} of {qTotal}
            </span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '20px',
              padding: '4px 12px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {playerName}
            </span>
          </div>
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            marginBottom: '9px',
          }}
        >
          {scenario.title}
        </div>
        <div
          style={{
            fontSize: '13.5px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            marginBottom: '14px',
          }}
        >
          {scenario.desc}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {scenario.attrs.map((tag) => (
            <span
              key={tag}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '5px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Run the ScenarioCard test — expect PASS**

  ```
  npx vitest run src/components/ScenarioCard.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  4 passed (4)`.

- [ ] **Step 5: Write failing test for ChoiceButtons**

  Create `src/components/ChoiceButtons.test.jsx` with the full content below. It asserts the three labels and sublabels render; that clicking a button when `answered={false}` calls `onPick` with the correct key; that when `answered={true}` clicking does NOT call `onPick`; that the selected button border is `COLORS.green` when the choice is `best` and `COLORS.red` when not; and that unselected buttons get `opacity: 0.4`.

  ```jsx
  import { describe, it, expect, vi, afterEach } from 'vitest';
  import { render, screen, cleanup, fireEvent } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import ChoiceButtons from './ChoiceButtons.jsx';
  import { COLORS } from '../theme.js';

  afterEach(cleanup);

  const scenario = {
    id: 'loan',
    title: 'Personal Loan Approval',
    desc: 'desc',
    attrs: ['High Risk', 'Regulated', 'Medium Volume'],
    choices: {
      automate: { eff: 30, risk: 30, comp: -35, breach: true, msg: 'a' },
      hitl: { eff: 15, risk: -10, comp: 20, breach: false, msg: 'h' },
      manual: { eff: -20, risk: -5, comp: 10, breach: false, msg: 'm' },
    },
    best: 'hitl',
  };

  describe('ChoiceButtons', () => {
    it('renders 3 labels and sublabels in order', () => {
      render(
        <ChoiceButtons scenario={scenario} answered={false} choice={null} onPick={() => {}} />
      );
      expect(screen.getByText('Automate Fully')).toBeInTheDocument();
      expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
      expect(screen.getByText('Manual Review')).toBeInTheDocument();
      expect(screen.getByText('Fully automated — no human step')).toBeInTheDocument();
      expect(screen.getByText('AI recommends, human reviews and approves')).toBeInTheDocument();
      expect(screen.getByText('Officer handles the entire process by hand')).toBeInTheDocument();
    });

    it('calls onPick with the choice key when not answered', () => {
      const onPick = vi.fn();
      render(
        <ChoiceButtons scenario={scenario} answered={false} choice={null} onPick={onPick} />
      );
      fireEvent.click(screen.getByTestId('choice-automate'));
      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith('automate');

      fireEvent.click(screen.getByTestId('choice-hitl'));
      expect(onPick).toHaveBeenCalledTimes(2);
      expect(onPick).toHaveBeenLastCalledWith('hitl');

      fireEvent.click(screen.getByTestId('choice-manual'));
      expect(onPick).toHaveBeenCalledTimes(3);
      expect(onPick).toHaveBeenLastCalledWith('manual');
    });

    it('does NOT call onPick once answered', () => {
      const onPick = vi.fn();
      render(
        <ChoiceButtons scenario={scenario} answered={true} choice="hitl" onPick={onPick} />
      );
      fireEvent.click(screen.getByTestId('choice-automate'));
      fireEvent.click(screen.getByTestId('choice-hitl'));
      fireEvent.click(screen.getByTestId('choice-manual'));
      expect(onPick).not.toHaveBeenCalled();
    });

    it('highlights selected best choice with green border and dims others', () => {
      render(
        <ChoiceButtons scenario={scenario} answered={true} choice="hitl" onPick={() => {}} />
      );
      const selected = screen.getByTestId('choice-hitl');
      expect(selected).toHaveStyle({ borderColor: COLORS.green });
      expect(selected).toHaveStyle({ opacity: '1' });

      expect(screen.getByTestId('choice-automate')).toHaveStyle({ opacity: '0.4' });
      expect(screen.getByTestId('choice-manual')).toHaveStyle({ opacity: '0.4' });
    });

    it('highlights selected non-best choice with red border and dims others', () => {
      render(
        <ChoiceButtons scenario={scenario} answered={true} choice="automate" onPick={() => {}} />
      );
      const selected = screen.getByTestId('choice-automate');
      expect(selected).toHaveStyle({ borderColor: COLORS.red });
      expect(selected).toHaveStyle({ opacity: '1' });
      expect(screen.getByTestId('choice-hitl')).toHaveStyle({ opacity: '0.4' });
      expect(screen.getByTestId('choice-manual')).toHaveStyle({ opacity: '0.4' });
    });
  });
  ```

- [ ] **Step 6: Run the ChoiceButtons test — expect FAIL**

  ```
  npx vitest run src/components/ChoiceButtons.test.jsx
  ```

  Expected: FAIL — the run exits non-zero and **zero tests pass** because Vitest cannot resolve the not-yet-created component module. The error is a module-resolution failure naming the missing import, e.g.:

  ```
  Error: Failed to resolve import "./ChoiceButtons.jsx" from "src/components/ChoiceButtons.test.jsx". Does the file exist?
  ```

  (If your Vitest version words this as `Cannot find module './ChoiceButtons.jsx'`, that is the same failure.) Do not proceed until you have seen the run FAIL with no passing tests.

- [ ] **Step 7: Implement ChoiceButtons**

  Create `src/components/ChoiceButtons.jsx` with the full content below. Pixel-faithful to the prototype choice buttons (lines 135–157) and the `btnBg`/`btnBd`/`btnOp`/`iconBg` logic (lines 343–346). Buttons render in `CHOICE_ORDER`. Each `<div>` is the clickable button (the prototype uses divs with `onClick`); we add a `data-testid` of `choice-{key}` and `role="button"` for accessibility. One-answer enforcement: the click handler ignores the click when `answered` is true. `variant='Bold'` tints unselected backgrounds/borders/icon backgrounds per the prototype; `variant='Standard'` (default) uses white background, `COLORS.border` border, and pale icon backgrounds. The `btnBd` hex values `#16A34A` (best) and `#DC2626` (non-best) come from `COLORS.green`/`COLORS.red`; the answered-fill backgrounds `#F0FDF4` (best) and `#FFF1F2` (non-best) are copied verbatim from prototype line 343.

  ```jsx
  import { COLORS, FONT } from '../theme.js';
  import {
    CHOICE_ORDER,
    CHOICE_LABELS,
    CHOICE_SUBLABELS,
    CHOICE_ICONS,
  } from '../content/scenarios.js';

  const STANDARD_ICON_BG = {
    automate: '#EFF6FF',
    hitl: '#EDE9FE',
    manual: '#ECFDF5',
  };
  const BOLD_BG = {
    automate: '#EFF6FF',
    hitl: '#EDE9FE',
    manual: '#ECFDF5',
  };
  const BOLD_BD = {
    automate: '#BFDBFE',
    hitl: '#C4B5FD',
    manual: '#A7F3D0',
  };
  const BOLD_ICON_BG = {
    automate: COLORS.blue,
    hitl: COLORS.purple,
    manual: COLORS.green,
  };

  export default function ChoiceButtons({
    scenario,
    answered,
    choice,
    onPick,
    variant = 'Standard',
  }) {
    const isBold = variant === 'Bold';

    const btnBg = (k) => {
      if (!answered) return isBold ? BOLD_BG[k] : COLORS.white;
      return choice === k ? (k === scenario.best ? '#F0FDF4' : '#FFF1F2') : COLORS.white;
    };
    const btnBd = (k) => {
      if (!answered) return isBold ? BOLD_BD[k] : COLORS.border;
      return choice === k ? (k === scenario.best ? COLORS.green : COLORS.red) : COLORS.border;
    };
    const btnOp = (k) => (answered && choice !== k ? 0.4 : 1);
    const iconBg = (k) => (isBold ? BOLD_ICON_BG[k] : STANDARD_ICON_BG[k]);

    const handleClick = (k) => {
      if (answered) return;
      onPick(k);
    };

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '10px',
          fontFamily: FONT,
        }}
      >
        {CHOICE_ORDER.map((k) => (
          <div
            key={k}
            data-testid={`choice-${k}`}
            role="button"
            onClick={() => handleClick(k)}
            style={{
              background: btnBg(k),
              border: `2px solid ${btnBd(k)}`,
              borderRadius: '14px',
              padding: '15px 16px',
              cursor: answered ? 'default' : 'pointer',
              opacity: btnOp(k),
              transition: 'background 0.2s,border-color 0.2s,opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '11px',
                background: iconBg(k),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '21px',
              }}
            >
              {CHOICE_ICONS[k]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: COLORS.ink,
                  marginBottom: '2px',
                }}
              >
                {CHOICE_LABELS[k]}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: COLORS.slate500,
                  lineHeight: 1.4,
                }}
              >
                {CHOICE_SUBLABELS[k]}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 8: Run the ChoiceButtons test — expect PASS**

  ```
  npx vitest run src/components/ChoiceButtons.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- [ ] **Step 9: Write failing test for Meters**

  Create `src/components/Meters.test.jsx` with the full content below. It asserts the three numeric meter values render, and that each bar's inline `width` equals `value%` and its `background` matches `meterColor(type, value)` from `gameLogic` (eff/comp: `>=60` green, `>=38` amber, else red; risk: `<=40` green, `<=65` amber, else red).

  ```jsx
  import { describe, it, expect, afterEach } from 'vitest';
  import { render, screen, cleanup } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import Meters from './Meters.jsx';
  import { COLORS } from '../theme.js';

  afterEach(cleanup);

  describe('Meters', () => {
    it('renders the three numeric meter values', () => {
      render(<Meters meters={{ eff: 65, risk: 30, comp: 70 }} />);
      expect(screen.getByTestId('meter-value-eff')).toHaveTextContent('65');
      expect(screen.getByTestId('meter-value-risk')).toHaveTextContent('30');
      expect(screen.getByTestId('meter-value-comp')).toHaveTextContent('70');
    });

    it('sets each bar width to value% and color from meterColor (green band)', () => {
      render(<Meters meters={{ eff: 65, risk: 30, comp: 70 }} />);
      // eff 65 -> >=60 green
      const effBar = screen.getByTestId('meter-bar-eff');
      expect(effBar).toHaveStyle({ width: '65%' });
      expect(effBar).toHaveStyle({ background: COLORS.green });
      // risk 30 -> <=40 green
      const riskBar = screen.getByTestId('meter-bar-risk');
      expect(riskBar).toHaveStyle({ width: '30%' });
      expect(riskBar).toHaveStyle({ background: COLORS.green });
      // comp 70 -> >=60 green
      const compBar = screen.getByTestId('meter-bar-comp');
      expect(compBar).toHaveStyle({ width: '70%' });
      expect(compBar).toHaveStyle({ background: COLORS.green });
    });

    it('uses amber/red colors per thresholds', () => {
      render(<Meters meters={{ eff: 40, risk: 80, comp: 20 }} />);
      // eff 40 -> >=38 amber
      expect(screen.getByTestId('meter-bar-eff')).toHaveStyle({ background: COLORS.amber });
      // risk 80 -> >65 red
      expect(screen.getByTestId('meter-bar-risk')).toHaveStyle({ background: COLORS.red });
      // comp 20 -> <38 red
      expect(screen.getByTestId('meter-bar-comp')).toHaveStyle({ background: COLORS.red });
      expect(screen.getByTestId('meter-bar-eff')).toHaveStyle({ width: '40%' });
      expect(screen.getByTestId('meter-bar-risk')).toHaveStyle({ width: '80%' });
      expect(screen.getByTestId('meter-bar-comp')).toHaveStyle({ width: '20%' });
    });
  });
  ```

- [ ] **Step 10: Run the Meters test — expect FAIL**

  ```
  npx vitest run src/components/Meters.test.jsx
  ```

  Expected: FAIL — the run exits non-zero and **zero tests pass** because Vitest cannot resolve the not-yet-created component module. The error is a module-resolution failure naming the missing import, e.g.:

  ```
  Error: Failed to resolve import "./Meters.jsx" from "src/components/Meters.test.jsx". Does the file exist?
  ```

  (If your Vitest version words this as `Cannot find module './Meters.jsx'`, that is the same failure.) Do not proceed until you have seen the run FAIL with no passing tests.

- [ ] **Step 11: Implement Meters**

  Create `src/components/Meters.jsx` with the full content below. Pixel-faithful to the prototype `TEAM METRICS` panel (lines 185–208): white `#fff` card, 11px/700 `#94A3B8` header `TEAM METRICS`, three rows (`⚡ Efficiency`, `⚠️ Risk`, `🛡️ Compliance` — note the active-game Risk row label is `⚠️ Risk`, not `Risk Control`) each with a label, the numeric value colored via `meterColor`, and an 8px-tall track (`#F1F5F9`) holding a bar whose `width` is `value%`, `background` is `meterColor(type, value)`, with the `cubic-bezier(0.34,1.56,0.64,1)` width transition. We attach `data-testid` to the value `<div>` and the bar `<div>` for testing.

  ```jsx
  import { COLORS, FONT } from '../theme.js';
  import { meterColor } from '../game/gameLogic.js';

  const ROWS = [
    { type: 'eff', label: '⚡ Efficiency' },
    { type: 'risk', label: '⚠️ Risk' },
    { type: 'comp', label: '🛡️ Compliance' },
  ];

  export default function Meters({ meters }) {
    return (
      <div
        style={{
          background: COLORS.white,
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: COLORS.slate400,
            letterSpacing: '0.1em',
            marginBottom: '14px',
          }}
        >
          TEAM METRICS
        </div>
        {ROWS.map((row, i) => {
          const value = meters[row.type];
          const color = meterColor(row.type, value);
          return (
            <div
              key={row.type}
              style={{ marginBottom: i < ROWS.length - 1 ? '12px' : 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: COLORS.slate700,
                  }}
                >
                  {row.label}
                </div>
                <div
                  data-testid={`meter-value-${row.type}`}
                  style={{ fontSize: '13px', fontWeight: 700, color }}
                >
                  {value}
                </div>
              </div>
              <div
                style={{
                  height: '8px',
                  background: COLORS.track,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  data-testid={`meter-bar-${row.type}`}
                  style={{
                    height: '100%',
                    width: `${value}%`,
                    background: color,
                    borderRadius: '4px',
                    transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 12: Run the Meters test — expect PASS**

  ```
  npx vitest run src/components/Meters.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- [ ] **Step 13: Run all three component tests together — expect PASS**

  ```
  npx vitest run src/components/ScenarioCard.test.jsx src/components/ChoiceButtons.test.jsx src/components/Meters.test.jsx
  ```

  Expected: PASS — `Test Files  3 passed (3)`, `Tests  12 passed (12)`.

- [ ] **Step 14: Commit**

  ```
  git add src/components/ScenarioCard.jsx src/components/ScenarioCard.test.jsx src/components/ChoiceButtons.jsx src/components/ChoiceButtons.test.jsx src/components/Meters.jsx src/components/Meters.test.jsx
  git commit -m "Add active-game components: ScenarioCard, ChoiceButtons, Meters"
  ```

  Expected: a single commit recording 6 new files. `git status` afterward shows a clean working tree for these paths.
</content>
</invoke>


---

### Task 7: ConsequenceCard & ReportCard

**Files:**
- Create: `src/components/ConsequenceCard.jsx`
- Create: `src/components/ReportCard.jsx`
- Test: `src/components/ConsequenceCard.test.jsx`
- Test: `src/components/ReportCard.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — exact signatures):
- From `src/theme.js`: `export const COLORS = { ... navy:'#0F2554', blue:'#2563EB', ink:'#1E293B', slate700:'#374151', slate500:'#64748B', slate400:'#94A3B8', border:'#E2E8F0', track:'#F1F5F9', green:'#16A34A', amber:'#D97706', red:'#DC2626', ... }` and `export const FONT = "'DM Sans', system-ui, sans-serif"`.
- From `src/content/scenarios.js`: `export const CHOICE_LABELS = { automate:'Automate Fully', hitl:'Human-in-Loop', manual:'Manual Review' }`. A `scenario` object has shape `{ id, title, desc, attrs, choices:{ automate:{eff,risk,comp,breach,msg}, hitl:{...}, manual:{...} }, best }`.
- From `src/game/gameLogic.js`: `export function isBest(choiceKey, scenario)` → boolean (`choiceKey === scenario.best`); `export function reportProfile(meters)` → `{ eff:{pct,color,label}, risk:{safePct,color,label}, comp:{pct,color,label} }` where `risk.safePct === 100 - meters.risk`.

Produces (later tasks — PlayerView in Task 9 — rely on these exact named exports and prop shapes):
- `export default function ConsequenceCard({ scenario, choice })` — `scenario` is a scenario object, `choice` is one of `'automate'|'hitl'|'manual'`. Renders the red `COMPLIANCE BREACH` card when `scenario.choices[choice].breach === true`; otherwise renders the neutral/green consequence card (green when `isBest(choice, scenario)`, neutral otherwise; the `Optimal:` line is rendered only when NOT best).
- `export default function ReportCard({ score, maxScore, playerName, correctCount, totalQ, breachCount, meters, onRestart })` — renders the navy debrief header and the white `TEAM PERFORMANCE PROFILE` (three bars via `reportProfile(meters)`), and a `Play Again` button that calls `onRestart` when clicked.

---

- [ ] **Step 1: Write failing test for ConsequenceCard**

  Create `src/components/ConsequenceCard.test.jsx` with the complete content below. It asserts all three render branches: breach, non-breach best, non-breach non-best. The `loan` fixture mirrors the prototype's loan scenario verbatim (best `'hitl'`; `automate.breach === true`; `manual.breach === false`).

  ```jsx
  import { describe, it, expect } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import ConsequenceCard from './ConsequenceCard';

  // Minimal scenario fixture, values copied verbatim from the prototype 'loan' object.
  const loan = {
    id: 'loan',
    title: 'Personal Loan Approval',
    desc: 'Review & approve 80 retail loan applications per day. Each requires income verification and credit scoring.',
    attrs: ['High Risk', 'Regulated', 'Medium Volume'],
    choices: {
      automate: { eff: 30, risk: 30, comp: -35, breach: true, msg: 'Automated approvals triggered a BOT regulatory audit. Decisions cannot be explained to the regulator — full portfolio review ordered.' },
      hitl: { eff: 15, risk: -10, comp: 20, breach: false, msg: 'AI pre-scores all applications. Officer reviews flagged cases and signs off. Complete audit trail — regulators satisfied.' },
      manual: { eff: -20, risk: -5, comp: 10, breach: false, msg: 'Officers review each case by hand. Backlog reaches 3 days. Customer satisfaction drops significantly.' },
    },
    best: 'hitl',
  };

  describe('ConsequenceCard', () => {
    it('renders the red COMPLIANCE BREACH card with msg and Optimal line when the choice breaches', () => {
      render(<ConsequenceCard scenario={loan} choice="automate" />);
      expect(screen.getByText('COMPLIANCE BREACH')).toBeInTheDocument();
      expect(screen.getByText(loan.choices.automate.msg)).toBeInTheDocument();
      // Optimal line shows the best choice label ('Human-in-Loop' for loan).
      expect(screen.getByText('Optimal:')).toBeInTheDocument();
      expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
    });

    it('renders the neutral/green consequence WITHOUT an Optimal line for a non-breach best choice', () => {
      render(<ConsequenceCard scenario={loan} choice="hitl" />);
      expect(screen.queryByText('COMPLIANCE BREACH')).not.toBeInTheDocument();
      expect(screen.getByText(loan.choices.hitl.msg)).toBeInTheDocument();
      // Best choice => no Optimal line.
      expect(screen.queryByText('Optimal:')).not.toBeInTheDocument();
    });

    it('renders the neutral consequence WITH an Optimal line for a non-breach non-best choice', () => {
      render(<ConsequenceCard scenario={loan} choice="manual" />);
      expect(screen.queryByText('COMPLIANCE BREACH')).not.toBeInTheDocument();
      expect(screen.getByText(loan.choices.manual.msg)).toBeInTheDocument();
      expect(screen.getByText('Optimal:')).toBeInTheDocument();
      // best label for loan is 'Human-in-Loop'
      expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the ConsequenceCard test — expect FAIL**

  ```bash
  npx vitest run src/components/ConsequenceCard.test.jsx
  ```

  Expected: FAIL — the suite errors during collection because the module does not exist yet:
  `Failed to resolve import "./ConsequenceCard" from "src/components/ConsequenceCard.test.jsx"`.

- [ ] **Step 3: Implement ConsequenceCard (minimal, pixel-faithful)**

  Create `src/components/ConsequenceCard.jsx` with the complete content below. Colors and pixel values are copied verbatim from the prototype consequence/breach blocks (lines 162–179): breach card `#FEF2F2` bg / `COLORS.red` (`#DC2626`) border / `#991B1B` msg / `#B91C1C` optimal; non-breach card bg `#F0FDF4` (best) or `#F8FAFC` (not best), border `#86EFAC` (best) or `COLORS.border` (`#E2E8F0`) (not best), msg color `COLORS.ink` (`#1E293B`), optimal label color `COLORS.blue` (`#2563EB`). The breach card uses the `shake` + `pulseRed` keyframes (defined globally in `index.html`).

  ```jsx
  import { COLORS, FONT } from '../theme';
  import { CHOICE_LABELS } from '../content/scenarios';
  import { isBest } from '../game/gameLogic';

  export default function ConsequenceCard({ scenario, choice }) {
    const c = scenario.choices[choice];
    const best = isBest(choice, scenario);
    const bestLabel = CHOICE_LABELS[scenario.best];

    if (c.breach) {
      return (
        <div
          style={{
            background: '#FEF2F2',
            border: '2px solid ' + COLORS.red,
            borderRadius: '14px',
            padding: '17px',
            marginBottom: '8px',
            fontFamily: FONT,
            animation: 'shake 0.5s ease 0.1s, pulseRed 1.5s ease 0.6s 2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.red, letterSpacing: '0.06em' }}>
              COMPLIANCE BREACH
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.6, marginBottom: '10px' }}>
            {c.msg}
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(220,38,38,0.15)',
              paddingTop: '9px',
              fontSize: '12px',
              color: '#B91C1C',
            }}
          >
            <span style={{ fontWeight: 500 }}>Optimal: </span>
            <span style={{ fontWeight: 700 }}>{bestLabel}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          background: best ? '#F0FDF4' : '#F8FAFC',
          border: '2px solid ' + (best ? '#86EFAC' : COLORS.border),
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '8px',
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: '13px', color: COLORS.ink, lineHeight: 1.6 }}>{c.msg}</div>
        {!best && (
          <div
            style={{
              borderTop: '1px solid ' + COLORS.border,
              paddingTop: '9px',
              marginTop: '10px',
              fontSize: '12px',
              color: COLORS.slate500,
            }}
          >
            <span style={{ fontWeight: 500 }}>Optimal: </span>
            <span style={{ fontWeight: 700, color: COLORS.blue }}>{bestLabel}</span>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 4: Run the ConsequenceCard test — expect PASS**

  ```bash
  npx vitest run src/components/ConsequenceCard.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)` and `Tests  3 passed (3)`.

- [ ] **Step 5: Write failing test for ReportCard**

  Create `src/components/ReportCard.test.jsx` with the complete content below. It asserts score/maxScore, name, the `{correctCount} of {totalQ}` line, conditional breach pill with plural suffix (`es` when `breachCount !== 1`), the three profile bars (asserting the Risk Control bar width equals `(100 - risk)%`), and that `Play Again` calls `onRestart`.

  ```jsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import ReportCard from './ReportCard';

  describe('ReportCard', () => {
    const baseProps = {
      score: 30,
      maxScore: 60,
      playerName: 'Asha',
      correctCount: 3,
      totalQ: 6,
      breachCount: 0,
      meters: { eff: 70, risk: 30, comp: 80 },
      onRestart: () => {},
    };

    it('renders score, maxScore, player name, and the optimal-decisions line', () => {
      render(<ReportCard {...baseProps} />);
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('/ 60 pts')).toBeInTheDocument();
      expect(screen.getByText('Asha')).toBeInTheDocument();
      expect(screen.getByText('3 of 6 optimal decisions')).toBeInTheDocument();
    });

    it('does NOT render the breach pill when breachCount is 0', () => {
      render(<ReportCard {...baseProps} breachCount={0} />);
      expect(screen.queryByText(/compliance breach/)).not.toBeInTheDocument();
    });

    it('renders the breach pill with singular wording when breachCount is 1', () => {
      render(<ReportCard {...baseProps} breachCount={1} />);
      expect(screen.getByText('🚨 1 compliance breach triggered')).toBeInTheDocument();
    });

    it('renders the breach pill with plural suffix "es" when breachCount is not 1', () => {
      render(<ReportCard {...baseProps} breachCount={2} />);
      expect(screen.getByText('🚨 2 compliance breaches triggered')).toBeInTheDocument();
    });

    it('renders the three profile bars and sets the Risk Control bar width to (100 - risk)%', () => {
      render(<ReportCard {...baseProps} meters={{ eff: 70, risk: 30, comp: 80 }} />);
      // Efficiency bar -> eff pct (70%)
      const effBar = screen.getByTestId('report-bar-eff');
      expect(effBar).toHaveStyle({ width: '70%' });
      // Risk Control bar -> safePct = 100 - risk = 70%
      const riskBar = screen.getByTestId('report-bar-risk');
      expect(riskBar).toHaveStyle({ width: '70%' });
      // Compliance bar -> comp pct (80%)
      const compBar = screen.getByTestId('report-bar-comp');
      expect(compBar).toHaveStyle({ width: '80%' });
    });

    it('calls onRestart when Play Again is clicked', () => {
      const onRestart = vi.fn();
      render(<ReportCard {...baseProps} onRestart={onRestart} />);
      fireEvent.click(screen.getByText('↺  Play Again'));
      expect(onRestart).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 6: Run the ReportCard test — expect FAIL**

  ```bash
  npx vitest run src/components/ReportCard.test.jsx
  ```

  Expected: FAIL — collection error because the module does not exist yet:
  `Failed to resolve import "./ReportCard" from "src/components/ReportCard.test.jsx"`.

- [ ] **Step 7: Implement ReportCard (minimal, pixel-faithful)**

  Create `src/components/ReportCard.jsx` with the complete content below. Navy header `COLORS.navy` (`#0F2554`), score font 62px/800/`-2px`, breach pill copy `🚨 {breachCount} compliance breach{suffix} triggered` where `suffix = breachCount !== 1 ? 'es' : ''` (prototype line 79). The white `TEAM PERFORMANCE PROFILE` panel renders the three bars from `reportProfile(meters)`: Efficiency uses `profile.eff.pct`, Risk Control uses `profile.risk.safePct` (= `100 - risk`), Compliance uses `profile.comp.pct`; each bar's track is `COLORS.track` (`#F1F5F9`) and its fill width is the pct with a `width 1.1s cubic-bezier(0.34,1.56,0.64,1)` transition (prototype lines 89/96/103). The three fill `<div>`s carry `data-testid` `report-bar-eff` / `report-bar-risk` / `report-bar-comp`. The `Play Again` button is `COLORS.blue` (`#2563EB`) and calls `onRestart` (prototype line 106).

  ```jsx
  import { COLORS, FONT } from '../theme';
  import { reportProfile } from '../game/gameLogic';

  export default function ReportCard({
    score,
    maxScore,
    playerName,
    correctCount,
    totalQ,
    breachCount,
    meters,
    onRestart,
  }) {
    const profile = reportProfile(meters);
    const breachSuffix = breachCount !== 1 ? 'es' : '';

    const barTrack = {
      height: '9px',
      background: COLORS.track,
      borderRadius: '5px',
      overflow: 'hidden',
    };
    const barFill = (pct, color) => ({
      height: '100%',
      width: pct + '%',
      background: color,
      borderRadius: '5px',
      transition: 'width 1.1s cubic-bezier(0.34,1.56,0.64,1)',
    });
    const rowHead = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '7px',
    };
    const rowLabel = { fontSize: '13px', fontWeight: 500, color: COLORS.slate700 };
    const rowValue = (color) => ({ fontSize: '13px', fontWeight: 700, color });

    return (
      <div style={{ animation: 'slideInUp 0.45s ease', fontFamily: FONT }}>
        <div
          style={{
            background: COLORS.navy,
            borderRadius: '20px',
            padding: '28px 24px',
            marginBottom: '10px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.13em',
              marginBottom: '12px',
            }}
          >
            MISSION DEBRIEF
          </div>
          <div style={{ fontSize: '62px', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
            {score}
          </div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
            / {maxScore} pts
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
            {playerName}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>
            {correctCount} of {totalQ} optimal decisions
          </div>
          {breachCount > 0 && (
            <div
              style={{
                background: 'rgba(220,38,38,0.2)',
                border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: '8px',
                padding: '9px 16px',
                marginTop: '14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#FCA5A5',
              }}
            >
              🚨 {breachCount} compliance breach{breachSuffix} triggered
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '22px',
            marginBottom: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: COLORS.slate400,
              letterSpacing: '0.1em',
              marginBottom: '18px',
            }}
          >
            TEAM PERFORMANCE PROFILE
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={rowHead}>
              <div style={rowLabel}>⚡ Efficiency</div>
              <div style={rowValue(profile.eff.color)}>{profile.eff.label}</div>
            </div>
            <div style={barTrack}>
              <div data-testid="report-bar-eff" style={barFill(profile.eff.pct, profile.eff.color)} />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={rowHead}>
              <div style={rowLabel}>⚠️ Risk Control</div>
              <div style={rowValue(profile.risk.color)}>{profile.risk.label}</div>
            </div>
            <div style={barTrack}>
              <div data-testid="report-bar-risk" style={barFill(profile.risk.safePct, profile.risk.color)} />
            </div>
          </div>

          <div>
            <div style={rowHead}>
              <div style={rowLabel}>🛡️ Compliance</div>
              <div style={rowValue(profile.comp.color)}>{profile.comp.label}</div>
            </div>
            <div style={barTrack}>
              <div data-testid="report-bar-comp" style={barFill(profile.comp.pct, profile.comp.color)} />
            </div>
          </div>
        </div>

        <button
          onClick={onRestart}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '16px',
            fontWeight: 700,
            background: COLORS.blue,
            color: '#fff',
            letterSpacing: '0.02em',
          }}
        >
          ↺  Play Again
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 8: Run the ReportCard test — expect PASS**

  ```bash
  npx vitest run src/components/ReportCard.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)` and `Tests  6 passed (6)`.

- [ ] **Step 9: Run both new component test files together — expect PASS**

  ```bash
  npx vitest run src/components/ConsequenceCard.test.jsx src/components/ReportCard.test.jsx
  ```

  Expected: PASS — `Test Files  2 passed (2)` and `Tests  9 passed (9)`.

- [ ] **Step 10: Commit**

  ```bash
  git add src/components/ConsequenceCard.jsx src/components/ConsequenceCard.test.jsx src/components/ReportCard.jsx src/components/ReportCard.test.jsx
  git commit -m "Add ConsequenceCard and ReportCard components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected: a single commit containing the four files; `git status` reports a clean working tree for these paths.
</content>
</invoke>


---

### Task 8: PlayerView (intro/join -> play -> report)

**Files:**
- Create: `src/views/PlayerView.jsx`
- Test: `src/views/PlayerView.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — use these exact signatures, do NOT redefine):
- `src/content/scenarios.js` → `export const SCENARIOS` (array of 6 objects; ids in order: `loan, faq, aml, statement, kyc, complaint`). Each: `{ id, title, desc, attrs:[3 strings], choices:{ automate:{eff,risk,comp,breach,msg}, hitl:{...}, manual:{...} }, best }`. Relevant facts for tests: `SCENARIOS[0].id === 'loan'`, `SCENARIOS[0].best === 'hitl'`, `SCENARIOS.length === 6`.
- `src/game/gameLogic.js` → `export const START_METERS = { eff:50, risk:50, comp:50 }`; `export const POINTS_PER_BEST = 10`; `export function applyChoice(meters, deltas)` (returns new clamped `{eff,risk,comp}`, never mutates); `export function isBest(choiceKey, scenario)` (boolean); `export function scoreDelta(choiceKey, scenario)` (`POINTS_PER_BEST` if best else `0`).
- `src/game/mockGameAPI.js` → `export function createMockGameAPI({ view='play', roomCode='DEMO', seed=false })` returning a `GameAPI` object: `{ getView(), getRoomCode(), joinRoom({name})->Promise<{playerId}>, emit(event,payload)->Promise<void>, award(points)->Promise<void>, advance()->Promise<void>, setReveal(on)->Promise<void>, subscribe(cb)->unsubscribe, getStation() }`. `getStation()` returns `Station = { roomCode, currentIdx, reveal, status, players, decisions, respondedCount }`. `subscribe(cb)` invokes `cb(station)` on any change and returns an unsubscribe function. `advance()` increments `currentIdx` (or sets `status` to `'ended'` past the last scenario) and notifies subscribers synchronously.
- `src/hooks/useStation.js` → `export function useStation(gameAPI)` — subscribes on mount, returns the latest `Station`, unsubscribes on unmount.
- `src/components/ScenarioCard.jsx` → `export default function ScenarioCard({ scenario, qNum, qTotal, playerName })`.
- `src/components/ChoiceButtons.jsx` → `export default function ChoiceButtons({ scenario, answered, choice, onPick, variant='Standard' })`. `onPick(choiceKey)` is called with the choice key string. Selected/answered styling is internal to the component.
- `src/components/Meters.jsx` → `export default function Meters({ meters })` (meters `{eff,risk,comp}`).
- `src/components/ConsequenceCard.jsx` → `export default function ConsequenceCard({ scenario, choice })` (`choice` is the chosen key string).
- `src/components/ReportCard.jsx` → `export default function ReportCard({ score, maxScore, playerName, correctCount, totalQ, breachCount, meters, onRestart })`. Renders the navy debrief header text `MISSION DEBRIEF` and the line `{correctCount} of {totalQ} optimal decisions` verbatim from the prototype (lines 73 and 77).
- `src/theme.js` → `export const COLORS` (token map) and `export const FONT`.

Produces (relied on by Task: App / wiring):
- `src/views/PlayerView.jsx` default export: `export default function PlayerView({ gameAPI })`. Renders, in order of lifecycle: an intro/join screen (hero + a 3-stat panel `6 SCENARIOS / 3 CHOICES / 4 BREACH RISKS` + name input + a Start button labelled `Start Simulation →`), the active game (progress bar + ScenarioCard + ChoiceButtons + ConsequenceCard-after-pick + a `Next Scenario →` button + Meters), then ReportCard once finished. Drives `gameAPI.joinRoom`, `gameAPI.emit('decision', …)`, `gameAPI.award(…)` on pick, and `gameAPI.advance()` from the Next button; follows `station.currentIdx`/`station.status`.

---

- [ ] **Step 1: Write the failing test for the intro screen + name/Start flow**

  Create `src/views/PlayerView.test.jsx` with the FIRST block of assertions (we will append more in Step 4). This asserts: intro shows the Start button and the BREACH RISKS stat; the active game is not shown yet; typing a name + clicking Start begins scenario 1 (the `loan` scenario title appears and the entered name pill shows).

  Write the COMPLETE file:

  ```jsx
  // src/views/PlayerView.test.jsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import PlayerView from './PlayerView.jsx';
  import { createMockGameAPI } from '../game/mockGameAPI.js';
  import { SCENARIOS } from '../content/scenarios.js';

  function makeApi() {
    return createMockGameAPI({ view: 'play', roomCode: 'DEMO', seed: false });
  }

  async function startGameAs(name) {
    const api = makeApi();
    render(<PlayerView gameAPI={api} />);
    const input = screen.getByPlaceholderText('Enter your name…');
    fireEvent.change(input, { target: { value: name } });
    fireEvent.click(screen.getByText('Start Simulation →'));
    await screen.findByText(SCENARIOS[0].title);
    return api;
  }

  describe('PlayerView — intro / join', () => {
    it('shows the intro Start button and stats, and no scenario before starting', () => {
      const api = makeApi();
      render(<PlayerView gameAPI={api} />);
      expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
      expect(screen.getByText('BREACH RISKS')).toBeInTheDocument();
      expect(screen.queryByText(SCENARIOS[0].title)).not.toBeInTheDocument();
    });

    it('starts scenario 1 (loan) after entering a name and clicking Start', async () => {
      await startGameAs('Dana');
      expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
      expect(screen.getByText('Dana')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the test — expect FAIL (module not found)**

  ```
  npx vitest run src/views/PlayerView.test.jsx
  ```

  Expected: FAIL — `Failed to resolve import "./PlayerView.jsx" from "src/views/PlayerView.test.jsx"` (the file does not exist yet). `Test Files  1 failed (1)`, no tests pass.

- [ ] **Step 3: Implement `PlayerView.jsx` (minimal, full code)**

  Create `src/views/PlayerView.jsx` with the COMPLETE implementation. It owns local `phase` (`'intro' | 'play'`), `name`, local accumulated `meters`, `score`, per-scenario `answered`/`choice`, and `history`. It reads `station.currentIdx`/`station.status` via `useStation` to follow the host, and resets per-scenario answered state when `currentIdx` changes. On pick it computes `isBest`/`scoreDelta`/`breach`, applies meter deltas locally via `applyChoice`, and calls `gameAPI.emit('decision', …)` + `gameAPI.award(scoreDelta)`. One answer per scenario is enforced (further picks are ignored once `answered`). `MAX_SCORE` is derived from `POINTS_PER_BEST` (no magic numbers).

  ```jsx
  // src/views/PlayerView.jsx
  import { useEffect, useRef, useState } from 'react';
  import { COLORS, FONT } from '../theme.js';
  import { SCENARIOS } from '../content/scenarios.js';
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
  import Meters from '../components/Meters.jsx';
  import ConsequenceCard from '../components/ConsequenceCard.jsx';
  import ReportCard from '../components/ReportCard.jsx';

  const MAX_SCORE = SCENARIOS.length * POINTS_PER_BEST;

  export default function PlayerView({ gameAPI }) {
    const station = useStation(gameAPI);
    const currentIdx = station ? station.currentIdx : 0;
    const status = station ? station.status : 'lobby';

    const [phase, setPhase] = useState('intro');
    const [name, setName] = useState('');
    const [meters, setMeters] = useState(START_METERS);
    const [score, setScore] = useState(0);
    const [history, setHistory] = useState([]);
    const [answered, setAnswered] = useState(false);
    const [choice, setChoice] = useState(null);

    // Reset per-scenario answer state whenever the host (or self-advance) moves on.
    const prevIdxRef = useRef(currentIdx);
    useEffect(() => {
      if (prevIdxRef.current !== currentIdx) {
        prevIdxRef.current = currentIdx;
        setAnswered(false);
        setChoice(null);
      }
    }, [currentIdx]);

    const idx = currentIdx;
    const scenario = SCENARIOS[idx];
    const ended = status === 'ended' || idx >= SCENARIOS.length;
    const playerName = name.trim() || 'Team Lead';
    const correctCount = history.filter((h) => h.isBest).length;
    const breachCount = history.filter((h) => h.breach).length;

    async function start() {
      await gameAPI.joinRoom({ name: playerName });
      setPhase('play');
    }

    function restart() {
      setPhase('intro');
      setName('');
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

    function next() {
      gameAPI.advance();
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
            <button
              onClick={start}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 700,
                background: COLORS.navy,
                color: COLORS.white,
                letterSpacing: '0.02em',
                boxShadow: '0 4px 14px rgba(15,37,84,0.25)',
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
            playerName={playerName}
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

          <Meters meters={meters} />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Append the remaining assertions to the test (pick best, ignore re-pick, full playthrough -> ReportCard)**

  Append this `describe` block to the end of `src/views/PlayerView.test.jsx` (after the existing `describe('PlayerView — intro / join', …)` block). It uses spies on the mock API to assert `award(10)` and the `emit('decision', …)` payload for the best `loan` choice (`hitl`), asserts that picking again is ignored, and asserts a full playthrough lands on the ReportCard with the correct count. The choice labels (`Automate Fully` / `Human-in-Loop` / `Manual Review`) match `CHOICE_LABELS` and the prototype copy verbatim.

  ```jsx

  describe('PlayerView — play / pick', () => {
    it('best choice on loan awards 10 and emits the decision payload, then shows consequence', async () => {
      const api = makeApi();
      const awardSpy = vi.spyOn(api, 'award');
      const emitSpy = vi.spyOn(api, 'emit');

      render(<PlayerView gameAPI={api} />);
      fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
        target: { value: 'Dana' },
      });
      fireEvent.click(screen.getByText('Start Simulation →'));
      await screen.findByText(SCENARIOS[0].title);

      // SCENARIOS[0].best === 'hitl' -> click the Human-in-Loop choice.
      fireEvent.click(screen.getByText('Human-in-Loop'));

      expect(awardSpy).toHaveBeenCalledTimes(1);
      expect(awardSpy).toHaveBeenCalledWith(10);
      expect(emitSpy).toHaveBeenCalledWith('decision', {
        scenarioId: 'loan',
        scenarioIdx: 0,
        choice: 'hitl',
        isBest: true,
        breach: false,
      });

      // Consequence shown -> Next button appears.
      expect(screen.getByText('Next Scenario →')).toBeInTheDocument();
    });

    it('ignores a second pick after the scenario is answered', async () => {
      const api = makeApi();
      const awardSpy = vi.spyOn(api, 'award');
      const emitSpy = vi.spyOn(api, 'emit');

      render(<PlayerView gameAPI={api} />);
      fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
        target: { value: 'Dana' },
      });
      fireEvent.click(screen.getByText('Start Simulation →'));
      await screen.findByText(SCENARIOS[0].title);

      fireEvent.click(screen.getByText('Human-in-Loop'));
      // A second click on any choice must be ignored.
      fireEvent.click(screen.getByText('Automate Fully'));

      expect(awardSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('advancing through all scenarios reaches the ReportCard with the correct count', async () => {
      const api = makeApi();
      render(<PlayerView gameAPI={api} />);
      fireEvent.change(screen.getByPlaceholderText('Enter your name…'), {
        target: { value: 'Dana' },
      });
      fireEvent.click(screen.getByText('Start Simulation →'));

      // Answer every scenario with its best choice, then advance.
      for (let i = 0; i < SCENARIOS.length; i++) {
        await screen.findByText(SCENARIOS[i].title);
        const best = SCENARIOS[i].best; // 'automate' | 'hitl' | 'manual'
        const label =
          best === 'automate'
            ? 'Automate Fully'
            : best === 'hitl'
            ? 'Human-in-Loop'
            : 'Manual Review';
        fireEvent.click(screen.getByText(label));
        fireEvent.click(screen.getByText('Next Scenario →'));
      }

      // ReportCard debrief header + perfect optimal count (every best choice picked).
      await screen.findByText('MISSION DEBRIEF');
      expect(
        screen.getByText(
          `${SCENARIOS.length} of ${SCENARIOS.length} optimal decisions`,
        ),
      ).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 5: Run the full test file — expect PASS**

  ```
  npx vitest run src/views/PlayerView.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- [ ] **Step 6: Commit**

  ```
  git add src/views/PlayerView.jsx src/views/PlayerView.test.jsx
  git commit -m "Add PlayerView: intro/join, play loop, and end-of-game ReportCard

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```


---

### Task 9: Screen components + ScreenView

**Files:**
- Create: `src/components/SegmentedBars.jsx`
- Create: `src/components/SegmentedBars.test.jsx`
- Create: `src/components/Scoreboard.jsx`
- Create: `src/components/Scoreboard.test.jsx`
- Create: `src/views/ScreenView.jsx`
- Create: `src/views/ScreenView.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — exact signatures):
- `src/theme.js` → `export const COLORS` (uses `COLORS.screenBg='#08121E'`, `COLORS.barAutomate='#3B82F6'`, `COLORS.barHitl='#8B5CF6'`, `COLORS.barManual='#475569'`), `export const FONT`.
- `src/content/scenarios.js` → `export const SCENARIOS` (6 objects, each `{ id, title, desc, attrs:[3 strings], choices, best }`), `export const CHOICE_LABELS = { automate:'Automate Fully', hitl:'Human-in-Loop', manual:'Manual Review' }`.
- `src/game/gameLogic.js`:
  - `aggregate(decisions)` → `{ counts:{automate,hitl,manual}, total, bars:[{key,label,pct,pctStr,color}] }` in `CHOICE_ORDER`. `pct = round(count/total*100)` (0 when total 0). `pctStr = pct + '%'`. Colors from `COLORS.barAutomate/barHitl/barManual`. Labels from `CHOICE_LABELS`.
  - `isRoomSplit(agg)` → boolean: true when the top two bar pcts are within 15 points and `total>0`.
  - `buildScoreboard(players)` → `players:[{name,team,score}]`. Group by team, sum score per team → `[{name:team, score}]` sorted desc by score. If players have no team, fall back to per-player rows `{name, score}` sorted desc. Returns at most 6 rows.
- `src/hooks/useStation.js` → `export function useStation(gameAPI)` subscribes on mount, returns latest `Station`, unsubscribes on unmount.
- `src/game/mockGameAPI.js` → `export function createMockGameAPI({ view='play', roomCode='DEMO', seed=false })`. `Station = { roomCode, currentIdx, reveal, status, players:[{id,name,team,score}], decisions:[{playerId,scenarioIdx,choice,isBest,breach}], respondedCount }`. `respondedCount` = count of DISTINCT players who have a decision for the current `currentIdx`. With `seed:true` it pre-populates ~30 players (teams Alpha/Beta/Gamma/Delta) and a deterministic decision spread for the current scenario.

Produces (later tasks / `App` rely on these exact names):
- `SegmentedBars({ bars, respondents })` — default export React component. `bars` is `aggregate(...).bars`; `respondents` is a number. Renders one row per bar with `data-testid="seg-row"` and the row's `pctStr` text, plus a `data-testid="seg-fill"` fill whose CSS width equals `pctStr`.
- `Scoreboard({ teams })` — default export React component. `teams` is `buildScoreboard(...)`. Renders one row per team with `data-testid="score-row"`.
- `ScreenView({ gameAPI })` — default export React component. Projector view. Uses `useStation(gameAPI)`, computes `aggregate()` over decisions filtered to `station.currentIdx`, renders the current scenario, `SegmentedBars` (with `station.respondedCount`), `Scoreboard` from `buildScoreboard(station.players)`, and a DISCUSSION POINT card highlighted via `isRoomSplit(agg)`.

---

- [ ] **Step 1: Write failing test for SegmentedBars**

Create `src/components/SegmentedBars.test.jsx`:

```jsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import SegmentedBars from './SegmentedBars.jsx';
import { aggregate } from '../game/gameLogic.js';

afterEach(cleanup);

describe('SegmentedBars', () => {
  it('renders three rows from aggregate bars with correct pctStr text', () => {
    const decisions = [
      { choice: 'automate' },
      { choice: 'automate' },
      { choice: 'hitl' },
      { choice: 'manual' },
    ];
    const agg = aggregate(decisions);
    render(<SegmentedBars bars={agg.bars} respondents={4} />);

    const rows = screen.getAllByTestId('seg-row');
    expect(rows).toHaveLength(3);

    // automate 2/4=50%, hitl 1/4=25%, manual 1/4=25%
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(2);
    expect(screen.getByText('Automate Fully')).toBeInTheDocument();
    expect(screen.getByText('Human-in-Loop')).toBeInTheDocument();
    expect(screen.getByText('Manual Review')).toBeInTheDocument();
  });

  it('renders the respondents count in the header', () => {
    const agg = aggregate([{ choice: 'hitl' }]);
    render(<SegmentedBars bars={agg.bars} respondents={1} />);
    expect(screen.getByText('ROOM RESPONSE — 1 PLAYERS')).toBeInTheDocument();
  });

  it('sets each fill bar width to its pctStr', () => {
    const agg = aggregate([{ choice: 'automate' }, { choice: 'hitl' }]);
    render(<SegmentedBars bars={agg.bars} respondents={2} />);
    const fills = screen.getAllByTestId('seg-fill');
    expect(fills).toHaveLength(3);
    // automate 1/2=50%, hitl 1/2=50%, manual 0%
    expect(fills[0]).toHaveStyle({ width: '50%' });
    expect(fills[1]).toHaveStyle({ width: '50%' });
    expect(fills[2]).toHaveStyle({ width: '0%' });
  });
});
```

- [ ] **Step 2: Run the SegmentedBars test — expect FAIL**

Run:

```bash
npx vitest run src/components/SegmentedBars.test.jsx
```

Expected: FAIL — `Failed to resolve import "./SegmentedBars.jsx"` (the component file does not exist yet).

- [ ] **Step 3: Implement SegmentedBars**

Create `src/components/SegmentedBars.jsx`. Pixel-faithful to prototype SCREEN VIEW lines 227-238 (header `#334155`, label `#CBD5E1`, pct `#fff`, track `rgba(255,255,255,0.06)`, 16px bar height, 8px radius, cubic-bezier width transition):

```jsx
import { FONT } from '../theme.js';

export default function SegmentedBars({ bars, respondents }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
          letterSpacing: '0.15em',
          marginBottom: 22,
        }}
      >
        ROOM RESPONSE — {respondents} PLAYERS
      </div>
      {bars.map((bar) => (
        <div key={bar.key} data-testid="seg-row" style={{ marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                color: '#CBD5E1',
              }}
            >
              {bar.label}
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 16,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {bar.pctStr}
            </span>
          </div>
          <div
            style={{
              height: 16,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              data-testid="seg-fill"
              style={{
                height: '100%',
                width: bar.pctStr,
                background: bar.color,
                borderRadius: 8,
                transition: 'width 1.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the SegmentedBars test — expect PASS**

Run:

```bash
npx vitest run src/components/SegmentedBars.test.jsx
```

Expected: PASS — `Test Files  1 passed (1)` / `Tests  3 passed (3)`.

- [ ] **Step 5: Commit SegmentedBars**

Run:

```bash
git add src/components/SegmentedBars.jsx src/components/SegmentedBars.test.jsx
git commit -m "Add SegmentedBars screen component"
```

- [ ] **Step 6: Write failing test for Scoreboard**

Create `src/components/Scoreboard.test.jsx`:

```jsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Scoreboard from './Scoreboard.jsx';
import { buildScoreboard } from '../game/gameLogic.js';

afterEach(cleanup);

describe('Scoreboard', () => {
  it('renders team rows sorted by score descending', () => {
    const players = [
      { name: 'A1', team: 'Alpha', score: 10 },
      { name: 'A2', team: 'Alpha', score: 20 },
      { name: 'B1', team: 'Beta', score: 5 },
      { name: 'G1', team: 'Gamma', score: 40 },
    ];
    const teams = buildScoreboard(players);
    render(<Scoreboard teams={teams} />);

    const rows = screen.getAllByTestId('score-row');
    // Gamma 40, Alpha 30, Beta 5
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Gamma')).toBeInTheDocument();
    expect(within(rows[0]).getByText('40')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alpha')).toBeInTheDocument();
    expect(within(rows[1]).getByText('30')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Beta')).toBeInTheDocument();
    expect(within(rows[2]).getByText('5')).toBeInTheDocument();
  });

  it('renders the SCOREBOARD header', () => {
    render(<Scoreboard teams={buildScoreboard([])} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the Scoreboard test — expect FAIL**

Run:

```bash
npx vitest run src/components/Scoreboard.test.jsx
```

Expected: FAIL — `Failed to resolve import "./Scoreboard.jsx"` (the component file does not exist yet).

- [ ] **Step 8: Implement Scoreboard**

Create `src/components/Scoreboard.jsx`. Pixel-faithful to prototype SCREEN VIEW lines 245-251 (header `#334155`, row bg `rgba(255,255,255,0.05)`, border `rgba(255,255,255,0.04)`, name `#94A3B8`, score `#fff`):

```jsx
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
```

- [ ] **Step 9: Run the Scoreboard test — expect PASS**

Run:

```bash
npx vitest run src/components/Scoreboard.test.jsx
```

Expected: PASS — `Test Files  1 passed (1)` / `Tests  2 passed (2)`.

- [ ] **Step 10: Commit Scoreboard**

Run:

```bash
git add src/components/Scoreboard.jsx src/components/Scoreboard.test.jsx
git commit -m "Add Scoreboard screen component"
```

- [ ] **Step 11: Write failing test for ScreenView**

Create `src/views/ScreenView.test.jsx`. Uses a real seeded mock (`seed:true`, `view:'screen'`) so the station already has the current scenario's title and a non-zero response spread:

```jsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenView from './ScreenView.jsx';
import { createMockGameAPI } from '../game/mockGameAPI.js';
import { SCENARIOS } from '../content/scenarios.js';

afterEach(cleanup);

describe('ScreenView', () => {
  it('shows the current scenario title from the seeded station', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    const expectedTitle = SCENARIOS[station.currentIdx].title;
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
  });

  it('renders three response bars with at least one non-zero percentage', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);

    const rows = screen.getAllByTestId('seg-row');
    expect(rows).toHaveLength(3);

    const fills = screen.getAllByTestId('seg-fill');
    const widths = fills.map((f) => f.style.width);
    // seeded spread must produce at least one bar wider than 0%
    const hasNonZero = widths.some((w) => w !== '0%' && w !== '' && w !== '0');
    expect(hasNonZero).toBe(true);
  });

  it('renders the scoreboard with at least one team row', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    render(<ScreenView gameAPI={gameAPI} />);
    expect(screen.getByText('SCOREBOARD')).toBeInTheDocument();
    expect(screen.getAllByTestId('score-row').length).toBeGreaterThan(0);
  });

  it('shows the CURRENT SCENARIO header with the question number', () => {
    const gameAPI = createMockGameAPI({ view: 'screen', roomCode: 'DEMO', seed: true });
    const station = gameAPI.getStation();
    render(<ScreenView gameAPI={gameAPI} />);
    const qNum = station.currentIdx + 1;
    expect(
      screen.getByText(`CURRENT SCENARIO · Q${qNum} / ${SCENARIOS.length}`)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 12: Run the ScreenView test — expect FAIL**

Run:

```bash
npx vitest run src/views/ScreenView.test.jsx
```

Expected: FAIL — `Failed to resolve import "./ScreenView.jsx"` (the view file does not exist yet).

- [ ] **Step 13: Implement ScreenView**

Create `src/views/ScreenView.jsx`. Pixel-faithful to prototype SCREEN VIEW lines 217-253: dark `#08121E` background (`COLORS.screenBg`), two-column flex layout (left content `flex:1` padding `44px 48px` with right border `1px solid rgba(255,255,255,0.05)`, right scoreboard `width:272px` padding `44px 24px`), CURRENT SCENARIO header `#334155`, title 30px `#fff`, attr tags `rgba(255,255,255,0.07)` with text `rgba(255,255,255,0.55)`, DISCUSSION POINT card `rgba(234,179,8,0.09)` border `rgba(234,179,8,0.22)` accent `#EAB308`. Respondents passed to `SegmentedBars` come from `station.respondedCount`; decisions are filtered to `station.currentIdx` before aggregation; the DISCUSSION POINT card renders only when `isRoomSplit(agg)` is true:

```jsx
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
```

- [ ] **Step 14: Run the ScreenView test — expect PASS**

Run:

```bash
npx vitest run src/views/ScreenView.test.jsx
```

Expected: PASS — `Test Files  1 passed (1)` / `Tests  4 passed (4)`.

- [ ] **Step 15: Run all three new test files together — expect PASS**

Run:

```bash
npx vitest run src/components/SegmentedBars.test.jsx src/components/Scoreboard.test.jsx src/views/ScreenView.test.jsx
```

Expected: PASS — `Test Files  3 passed (3)` / `Tests  9 passed (9)`.

- [ ] **Step 16: Commit ScreenView and close the task**

Run:

```bash
git add src/views/ScreenView.jsx src/views/ScreenView.test.jsx
git commit -m "Add ScreenView projector view with response bars and scoreboard"
```


---

### Task 10: HostView

**Files:**
- Create: `src/views/HostView.jsx`
- Test: `src/views/HostView.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — exact signatures, do not re-implement):
- From `src/content/scenarios.js`: `export const SCENARIOS` — array of 6 objects `{ id, title, desc, attrs:[3 strings], choices:{...}, best }`. First object is `{ id:'loan', title:'Personal Loan Approval', attrs:['High Risk','Regulated','Medium Volume'], ... }`. Second is `{ id:'faq', title:'Customer FAQ Responses', attrs:['High Volume','Low Risk','Repetitive'], ... }`.
- From `src/theme.js`: `export const COLORS` (object with `.bg='#D8DFE8'`, `.navy='#0F2554'`, `.blue='#2563EB'`, `.hostBg='#F1F5F9'`, `.white='#FFFFFF'`, `.ink='#1E293B'`, `.slate700='#374151'`, `.slate500='#64748B'`, `.slate400='#94A3B8'`, `.border='#E2E8F0'`, `.track='#F1F5F9'`, `.green='#16A34A'`, …) and `export const FONT = "'DM Sans', system-ui, sans-serif"`.
- From `src/hooks/useStation.js`: `export function useStation(gameAPI)` — subscribes on mount, returns the latest `Station`, unsubscribes on unmount. `Station = { roomCode, currentIdx, reveal:boolean, status, players:[{id,name,team,score}], decisions:[{playerId,scenarioIdx,choice,isBest,breach}], respondedCount:number }`.
- From `src/game/mockGameAPI.js`: `export function createMockGameAPI({ view='play', roomCode='DEMO', seed=false })` — returns a `GameAPI` object whose methods (`advance()`, `setReveal(on)`, `subscribe(cb)`, `getStation()`, etc.) synchronously mutate an in-memory `Station` and notify subscribers. `seed:true` pre-populates ~30 fake players + a decision spread for the current scenario. `advance()` does `currentIdx++` (or `status->'ended'` past the last scenario). `setReveal(on)` toggles `station.reveal`.

Produces (later tasks / `App` rely on these exact names):
- `src/views/HostView.jsx` default export: `export default function HostView({ gameAPI }) { … }` — a React component taking a single prop `gameAPI` (a `GameAPI` object). No other props.

---

- [ ] **Step 1: Write the failing test for HostView**

  Create `src/views/HostView.test.jsx` with the full content below. The test renders `HostView` with a seeded mock `GameAPI` in `host` view, then asserts: (a) the SCENARIO stat card shows `1` and `/6`, (b) the RESPONDED stat card shows the seeded `respondedCount` and the `/`+player-count denominator, (c) NOW PLAYING shows the first scenario's title and its three attr tags, (d) clicking "Advance to Next Scenario" calls `gameAPI.advance` and the displayed scenario number increments to `2` and NOW PLAYING swaps to the second scenario's title, (e) the Reveal toggle label reads `OFF` initially and reads `ON` after clicking it (and `gameAPI.setReveal` was called with `true`).

  NOTE on the stat-card queries: in the implementation the big number and its `SCENARIO`/`RESPONDED` label are **sibling** `<div>`s inside the white card `<div>`. So `getByText('SCENARIO')` returns the *label* div, and its `.parentElement` is the card div that contains BOTH the number and the label. The test therefore reads `.parentElement` (NOT `.closest('div')`, which would return the label div itself and exclude the number).

  ```jsx
  // src/views/HostView.test.jsx
  import { describe, it, expect, vi, afterEach } from 'vitest';
  import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import HostView from './HostView.jsx';
  import { createMockGameAPI } from '../game/mockGameAPI.js';
  import { SCENARIOS } from '../content/scenarios.js';

  afterEach(() => {
    cleanup();
  });

  function renderHost() {
    const gameAPI = createMockGameAPI({ view: 'host', roomCode: 'DEMO', seed: true });
    const advanceSpy = vi.spyOn(gameAPI, 'advance');
    const setRevealSpy = vi.spyOn(gameAPI, 'setReveal');
    const utils = render(<HostView gameAPI={gameAPI} />);
    return { gameAPI, advanceSpy, setRevealSpy, ...utils };
  }

  describe('HostView', () => {
    it('shows the SCENARIO stat card as 1 over the total scenario count', () => {
      renderHost();
      const scenarioCard = screen.getByText('SCENARIO').parentElement;
      expect(scenarioCard).toHaveTextContent('1');
      expect(scenarioCard).toHaveTextContent('/' + SCENARIOS.length);
      expect(scenarioCard).toHaveTextContent('/6');
    });

    it('shows the RESPONDED stat card with the seeded counts', () => {
      const { gameAPI } = renderHost();
      const station = gameAPI.getStation();
      expect(station.players.length).toBeGreaterThan(0);
      const respondedCard = screen.getByText('RESPONDED').parentElement;
      expect(respondedCard).toHaveTextContent(String(station.respondedCount));
      expect(respondedCard).toHaveTextContent('/' + station.players.length);
    });

    it('shows NOW PLAYING with the current scenario title and its attr tags', () => {
      renderHost();
      expect(screen.getByText('NOW PLAYING')).toBeInTheDocument();
      expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
      SCENARIOS[0].attrs.forEach((tag) => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    it('advances the scenario when Advance is clicked', () => {
      const { advanceSpy } = renderHost();
      expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Advance to Next Scenario'));

      expect(advanceSpy).toHaveBeenCalledTimes(1);
      const scenarioCard = screen.getByText('SCENARIO').parentElement;
      expect(scenarioCard).toHaveTextContent('2');
      expect(screen.getByText(SCENARIOS[1].title)).toBeInTheDocument();
      expect(screen.queryByText(SCENARIOS[0].title)).not.toBeInTheDocument();
    });

    it('toggles the Reveal Aggregate label from OFF to ON', () => {
      const { setRevealSpy } = renderHost();
      const revealBtn = screen
        .getByText('Reveal Aggregate on Screen', { exact: false })
        .closest('button');
      expect(within(revealBtn).getByText('OFF')).toBeInTheDocument();

      fireEvent.click(revealBtn);

      expect(setRevealSpy).toHaveBeenCalledWith(true);
      const revealBtnAfter = screen
        .getByText('Reveal Aggregate on Screen', { exact: false })
        .closest('button');
      expect(within(revealBtnAfter).getByText('ON')).toBeInTheDocument();
      expect(within(revealBtnAfter).queryByText('OFF')).not.toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the test and confirm it fails**

  Run:

  ```
  npx vitest run src/views/HostView.test.jsx
  ```

  Expected: FAIL — the module cannot be resolved / imported. The error is `Failed to resolve import "./HostView.jsx"` (or `Error: Failed to load url ./HostView.jsx`) because `src/views/HostView.jsx` does not exist yet. No tests pass.

- [ ] **Step 3: Implement HostView**

  Create `src/views/HostView.jsx` with the full content below. It uses `useStation(gameAPI)` to follow the live `Station`, derives the current scenario from `SCENARIOS[station.currentIdx]` (clamped so an `ended`/out-of-range index falls back to the last scenario for display), renders the two stat cards, the NOW PLAYING card, the Advance button (calls `gameAPI.advance()`), and the Reveal toggle (calls `gameAPI.setReveal(!station.reveal)`, label `ON`/`OFF` driven by `station.reveal`). The big number and its `SCENARIO`/`RESPONDED` label are sibling `<div>`s inside each white card `<div>` (matching the prototype, lines 263–270). All styles are inline objects copied pixel-faithfully from the prototype HOST VIEW (lines 258–287), substituting `COLORS`/`FONT` tokens for the literal hex values where the contract defines a token. The Pause Timer button from the prototype is reproduced as a static, non-wired control (decorative, matches the prototype) so the panel is pixel-faithful.

  ```jsx
  // src/views/HostView.jsx
  import React from 'react';
  import { COLORS, FONT } from '../theme.js';
  import { SCENARIOS } from '../content/scenarios.js';
  import { useStation } from '../hooks/useStation.js';

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
              fontSize: 24,
              fontWeight: 800,
              color: COLORS.navy,
              marginBottom: 4,
            }}
          >
            Host Controls
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
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Run the test and confirm it passes**

  Run:

  ```
  npx vitest run src/views/HostView.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)` and `Tests  5 passed (5)`. The component resolves, the seeded mock drives the stats, clicking Advance increments the scenario and swaps NOW PLAYING, and the Reveal label flips OFF→ON.

- [ ] **Step 5: Commit**

  Run:

  ```
  git add src/views/HostView.jsx src/views/HostView.test.jsx
  git commit -m "Add HostView (facilitation panel, advance + reveal toggle)"
  ```

  Expected: a single commit recording the two new files.


---

### Task 11: App routing, TopNav, API selection

**Files:**
- Create: `src/components/TopNav.jsx`
- Test: `src/components/TopNav.test.jsx`
- Modify: `src/App.jsx` (replace the Task 1 placeholder)
- Test: `src/App.test.jsx`
- Modify: `src/main.jsx` (ensure it mounts `<App/>` with React 18 `createRoot`)

**Interfaces:**

Consumes (provided by earlier tasks — exact signatures, do not redefine):
- `src/theme.js` → `export const COLORS` (includes `navy:'#0F2554'`, `blue:'#2563EB'`, `bg:'#D8DFE8'`) and `export const FONT = "'DM Sans', system-ui, sans-serif"`.
- `src/game/GameAPI.js` → `export function buildGameAPI({ view, roomCode, supabase })` returning a `GameAPI` object (the Supabase impl when `supabase` is truthy, else the mock). The returned object exposes at least `getView()`, `getRoomCode()`, `subscribe(cb)`, `getStation()`.
- `src/game/supabaseClient.js` → `export function getSupabase()` returning a Supabase client or `null` when env is missing.
- `src/views/PlayerView.jsx` → `export default function PlayerView({ gameAPI })`. Its intro screen renders the literal copy `BANK TRAINING SIMULATION` and a `Start Simulation →` button.
- `src/views/ScreenView.jsx` → `export default function ScreenView({ gameAPI })`. Renders the literal text `ROOM RESPONSE`.
- `src/views/HostView.jsx` → `export default function HostView({ gameAPI })`. Renders the literal text `Host Controls`.

Produces (later tasks / the running app rely on these — exact names/types):
- `src/components/TopNav.jsx` → `export default function TopNav({ view, onChange })`. `view` is one of `'play' | 'screen' | 'host'`. `onChange` is `(nextView: 'play'|'screen'|'host') => void`, called when a tab is clicked. Renders three buttons whose accessible names contain `Player`, `Screen`, `Host`. The button matching `view` is the active tab and uses `background: COLORS.blue`; inactive tabs use `rgba(255,255,255,0.1)`.
- `src/App.jsx` → `export default function App()`. Reads `new URLSearchParams(window.location.search)`: `view` (`play`|`screen`|`host`, default `play`) and `room` (string|null). Builds `gameAPI = buildGameAPI({ view, roomCode: room, supabase: getSupabase() })`. Renders `<TopNav view onChange>` above the selected view component. Clicking a tab updates `?view=` in the URL (via `window.history.pushState`) and re-renders the matching view.

---

- [ ] **Step 1: Write the failing test for TopNav**

  Create `src/components/TopNav.test.jsx`:

  ```jsx
  import { describe, it, expect, afterEach, vi } from 'vitest';
  import { render, screen, cleanup } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import TopNav from './TopNav.jsx';
  import { COLORS } from '../theme.js';

  afterEach(() => cleanup());

  describe('TopNav', () => {
    it('renders three tabs: Player, Screen, Host', () => {
      render(<TopNav view="play" onChange={() => {}} />);
      expect(screen.getByRole('button', { name: /Player/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Screen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Host/i })).toBeInTheDocument();
    });

    it('highlights the active tab with COLORS.blue background', () => {
      // sanity: token is the expected hex from the contract
      expect(COLORS.blue).toBe('#2563EB');
      render(<TopNav view="screen" onChange={() => {}} />);
      const screenTab = screen.getByRole('button', { name: /Screen/i });
      const playerTab = screen.getByRole('button', { name: /Player/i });
      // jsdom normalizes inline hex backgrounds to rgb()
      expect(screenTab.style.background).toBe('rgb(37, 99, 235)'); // #2563EB
      expect(playerTab.style.background).not.toBe('rgb(37, 99, 235)');
    });

    it('calls onChange with the clicked view key', async () => {
      const onChange = vi.fn();
      render(<TopNav view="play" onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: /Host/i }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('host');
    });
  });
  ```

- [ ] **Step 2: Run the TopNav test — expect FAIL**

  ```bash
  npx vitest run src/components/TopNav.test.jsx
  ```

  Expected: FAIL — `Failed to resolve import "./TopNav.jsx" from "src/components/TopNav.test.jsx". Does the file exist?` (the module does not exist yet). Reported as `Test Files  1 failed (1)`.

- [ ] **Step 3: Implement TopNav (pixel-faithful to prototype lines 23-30)**

  Create `src/components/TopNav.jsx`:

  ```jsx
  import { COLORS, FONT } from '../theme.js';

  const TABS = [
    { key: 'play', label: '📱 Player' },
    { key: 'screen', label: '🖥 Screen' },
    { key: 'host', label: '🎛 Host' },
  ];

  export default function TopNav({ view, onChange }) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          background: COLORS.navy,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.13em',
          }}
        >
          AUTOMATE OR NOT?
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  background: active ? COLORS.blue : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  transition: 'background 0.2s',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4: Run the TopNav test — expect PASS**

  ```bash
  npx vitest run src/components/TopNav.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)` / `Tests  3 passed (3)`.

- [ ] **Step 5: Commit TopNav**

  ```bash
  git add src/components/TopNav.jsx src/components/TopNav.test.jsx
  git commit -m "Add TopNav component with active-tab highlight and onChange"
  ```

- [ ] **Step 6: Write the failing test for App routing + API selection**

  This test mocks `getSupabase` to return `null`, so `buildGameAPI` uses the in-memory mock and tests never touch real Supabase. The `vi.mock` specifier MUST match exactly the specifier `App.jsx` imports (`./game/supabaseClient.js`, Step 8). The default-view assertions deliberately avoid the substring `Automate`, because the always-present `TopNav` brand text `AUTOMATE OR NOT?` would also match `/Automate/i` and make `getByText` throw on multiple matches — instead we assert on intro-only copy (`BANK TRAINING SIMULATION`) and the `Start` control.

  Create `src/App.test.jsx`:

  ```jsx
  import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
  import { render, screen, cleanup } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';

  // Force the mock GameAPI: getSupabase() returns null in all tests.
  // Path must match App.jsx's import specifier exactly: './game/supabaseClient.js'.
  vi.mock('./game/supabaseClient.js', () => ({
    getSupabase: () => null,
  }));

  import App from './App.jsx';

  function setSearch(search) {
    window.history.replaceState({}, '', '/' + (search ? '?' + search : ''));
  }

  afterEach(() => cleanup());
  beforeEach(() => setSearch(''));

  describe('App routing', () => {
    it('defaults to the player intro when no view param is present', () => {
      setSearch('');
      render(<App />);
      // PlayerView intro renders the BANK TRAINING SIMULATION eyebrow copy
      expect(screen.getByText(/BANK TRAINING SIMULATION/i)).toBeInTheDocument();
      // The player Start control is present (label "Start Simulation →")
      expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
    });

    it('renders the Host view when ?view=host', () => {
      setSearch('view=host');
      render(<App />);
      expect(screen.getByText(/Host Controls/i)).toBeInTheDocument();
    });

    it('renders the Screen view when ?view=screen', () => {
      setSearch('view=screen');
      render(<App />);
      expect(screen.getByText(/ROOM RESPONSE/i)).toBeInTheDocument();
    });

    it('switches the rendered view when a TopNav tab is clicked', async () => {
      setSearch('');
      render(<App />);
      // Starts on the player intro
      expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
      // Click the Host tab in the nav
      await userEvent.click(screen.getByRole('button', { name: /Host/i }));
      // Host view now renders and the intro Start button is gone
      expect(screen.getByText(/Host Controls/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Start/i })).toBeNull();
      // URL reflects the new view
      expect(new URLSearchParams(window.location.search).get('view')).toBe('host');
    });
  });
  ```

- [ ] **Step 7: Run the App test — expect FAIL**

  ```bash
  npx vitest run src/App.test.jsx
  ```

  Expected: FAIL — `App.jsx` resolves (Task 1 left a placeholder), so the failure is assertion-level, not an import error. The placeholder App does not render `BANK TRAINING SIMULATION`, `Host Controls`, `ROOM RESPONSE`, or a `Start` button, so all four tests fail. Reported as `Test Files  1 failed (1)` / `Tests  4 failed (4)` with messages like `TestingLibraryElementError: Unable to find an element with the text: /Host Controls/i`.

- [ ] **Step 8: Rewrite App.jsx (replace the Task 1 placeholder)**

  Overwrite `src/App.jsx`:

  ```jsx
  import { useState } from 'react';
  import { COLORS, FONT } from './theme.js';
  import { buildGameAPI } from './game/GameAPI.js';
  import { getSupabase } from './game/supabaseClient.js';
  import TopNav from './components/TopNav.jsx';
  import PlayerView from './views/PlayerView.jsx';
  import ScreenView from './views/ScreenView.jsx';
  import HostView from './views/HostView.jsx';

  const VIEWS = ['play', 'screen', 'host'];

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    const rawView = params.get('view');
    const view = VIEWS.includes(rawView) ? rawView : 'play';
    const roomCode = params.get('room');
    return { view, roomCode };
  }

  function writeViewParam(view) {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    const qs = params.toString();
    window.history.pushState({}, '', '/' + (qs ? '?' + qs : ''));
  }

  export default function App() {
    const initial = readParams();
    const [view, setView] = useState(initial.view);
    const roomCode = initial.roomCode;

    const gameAPI = buildGameAPI({
      view,
      roomCode,
      supabase: getSupabase(),
    });

    function handleChange(nextView) {
      writeViewParam(nextView);
      setView(nextView);
    }

    let body;
    if (view === 'host') {
      body = <HostView gameAPI={gameAPI} />;
    } else if (view === 'screen') {
      body = <ScreenView gameAPI={gameAPI} />;
    } else {
      body = <PlayerView gameAPI={gameAPI} />;
    }

    return (
      <div style={{ fontFamily: FONT, background: COLORS.bg, minHeight: '100vh' }}>
        <TopNav view={view} onChange={handleChange} />
        <div style={{ paddingTop: 52 }}>{body}</div>
      </div>
    );
  }
  ```

  Implementation notes for the executor:
  - `gameAPI` is rebuilt on every render keyed off the current `view`. That is intentional and matches the dev-nav contract (each view selects its own API role via `buildGameAPI({ view, ... })`). With `getSupabase()` returning `null` (no env / test), `buildGameAPI` returns the in-memory mock, so this is cheap and side-effect-free.
  - The `paddingTop: 52` offsets the fixed `TopNav`, matching the prototype spacer `<div style="height:52px;"></div>` at line 31.

- [ ] **Step 9: Run the App test — expect PASS**

  ```bash
  npx vitest run src/App.test.jsx
  ```

  Expected: PASS — `Test Files  1 passed (1)` / `Tests  4 passed (4)`.

- [ ] **Step 10: Ensure main.jsx mounts App with React 18 createRoot**

  Overwrite `src/main.jsx` (this is the production entry; it is not unit-tested, but it must mount `<App/>`):

  ```jsx
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import App from './App.jsx';

  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

- [ ] **Step 11: Run the full suite to confirm nothing regressed**

  ```bash
  npx vitest run
  ```

  Expected: PASS — all test files pass, including `src/components/TopNav.test.jsx (3)` and `src/App.test.jsx (4)`. No failures.

- [ ] **Step 12: Commit App routing + main mount**

  ```bash
  git add src/App.jsx src/App.test.jsx src/main.jsx
  git commit -m "Wire App routing, URL view param, and API selection via buildGameAPI"
  ```


---

### Task 12: Supabase schema, client, realtime API & useStation

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/game/supabaseClient.js`
- Modify: `src/game/supabaseGameAPI.js` (OVERWRITES the throwing stub created in Task 5 with the real Supabase-backed implementation)
- Create: `src/hooks/useStation.js`
- Test: `src/game/supabaseClient.test.js`
- Test: `src/game/supabaseGameAPI.test.js`
- Test: `src/hooks/useStation.test.jsx`

**Interfaces:**

Consumes (provided by earlier tasks — use these EXACT signatures, do NOT redefine):
- `src/game/GameAPI.js` → `export function buildGameAPI({ view, roomCode, supabase })`. When `supabase` is truthy it calls `createSupabaseGameAPI({ view, roomCode, supabase })`; otherwise it returns the mock. `GameAPI.js` statically `import { createSupabaseGameAPI } from './supabaseGameAPI.js'`, so this file must keep exporting `createSupabaseGameAPI`. The `Station` typedef documented there is: `{ roomCode:string, currentIdx:number, reveal:boolean, status:'lobby'|'active'|'ended', players:[{id,name,team,score}], decisions:[{playerId,scenarioIdx,choice,isBest,breach}], respondedCount:number }`.
- `src/game/supabaseGameAPI.js` (from Task 5) currently exports a stub `createSupabaseGameAPI(_opts)` that `throw new Error('supabaseGameAPI not implemented yet')`. This task replaces that stub.
- The Vitest toolchain from Task 1: `npm test` runs `vitest run`, environment `jsdom`, `globals: true`, setup file `src/test/setup.js` (registers `@testing-library/jest-dom`). `@testing-library/react` is installed.
- `@supabase/supabase-js` v2 is a dependency (`createClient`, `client.channel(...).on('postgres_changes', ...).subscribe()`, `client.from(table).insert/upsert/select/update`). Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are read via `import.meta.env`.
- `.env.example` (from Task 1) already lists `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the manual step copies it to `.env`.

Produces (relied on by later tasks — exact names/signatures):
- `src/game/supabaseClient.js` → `export function getSupabase()` — returns a `@supabase/supabase-js` client from `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, or `null` when either env var is missing/blank. The App-wiring task calls this and passes the result into `buildGameAPI`.
- `src/game/supabaseGameAPI.js` → `export function createSupabaseGameAPI({ view, roomCode, supabase })` — a `GameAPI` object implementing the FULL interface (`getView, getRoomCode, joinRoom, emit, award, advance, setReveal, subscribe, getStation`) against Supabase tables `rooms`/`players`/`decisions` using `postgres_changes` realtime subscriptions, keeping an in-memory `Station` and notifying subscribers on change. Player identity persisted in `localStorage` under keys `'aon_client_id'` and `'aon_player_id'`.
- `src/hooks/useStation.js` → `export function useStation(gameAPI)` — React hook that subscribes on mount, returns the latest `Station` (initialized from `gameAPI.getStation()`), and unsubscribes on unmount.
- `supabase/schema.sql` — DDL applied once in the Supabase SQL editor (tables, constraints, permissive workshop RLS, realtime publication, DEMO room seed). Not imported by JS; verified manually.

> **Note on test scope.** True realtime sync needs a live Postgres + websocket and CANNOT be unit-tested here. We TDD only what runs without a DB: `getSupabase()` returning `null` when env is absent; `useStation` against a fake `gameAPI` (subscribe/getStation contract — return value, update on callback, unsubscribe on unmount); and a STRUCTURAL test that `createSupabaseGameAPI` exposes every interface method, returns the right view/room/Station shape, wires exactly one realtime channel, and resolves every async interface method (`joinRoom`/`emit`/`award`/`advance`/`setReveal`) without throwing when constructed with a fully-mocked supabase client. End-to-end realtime is covered by the MANUAL VERIFICATION block (Step 15).

---

- [ ] **Step 1: Write the failing test for `useStation` (hook contract)**

  Create `src/hooks/useStation.test.jsx` with the COMPLETE contents below. It builds a tiny fake `gameAPI` exposing only `getStation()` and `subscribe(cb)` (the two methods the hook touches), and asserts: (a) the hook returns the initial station from `getStation()`; (b) when the fake API notifies via the stored callback, the hook re-renders with the new station; (c) unmounting calls the unsubscribe function exactly once. `act` is used so React flushes the subscription callback's state update.

  ```jsx
  // src/hooks/useStation.test.jsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, act } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import { useStation } from './useStation.js';

  // A minimal fake GameAPI: only getStation + subscribe are exercised by the hook.
  function makeFakeApi(initialStation) {
    let station = initialStation;
    let listener = null;
    const unsubscribe = vi.fn();
    return {
      getStation: () => station,
      subscribe: (cb) => {
        listener = cb;
        return unsubscribe;
      },
      // test-only helper to push a new station through the stored callback
      __emit: (next) => {
        station = next;
        if (listener) listener(next);
      },
      __unsubscribe: unsubscribe,
    };
  }

  function Probe({ gameAPI }) {
    const station = useStation(gameAPI);
    return <div data-testid="idx">{station ? station.currentIdx : 'none'}</div>;
  }

  describe('useStation', () => {
    it('returns the initial station from getStation()', () => {
      const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
      render(<Probe gameAPI={api} />);
      expect(screen.getByTestId('idx')).toHaveTextContent('0');
    });

    it('re-renders with the new station when the API notifies', () => {
      const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
      render(<Probe gameAPI={api} />);
      act(() => {
        api.__emit({ currentIdx: 3, respondedCount: 12 });
      });
      expect(screen.getByTestId('idx')).toHaveTextContent('3');
    });

    it('unsubscribes exactly once on unmount', () => {
      const api = makeFakeApi({ currentIdx: 0, respondedCount: 0 });
      const { unmount } = render(<Probe gameAPI={api} />);
      expect(api.__unsubscribe).not.toHaveBeenCalled();
      unmount();
      expect(api.__unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 2: Run the `useStation` test — expect FAIL (module not found)**

  ```bash
  npx vitest run src/hooks/useStation.test.jsx
  ```

  Expected: FAIL — Vitest cannot resolve the import. Output contains a line like:
  ```
  Error: Failed to resolve import "./useStation.js" from "src/hooks/useStation.test.jsx". Does the file exist?
  ```
  and the summary ends with `Test Files  1 failed`. No assertions run because the module is missing.

- [ ] **Step 3: Implement `src/hooks/useStation.js` (full code)**

  Create `src/hooks/useStation.js` with the COMPLETE contents below. It initializes state lazily from `gameAPI.getStation()`, subscribes on mount, stores the latest station on every callback, and returns the stored unsubscribe function from the effect so React calls it on unmount. The effect depends on `gameAPI` so it re-subscribes if a different API object is passed.

  ```js
  // src/hooks/useStation.js
  import { useEffect, useState } from 'react';

  /**
   * Subscribe to a GameAPI's Station and re-render on every change.
   *
   * @param {{ getStation: () => object, subscribe: (cb: (s: object) => void) => (() => void) }} gameAPI
   * @returns {object} the latest Station
   */
  export function useStation(gameAPI) {
    const [station, setStation] = useState(() => gameAPI.getStation());

    useEffect(() => {
      // Re-sync immediately in case the station changed between the initial
      // useState and this effect running.
      setStation(gameAPI.getStation());
      const unsubscribe = gameAPI.subscribe((next) => {
        setStation(next);
      });
      return unsubscribe;
    }, [gameAPI]);

    return station;
  }
  ```

- [ ] **Step 4: Run the `useStation` test — expect PASS**

  ```bash
  npx vitest run src/hooks/useStation.test.jsx
  ```

  Expected: PASS — output shows `Test Files  1 passed (1)` and `Tests  3 passed (3)`.

- [ ] **Step 5: Commit the `useStation` hook**

  ```bash
  git add src/hooks/useStation.js src/hooks/useStation.test.jsx
  git commit -m "Add useStation hook subscribing to GameAPI Station

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected: a commit recording the two files. `git log --oneline -1` shows it at HEAD.

- [ ] **Step 6: Write the failing test for `getSupabase()` (null when env absent)**

  Create `src/game/supabaseClient.test.js` with the COMPLETE contents below. It uses `vi.stubEnv` to control `import.meta.env`, and `vi.mock('@supabase/supabase-js', ...)` to spy on `createClient` WITHOUT making a real network client. It asserts: (a) returns `null` when both env vars are missing; (b) returns `null` when only one is present; (c) when both are present, calls `createClient(url, key)` and returns its result. `vi.unstubAllEnvs()` in `afterEach` keeps cases isolated.

  ```js
  // src/game/supabaseClient.test.js
  import { describe, it, expect, vi, afterEach } from 'vitest';

  // Mock the supabase factory so no real client is constructed.
  const createClientMock = vi.fn((url, key) => ({ __client: true, url, key }));
  vi.mock('@supabase/supabase-js', () => ({
    createClient: (url, key) => createClientMock(url, key),
  }));

  import { getSupabase } from './supabaseClient.js';

  afterEach(() => {
    vi.unstubAllEnvs();
    createClientMock.mockClear();
  });

  describe('getSupabase', () => {
    it('returns null when both env vars are missing', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      expect(getSupabase()).toBeNull();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it('returns null when only the URL is present', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      expect(getSupabase()).toBeNull();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it('creates and returns a client when both env vars are present', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
      const client = getSupabase();
      expect(createClientMock).toHaveBeenCalledTimes(1);
      expect(createClientMock).toHaveBeenCalledWith(
        'https://demo.supabase.co',
        'anon-key-123',
      );
      expect(client).toEqual({
        __client: true,
        url: 'https://demo.supabase.co',
        key: 'anon-key-123',
      });
    });
  });
  ```

- [ ] **Step 7: Run the `supabaseClient` test — expect FAIL (module not found)**

  ```bash
  npx vitest run src/game/supabaseClient.test.js
  ```

  Expected: FAIL — `Failed to resolve import "./supabaseClient.js"`. Summary ends with `Test Files  1 failed`. No assertions run.

- [ ] **Step 8: Implement `src/game/supabaseClient.js` (full code)**

  Create `src/game/supabaseClient.js` with the COMPLETE contents below. It reads the two env vars, returns `null` if either is falsy (missing or blank string), and otherwise builds a client via `createClient`.

  ```js
  // src/game/supabaseClient.js
  import { createClient } from '@supabase/supabase-js';

  /**
   * Build the shared Supabase client from Vite env vars.
   * Returns null when either env var is missing/blank so the app falls back
   * to the in-memory mock (single-device / demo mode).
   *
   * @returns {import('@supabase/supabase-js').SupabaseClient | null}
   */
  export function getSupabase() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }
  ```

- [ ] **Step 9: Run the `supabaseClient` test — expect PASS**

  ```bash
  npx vitest run src/game/supabaseClient.test.js
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- [ ] **Step 10: Commit the Supabase client factory**

  ```bash
  git add src/game/supabaseClient.js src/game/supabaseClient.test.js
  git commit -m "Add getSupabase env-gated client factory (null when env missing)

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected: a commit recording the two files. `git log --oneline -1` shows it at HEAD.

- [ ] **Step 11: Write the failing structural test for `createSupabaseGameAPI`**

  Create `src/game/supabaseGameAPI.test.js` with the COMPLETE contents below. It builds a fully-stubbed supabase client whose `.from()` returns a chainable query builder (covering `insert`, `upsert`, `update`, `select`, `eq`, `order`, `limit`, `single`, `maybeSingle`) and whose `.channel()` returns a chainable realtime channel, so the implementation can be constructed and EXERCISED WITHOUT a real DB. It asserts: (a) every interface method exists and is a function; (b) `getView()` / `getRoomCode()` return the constructor args; (c) `getStation()` returns a Station-shaped object with the expected default keys; (d) constructing the API opens exactly one realtime channel and calls `.subscribe()` on it (proving realtime wiring runs); (e) `subscribe(cb)` returns a callable unsubscribe that does not throw and synchronously pushes the current station to the new subscriber; (f) every async interface method (`joinRoom`/`emit`/`award`/`advance`/`setReveal`) resolves without throwing against the stub. `localStorage` is provided by jsdom; we clear it before each test. Because this is a STRUCTURAL test (no real round-trips), the stub query builder resolves all reads to empty data.

  ```js
  // src/game/supabaseGameAPI.test.js
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { createSupabaseGameAPI } from './supabaseGameAPI.js';

  // A chainable query-builder stub. Every terminal method resolves to a
  // PostgREST-shaped { data, error } result. select()/eq()/order()/limit() are
  // awaitable AND chainable by returning the same kind of thenable object.
  function makeQueryBuilder(result) {
    const qb = {
      insert: vi.fn(() => makeQueryBuilder(result)),
      upsert: vi.fn(() => makeQueryBuilder(result)),
      update: vi.fn(() => makeQueryBuilder(result)),
      select: vi.fn(() => makeQueryBuilder(result)),
      eq: vi.fn(() => makeQueryBuilder(result)),
      order: vi.fn(() => makeQueryBuilder(result)),
      limit: vi.fn(() => makeQueryBuilder(result)),
      single: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      // Make the builder itself awaitable.
      then: (resolve) => resolve(result),
    };
    return qb;
  }

  function makeChannel(record) {
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn((cb) => {
        record.subscribed += 1;
        if (cb) cb('SUBSCRIBED');
        return channel;
      }),
      unsubscribe: vi.fn(() => Promise.resolve('ok')),
    };
    return channel;
  }

  function makeSupabaseStub() {
    const record = { channels: 0, subscribed: 0 };
    return {
      record,
      from: vi.fn(() => makeQueryBuilder({ data: [], error: null })),
      channel: vi.fn(() => {
        record.channels += 1;
        return makeChannel(record);
      }),
      removeChannel: vi.fn(() => Promise.resolve('ok')),
    };
  }

  const INTERFACE_METHODS = [
    'getView',
    'getRoomCode',
    'joinRoom',
    'emit',
    'award',
    'advance',
    'setReveal',
    'subscribe',
    'getStation',
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  describe('createSupabaseGameAPI — structural contract', () => {
    it('exposes every GameAPI interface method as a function', () => {
      const supabase = makeSupabaseStub();
      const api = createSupabaseGameAPI({
        view: 'host',
        roomCode: 'DEMO',
        supabase,
      });
      for (const m of INTERFACE_METHODS) {
        expect(typeof api[m]).toBe('function');
      }
    });

    it('getView and getRoomCode reflect the constructor args', () => {
      const supabase = makeSupabaseStub();
      const api = createSupabaseGameAPI({
        view: 'screen',
        roomCode: 'WXYZ',
        supabase,
      });
      expect(api.getView()).toBe('screen');
      expect(api.getRoomCode()).toBe('WXYZ');
    });

    it('getStation returns a Station-shaped object with sane defaults', () => {
      const supabase = makeSupabaseStub();
      const api = createSupabaseGameAPI({
        view: 'play',
        roomCode: 'DEMO',
        supabase,
      });
      const s = api.getStation();
      expect(s).toMatchObject({
        roomCode: 'DEMO',
        currentIdx: 0,
        reveal: false,
        status: 'lobby',
      });
      expect(Array.isArray(s.players)).toBe(true);
      expect(Array.isArray(s.decisions)).toBe(true);
      expect(typeof s.respondedCount).toBe('number');
    });

    it('opens a realtime channel and subscribes on construction', () => {
      const supabase = makeSupabaseStub();
      createSupabaseGameAPI({ view: 'screen', roomCode: 'DEMO', supabase });
      expect(supabase.channel).toHaveBeenCalledTimes(1);
      expect(supabase.record.subscribed).toBe(1);
    });

    it('subscribe pushes the current station and returns a callable unsubscribe', () => {
      const supabase = makeSupabaseStub();
      const api = createSupabaseGameAPI({
        view: 'screen',
        roomCode: 'DEMO',
        supabase,
      });
      const cb = vi.fn();
      const unsub = api.subscribe(cb);
      // New subscribers get the current snapshot immediately.
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb.mock.calls[0][0]).toMatchObject({ roomCode: 'DEMO', currentIdx: 0 });
      expect(typeof unsub).toBe('function');
      // Unsubscribing must not throw.
      expect(() => unsub()).not.toThrow();
    });

    it('resolves every async interface method without throwing against the stub', async () => {
      const supabase = makeSupabaseStub();
      const api = createSupabaseGameAPI({
        view: 'play',
        roomCode: 'DEMO',
        supabase,
      });
      // joinRoom resolves to a { playerId } shape.
      await expect(api.joinRoom({ name: 'Dana' })).resolves.toHaveProperty('playerId');
      // emit('decision', ...) resolves (insert against the stub).
      await expect(
        api.emit('decision', {
          scenarioId: 'loan',
          scenarioIdx: 0,
          choice: 'hitl',
          isBest: true,
          breach: false,
        }),
      ).resolves.toBeUndefined();
      // award/advance/setReveal resolve.
      await expect(api.award(10)).resolves.toBeUndefined();
      await expect(api.advance()).resolves.toBeUndefined();
      await expect(api.setReveal(true)).resolves.toBeUndefined();
    });
  });
  ```

- [ ] **Step 12: Run the structural test — expect FAIL (stub still throws)**

  ```bash
  npx vitest run src/game/supabaseGameAPI.test.js
  ```

  Expected: FAIL. The Task-5 stub still in place is `createSupabaseGameAPI(_opts) { throw new Error('supabaseGameAPI not implemented yet'); }`, so the very first test that constructs the API throws. Output contains:
  ```
  Error: supabaseGameAPI not implemented yet
  ```
  and the summary ends with `Test Files  1 failed`.

- [ ] **Step 13: Implement the real `src/game/supabaseGameAPI.js` (full code, OVERWRITE the stub)**

  Overwrite `src/game/supabaseGameAPI.js` with the COMPLETE contents below. It keeps an in-memory `station`, hydrates it from the `rooms`/`players`/`decisions` tables, opens ONE realtime channel listening to `postgres_changes` on all three tables, recomputes `respondedCount` (distinct players with a decision for `currentIdx`) on every refresh, and notifies subscribers. Identity is persisted in `localStorage` (`aon_client_id` is a stable per-device id; `aon_player_id` is the row id after joining). `joinRoom` upserts the player on the `unique(room_id, client_id)` constraint so a reconnecting device reuses its row. `emit('decision', …)` inserts a `decisions` row and swallows the unique-constraint duplicate (Postgres error code `23505`) as success. `award` increments `players.score`; `advance`/`setReveal` update the `rooms` row.

  ```js
  // src/game/supabaseGameAPI.js
  /**
   * Supabase-backed implementation of the GameAPI interface.
   *
   * Tables: rooms(code, current_idx, reveal, status), players(room_id, name,
   * team, score, client_id), decisions(room_id, player_id, scenario_id,
   * scenario_idx, choice, is_best, breach). Realtime via postgres_changes keeps
   * an in-memory Station that subscribers read through getStation()/subscribe().
   *
   * @param {{ view:'play'|'screen'|'host', roomCode:string, supabase:object }} args
   * @returns {object} GameAPI
   */
  export function createSupabaseGameAPI({ view, roomCode, supabase }) {
    const CLIENT_ID_KEY = 'aon_client_id';
    const PLAYER_ID_KEY = 'aon_player_id';
    const SCENARIO_COUNT = 6; // 6 scenarios -> currentIdx 0..5 (see scenarios.js)

    // Stable per-device client id (used for the unique(room_id, client_id) join).
    let clientId = safeGet(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = makeClientId();
      safeSet(CLIENT_ID_KEY, clientId);
    }
    let playerId = safeGet(PLAYER_ID_KEY) || null;

    let roomId = null;

    // In-memory Station mirror. respondedCount is derived in recompute().
    const station = {
      roomCode,
      currentIdx: 0,
      reveal: false,
      status: 'lobby',
      players: [],
      decisions: [],
      respondedCount: 0,
    };

    const listeners = new Set();

    function notify() {
      const snapshot = getStation();
      for (const cb of listeners) cb(snapshot);
    }

    function recompute() {
      // respondedCount = DISTINCT players with a decision for the current idx.
      const ids = new Set();
      for (const d of station.decisions) {
        if (d.scenarioIdx === station.currentIdx) ids.add(d.playerId);
      }
      station.respondedCount = ids.size;
    }

    function getStation() {
      // Return a shallow copy so consumers can't mutate internal arrays.
      return {
        roomCode: station.roomCode,
        currentIdx: station.currentIdx,
        reveal: station.reveal,
        status: station.status,
        players: station.players.slice(),
        decisions: station.decisions.slice(),
        respondedCount: station.respondedCount,
      };
    }

    // ---- hydration ----------------------------------------------------------

    async function loadRoom() {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, code, current_idx, reveal, status')
        .eq('code', roomCode)
        .maybeSingle();
      if (error || !data) return;
      roomId = data.id;
      station.roomCode = data.code;
      station.currentIdx = data.current_idx ?? 0;
      station.reveal = data.reveal ?? false;
      station.status = data.status ?? 'lobby';
    }

    async function loadPlayers() {
      if (!roomId) return;
      const { data, error } = await supabase
        .from('players')
        .select('id, name, team, score')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (error || !data) return;
      station.players = data.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team ?? null,
        score: p.score ?? 0,
      }));
    }

    async function loadDecisions() {
      if (!roomId) return;
      const { data, error } = await supabase
        .from('decisions')
        .select('player_id, scenario_idx, choice, is_best, breach')
        .eq('room_id', roomId);
      if (error || !data) return;
      station.decisions = data.map((d) => ({
        playerId: d.player_id,
        scenarioIdx: d.scenario_idx,
        choice: d.choice,
        isBest: d.is_best,
        breach: d.breach,
      }));
    }

    async function refresh() {
      await loadRoom();
      await Promise.all([loadPlayers(), loadDecisions()]);
      recompute();
      notify();
    }

    // ---- realtime -----------------------------------------------------------
    // One channel listening to all three tables for this room. Any change
    // triggers a full refresh (simple + correct for ~30 players / 6 rounds).
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => { refresh(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decisions' },
        () => { refresh(); },
      )
      .subscribe(() => { refresh(); });

    // Kick an initial load even before the SUBSCRIBED callback fires.
    refresh();

    // ---- interface methods --------------------------------------------------

    function getView() {
      return view;
    }

    function getRoomCode() {
      return roomCode;
    }

    async function joinRoom({ name }) {
      if (!roomId) await loadRoom();
      if (!roomId) return { playerId: null };

      // Idempotent: one player row per (room_id, client_id). Upsert on conflict
      // so a reconnecting device reuses its existing row instead of erroring.
      const { data, error } = await supabase
        .from('players')
        .upsert(
          { room_id: roomId, name, client_id: clientId },
          { onConflict: 'room_id,client_id' },
        )
        .select('id')
        .single();

      if (!error && data) {
        playerId = data.id;
        safeSet(PLAYER_ID_KEY, playerId);
      }
      await refresh();
      return { playerId };
    }

    async function emit(event, payload) {
      if (event !== 'decision') return;
      if (!roomId) await loadRoom();
      const pid = playerId || safeGet(PLAYER_ID_KEY);
      if (!roomId || !pid) return;

      const { error } = await supabase.from('decisions').insert({
        room_id: roomId,
        player_id: pid,
        scenario_id: payload.scenarioId,
        scenario_idx: payload.scenarioIdx,
        choice: payload.choice,
        is_best: payload.isBest,
        breach: payload.breach,
      });

      // Swallow the unique(player_id, scenario_idx) duplicate as success.
      if (error && error.code !== '23505') {
        // Non-duplicate errors are surfaced for the caller / console.
        throw error;
      }
    }

    async function award(points) {
      const pid = playerId || safeGet(PLAYER_ID_KEY);
      if (!pid || !points) return;

      // Read current score, then write the incremented value.
      const { data } = await supabase
        .from('players')
        .select('score')
        .eq('id', pid)
        .single();
      const current = data && typeof data.score === 'number' ? data.score : 0;
      await supabase
        .from('players')
        .update({ score: current + points })
        .eq('id', pid);
    }

    async function advance() {
      if (!roomId) await loadRoom();
      if (!roomId) return;
      const last = station.currentIdx;
      // Past the last index, end the room; otherwise step to the next scenario.
      if (last >= SCENARIO_COUNT - 1) {
        await supabase
          .from('rooms')
          .update({ status: 'ended' })
          .eq('id', roomId);
      } else {
        await supabase
          .from('rooms')
          .update({ current_idx: last + 1, status: 'active' })
          .eq('id', roomId);
      }
    }

    async function setReveal(on) {
      if (!roomId) await loadRoom();
      if (!roomId) return;
      await supabase
        .from('rooms')
        .update({ reveal: !!on })
        .eq('id', roomId);
    }

    function subscribe(cb) {
      listeners.add(cb);
      // Push the current snapshot immediately so new subscribers aren't blank.
      cb(getStation());
      return () => {
        listeners.delete(cb);
      };
    }

    return {
      getView,
      getRoomCode,
      joinRoom,
      emit,
      award,
      advance,
      setReveal,
      subscribe,
      getStation,
      // Exposed for teardown by callers that own the API lifecycle.
      _channel: channel,
    };
  }

  // ---- localStorage helpers (jsdom-safe) ------------------------------------

  function safeGet(key) {
    try {
      return globalThis.localStorage ? globalThis.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      if (globalThis.localStorage) globalThis.localStorage.setItem(key, value);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }

  function makeClientId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    // Fallback: timestamp + random suffix (only used where crypto is absent).
    return `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
  ```

- [ ] **Step 14: Run the structural test — expect PASS**

  ```bash
  npx vitest run src/game/supabaseGameAPI.test.js
  ```

  Expected: PASS — `Test Files  1 passed (1)`, `Tests  6 passed (6)`. (The `refresh()` calls run against the stub query builder, which resolves to `{ data: [], error: null }`, so hydration is a no-op and `getStation()` returns the defaults asserted in the test. The async-methods test exercises `upsert`/`insert`/`update` on the stub and confirms each method resolves.)

- [ ] **Step 15: Create `supabase/schema.sql` (tables, constraints, RLS, realtime, DEMO seed)**

  Create `supabase/schema.sql` with the COMPLETE contents below. This is applied once in the Supabase SQL editor. It defines the three tables exactly per the contract (including `unique(room_id, client_id)` on players and `unique(player_id, scenario_idx)` on decisions), enables RLS with permissive anon `select`/`insert`/`update` policies (workshop-grade — explicitly documented as such, NOT for production data), adds all three tables to the `supabase_realtime` publication, and seeds one demo room with code `'DEMO'`. Statements are idempotent where practical (`if not exists`, `on conflict do nothing`) so re-running is safe.

  ```sql
  -- supabase/schema.sql
  -- Automate or Not? — workshop game schema.
  --
  -- WORKSHOP-GRADE SECURITY: the RLS policies below grant the anon role full
  -- read/write on game tables. This is intentional for a throwaway, time-boxed
  -- training room with no real customer data. DO NOT reuse these policies for
  -- any table holding personal or production data.

  create extension if not exists pgcrypto;

  -- ── tables ────────────────────────────────────────────────────────────────

  create table if not exists rooms (
    id          uuid primary key default gen_random_uuid(),
    code        text unique,
    current_idx int default 0,
    reveal      boolean default false,
    status      text default 'lobby',
    created_at  timestamptz default now()
  );

  create table if not exists players (
    id          uuid primary key default gen_random_uuid(),
    room_id     uuid references rooms on delete cascade,
    name        text,
    team        text,
    score       int default 0,
    client_id   text,
    created_at  timestamptz default now(),
    unique (room_id, client_id)
  );

  create table if not exists decisions (
    id           uuid primary key default gen_random_uuid(),
    room_id      uuid references rooms on delete cascade,
    player_id    uuid references players on delete cascade,
    scenario_id  text,
    scenario_idx int,
    choice       text,
    is_best      boolean,
    breach       boolean,
    created_at   timestamptz default now(),
    unique (player_id, scenario_idx)
  );

  -- ── row level security (WORKSHOP-GRADE: permissive anon access) ────────────

  alter table rooms     enable row level security;
  alter table players   enable row level security;
  alter table decisions enable row level security;

  drop policy if exists rooms_anon_all     on rooms;
  drop policy if exists players_anon_all    on players;
  drop policy if exists decisions_anon_all  on decisions;

  -- One permissive policy per table covering select/insert/update for anon.
  create policy rooms_anon_all on rooms
    for all to anon using (true) with check (true);

  create policy players_anon_all on players
    for all to anon using (true) with check (true);

  create policy decisions_anon_all on decisions
    for all to anon using (true) with check (true);

  -- ── realtime publication ───────────────────────────────────────────────────
  -- Add all three tables to the supabase_realtime publication so the client
  -- receives postgres_changes events. The do-block guards re-runs.

  do $$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      alter publication supabase_realtime add table rooms;
      alter publication supabase_realtime add table players;
      alter publication supabase_realtime add table decisions;
    else
      create publication supabase_realtime for table rooms, players, decisions;
    end if;
  exception
    when duplicate_object then null; -- table already in the publication
  end $$;

  -- ── seed: one demo room ────────────────────────────────────────────────────

  insert into rooms (code, current_idx, reveal, status)
  values ('DEMO', 0, false, 'lobby')
  on conflict (code) do nothing;
  ```

- [ ] **Step 16: Run the full test suite — expect all green**

  ```bash
  npx vitest run
  ```

  Expected: PASS across the whole project. The three test files added by this task contribute:
  ```
   ✓ src/hooks/useStation.test.jsx (3)
   ✓ src/game/supabaseClient.test.js (3)
   ✓ src/game/supabaseGameAPI.test.js (6)
  ```
  The final summary line shows `Test Files  N passed (N)` with no failures (N includes the files from earlier tasks). If any EARLIER test file fails, STOP — this task must not regress the suite.

- [ ] **Step 17: MANUAL VERIFICATION — realtime sync (documented, not unit-tested)**

  Realtime cannot be unit-tested without a live Postgres + websocket. Perform this manual check once against a real Supabase project. Record the result in the PR description.

  1. **Create the project & apply the schema.** In the Supabase dashboard create (or open) a project. Open **SQL Editor**, paste the entire contents of `supabase/schema.sql`, and click **Run**. Confirm: "Success. No rows returned." Under **Table Editor** you should now see `rooms` (with one row, `code = DEMO`), `players`, and `decisions`. Under **Database → Replication / Publications** confirm `supabase_realtime` lists `rooms`, `players`, `decisions`.
  2. **Wire env.** Copy `.env.example` to `.env` and fill:
     ```
     VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
     VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
     ```
     (Both values are under **Project Settings → API**.) Restart `npm run dev` so Vite reloads env. With these set, `getSupabase()` returns a real client and `buildGameAPI` takes the Supabase branch instead of the mock.
  3. **Open three views against the DEMO room.** In the browser:
     - Host: `http://localhost:5173/?view=host&room=DEMO`
     - Screen: `http://localhost:5173/?view=screen&room=DEMO`
     - Player A: `http://localhost:5173/?view=play&room=DEMO` (one tab/window)
     - Player B: `http://localhost:5173/?view=play&room=DEMO` (a SEPARATE browser profile or private window so it gets its own `aon_client_id` in localStorage — two tabs in the same profile share storage and would count as one player).
  4. **Confirm join → realtime player count.** Enter a name and Start in both player tabs. On the **Host** view the "responded / players" stat should reach **2** players (and the `players` table shows 2 rows). No manual refresh.
  5. **Confirm decision → live aggregate.** Have Player A pick *Automate Fully* and Player B pick *Human-in-Loop* on scenario 1. Within ~1s the **Screen** view's ROOM RESPONSE bars must update to reflect 1 + 1 (50% / 50%), `respondedCount` shows **2**, and a new row appears in the `decisions` table for each. This proves the `postgres_changes` subscription drives the aggregate from real data.
  6. **Confirm idempotent decision.** Make Player A pick a SECOND time on the same scenario (or refresh and re-pick). No second `decisions` row is created (the `unique(player_id, scenario_idx)` constraint fires `23505`, which `emit` swallows), and the Screen aggregate does not double-count. No console error surfaces.
  7. **Confirm host advance & reveal propagate.** On the **Host** view click **Advance**: `rooms.current_idx` increments and both Player tabs and the Screen move to scenario 2 within ~1s. Toggle **Reveal Aggregate**: `rooms.reveal` flips and the Screen reflects the new reveal state. Click **Advance** past the last scenario (index 5): `rooms.status` becomes `'ended'` and the Player tabs show the ReportCard.

  If every box above behaves as described, realtime sync is verified end-to-end. (No automated assertion is possible for this step.)

- [ ] **Step 18: Commit the schema and Supabase realtime API**

  ```bash
  git add supabase/schema.sql src/game/supabaseGameAPI.js src/game/supabaseGameAPI.test.js
  git commit -m "Add Supabase schema and realtime GameAPI implementation

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```

  Expected: a commit recording the three files. `git log --oneline -1` shows the new commit at HEAD.


---

### Task 13: End-to-end wiring, run docs & multiplayer test script

This is the final task. By now every source file from Tasks 1–12 exists, every co-located `*.test.jsx`/`*.test.js` passes, `src/App.jsx` reads `?view`/`?room` and builds the `GameAPI`, `src/main.jsx` mounts `<App/>`, `supabase/schema.sql` is complete, and `.env.example` lists the two Supabase env vars. This task introduces **no new interfaces, no new components, and no new npm scripts**. It only: (a) writes operator-facing run docs (`RUN.md`) covering install, env, Supabase setup, dev server, and the per-device URLs; (b) adds a documented manual 3-device multiplayer test checklist; (c) adds one smoke test that proves `App` mounts each of the three views without crashing through the public seam (`buildGameAPI`), so a broken wire is caught by `npm test`; and (d) runs the **whole** suite (non-watch) + production build as the final green-light verification.

**Files:**
- Create: `RUN.md` (repo root)
- Create: `src/App.smoke.test.jsx`
- Test: `src/App.smoke.test.jsx` (the smoke test above)

(No `package.json` edit — the non-watch full-suite run uses `npx vitest run`, so no new script is introduced.)

**Interfaces:**

Consumes (provided by earlier tasks — use these EXACT signatures, do NOT redefine or re-implement them here):
- `src/App.jsx` → `export default function App()`. Reads `new URLSearchParams(window.location.search)`: `view` ∈ `'play'|'screen'|'host'` (default `'play'`) and `room` (string|null). Builds `gameAPI` via `buildGameAPI({ view, roomCode, supabase })` and renders `TopNav` + the chosen view (`PlayerView`/`ScreenView`/`HostView`). (Task 12.)
- `src/game/GameAPI.js` → `export function buildGameAPI({ view, roomCode, supabase })` → returns the Supabase impl when a `supabase` client is present, else the mock (`createMockGameAPI`). The returned object satisfies the `GameAPI` interface: `getView()`, `getRoomCode()`, `joinRoom({name})`, `emit(event,payload)`, `award(points)`, `advance()`, `setReveal(on)`, `subscribe(cb)→unsubscribe`, `getStation()→Station`. (Task 5.)
- `src/game/supabaseClient.js` → `export function getSupabase()` → `createClient(...)` from `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, or `null` when env missing. In the test environment those env vars are unset, so `getSupabase()` returns `null` and `App` falls through to the deterministic mock — meaning the smoke test needs no network and no Supabase. (Task 11.)
- `src/content/scenarios.js` → `export const SCENARIOS` (6 objects, ids `loan, faq, aml, statement, kyc, complaint`). Test fact used below: `SCENARIOS[0].title === 'Personal Loan Approval'`. (Task 3.)
- `src/views/PlayerView.jsx`, `src/views/ScreenView.jsx`, `src/views/HostView.jsx` → default exports `function XView({ gameAPI })`. Signature chrome reproduced verbatim from the prototype: the Player intro renders the button `Start Simulation →`; the Screen view renders the header text `ROOM RESPONSE — {n} PLAYERS` and the current scenario title; the Host view renders the standalone `NOW PLAYING` label and the button `Advance to Next Scenario`. (Tasks 8–10.)
- `supabase/schema.sql` → creates tables `rooms`/`players`/`decisions`, permissive anon RLS policies, adds all three to the `supabase_realtime` publication, and seeds one demo room with `code = 'DEMO'`. (Task 12 schema task.)
- `.env.example` → contains `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=`. (Task 1.)
- `package.json` → already has `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, and `"test": "vitest"`. (Task 1.)

Produces (the deliverable of this task — nothing later depends on it; this is the last task):
- `RUN.md` — the single operator runbook.
- A passing smoke test proving `App` mounts all three views through `buildGameAPI`.

---

- [ ] **Step 1: Confirm the current state (sanity check before wiring)**

  Verify the files this task depends on already exist. This is a read-only check — it must list all of these paths with no "No such file" errors before you continue.

  ```
  ls -1 src/App.jsx src/main.jsx src/game/GameAPI.js src/game/supabaseClient.js src/content/scenarios.js src/views/PlayerView.jsx src/views/ScreenView.jsx src/views/HostView.jsx supabase/schema.sql .env.example package.json
  ```

  Expected output (order may vary, all 11 present, no errors):

  ```
  .env.example
  package.json
  src/App.jsx
  src/content/scenarios.js
  src/game/GameAPI.js
  src/game/supabaseClient.js
  src/main.jsx
  src/views/HostView.jsx
  src/views/PlayerView.jsx
  src/views/ScreenView.jsx
  supabase/schema.sql
  ```

  If any file is missing, STOP — an earlier task is incomplete; do not proceed.

- [ ] **Step 2: Write the App smoke test (all three views mount through the seam)**

  This test exercises the real wiring path: it sets `window.location.search` to each `?view=…&room=DEMO` value, renders `<App/>`, and asserts a string unique to that view appears. Because `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are unset under Vitest, `getSupabase()` returns `null` and `buildGameAPI` returns the deterministic mock — no network, no flakiness.

  The assertions use the EXACT signature chrome the views render (verbatim from the prototype):
  - Player intro button text is `Start Simulation →` (exact node).
  - Screen view header is a single text node `ROOM RESPONSE — {n} PLAYERS`, so we match it with the substring regex `/ROOM RESPONSE/`; the current scenario title (`SCENARIOS[0].title`) also appears on the projector.
  - Host view renders the standalone `NOW PLAYING` label (exact node) and the button `Advance to Next Scenario`, matched with `/Advance to Next Scenario/` (the button also contains a separate `→` span).

  Create `src/App.smoke.test.jsx` with the COMPLETE file:

  ```jsx
  // src/App.smoke.test.jsx
  import { describe, it, expect, afterEach } from 'vitest';
  import { render, screen, cleanup } from '@testing-library/react';
  import '@testing-library/jest-dom';
  import App from './App.jsx';
  import { SCENARIOS } from './content/scenarios.js';

  // Rewrite the URL the App reads on mount (via URLSearchParams), then render fresh.
  function renderAppWith(search) {
    window.history.pushState({}, '', search);
    return render(<App />);
  }

  describe('App — view wiring smoke test', () => {
    const originalSearch = window.location.search;

    afterEach(() => {
      cleanup();
      window.history.pushState({}, '', originalSearch || '/');
    });

    it('mounts the Player view (explicit ?view=play) without crashing', () => {
      renderAppWith('/?view=play&room=DEMO');
      // Player intro screen signature button (exact prototype copy).
      expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
    });

    it('mounts the Screen view without crashing', () => {
      renderAppWith('/?view=screen&room=DEMO');
      // Projector signature header is "ROOM RESPONSE — N PLAYERS" (one text node).
      expect(screen.getByText(/ROOM RESPONSE/)).toBeInTheDocument();
      // The first scenario title is shown on the projector.
      expect(screen.getByText(SCENARIOS[0].title)).toBeInTheDocument();
    });

    it('mounts the Host view without crashing', () => {
      renderAppWith('/?view=host&room=DEMO');
      // Host signature label (exact prototype copy) + Advance control.
      expect(screen.getByText('NOW PLAYING')).toBeInTheDocument();
      expect(screen.getByText(/Advance to Next Scenario/)).toBeInTheDocument();
    });

    it('defaults to the Player view when no view param is present', () => {
      renderAppWith('/?room=DEMO');
      expect(screen.getByText('Start Simulation →')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 3: Run the smoke test — expect PASS (this task adds no production code)**

  This is a wiring guard, not a feature implementation: `App.jsx` and the three views were built in Tasks 8–12, so against a correctly wired app the smoke test passes immediately. Run it in non-watch mode:

  ```
  npx vitest run src/App.smoke.test.jsx
  ```

  Expected: **PASS** —

  ```
   ✓ src/App.smoke.test.jsx (4)
   Test Files  1 passed (1)
        Tests  4 passed (4)
  ```

  If it instead FAILS, the failure pinpoints a real wiring bug in an earlier task — do NOT weaken the test. For example:

  ```
   FAIL  src/App.smoke.test.jsx > App — view wiring smoke test > mounts the Screen view without crashing
  TestingLibraryElementError: Unable to find an element with the text: /ROOM RESPONSE/.
  ```

  means `App` is not routing `?view=screen` to `ScreenView`, or `ScreenView` is not rendering its `ROOM RESPONSE — N PLAYERS` header. Fix the *wiring* (App routing or the offending view from Tasks 8–10), then re-run this exact command until it is green before proceeding.

- [ ] **Step 4: Write `RUN.md` — the operator runbook**

  Create `RUN.md` at the repo root with the COMPLETE content below. It is the single source of truth for running the workshop. Keep the exact URLs and DEMO room code — they match `supabase/schema.sql`'s seeded room and the `?view`/`?room` params `App` reads.

  ````markdown
  # Automate or Not? — Run Guide

  A live workshop game for ~30 bank interns. Each player is a **Team Lead** on a
  phone; a projector shows live room aggregates; a host advances scenarios.
  Players read a banking work scenario, pick one of three approaches
  (**Automate Fully / Human-in-Loop / Manual Review**), see an immediate
  consequence and three personal meters move (plus a red **BREACH** card on a bad
  high-risk choice), and get a personal report card at the end.

  Three URL-selected views share one app:

  | View    | Who          | URL param      |
  | ------- | ------------ | -------------- |
  | Player  | each phone   | `?view=play`   |
  | Screen  | the projector| `?view=screen` |
  | Host    | facilitator  | `?view=host`   |

  All three join the same room by code (`?room=DEMO` by default).

  ---

  ## 1. Prerequisites

  - **Node 18+** and **npm** (`node -v` should print `v18.x` or newer).
  - A modern browser on every device (host laptop, projector, each phone).
  - For the **real multiplayer** experience: a free **Supabase** project.
    Without Supabase the app still runs fully in a deterministic **mock**
    (single-device / demo mode) — great for trying it out, but devices will not
    see each other.

  ## 2. Install

  ```bash
  npm install
  ```

  ## 3. Environment setup

  Copy the example env file and fill in your Supabase credentials:

  ```bash
  cp .env.example .env
  ```

  Edit `.env`:

  ```
  VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
  VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
  ```

  > If you leave these blank, the app runs in **mock mode** (in-memory, single
  > device). The Player/Screen/Host views all work locally, but devices are not
  > connected to each other. Fill them in for the real multi-device room.

  ## 4. Create the Supabase project + apply the schema

  1. Go to <https://supabase.com>, sign in, and **New project**.
  2. Once provisioned, open **Project Settings → API** and copy:
     - **Project URL** → `VITE_SUPABASE_URL`
     - **anon public** key → `VITE_SUPABASE_ANON_KEY`
  3. Apply the database schema. Either:
     - **Supabase Studio (easiest):** open **SQL Editor → New query**, paste the
       entire contents of [`supabase/schema.sql`](supabase/schema.sql), and
       **Run**. This creates `rooms` / `players` / `decisions`, enables
       Row-Level Security with permissive **workshop-grade** anon policies
       (documented as such in the file — this is *not* a production security
       posture), adds all three tables to the `supabase_realtime` publication so
       live updates flow, and seeds one demo room with code **`DEMO`**.
     - **or Supabase CLI:**
       ```bash
       supabase db execute --file supabase/schema.sql
       ```
  4. Confirm **Database → Replication** shows `rooms`, `players`, `decisions`
     under the `supabase_realtime` publication (the schema adds them, but verify
     — realtime aggregates depend on it).

  > **Security note:** the RLS policies allow anonymous insert/select/update so
  > ~30 interns can join with no logins. This is intentional for a closed,
  > time-boxed workshop. Do not reuse this project or these policies for anything
  > with real customer data.

  ## 5. Run the dev server

  ```bash
  npm run dev
  ```

  Vite prints a Local URL (typically `http://localhost:5173`) and, when started
  with a host flag, a Network URL. **Phones must reach the app over the network**,
  so start it bound to your LAN:

  ```bash
  npm run dev -- --host
  ```

  Vite then prints something like:

  ```
    ➜  Local:   http://localhost:5173/
    ➜  Network: http://192.168.1.42:5173/
  ```

  Use the **Network** address (`http://192.168.1.42:5173` in this example — yours
  will differ) on every device. Replace `192.168.1.42:5173` below with whatever
  Vite prints for you.

  ## 6. Per-device URLs

  All three views point at the same room code, **`DEMO`** (the seeded room).

  - **Host laptop:**
    `http://192.168.1.42:5173/?view=host&room=DEMO`
  - **Projector:**
    `http://192.168.1.42:5173/?view=screen&room=DEMO`
  - **Each phone:**
    `http://192.168.1.42:5173/?view=play&room=DEMO`

  Tip: generate a QR code for the phone URL so interns can join in seconds.

  > A small dev-only top nav (Player / Screen / Host tabs) is visible for quick
  > switching during setup. In the workshop, hand each device its dedicated URL.

  ## 7. Running the tests

  Watch mode while developing:

  ```bash
  npm test
  ```

  One-shot, non-watch run (CI / pre-flight check):

  ```bash
  npx vitest run
  ```

  Production build (also a good final smoke check):

  ```bash
  npm run build
  ```

  ## 8. Manual 3-device multiplayer test checklist

  Do this once after applying the schema and before the real session. You need at
  least **three browser contexts** — ideally the host laptop, the projector, and
  two phones (or two extra browser tabs/incognito windows standing in for phones).
  All must use the **Network** URL and the **same `room=DEMO`**.

  1. **Players can join from 2+ devices.**
     Open the phone URL (`?view=play&room=DEMO`) in **two** tabs/phones. Enter a
     name on each and tap **Start Simulation →**. On the **Host** view, the
     "RESPONDED" stat's player count (the denominator) rises as each joins; on the
     **Screen** view the scoreboard begins to populate.

  2. **All devices follow the host's Advance.**
     On the **Host** view, click **Advance to Next Scenario**. Every **Player**
     device should move to the next scenario, and the **Screen** view's
     "NOW PLAYING"/current scenario title should change in step. No device should
     be left on the old scenario.

  3. **Screen aggregates update live as players answer.**
     With players on the same scenario, have each phone pick a *different*
     approach (one **Automate Fully**, one **Human-in-Loop**, one **Manual
     Review** if you have three). The **Screen** `ROOM RESPONSE` segmented bars
     and the respondent count must update **within ~1 second** — no refresh
     needed. When the top two bars are within 15 points of each other, the
     `DISCUSSION POINT` card should highlight on the screen.

  4. **Breach card appears on a bad high-risk pick.**
     Advance to a **high-risk** scenario (e.g. **Suspicious Transaction
     Detection** — the `aml` scenario, or **Personal Loan Approval** — the `loan`
     scenario). On a phone, pick **Automate Fully**. That player's device must
     show the red **COMPLIANCE BREACH** card (it shakes and pulses red) with the
     consequence message and an `Optimal:` line. Safer picks on the same scenario
     must NOT show the breach card.

  5. **Report card appears at the end.**
     Have the **Host** click **Advance to Next Scenario** past the last scenario
     (or until the room status ends). Every **Player** device must show the
     **MISSION DEBRIEF** report card: score / max, name, "X of N optimal
     decisions", a breach pill if any breaches were triggered, and the
     **TEAM PERFORMANCE PROFILE** meters.

  6. **One answer per scenario is enforced.**
     On a phone, pick an approach, then try to tap a *different* approach for the
     **same** scenario. The second tap must be ignored — the choice does not
     change, the score does not change again, and the **Screen** aggregate count
     for that player does not double-count. (This is enforced both in the UI and
     by the `unique(player_id, scenario_idx)` database constraint, so a duplicate
     network insert is swallowed as success.)

  If any step fails, check: `.env` has the right Supabase URL/key; the schema ran
  (tables exist and are in `supabase_realtime`); all devices use the **same**
  `room=DEMO`; and the phones are on the **Network** URL, not `localhost`.

  ## 9. Mock / single-device demo mode

  Leaving `.env` blank (no Supabase) runs the deterministic mock. The Screen and
  Host views are pre-seeded with ~30 fake players across teams Alpha / Beta /
  Gamma / Delta and a realistic response spread, so you can rehearse the
  projector and host flows on one laptop. Devices are **not** connected to each
  other in this mode.
  ````

- [ ] **Step 5: Run the WHOLE test suite — expect all green**

  This is the top-level full-suite verification. Run every co-located test across the project in non-watch mode (using Vitest's `run` mode so it exits instead of watching):

  ```
  npx vitest run
  ```

  Expected: **all tests pass** — every `*.test.js` / `*.test.jsx` from Tasks 1–13 is green. The final summary lines look like (file/test counts reflect the full project):

  ```
   Test Files  N passed (N)
        Tests  M passed (M)
  ```

  with **zero** `failed` files or tests. If anything fails, STOP and fix the underlying task before continuing — do not edit tests to make them pass.

- [ ] **Step 6: Run the production build — expect success**

  ```
  npm run build
  ```

  Expected: **build succeeds** — Vite transforms modules and writes `dist/` with no errors. The tail of the output looks like:

  ```
  vite vX.Y.Z building for production...
  ✓ NN modules transformed.
  dist/index.html                   X.XX kB
  dist/assets/index-XXXXXXXX.js   XXX.XX kB │ gzip: XX.XX kB
  ✓ built in X.XXs
  ```

  No `error`/`Could not resolve`/`Rollup failed` lines. If the build fails on an unresolved import or a syntax error, fix the offending source file (an earlier task) and re-run both Step 5 and Step 6.

- [ ] **Step 7: Commit**

  ```
  git add RUN.md src/App.smoke.test.jsx
  git commit -m "Wire end-to-end: App smoke test & RUN.md runbook with multiplayer checklist

  Add a smoke test asserting App routes ?view=play|screen|host through
  buildGameAPI to the three views (mock fallback when Supabase env is unset).
  Add RUN.md: prerequisites, install, env, Supabase project + schema.sql,
  npm run dev --host, per-device DEMO URLs, the npm test note, and a manual
  3-device multiplayer test checklist.

  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
  ```


---

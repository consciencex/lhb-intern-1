# Automate or Not?

A live, in-room workshop game for ~30 bank interns. Each player is a **Team
Lead** on their **phone** and plays **self-paced** — no host, no waiting. On the
intro screen the player enters an optional name and **chooses one of four squads**
(Team Alpha / Beta / Gamma / Delta) before starting. A **projector** shows a
**live results dashboard**: every answer shows up instantly with per-scenario
response breakdowns, an overall "chose the optimal approach" rate, and a
**TEAM STANDINGS** panel that ranks the four squads by score (with player count
and each squad's optimal %). Players read a banking work scenario (loan
approvals, AML monitoring, KYC, complaints, …), each shown with a clean flat
illustration, pick one of three approaches —
**Automate Fully / Human-in-Loop / Manual Review** — and immediately see the
consequence, a 4-axis **radar chart** of their team metrics
(**Efficiency / Accuracy / Risk / Compliance**) update, and a red **COMPLIANCE
BREACH** card on a bad high-risk choice, then advance themselves to the next
scenario. At the end
each player gets a personal **MISSION DEBRIEF** report card. The point is the
discussion the spread of answers provokes, not the score.

Two URL-selected views share one app — `room` picks the shared session, `view`
picks the screen:

| Role          | Device       | URL                       |
| ------------- | ------------ | ------------------------- |
| Player        | each phone   | `?view=play&room=DEMO`    |
| Screen        | projector    | `?view=screen&room=DEMO`  |

> Originated from a [Claude Design](https://claude.ai/design) handoff; the
> original HTML/CSS/JS prototype and screenshots live in [`project/`](project/)
> as the visual reference for this built version.

## Tech stack

- **Vite** + **React 18** (plain JavaScript / JSX — no TypeScript)
- **Supabase** (`@supabase/supabase-js`) for realtime multiplayer; falls back to
  an in-memory mock when no Supabase env is configured
- **Vitest** + Testing Library (jsdom) for the test suite

## Quick start (single-device / no backend)

```bash
npm install
npm run dev
```

Open these two URLs (default `http://localhost:5173`), each in its own
tab/window — they work immediately against the in-memory mock, no backend
required:

- Player: <http://localhost:5173/?view=play>
- Screen: <http://localhost:5173/?view=screen>

The tabs are not connected to each other in mock mode (it is per-tab and
in-memory) — this is for trying the game out and rehearsing each screen. The
Screen tab is pre-seeded with demo data so the live dashboard looks alive. For a
real shared session across phones, set up Supabase.

## Real multiplayer (Supabase)

1. Create a free project at <https://supabase.com>.
2. In **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql)
   (creates the tables + realtime publication and seeds the `DEMO` room).
3. `cp .env.example .env`, then fill in from **Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
4. `npm run dev -- --host` (bind to your LAN so phones can reach it), or
   `npm run build` and host the `dist/` folder on any static host.

### Per-device URLs for the live activity

Using the **Network** address Vite prints (e.g. `http://192.168.1.42:5173`) and
the seeded `DEMO` room:

- Projector:  `http://192.168.1.42:5173/?view=screen&room=DEMO`
- Each phone: `http://192.168.1.42:5173/?view=play&room=DEMO` (or scan the QR on
  the projector)

## Testing

```bash
npm test          # full Vitest suite (non-watch)
npm run build     # production build (also a good final smoke check)
```

## More

- **[`RUN.md`](RUN.md)** — the full operator runbook: prerequisites, install,
  Supabase setup, the dev/build/host workflow, per-device URLs, and a manual
  3-device multiplayer test checklist.
- **[`supabase/README.md`](supabase/README.md)** — DB setup, the manual realtime
  verification steps, and the security / threat-model writeup.
- **[`project/`](project/)** — the original design prototype and screenshots.

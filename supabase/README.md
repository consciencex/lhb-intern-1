# Supabase backend — "Automate or Not?"

This directory holds the database schema for the multiplayer backend. The app
talks to Supabase only through `src/game/supabaseGameAPI.js` (the realtime
`GameAPI` implementation); when no Supabase env is configured the app falls
back to the in-memory mock in `src/game/mockGameAPI.js` (single-device demo).

## Files

- `schema.sql` — the full DDL: tables (`rooms`, `players`, `decisions`),
  constraints, the `increment_score(uuid, int)` RPC used by `award`,
  workshop-grade RLS policies, the `supabase_realtime` publication, and a seed
  `DEMO` room. Apply it once in the SQL editor.

> **WORKSHOP-GRADE SECURITY (by design).** Anon can read/write all game rows
> and scores/flags are client-trusted — this is an intentional tradeoff for a
> closed, facilitator-run, no-PII training game. See
> [Security & threat model](#security--threat-model) below for the full
> rationale and what production hardening would require.

## MANUAL VERIFICATION — realtime sync

Realtime sync needs a live Postgres + websocket and **cannot** be unit-tested.
The Vitest suite covers only what runs without a DB (`getSupabase()` null
behaviour, the `useStation` hook contract, and a structural check that
`createSupabaseGameAPI` exposes the full interface and wires exactly one
channel). Perform the steps below once against a real Supabase project and
record the result in the PR description.

### 1. Create the project & apply the schema

In the Supabase dashboard, create (or open) a project. Open **SQL Editor**,
paste the entire contents of `supabase/schema.sql`, and click **Run**. Confirm:
"Success. No rows returned."

- Under **Table Editor** you should now see `rooms` (with one row,
  `code = DEMO`), `players`, and `decisions`.
- Under **Database → Replication / Publications** confirm `supabase_realtime`
  lists `rooms`, `players`, `decisions`.

### 2. Wire env

Copy `.env.example` to `.env` and fill:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

(Both values are under **Project Settings → API**.) Restart `npm run dev` so
Vite reloads env. With these set, `getSupabase()` returns a real client and
`buildGameAPI` takes the Supabase branch instead of the mock.

### 3. Open three views against the DEMO room

In the browser:

- Host:     `http://localhost:5173/?view=host&room=DEMO`
- Screen:   `http://localhost:5173/?view=screen&room=DEMO`
- Player A: `http://localhost:5173/?view=play&room=DEMO` (one tab/window)
- Player B: `http://localhost:5173/?view=play&room=DEMO` (a **separate** browser
  profile or private window so it gets its own `aon_client_id` in
  localStorage — two tabs in the same profile share storage and would count as
  one player).

### 4. Confirm join → realtime player count

Enter a name and Start in both player tabs. On the **Host** view the
"responded / players" stat should reach **2** players (and the `players` table
shows 2 rows). No manual refresh.

### 5. Confirm decision → live aggregate

Have Player A pick *Automate Fully* and Player B pick *Human-in-Loop* on
scenario 1. Within ~1s the **Screen** view's ROOM RESPONSE bars must update to
reflect 1 + 1 (50% / 50%), `respondedCount` shows **2**, and a new row appears
in the `decisions` table for each. This proves the `postgres_changes`
subscription drives the aggregate from real data.

### 6. Confirm idempotent decision

Make Player A pick a **second** time on the same scenario (or refresh and
re-pick). No second `decisions` row is created (the
`unique(player_id, scenario_idx)` constraint fires `23505`, which `emit`
swallows as expected idempotency — **not** an error), and the Screen aggregate
does not double-count. The duplicate path logs nothing; no console error
surfaces.

> **Error handling note.** The write methods (`emit`, `award`, `advance`,
> `setReveal`) are called fire-and-forget by the views, so they catch
> non-fatal failures, `console.error(...)` them for debugging, and resolve
> rather than reject (no `unhandledrejection`). So in normal operation — and on
> the idempotent duplicate above — the console stays clean; a genuine write
> failure shows a single `[supabaseGameAPI] …` error line instead of crashing
> the tab.

### 7. Confirm host advance & reveal propagate

On the **Host** view click **Advance**: `rooms.current_idx` increments and both
Player tabs and the Screen move to scenario 2 within ~1s. Toggle
**Reveal Aggregate**: `rooms.reveal` flips and the Screen reflects the new
reveal state. Click **Advance** past the last scenario: `rooms.status` becomes
`'ended'` and the Player tabs show the ReportCard.

If every box above behaves as described, realtime sync is verified
end-to-end. (No automated assertion is possible for this step.)

## Security & threat model

The backend is **workshop-grade by design**. This is an informed, documented
tradeoff — not an oversight — appropriate for what this game is and is not.

### What is intentionally open

- **Permissive anon RLS.** The `rooms` / `players` / `decisions` policies grant
  the `anon` role full `select` / `insert` / `update`. Any participant with the
  public anon key (shipped in the client bundle) can read and write any row.
- **Client-trusted scores and flags.** `is_best`, `breach`, and `score` are
  computed in the browser and sent up; the server does not re-derive or
  validate them. A participant could spoof their own score or decision flags.
- **Self-claimed identity, no auth.** A "player" is a self-entered display name
  plus a random per-device id (`aon_client_id` in `localStorage`). There is no
  login, no email, no verification — anyone can claim any name.

### Why that is acceptable here

- This is a **closed, facilitator-run, in-room training activity**. Players are
  in the same room as the facilitator running the Host/Screen views.
- There is **no personal or sensitive data** — no PII, no credentials, nothing
  of value. Rooms (e.g. `DEMO`) are throwaway and short-lived.
- There are **no real stakes**. The worst a participant can do is fudge their
  own score in a game whose purpose is discussion, not competition. The
  facilitator sees the live Screen aggregate and would notice nonsense.

Given that, adding authentication, ownership checks, and server-side scoring
would be cost with no benefit for the intended use.

### NOT suitable for public / internet deployment

If this were ever exposed beyond a facilitated room — on the open internet, or
with any data worth protecting — it would need, at minimum:

- **Authentication** (Supabase Auth) so players are real, distinct identities.
- **Row-ownership RLS** so a player can only write their own `players` /
  `decisions` rows (e.g. `auth.uid()`-scoped policies) and only the host can
  mutate `rooms`.
- **Server-side validation of decisions and scores** (e.g. a Postgres function
  or Edge Function that derives `is_best` / `breach` / score increments from
  the canonical scenario data) so the client cannot fabricate outcomes.

These are deliberately out of scope for the workshop game.

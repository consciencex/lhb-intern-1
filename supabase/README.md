# Supabase backend — "Automate or Not?"

This directory holds the database schema for the multiplayer backend. The app
talks to Supabase only through `src/game/supabaseGameAPI.js` (the realtime
`GameAPI` implementation); when no Supabase env is configured the app falls
back to the in-memory mock in `src/game/mockGameAPI.js` (single-device demo).

## Files

- `schema.sql` — the full DDL: tables (`rooms`, `players`, `decisions`),
  constraints, workshop-grade RLS policies, the `supabase_realtime`
  publication, and a seed `DEMO` room. Apply it once in the SQL editor.

> **WORKSHOP-GRADE SECURITY.** The RLS policies grant the `anon` role full
> read/write on the game tables. This is intentional for a throwaway,
> time-boxed training room with no real customer data. **Do not reuse these
> policies for any table holding personal or production data.**

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
swallows), and the Screen aggregate does not double-count. No console error
surfaces.

### 7. Confirm host advance & reveal propagate

On the **Host** view click **Advance**: `rooms.current_idx` increments and both
Player tabs and the Screen move to scenario 2 within ~1s. Toggle
**Reveal Aggregate**: `rooms.reveal` flips and the Screen reflects the new
reveal state. Click **Advance** past the last scenario: `rooms.status` becomes
`'ended'` and the Player tabs show the ReportCard.

If every box above behaves as described, realtime sync is verified
end-to-end. (No automated assertion is possible for this step.)

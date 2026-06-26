# Automate or Not? — Run Guide

A live workshop game for ~30 bank interns. Each player is a **Team Lead** on a
phone; a projector shows room aggregates; a host advances scenarios. Players read
a banking work scenario, pick one of three approaches
(**Automate Fully / Human-in-Loop / Manual Review**), see an immediate
consequence and three personal meters move (plus a red **BREACH** card on a bad
high-risk choice), and get a personal report card at the end.

The game is **host-paced**: in a hosted (multi-device) room the host advances
scenarios and every player follows — players do **not** get a "Next" button;
after answering they see "waiting for the host" and move on when the host
advances. (Single-device mock mode is **solo**: the player self-paces with a Next
button.) The projector **hides the room responses until the host reveals them**
(answers come in privately → host reveals to discuss → advancing re-hides for the
next scenario). Each joining device is auto-assigned a **squad** (Team Alpha /
Beta / Gamma / Delta) so the projector scoreboard ranks squads. The **room code**
is shown on the Host header and on the Screen ("Join: room DEMO") so the
facilitator can read it out, and a **"Scan to join" QR code** is shown on both
the Screen and the Host view so interns can scan to open the player URL.

The **Host view also shows a live results panel** ("ผลสด / LIVE RESULTS") that is
**always visible** — the facilitator sees the incoming Automate / Human-in-Loop /
Manual percentages, the responded count, and the squad scoreboard in real time
**before** deciding to reveal them on the projector. (Reveal only controls what
the *projector* shows; the host always sees the backend data.)

Three URL-selected views share one app:

| View    | Who           | URL param      |
| ------- | ------------- | -------------- |
| Player  | each phone    | `?view=play`   |
| Screen  | the projector | `?view=screen` |
| Host    | facilitator   | `?view=host`   |

All three join the same room by code (`?room=DEMO` by default). `room` selects
the shared session; the three `view` values are the three screens.

---

## 1. Prerequisites

- **Node 18+** and **npm** (`node -v` should print `v18.x` or newer).
- A modern browser on every device (host laptop, projector, each phone).
- For the **real multiplayer** experience: a free **Supabase** project.
  Without Supabase the app still runs fully in a deterministic **mock**
  (single-device / demo mode) — great for trying it out, but devices will not
  see each other.

## 2. Quick start (single-device / no backend)

The fastest way to see the game. No Supabase, no `.env` — the app falls back to
an in-memory mock automatically.

```bash
npm install
npm run dev
```

Vite prints a Local URL (typically `http://localhost:5173`). Open these three,
each in its own tab/window:

- Player: <http://localhost:5173/?view=play>
- Screen: <http://localhost:5173/?view=screen>
- Host:   <http://localhost:5173/?view=host>

Everything renders and is interactive immediately (intro → play → report on the
player; scenario, live bars and scoreboard on the screen; advance/reveal on the
host). Because the mock is in-memory and per-tab, the tabs are **not** connected
to each other — this mode is for trying it out and rehearsing each screen, not
real multiplayer. For that, set up Supabase (next section).

A small dev-only top nav (Player / Screen / Host tabs) is rendered at the top of
every view for quick switching while you explore.

## 3. Real multiplayer (Supabase) setup

For an actual multi-device room (phones, projector, host laptop all sharing one
session), back the game with a Supabase project.

### 3a. Create the project and apply the schema

1. Go to <https://supabase.com>, sign in, and create a **New project**.
2. Once provisioned, open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Apply the database schema. Either:
   - **Supabase Studio (easiest):** open **SQL Editor → New query**, paste the
     entire contents of [`supabase/schema.sql`](supabase/schema.sql), and
     **Run**. This creates `rooms` / `players` / `decisions`, the
     `increment_score` RPC used by scoring, enables Row-Level Security with
     permissive **workshop-grade** anon policies (documented as such in the
     file — this is *not* a production security posture), adds all three tables
     to the `supabase_realtime` publication so live updates flow, and seeds one
     demo room with code **`DEMO`**.
   - **or Supabase CLI:**
     ```bash
     supabase db execute --file supabase/schema.sql
     ```
4. Confirm **Database → Replication / Publications** shows `rooms`, `players`,
   `decisions` under the `supabase_realtime` publication (the schema adds them,
   but verify — realtime aggregates depend on it).

> **Security note:** the RLS policies allow anonymous insert/select/update so
> ~30 interns can join with no logins, and scores/flags are client-trusted.
> This is intentional for a closed, time-boxed, no-PII workshop. Do not reuse
> this project or these policies for anything with real customer data. The full
> rationale and what production hardening would require is in
> [`supabase/README.md`](supabase/README.md) → "Security & threat model".

### 3b. Wire the environment

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
> device — see section 2). Fill them in for the real multi-device room. Restart
> `npm run dev` after editing `.env` so Vite reloads it.

### 3c. Run the dev server (bound to the LAN)

```bash
npm run dev
```

Vite prints a Local URL (typically `http://localhost:5173`). **Phones must
reach the app over the network**, so start it bound to your LAN with Vite's
`--host` flag:

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

For a deployed session you can instead build and host the static output:

```bash
npm run build      # writes dist/
npm run preview    # serves dist/ locally to sanity-check it
```

Host the `dist/` folder on any static host (the same `?view`/`?room` URLs
apply). The Supabase env vars are baked in at **build** time, so build with the
`.env` you intend to use.

## 4. Per-device URLs for the live activity

All three views point at the same room code, **`DEMO`** (the seeded room). Using
the Network address from section 3c:

- **Host laptop:**
  `http://192.168.1.42:5173/?view=host&room=DEMO`
- **Projector:**
  `http://192.168.1.42:5173/?view=screen&room=DEMO`
- **Each intern's phone:**
  `http://192.168.1.42:5173/?view=play&room=DEMO`

`room=DEMO` is what binds all the devices into one shared session; the three
`view` values pick which of the three screens each device shows.

**Scan to join (QR):** both the **Screen** (projector) and the **Host** view now
render a **"Scan to join"** QR code on a white card. Interns just point their
phone camera at it to open the player URL for this room (`?view=play&room=…`) —
no typing. The URL is derived from the page's own origin, so the QR works on
localhost, the LAN address, or the deployed domain automatically. The join URL is
also printed under the QR for anyone who prefers to type it.

> The dev-only top nav (Player / Screen / Host tabs) is still visible for quick
> switching during setup. In the workshop, hand each device its dedicated URL.

## 5. Testing

Run the full test suite (Vitest, non-watch — `test` is `vitest run`):

```bash
npm test
```

Expected: all tests pass. A production build is also a good final smoke check:

```bash
npm run build
```

## 6. Manual 3-device multiplayer test checklist

Do this once after applying the schema and before the real session. You need at
least **three browser contexts** — ideally the host laptop, the projector, and
two phones (or two extra browser profiles / private windows standing in for
phones; two tabs in the *same* profile share the `aon_client_id` in
`localStorage` and would count as one player). All must use the **Network** URL
and the **same `room=DEMO`**.

1. **Players can join from 2+ devices.**
   Open the phone URL (`?view=play&room=DEMO`) on **two** phones / profiles.
   Enter a name on each and tap **Start Simulation →**. On the **Host** view the
   "RESPONDED" stat's player-count denominator rises as each joins; on the
   **Screen** view the scoreboard begins to populate.

2. **All devices follow the host's Advance.**
   On the **Host** view, click **Advance to Next Scenario**. Every **Player**
   device should move to the next scenario, and the **Screen** view's current
   scenario title (under "NOW PLAYING" on the host) should change in step. No
   device should be left on the old scenario. Players never advance the room
   themselves: after answering, a Player device shows "✓ Answer locked — waiting
   for the host…" (no Next button) until the host advances. The Screen scoreboard
   ranks **squads** (Team Alpha / Beta / Gamma / Delta), the squad each device was
   auto-assigned on join.

3. **Screen aggregates update live once the host reveals.**
   With players on the same scenario, have each phone pick a *different*
   approach (one **Automate Fully**, one **Human-in-Loop**, one **Manual
   Review** if you have three). While **Reveal** is OFF the **Screen** shows a
   "🔒 Responses hidden — N / M answered" placeholder; the responded count still
   ticks up live as players answer. On the **Host** view, the **LIVE RESULTS**
   panel shows the actual Automate / Human-in-Loop / Manual bars and the squad
   scoreboard updating live the whole time — even with **Reveal OFF** — so the
   facilitator can gauge the room before revealing. On the **Host** view toggle **Reveal
   Aggregate on Screen** ON: the **Screen** `ROOM RESPONSE` segmented bars appear
   and update **within ~1 second** — no refresh needed. When the room is split
   between Automate and Human-in-Loop, the `DISCUSSION POINT` card highlights on
   the screen. Clicking **Advance** resets Reveal to OFF so the next scenario
   starts hidden again.

4. **Breach card appears on a bad high-risk pick.**
   Advance to a **high-risk** scenario (e.g. **Suspicious Transaction
   Detection** — the `aml` scenario, or **Personal Loan Approval** — the `loan`
   scenario). On a phone, pick **Automate Fully**. That player's device must
   show the red **COMPLIANCE BREACH** card (it shakes and pulses red) with the
   consequence message and an `Optimal:` line. Safer picks on the same scenario
   must NOT show the breach card.

5. **Report card appears at the end.**
   Have the **Host** click **Advance to Next Scenario** past the last scenario
   (room status becomes `ended`). Every **Player** device must show the
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
`room=DEMO`; and the phones are on the **Network** URL, not `localhost`. For the
DB-side verification (inspecting `players` / `decisions` rows, the idempotent
duplicate behaviour, host advance/reveal propagation), see the step-by-step
checklist in [`supabase/README.md`](supabase/README.md) → "MANUAL VERIFICATION —
realtime sync".

## 7. Mock / single-device demo mode

Leaving `.env` blank (no Supabase) runs the deterministic in-memory mock (see
section 2). Each tab/window holds its own private room — the Player, Screen, and
Host views all render and are interactive so you can rehearse every screen on
one laptop, but devices are **not** connected to each other in this mode. For a
shared multi-device session, configure Supabase (section 3).

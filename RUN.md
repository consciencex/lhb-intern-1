# Automate or Not? — Run Guide

A live workshop game for ~30 bank interns. Each player is a **Team Lead** on a
phone; a projector shows a **live results dashboard**. Players read a banking work
scenario — including a short **"Key Considerations"** list that surfaces the
tradeoffs (efficiency vs accuracy vs risk vs compliance) to weigh before
deciding — then pick one of three approaches
(**Automate Fully / Human-in-Loop / Manual Review**), see an immediate
consequence and a 4-axis team-metrics **radar chart**
(**Efficiency / Accuracy / Risk / Compliance**) update (plus a red **BREACH**
card on a bad high-risk choice), and get a personal report card at the end.

The game is **fully self-paced — there is no host.** Each player moves through
the six scenarios at their own speed using a **"Next Scenario →"** button after
answering; nobody has to wait for anyone. As soon as a player answers, the
projector's dashboard updates **live and immediately** — there is no "reveal"
step and nothing is hidden. On the intro screen each player **chooses their own
squad** (Team Alpha / Beta / Gamma / Delta) — Start is disabled until a squad is
picked (name stays optional) — and the projector's **TEAM STANDINGS** panel ranks
those squads. The **room code** is shown on the Screen ("Join: room DEMO") so the
facilitator can read it out, and a **"Scan to join" QR code** on the Screen lets
interns scan to open the player URL.

The **Screen is a live, always-on results dashboard**: a summary bar (players
joined, total responses, and the overall **"chose the optimal approach" rate** —
the teaching takeaway), a compact **live card for every one of the six
scenarios** (each with a flat scenario illustration, response breakdown bars for
Automate / Human-in-Loop / Manual, the response count, and a ★ marker on the
optimal answer), the **TEAM STANDINGS** panel (each squad's score, player
count and optimal %), and a **TEAM PROFILES** row of radar charts.
**Team score is the AVERAGE points per player** (total optimal-answer points ÷
squad size, rounded) so the competition is **fair across team sizes** — a bigger
squad no longer wins on headcount, and two squads with the same total are ranked
by the smaller (higher per-player average) one. **TEAM PROFILES** shows each
squad's **average decision profile** as a compact 4-axis radar
(**Efficiency / Accuracy / Risk / Compliance**): every member's accumulated
meters are derived by replaying their decisions and then averaged across the
members who have answered, with an "{answered}/{players} answered" caption.
Everything is visible from the start and updates in real time as answers arrive.

**Reset the room (facilitator).** The person running the Screen can wipe the room
before each real session — no DB access needed. Click the subtle **↺ Reset**
button in the dashboard header; an in-app confirmation modal shows how many
players and responses will be cleared and asks you to confirm. Confirming clears
all players and decisions for the room and returns the live dashboard (totals,
per-scenario bars, team standings) to 0; connected phones see the wipe via
realtime. Cancel leaves everything untouched.

Two URL-selected views share one app:

| View    | Who           | URL param      |
| ------- | ------------- | -------------- |
| Player  | each phone    | `?view=play`   |
| Screen  | the projector | `?view=screen` |

Both join the same room by code (`?room=DEMO` by default). `room` selects the
shared session; the two `view` values are the two screens.

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

Vite prints a Local URL (typically `http://localhost:5173`). Open these two,
each in its own tab/window:

- Player: <http://localhost:5173/?view=play>
- Screen: <http://localhost:5173/?view=screen>

Everything renders and is interactive immediately (intro → choose squad →
self-paced play → report on the player; the live all-scenarios dashboard and
team standings on the screen). The Screen tab is pre-seeded with demo data so the dashboard looks
alive. Because the mock is in-memory and per-tab, the tabs are **not** connected
to each other — this mode is for trying it out and rehearsing each screen, not
real multiplayer. For that, set up Supabase (next section).

A small dev-only top nav (Player / Screen tabs) is rendered at the top of every
view for quick switching while you explore.

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

Both views point at the same room code, **`DEMO`** (the seeded room). Using the
Network address from section 3c:

- **Projector:**
  `http://192.168.1.42:5173/?view=screen&room=DEMO`
- **Each intern's phone:**
  `http://192.168.1.42:5173/?view=play&room=DEMO`

`room=DEMO` is what binds all the devices into one shared session; the two
`view` values pick which of the two screens each device shows.

**Scan to join (QR):** the **Screen** (projector) renders a **"Scan to join"** QR
code on a white card. Interns just point their phone camera at it to open the
player URL for this room (`?view=play&room=…`) — no typing. The URL is derived
from the page's own origin, so the QR works on localhost, the LAN address, or the
deployed domain automatically. The join URL is also printed under the QR for
anyone who prefers to type it.

> The dev-only top nav (Player / Screen tabs) is still visible for quick
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

## 6. Manual multi-device test checklist

Do this once after applying the schema and before the real session. You need the
**projector** plus at least **two phones** (or two extra browser profiles /
private windows standing in for phones; two tabs in the *same* profile share the
`aon_client_id` in `localStorage` and would count as one player). All must use
the **Network** URL and the **same `room=DEMO`**. There is **no host device** —
players drive themselves.

1. **Players can join from 2+ devices.**
   Open the phone URL (`?view=play&room=DEMO`) on **two** phones / profiles (or
   scan the projector's QR). Enter a name (optional) and **choose a squad** on
   each — **Start Simulation →** stays disabled until a squad is picked — then tap
   it. On the **Screen** view the **PLAYERS JOINED** total rises as each joins and
   the **TEAM STANDINGS** panel begins to populate.

2. **Players are self-paced (no host, no waiting).**
   On a phone, answer scenario 1, then tap **Next Scenario →**. That device moves
   to scenario 2 on its own — it does **not** wait for anyone. Different phones
   can be on different scenarios at the same time. There is no "waiting for the
   host" state and no shared advance.

3. **Screen dashboard updates live immediately (no reveal step).**
   Have each phone pick a *different* approach on whatever scenario they are on
   (one **Automate Fully**, one **Human-in-Loop**, one **Manual Review** if you
   have three). The **Screen** updates **within ~1 second** — no refresh, no
   reveal: the matching scenario's live card shows the response bars and count
   change, **TOTAL RESPONSES** ticks up, and the overall **"chose the optimal
   approach" rate** recomputes. The ★ marker on each card always points at the
   optimal answer so viewers learn where AI belongs. The **TEAM STANDINGS** panel
   ranks the four **squads** (Team Alpha / Beta / Gamma / Delta) — each player
   chose their own squad at join — by **average points per player** (fair across
   squad sizes), with player count and optimal %. Below the scenarios, the
   **TEAM PROFILES** row shows each squad's **average decision profile** as a
   compact radar (Efficiency / Accuracy / Risk / Compliance) with an
   "{answered}/{players} answered" caption.

4. **Breach card appears on a bad high-risk pick.**
   On a phone, advance to a **high-risk** scenario (e.g. **Suspicious Transaction
   Detection** — the `aml` scenario, or **Personal Loan Approval** — the `loan`
   scenario). Pick **Automate Fully**. That player's device must show the red
   **COMPLIANCE BREACH** card (it shakes and pulses red) with the consequence
   message and an `Optimal:` line. Safer picks on the same scenario must NOT show
   the breach card.

5. **Report card appears at the end.**
   On a phone, self-advance past the last scenario. That device must show the
   **MISSION DEBRIEF** report card: score / max, name, "X of N optimal
   decisions", a breach pill if any breaches were triggered, and the
   **TEAM PERFORMANCE PROFILE** 4-axis radar chart
   (Efficiency / Accuracy / Risk / Compliance).

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
DB-side verification (inspecting `players` / `decisions` rows and the idempotent
duplicate behaviour), see the step-by-step checklist in
[`supabase/README.md`](supabase/README.md) → "MANUAL VERIFICATION — realtime
sync".

## 7. Mock / single-device demo mode

Leaving `.env` blank (no Supabase) runs the deterministic in-memory mock (see
section 2). Each tab/window holds its own private room — the Player and Screen
views both render and are interactive so you can rehearse each screen on one
laptop (the Screen tab is pre-seeded with demo answers across all scenarios so
the dashboard looks alive), but devices are **not** connected to each other in
this mode. For a shared multi-device session, configure Supabase (section 3).

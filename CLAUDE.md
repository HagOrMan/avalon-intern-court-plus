# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A two-screen, Jackbox-style web version of *The Resistance: Avalon*. One TV/desktop browser is the host screen everyone watches; each player's phone is a private controller. Next.js 15 (App Router) + React 19 on Vercel, Upstash Redis for room state. Package manager is pnpm.

## Commands

```bash
pnpm install
vercel env pull     # optional: Upstash creds; without them the in-memory store is used
pnpm dev            # next dev
pnpm build          # next build (also the only type-check — there is no separate tsc script)
pnpm lint           # next lint
```

There is no unit test runner. `scripts/e2e.mjs` drives games over the HTTP API against a running server: start the app on port 3999 (`pnpm dev -p 3999`), then `node scripts/e2e.mjs` (override target with `BASE=...`). It needs the in-memory or a real store; it reads views by grabbing the first SSE event from the stream endpoint. Games 1–7 reuse one 5-player room, one module each; game 8 is a full 10-player game in a second room, driven phase by phase. Each run creates 2 rooms, against a limit of `ROOM_CREATE_LIMIT` per IP per 10 minutes.

## Architecture

**Server-authoritative state machine.** All game state is one `GameState` object (`lib/types.ts`) per 4-letter room code. `lib/engine.ts` holds pure functions `(state, ...args) => newState` for every transition (`beginCourt`, `propose`, `vote`, `playQuestCard`, `assassinate`, the `ack*Reveal`s, `autoAdvance`, …). They throw `GameError` for illegal moves; API routes turn that into a 400 with the message, which the client shows as a toast. Game-tuning constants (mission sizes up to 16 players, evil counts, two-Fail quests, default specials, timer defaults, Lancelot decks, reveal durations) live in `lib/rules.ts`; role metadata in `lib/roles.ts`; Plot card data in `lib/plots.ts`.

**Rules and modules.** `docs/rules.md` is the source of truth for game rules: the official rules, every module (Lady of the Lake, Excalibur, Trapper, Lancelot + Guinevere, Targeting, Plot cards, timers), how each is implemented, every deviation from the board game, and the decisions behind them. Read it before changing game logic and update it when you do. Invariants that are easy to break:
- `GameState.mission` is the *round* (quests resolved); `quest` is the quest being attempted (Targeting). Read the quest through `currentQuest`. Round-counted things (Lady, Lancelot draws, Excalibur/trap logs) use `mission`; team size, Fails needed and the history record use the quest.
- `isEvil(role)` is a role's *starting* side (seat counting, night sight). `allegianceOf(s, id)` is the *current* side (a switched Lancelot): use it for cards, Lady checks and the cast.
- Every path into a round goes through `enterRound` and every leader's turn through `toLeaderTurn` (Lancelot card → Lady → Lead to Victory → Plot draw → proposal). Every phase change is timestamped by `stampPhase` in `mutateRoom` and the stream's `autoAdvance` path, which timers count from.
- Config and module state are read through `normalizeConfig` / optional fields, because rooms saved by an older deploy can lack them for up to `ROOM_TTL_SECONDS`.
- Every `Phase` must be handled by `TvApp`'s and `Controller`'s switches.

**Information hiding is the core invariant.** `state.roles` (playerId → role) and tokens never leave the server. Every client — including the TV — gets a per-viewer filtered projection from `lib/views.ts` (`tvView`, `playerView`), which computes what each role knows (Merlin, Mistress, evil teammates, Oberon/Mordred exceptions). Any new state field must be deliberately exposed (or not) in `views.ts`; never send raw `GameState` to a client.

**Randomness and fairness.** All game randomness goes through `secureRandom` (CSPRNG) and the Fisher–Yates `shuffle` in `lib/rules.ts`. Seat order is the `players` array order: it drives leader rotation and the deal. The first leader carries over between games via `nextLeader`. `docs/fairness.md` records each decision and the analysis behind it (deal uniformity, leader rotation, quest-card shuffle, phone button order, side channels). Read it before changing anything random, seat-ordered or display-ordered, and update it when you do.

**Write path.** `POST /api/room/[code]/action` with `{ token, action, ...payload }`. The token identifies the caller: matching `hostToken` → host actions (setup, config, kick, ack, restart); matching a player's token → player actions. The route calls `mutateRoom` (`lib/store.ts`), which does load → engine function → compare-and-set with retries. Room creation is `POST /api/rooms`; joining is `POST /api/room/[code]/join`.

**Read path / realtime.** `GET /api/room/[code]/stream?token=…` is an SSE loop that polls only the room's version key (~450ms) and fetches full state when it moves, refreshes presence (`touchSeen`/`getSeen`, used to detect a missing TV / disconnected players) every 5s, sends the viewer's view only when it changed (ignoring `serverNow`), sends `{error:"kicked"}` once the viewer's seat is gone, and closes after ~55s so the client's `EventSource` reconnects within Vercel's function limit. `components/useRoom.ts` is the shared client hook for both TV and phone: subscribes to the stream, exposes `act(action, payload)`, and computes a server clock offset.

**Scripted reveal beats.** Vote reveal, quest-card reveal, and the assassination reveal are timed: the engine stamps `revealAt`, the TV animates against server time, then the host sends `ack`. The engine refuses an ack before the duration has elapsed, and the stream loop calls `autoAdvance` to push the phase forward if the TV never acks (grace period in `rules.ts`). Changing a beat's animation length means changing the matching constant in `rules.ts`, which both the TV component and the engine read.

**Store.** `getStore()` picks Upstash Redis if `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` env vars exist, otherwise a `globalThis` in-memory map (single-process dev only). Redis CAS is a Lua script over `court:{code}:state` / `court:{code}:ver` keys with a TTL; presence is a `court:{code}:seen` hash. `rateLimit` is a sliding-window limiter (sorted set via Lua) used to cap room creation per client IP (`ROOM_CREATE_*` in `rules.ts`); it's hand-rolled, not `@upstash/ratelimit`. `/api/cron/keepalive` (Vercel Cron, `vercel.json`, requires `CRON_SECRET`) writes a heartbeat key so the Upstash database isn't flagged inactive.

**Clients.**
- `app/host/page.tsx` → `components/tv/TvApp.tsx`, which switches on `view.phase` to a TV screen. TV screens render on a fixed 1920×1080 stage scaled to the viewport, so sizes in TV components are literal 1080p pixel values.
- `app/join/page.tsx` → `components/phone/Controller.tsx`, one decision per screen.
- Reconnection uses `localStorage` (`court:host`, `court:player:{code}`, `court:player:last`) to reclaim the same seat/host after refresh.

## Repo notes

- `.agents/skills/` (symlinked into `.claude/skills/`) contains Upstash Redis and Ratelimit reference skills — consult them when touching `lib/store.ts`.
- The design handoff referenced in the README (`design_handoff_avalon_intern_court/`) is not committed.

// Manual playtest driver: creates a room, hands the TV to your browser, fills the seats with
// bots and walks a game into states that need a human eye, pausing at each one.
// Usage: node scripts/playtest.mjs --scenario NAME [--players N] [--base URL] [--step]
//        [--me NAME] [--pace MS] [--config JSON] [--verbose]
// Run with no arguments for the list of scenarios.
import readline from "node:readline";
import { webcrypto } from "node:crypto";

/* ------------------------------------------------------------------ arguments */

const SCENARIOS = {
  "setup-max": {
    players: 16,
    about:
      "Court Setup with every optional role, modules and timers on. Starts at 7 seats so the overfull-deck warning shows, then fills to N. You open Customize and each sub-panel. Checks L1 (Setup height).",
  },
  roles: {
    players: 16,
    about: "The most distinct roles the table allows (11 at 16) → the Roles in Play screen, all names still awaiting. Checks T2.",
  },
  "table-plot": {
    players: 16,
    about:
      "Plot cards + Excalibur + Lady at N seats, played 2–2 into Mission 5 with every Plot card kept, so hands, Charges and markers pile up on the side and bottom seats; pauses on the 4-card draw banner, the 9-rider vote banner and the riding banner. Checks L2.",
  },
  "quest-q5": {
    players: 16,
    about: "15–16 seats played 2–2 into Mission 5; pauses before the 9 cards are played, then you watch the reveal. Checks T1.",
  },
  "gameover-recap": {
    players: 16,
    about:
      "Forfeit, win 12–4, win 11–5, forfeit, fail ×3 at 10–6 → Evil wins with every recap slot filled. Checks L3 (game-over recap row).",
  },
  "lancelot-known": {
    players: 10,
    about:
      "Lancelots + Guinevere on a known schedule (redealt until it holds a switch), played to the round the switch lands → SWITCHED beside the allegiance track. Checks L4.",
  },
  full: {
    players: 10,
    about: "A complete game of random legal bot play, pausing at every phase (add --no-step to let it run).",
  },
};

function usage() {
  console.log(`
node scripts/playtest.mjs --scenario NAME [options]

  --scenario NAME   one of the scenarios below
  --players N       seats, 5–16, counting you if --me is set (default per scenario)
  --base URL        server (default $BASE or http://localhost:3000)
  --me NAME         keep a seat for you: the script waits for NAME to join from a phone or a
                    second window, then prints what to do whenever it's your move
  --step            pause for Enter at every phase change (on by default for "full"; --no-step)
  --pace MS         delay between bot actions (default 200)
  --config JSON     extra Court Setup config merged over the scenario's, e.g. '{"timers":true}'
  --verbose         print refused bot actions (usually a view one tick behind)

Scenarios:
${Object.entries(SCENARIOS)
  .map(([k, s]) => `  ${k.padEnd(15)} (${s.players} seats) ${s.about}`)
  .join("\n")}

The TV acks reveal beats itself, so keep the TV tab open. Every bot holds a live stream; run
against a local server without Upstash creds (in-memory store) to avoid Redis traffic.`);
}

const argv = process.argv.slice(2);
const opt = { base: process.env.BASE ?? "http://localhost:3000", pace: 200, step: null, verbose: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const val = () => {
    if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
    return argv[++i];
  };
  if (a === "--scenario") opt.scenario = val();
  else if (a === "--players") opt.players = Number(val());
  else if (a === "--base") opt.base = val();
  else if (a === "--me") opt.me = val().trim().slice(0, 14);
  else if (a === "--step") opt.step = true;
  else if (a === "--no-step") opt.step = false;
  else if (a === "--pace") opt.pace = Number(val());
  else if (a === "--config") opt.config = JSON.parse(val());
  else if (a === "--verbose") opt.verbose = true;
  else if (a === "--help" || a === "-h") opt.help = true;
  else if (!opt.scenario && !a.startsWith("-")) opt.scenario = a;
  else throw new Error(`Unknown argument ${a}`);
}
if (opt.help || !opt.scenario || !SCENARIOS[opt.scenario]) {
  if (opt.scenario && !SCENARIOS[opt.scenario]) console.log(`Unknown scenario "${opt.scenario}".`);
  usage();
  process.exit(opt.help ? 0 : 1);
}
const BASE = opt.base.replace(/\/$/, "");
const N = opt.players ?? SCENARIOS[opt.scenario].players;
if (!Number.isInteger(N) || N < 5 || N > 16) {
  console.log("--players must be 5–16");
  process.exit(1);
}
const STEP = opt.step ?? opt.scenario === "full";
const USER_CONFIG = opt.config ?? {};

/* ------------------------------------------------------------------ utilities */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function randInt(n) {
  const limit = Math.floor(2 ** 32 / n) * n;
  const a = new Uint32Array(1);
  do webcrypto.getRandomValues(a);
  while (a[0] >= limit);
  return a[0] % n;
}
const pick = (arr) => arr[randInt(arr.length)];
const chance = (p) => randInt(1_000_000) < p * 1_000_000;
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mirrors lib/rules.ts. */
const evilCount = (n) => Math.ceil(n / 3);
const EVIL_ROLES = ["mordred", "morgana", "assassin", "minion", "oberon", "lancelotEvil"];
function failsNeeded(n) {
  if (n >= 13) return [1, 1, 1, 2, 2];
  if (n >= 7) return [1, 1, 1, 2, 1];
  return [1, 1, 1, 1, 1];
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, json.error ?? `${path} -> ${res.status}`);
  return json;
}

/* ------------------------------------------------------------------ console */

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let shuttingDown = false;
const feeds = new Set();
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const f of feeds) f.close();
  rl.close();
  if (code === 130) console.log("\nStopped. The room stays open; the bots go offline.");
  process.exit(code);
}
rl.on("SIGINT", () => shutdown(130));
rl.on("close", () => shutdown(0));
process.on("SIGINT", () => shutdown(130));

const ask = (q) => new Promise((r) => rl.question(q, r));
async function pause(msg) {
  console.log(`\n▶ ${msg.replace(/\n/g, "\n  ")}`);
  await ask("  [Enter] ");
}
const log = (...a) => console.log(...a);
const vlog = (...a) => opt.verbose && console.log("   ", ...a);

/* ------------------------------------------------------------------ SSE feeds */

/**
 * One live stream per token. The server closes each stream after ~55 s; this reconnects,
 * and keeps the latest view. Holding a stream open is also what marks a bot as connected.
 */
class Feed {
  constructor(code, token, label) {
    this.url = `${BASE}/api/room/${code}/stream?token=${encodeURIComponent(token)}`;
    this.label = label;
    this.view = null;
    this.seq = 0;
    this.ended = null;
    this.waiters = new Set();
    this.ctrl = new AbortController();
    feeds.add(this);
    this.loop();
  }

  async loop() {
    let warned = false;
    while (!this.ended && !this.ctrl.signal.aborted) {
      try {
        const res = await fetch(this.url, { signal: this.ctrl.signal });
        if (res.status === 404) return this.end("expired");
        if (res.status === 403) return this.end("kicked");
        if (!res.ok) throw new Error(`stream ${res.status}`);
        warned = false;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            this.onEvent(buf.slice(0, i));
            buf = buf.slice(i + 2);
            if (this.ended) return;
          }
        }
      } catch (e) {
        if (this.ctrl.signal.aborted) return;
        if (!warned) log(`  (${this.label}: stream dropped — ${e.message}; reconnecting)`);
        warned = true;
      }
      await sleep(800);
    }
  }

  onEvent(chunk) {
    const data = chunk
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => l.slice(6))
      .join("\n");
    if (!data) return;
    const msg = JSON.parse(data);
    if (msg.error) return this.end(msg.error);
    this.view = msg;
    this.seq += 1;
    this.notify();
  }

  end(reason) {
    this.ended = reason;
    this.ctrl.abort();
    this.notify();
  }

  notify() {
    for (const w of [...this.waiters]) w();
  }

  /** Resolves once a view newer than `seq` arrives, or after `ms`. */
  next(seq, ms) {
    if (this.seq !== seq || this.ended) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.waiters.delete(done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.waiters.add(done);
    });
  }

  close() {
    this.ctrl.abort();
    feeds.delete(this);
  }
}

/* ------------------------------------------------------------------ the room */

let code = "";
let hostToken = "";
/** @type {Feed} */
let host;
/** playerId -> { id, token, name, feed } */
const bots = new Map();
let meId = null;

const view = () => host.view;
const nameOf = (id) => view().players.find((p) => p.id === id)?.name ?? "?";
const names = (ids) => ids.map(nameOf).join(", ");
const botView = (id) => bots.get(id)?.feed.view ?? null;
/** A bot's current side, from its own view; null for you or before the deal reaches it. */
const sideOf = (id) => botView(id)?.role?.allegiance ?? null;
const roleOf = (id) => botView(id)?.role?.key ?? null;
const isLancelot = (id) => ["lancelotGood", "lancelotEvil"].includes(roleOf(id));
const rolesKnown = () => [...bots.keys()].every((id) => sideOf(id));
const bySeat = (v) => [...v.players].sort((a, b) => a.seat - b.seat);

async function hostAct(action, payload) {
  return post(`/api/room/${code}/action`, { token: hostToken, action, ...payload });
}

async function waitFor(pred, what, ms = Infinity) {
  const start = Date.now();
  let said = false;
  for (;;) {
    if (host.ended) throw new Error(`The room's stream ended: ${host.ended}`);
    if (host.view && pred(host.view)) return host.view;
    if (Date.now() - start > ms) throw new Error(`Timed out waiting for ${what}`);
    if (what && !said && Date.now() - start > 1500) {
      log(`  waiting for ${what}…`);
      said = true;
    }
    await host.next(host.seq, 1000);
  }
}

/**
 * Seat order around the TV's table puts seat 0 at the top and goes clockwise. Seats are
 * ranked most-crowded first: the bottom seat (it sits over the banner), then the sides.
 */
function crowdRank(n) {
  const score = (i) => {
    if (n % 2 === 0 && i === n / 2) return 2;
    return Math.abs(Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n));
  };
  return [...Array(n).keys()].sort((a, b) => score(b) - score(a));
}

const LONG_NAMES = [
  "Wilhelmina Fox",
  "Konstantinos K",
  "Evangelina Ray",
  "Maximilian Rex",
  "Christabelle M",
  "Fitzgerald Oak",
  "Persephone Lu",
  "Bartholomew",
];
const SHORT_NAMES = ["Ann", "Cy", "Jo", "Lia", "Quill", "Ignatius", "Ottoline", "Rosalind"];

/** Names by seat: the 14-character maximum lands on the most crowded seats. */
function seatNames(n) {
  const out = Array(n);
  const longCount = Math.ceil(n / 2);
  crowdRank(n).forEach((seat, k) => {
    out[seat] = k < longCount ? LONG_NAMES[k] : SHORT_NAMES[k - longCount];
  });
  return out.map((name, seat) =>
    opt.me && name.toLowerCase() === opt.me.toLowerCase() ? `Bot ${seat}` : name
  );
}

async function openRoom() {
  const room = await post("/api/rooms");
  code = room.code;
  hostToken = room.hostToken;
  host = new Feed(code, hostToken, "TV");
  await waitFor(() => true, "the room's first view", 15000);
  log(`\nRoom ${code}`);
  log(`  TV:   ${BASE}/host?code=${code}&hostToken=${hostToken}`);
  log(`  join: ${BASE}/join?code=${code}`);
  await pause("Open the TV link in your browser (it replaces any room that tab held), then press Enter.");
  if (opt.me) {
    log(`\nJoin as "${opt.me}" at ${BASE}/join?code=${code}`);
    const v = await waitFor(
      (v) => v.players.some((p) => p.name.toLowerCase() === opt.me.toLowerCase()),
      `"${opt.me}" to join`
    );
    meId = v.players.find((p) => p.name.toLowerCase() === opt.me.toLowerCase()).id;
    log(`  ${opt.me} is seated.`);
  }
}

/** Join bots until `total` seats are filled. */
async function seatBots(total) {
  const all = seatNames(N);
  for (let seat = view().players.length; seat < total; seat++) {
    const name = all[seat];
    const j = await post(`/api/room/${code}/join`, { name });
    bots.set(j.playerId, { id: j.playerId, token: j.token, name, feed: new Feed(code, j.token, name) });
    if (opt.pace) await sleep(Math.min(opt.pace, 150));
  }
  await waitFor((v) => v.players.length >= total, `${total} seats`, 15000);
}

async function configure(cfg) {
  await hostAct("updateConfig", { config: { ...cfg, ...USER_CONFIG } });
}

async function beginCourt() {
  await hostAct("beginCourt");
  const v = await waitFor((v) => v.phase === "reveal", "the deal", 15000);
  await waitFor(() => rolesKnown(), "the bots' roles", 15000);
  return v;
}

/** Keep the Lancelot pair (and Guinevere, who needs them) together; drop roles until the deck fits. */
function fitSpecials(n, wanted) {
  let s = [...wanted];
  const evilOver = () => s.filter((r) => EVIL_ROLES.includes(r)).length > evilCount(n);
  const goodOver = () => s.filter((r) => !EVIL_ROLES.includes(r)).length > n - evilCount(n);
  const drop = (rs) => (s = s.filter((r) => !rs.includes(r)));
  for (const rs of [["oberon"], ["morgana"], ["mordred"], ["lancelotGood", "lancelotEvil", "guinevere"]])
    if (evilOver()) drop(rs);
  for (const rs of [["guinevere"], ["mistress"], ["lancelotGood", "lancelotEvil", "guinevere"]])
    if (goodOver()) drop(rs);
  return s;
}
const ALL_SPECIALS = ["merlin", "mistress", "guinevere", "lancelotGood", "mordred", "morgana", "oberon", "lancelotEvil"];

/* ------------------------------------------------------------------ bot play */

function turnKey(v) {
  return [
    v.phase,
    v.round,
    v.mission,
    v.rejections,
    v.leaderId,
    v.proposalIds.join(","),
    v.plot?.window?.kind,
    v.plot?.window?.askingId,
    v.plot?.pending?.key,
    v.plot?.pending?.actorId,
    JSON.stringify(v.plot?.lastEvent ?? null),
    v.lady?.holderId,
    v.questResults.map((r) => (r ? (r.success ? "W" : "L") : "-")).join(""),
  ].join("|");
}

/** The quest to attempt: the round's own, or under Targeting the lowest open one. */
function questFor(v) {
  if (!v.targeting) return v.mission;
  return v.availableQuests.includes(v.round) ? v.round : v.availableQuests[0];
}

/**
 * A team carrying exactly `fails` Evil bots (non-Lancelots first), filled with Good bots,
 * longest names first so banners run long. You ride only when the bots run out.
 */
function plannedTeam(v, size, fails) {
  const ids = bySeat(v)
    .map((p) => p.id)
    .filter((id) => bots.has(id))
    .sort((a, b) => nameOf(b).length - nameOf(a).length);
  const evil = ids.filter((id) => sideOf(id) === "evil").sort((a, b) => isLancelot(a) - isLancelot(b));
  const good = ids.filter((id) => sideOf(id) === "good");
  if (evil.length < fails) log(`  ! only ${evil.length} Evil bots for a planned ${fails} Fail(s)`);
  const team = [...evil.slice(0, fails), ...good.slice(0, size - Math.min(fails, evil.length))];
  for (const id of [...ids, ...(meId ? [meId] : [])]) {
    if (team.length >= size) break;
    if (!team.includes(id)) team.push(id);
  }
  return team.slice(0, size);
}

function randomTeam(v, size) {
  return shuffled(v.players.map((p) => p.id)).slice(0, size);
}

/**
 * The card a bot plays when `want` Fails are planned: Good always Success; a Lancelot under
 * forced cards plays his side; the first `want` Evil riders (forced Lancelots counted first) Fail.
 */
function plannedCard(v, id, want) {
  if (sideOf(id) !== "evil") return "success";
  const forced = (x) => v.lancelotForcedCards && isLancelot(x);
  if (forced(id)) return "fail";
  const evilRiders = v.proposalIds
    .filter((x) => bots.has(x) && sideOf(x) === "evil")
    .sort((a, b) => forced(b) - forced(a));
  const i = evilRiders.indexOf(id);
  return i >= 0 && i < want ? "fail" : "success";
}

function randomCard(v, id) {
  if (sideOf(id) !== "evil") return "success";
  if (v.lancelotForcedCards && isLancelot(id)) return "fail";
  return chance(0.5) ? "fail" : "success";
}

function randomDeal(v) {
  const others = v.players.filter((p) => p.id !== v.leaderId).map((p) => p.id);
  return Object.fromEntries(v.plot.drawn.map((c) => [c.id, pick(others)]));
}

/** Random play for a Plot window: Lead to Victory / King Returns play blind; the others pick a rider. */
function randomWindow(turn, p) {
  if (!chance(p)) return null;
  if (turn.key === "leadToVictory" || turn.key === "kingReturns") return { targetId: null };
  return turn.targets.length ? { targetId: pick(turn.targets).id } : null;
}

/**
 * A policy maps the TV's view to the moves owed right now. Each move names who owes it and a
 * `resolve(botView)` giving [action, payload], or null when the bot's own view hasn't caught
 * up; for your seat the script prints `hint` instead.
 *
 * Options: team(v, quest, size), vote(v, id), card(v, id), deal(v), window(v, turn),
 * excalibur(v, targets), holdReady.
 */
function makePolicy(o) {
  return (v, ctx) => {
    const moves = [];
    const owe = (id, kind, resolve, hint) => id && moves.push({ id, kind, resolve, hint });
    const fixed = (action, payload) => () => [action, payload];
    switch (v.phase) {
      case "reveal":
        if (o.holdReady) break;
        for (const p of v.players) if (!p.ready) owe(p.id, "ready", fixed("ready", {}), "swear in on your phone");
        break;
      case "proposal": {
        if (!rolesKnown()) break;
        const quest = questFor(v);
        const size = v.missionSizes[quest] + v.extraRiders;
        const team = o.team(v, quest, size);
        const payload = { team };
        if (v.targeting) payload.quest = quest;
        if (v.excaliburOn) payload.excaliburId = team.find((id) => id !== v.leaderId);
        owe(
          v.leaderId,
          "propose",
          fixed("propose", payload),
          `propose ${names(team)}${v.targeting ? ` for quest ${quest + 1}` : ""}${
            payload.excaliburId ? `, Excalibur to ${nameOf(payload.excaliburId)}` : ""
          }`
        );
        break;
      }
      case "voting": {
        const charges = (v.plot?.charges ?? []).filter((id) => !v.votedIds.includes(id));
        const left = charges.length ? charges : v.players.map((p) => p.id).filter((id) => !v.votedIds.includes(id));
        for (const id of left) {
          const vote = o.vote(v, id);
          owe(id, "vote", fixed("vote", { vote }), `vote ${vote.toUpperCase()}`);
        }
        break;
      }
      case "quest":
        for (const id of v.proposalIds) {
          const card = bots.has(id) ? o.card(v, id) : "success";
          owe(
            id,
            "card",
            (bv) => (bv?.myCard ? null : ["questCard", { card }]),
            "play your quest card (Success keeps the plan)"
          );
        }
        break;
      case "plotDeal":
        owe(v.leaderId, "deal", () => ["plotDeal", { assignments: o.deal(v) }], "hand out the Plot cards (to bots, to keep the plan)");
        break;
      case "plotResolve":
        if (!v.plot?.pending) break;
        owe(
          v.plot.pending.actorId,
          "resolve",
          (bv) => {
            const t = bv?.plotTurn;
            if (!t || t.kind !== "resolve") return null;
            if (t.key === "restoreHonor") {
              const c = pick(t.takeable);
              return ["plotResolve", { targetId: c.playerId, cardId: c.cardId }];
            }
            return ["plotResolve", { targetId: pick(t.targets).id }];
          },
          `resolve ${v.plot.pending.key}`
        );
        break;
      case "plotWindow":
        if (!v.plot?.window) break;
        owe(
          v.plot.window.askingId,
          "window",
          (bv) => {
            const t = bv?.plotTurn;
            if (!t || t.kind !== "window") return null;
            const play = o.window(v, t);
            return play ? ["plotPlay", play] : ["plotPass", {}];
          },
          `decide on ${v.plot.window.kind} (pass keeps the plan)`
        );
        break;
      case "lady":
        owe(
          v.lady.holderId,
          "lady",
          (bv) => (bv?.ladyTargets?.length ? ["ladyExamine", { targetId: pick(bv.ladyTargets).id }] : null),
          "examine someone with the Lady"
        );
        break;
      case "ladyReveal":
        owe(v.lady.holderId, "ladyPass", fixed("ladyPass", {}), "pass the Lady on");
        break;
      case "excalibur":
        owe(
          v.excalibur.holderId,
          "excalibur",
          (bv) => (bv?.excaliburTargets ? ["excalibur", { targetId: o.excalibur(v, bv.excaliburTargets) }] : null),
          "sheathe Excalibur (or switch a card)"
        );
        break;
      case "excaliburReveal":
        owe(v.excalibur.holderId, "excaliburDone", fixed("excaliburDone", {}), "close the Excalibur result");
        break;
      case "trap":
        owe(v.leaderId, "trap", fixed("trap", { targetId: pick(v.proposalIds) }), "trap a rider");
        break;
      case "trapReveal":
        owe(v.leaderId, "trapDone", fixed("trapDone", {}), "close the trap result");
        break;
      case "assassination": {
        const holder = [...bots.values()].find((b) => b.feed.view?.assassin?.choosing);
        if (holder) {
          owe(holder.id, "assassinate", (bv) =>
            bv?.assassin?.choosing ? ["assassinate", { targetId: pick(bv.assassin.targets).id }] : null
          );
        } else if (meId && ctx.phaseAge > 2500) {
          owe(meId, "assassinate", null, "if your phone shows the blade, name a target");
        }
        break;
      }
    }
    return moves;
  };
}

const STALL_MS = 4000;
const REVEALS = ["voteReveal", "questReveal", "assassinationReveal"];

/**
 * Drive the game with `policy` until `until(view)` holds. Each checkpoint pauses once, the
 * first time its `when(view)` holds, before any bot acts on that view.
 */
async function run(policy, { until, checkpoints = [] }) {
  const fired = new Set();
  const sent = new Set();
  const hinted = new Set();
  let lastSeq = -1;
  let lastProgress = Date.now();
  let lastPhase = null;
  let phaseStart = Date.now();
  let revealWarned = false;
  for (;;) {
    if (host.ended) throw new Error(`The room's stream ended: ${host.ended}`);
    const v = view();
    if (host.seq !== lastSeq) {
      lastSeq = host.seq;
      lastProgress = Date.now();
    }
    const cp = checkpoints.findIndex((c, i) => !fired.has(i) && c.when(v));
    if (cp >= 0) {
      fired.add(cp);
      const c = checkpoints[cp];
      await pause(typeof c.msg === "function" ? c.msg(v) : c.msg);
      lastProgress = Date.now();
      continue;
    }
    if (until(v)) return v;
    if (v.phase !== lastPhase) {
      lastPhase = v.phase;
      phaseStart = Date.now();
      revealWarned = false;
      log(`· ${describe(v)}`);
      if (STEP) {
        await pause(`[step] ${describe(v)}`);
        continue;
      }
    }
    if (REVEALS.includes(v.phase) && !revealWarned && Date.now() - phaseStart > 25000) {
      log("  (the TV acks reveals — is the TV tab open? The server moves on by itself after a grace period.)");
      revealWarned = true;
    }
    if (Date.now() - lastProgress > STALL_MS) {
      sent.clear();
      lastProgress = Date.now();
    }
    const key = turnKey(v);
    for (const m of policy(v, { phaseAge: Date.now() - phaseStart })) {
      const k = `${key}|${m.id}|${m.kind}`;
      const bot = bots.get(m.id);
      if (!bot) {
        if (!hinted.has(k) && m.hint) log(`  → you (${nameOf(m.id)}): ${m.hint}`);
        hinted.add(k);
        continue;
      }
      if (sent.has(k)) continue;
      const step = m.resolve(bot.feed.view);
      if (!step) continue;
      const [action, payload] = step;
      try {
        await post(`/api/room/${code}/action`, { token: bot.token, action, ...payload });
        sent.add(k);
        vlog(`${bot.name}: ${action} ${JSON.stringify(payload)}`);
        if (opt.pace) await sleep(opt.pace);
      } catch (e) {
        if (e instanceof HttpError && e.status === 400) vlog(`${bot.name}: ${action} refused — ${e.message}`);
        else if (e instanceof HttpError && e.status === 404) throw new Error("The room is gone (expired?)");
        else log(`  ! ${bot.name}: ${action} failed — ${e.message}`);
      }
    }
    await host.next(lastSeq, 1000);
  }
}

function describe(v) {
  const q = v.questChosen ? ` · Mission ${v.mission + 1}` : "";
  const lead = v.leaderName ? ` · leader ${v.leaderName}` : "";
  const rej = v.rejections ? ` · ${v.rejections} rejected` : "";
  return `round ${v.round + 1}${q} · ${v.phase}${lead}${rej}`;
}

const isOver = (v) => v.phase === "gameover";

/* ------------------------------------------------------------------ scenarios */

const scripted = (fails, extra = {}) =>
  makePolicy({
    team: (v, q, size) => plannedTeam(v, size, fails[q] ?? 0),
    vote: () => "approve",
    card: (v, id) => plannedCard(v, id, fails[v.mission] ?? 0),
    deal: randomDeal,
    window: () => null,
    excalibur: () => null,
    ...extra,
  });

/** Q1 won, Q2 lost, Q3 won, Q4 lost: Mission 5 decides. */
const twoTwo = (n) => [0, failsNeeded(n)[1], 0, failsNeeded(n)[3]];

async function finish() {
  await pause("Enter to play on to the end (Ctrl+C stops here; the room stays).");
  const v = await run(scripted([]), { until: isOver });
  log(`· game over: ${v.gameover.winner} — ${v.gameover.winReason}`);
}

async function setupMax() {
  const first = Math.min(7, N);
  await openRoom();
  await seatBots(first);
  await hostAct("startSetup");
  await configure({
    specials: ALL_SPECIALS,
    ladyOfTheLake: true,
    excalibur: true,
    plotCards: true,
    targeting: true,
    lancelotSchedule: "known",
    lancelotForcedCards: true,
    timers: true,
    timerForce: true,
  });
  await pause(
    `Court Setup at ${first} seats with all 8 optional roles: the deck is overfull, so the red deck\n` +
      "warning shows. Look at the left column: role rows, the Lancelot row and the advisory must\n" +
      "end above the bottom edge (L1)."
  );
  if (N > first) {
    await seatBots(N);
    await pause(
      `${N} seats now. On the TV, open Customize and each sub-panel (Modules, Timers, Lancelot).\n` +
        `Check L1: nothing runs past 1080 px — the role list with the Lancelot row and advisory,\n` +
        `and the Timers panel beside the ${N}-name seat order.`
    );
  }
  await pause("Done. Enter exits (the room stays in setup; the bots go offline).");
}

async function roles() {
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  const specials = fitSpecials(N, ALL_SPECIALS);
  await configure({ specials, assassination: true });
  const v = await beginCourt();
  const distinct = new Set(v.rolesInPlay).size;
  if (N < 16) log(`  (11 distinct roles need 16 seats; ${N} seats deal ${distinct})`);
  await pause(
    `Roles in Play: ${distinct} distinct roles (T2). The plates must fit the 1920 px stage, and stay\n` +
      `clear of the "still awaiting" list, which holds all ${N} names right now.`
  );
  const half = bySeat(view())
    .map((p) => p.id)
    .filter((id) => bots.has(id))
    .slice(0, Math.floor(N / 2));
  for (const id of half) {
    await post(`/api/room/${code}/action`, { token: bots.get(id).token, action: "ready" });
    if (opt.pace) await sleep(opt.pace);
  }
  await pause("Half the court is sworn in: the awaiting list is shorter. Enter swears in the rest.");
  await run(scripted([]), { until: (v) => v.phase !== "reveal" });
  await pause("Everyone is sworn in. Enter exits (the room stays).");
}

async function tablePlot() {
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  await configure({ plotCards: true, excalibur: true, ladyOfTheLake: true, trapper: false, targeting: false });
  await beginCourt();
  // every card goes to the most crowded seats in turn, and held cards are never played
  let next = 0;
  const crowdedDeal = (v) => {
    const seats = bySeat(v);
    const ids = crowdRank(seats.length)
      .map((i) => seats[i].id)
      .filter((id) => id !== v.leaderId && id !== meId)
      .slice(0, 7);
    return Object.fromEntries(v.plot.drawn.map((c) => [c.id, ids[next++ % ids.length]]));
  };
  const policy = scripted(twoTwo(N), { deal: crowdedDeal });
  await run(policy, {
    until: isOver,
    checkpoints: [
      {
        when: (v) => v.phase === "plotDeal",
        msg: (v) =>
          `The leader's Plot draw: the banner names all ${v.plot.drawn.length} cards drawn. Does it wrap or\n` +
          "run into the bottom seat?",
      },
      {
        when: (v) => v.phase === "plotWindow",
        msg: "A Plot window: the \"Will … play …?\" banner. The bots pass every window, so hands keep growing.",
      },
      {
        when: (v) => v.phase === "voting" && v.mission === 4,
        msg: (v) =>
          `Mission 5 vote: ${v.proposalIds.length} riders in the banner (L2). Check the banner wrap, the bottom\n` +
          "seat against the banner and the last-event line, and the side seats with Plot hands,\n" +
          "Charges, the Lady and Excalibur markers.",
      },
      {
        when: (v) => v.phase === "quest" && v.mission === 4,
        msg: (v) =>
          `Mission 5 riding: the banner lists all ${v.proposalIds.length} riders. Enter plays the cards and\n` +
          "finishes the game.",
      },
    ],
  });
  await pause("Game over. Enter exits (the room stays).");
}

async function questQ5() {
  if (N < 15) log(`  (9-card Mission 5 needs 15–16 seats; ${N} seats ride ${({ 13: 8, 14: 8 })[N] ?? "fewer"})`);
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  await configure({ plotCards: false, excalibur: false, ladyOfTheLake: false, trapper: false, targeting: false });
  await beginCourt();
  await run(scripted([...twoTwo(N), 1]), {
    until: isOver,
    checkpoints: [
      {
        when: (v) => v.phase === "quest" && v.mission === 4,
        msg: (v) =>
          `Mission 5 is riding with ${v.proposalIds.length} riders (one will Fail). Enter plays the cards; then\n` +
          "watch the TV's reveal: every card must sit inside the 1920 px stage (T1).",
      },
    ],
  });
  await pause("Game over. Enter exits (the room stays).");
}

async function gameoverRecap() {
  if (N < 10) log(`  (two-digit tallies need 10+ seats; ${N} seats show single digits)`);
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  await configure({
    plotCards: false,
    excalibur: false,
    ladyOfTheLake: false,
    trapper: false,
    targeting: false,
    rejectionVariant: "forfeit",
  });
  await beginCourt();
  const forfeitRound = (r) => r === 0 || r === 3;
  /** Approvals per approved round (rounds 1, 2, 4): 12, 11, 10 at 16 seats. */
  const approvals = (r) => Math.min(N, Math.max(10, N - 4 - [0, 0, 1, 0, 2][r]));
  const evilBots = [...bots.keys()].filter((id) => sideOf(id) === "evil").length;
  const fails = [0, 0, 0, 0, Math.max(failsNeeded(N)[4], Math.min(3, evilBots))];
  const policy = scripted(fails, {
    vote: (v, id) => {
      if (forfeitRound(v.round)) return "reject";
      const seat = bySeat(v).findIndex((p) => p.id === id);
      return seat < approvals(v.round) ? "approve" : "reject";
    },
  });
  await run(policy, {
    until: isOver,
    checkpoints: [
      {
        when: (v) => v.phase === "proposal" && v.round === 0,
        msg: "Mission 1 will be forfeited: five teams rejected in a row. Enter to start.",
      },
    ],
  });
  await pause(
    "Game over with every recap slot filled: two forfeits, two-digit approval tallies and a\n" +
      "multi-Fail mission. The recap row must fit the 1920 px stage (L3). Enter exits."
  );
}

async function lancelotKnown() {
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  const specials = fitSpecials(N, ["merlin", "mistress", "mordred", "morgana", "lancelotGood", "lancelotEvil", "guinevere"]);
  await configure({ specials, lancelotSchedule: "known", plotCards: false, targeting: false });
  let v = await beginCourt();
  // the known schedule is 5 of 7 cards with 2 switches; 1 deal in 21 has none
  for (let tries = 0; !v.lancelot?.schedule?.includes("switch"); tries++) {
    if (!v.lancelot) throw new Error("No Lancelots were dealt — check --config");
    if (tries >= 20) throw new Error("No switch in 20 deals");
    log("  (no switch in this schedule; redealing)");
    await hostAct("restart");
    await waitFor((v) => v.phase === "setup", "setup", 15000);
    v = await beginCourt();
  }
  const round = v.lancelot.schedule.indexOf("switch") + 1;
  log(`  schedule: ${v.lancelot.schedule.join(" ")} — the first switch lands in round ${round}`);
  await run(scripted(twoTwo(N)), {
    until: (v) => v.phase === "proposal" && v.lancelot.switched,
    checkpoints: [
      {
        when: (v) => v.phase === "proposal" && !v.lancelot.switched,
        msg: `The known schedule, face up top-left beside the quest track. The switch lands in round ${round}.`,
      },
    ],
  });
  await pause(
    `Round ${view().round + 1}: the switch has landed and SWITCHED shows after the allegiance cards.\n` +
      "Check it clears the quest track (L4)."
  );
  await finish();
}

async function full() {
  await openRoom();
  await seatBots(N);
  await hostAct("startSetup");
  if (Object.keys(USER_CONFIG).length) await configure({});
  await beginCourt();
  const policy = makePolicy({
    team: (v, q, size) => randomTeam(v, size),
    vote: (v) => (chance(v.rejections >= 3 ? 0.85 : 0.6) ? "approve" : "reject"),
    card: randomCard,
    deal: randomDeal,
    window: (v, turn) => randomWindow(turn, 0.35),
    excalibur: (v, targets) => (targets.length && chance(0.3) ? pick(targets).id : null),
  });
  const v = await run(policy, { until: isOver });
  log(`· game over: ${v.gameover.winner} — ${v.gameover.winReason}`);
  await pause("Enter exits (the room stays).");
}

/* ------------------------------------------------------------------ main */

const RUNNERS = {
  "setup-max": setupMax,
  roles,
  "table-plot": tablePlot,
  "quest-q5": questQ5,
  "gameover-recap": gameoverRecap,
  "lancelot-known": lancelotKnown,
  full,
};

log(`Scenario ${opt.scenario} at ${N} seats against ${BASE}${opt.me ? `, with you as ${opt.me}` : ""}`);
log(`  ${SCENARIOS[opt.scenario].about}`);
if (opt.me) log("  Deterministic scenarios stay on plan only if you follow the → hints when it's your move.");
try {
  await RUNNERS[opt.scenario]();
  shutdown(0);
} catch (e) {
  if (!shuttingDown) {
    console.error(`\n✗ ${e.message}`);
    shutdown(1);
  }
}

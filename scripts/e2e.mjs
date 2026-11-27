/*
 * End-to-end game flow test against a running server: drives games over the HTTP API and
 * reads each view from the first SSE event of the stream endpoint.
 *
 * Each run creates 3 rooms: games 1–9 share one 5-player room, game 10 is a full 10-player
 * game, and games 11–12 seat 16. The Plot deck is random, so game 11's coverage is
 * opportunistic: it logs which cards and branches it exercised and which it didn't.
 *
 * Not covered: timers pausing while the TV is gone. That needs the host's stream to stay
 * closed for PRESENCE_MS while a phone's stays open; check it by hand.
 */
const BASE = process.env.BASE ?? "http://localhost:3999";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${json.error ?? ""}`);
  return json;
}

/** Like post, but returns the HTTP status instead of throwing. */
async function postStatus(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  await res.text().catch(() => "");
  return res.status;
}

async function readView(code, token) {
  // grab the first SSE event then abort
  const ctrl = new AbortController();
  const res = await fetch(`${BASE}/api/room/${code}/stream?token=${token}`, {
    signal: ctrl.signal,
  });
  if (!res.ok) throw new Error(`stream ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const m = buf.match(/data: (.+)\n\n/);
    if (m) {
      ctrl.abort();
      return JSON.parse(m[1]);
    }
  }
  throw new Error("no event");
}

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT: " + msg);
  console.log("  ok:", msg);
}

// starting sides; a Lancelot's current side comes from his own view
const EVIL = ["mordred", "morgana", "assassin", "minion", "oberon", "lancelotEvil"];
const isLancelotRole = (r) => r === "lancelotGood" || r === "lancelotEvil";
const otherSide = (side) => (side === "evil" ? "good" : "evil");

/* ---- seat helpers over a view (`players[].seat` is the rotation order) ---- */
const bySeat = (v) => [...v.players].sort((a, b) => a.seat - b.seat).map((p) => p.id);
function seatAfter(v, id) {
  const s = bySeat(v);
  return s[(s.indexOf(id) + 1) % s.length];
}
function neighbours(v, id) {
  const s = bySeat(v);
  const i = s.indexOf(id);
  return [s[(i - 1 + s.length) % s.length], s[(i + 1) % s.length]];
}
/** Holders of a Plot card, clockwise from the leader: the order a window asks them in. */
function holdersIn(v, key) {
  const s = bySeat(v);
  const i = s.indexOf(v.leaderId);
  return s
    .map((_, k) => s[(i + k) % s.length])
    .filter((id) => v.plot.hands.some((h) => h.playerId === id && h.cards.some((c) => c.key === key)));
}

/* ---- leak sweep ---- */
const ROLE_KEYS = new Set([
  "merlin", "mistress", "servant", "mordred", "morgana", "assassin",
  "minion", "oberon", "lancelotGood", "lancelotEvil", "guinevere",
]);
/** Where a role key may appear in a view: public deck lists, your own card, the blade's hit, the end. */
const ROLE_PATHS = /^(rolesInPlay\.\d+|config\.specials\.\d+|config\.assassinFlag|role\.key|assassinReveal\.markRole|gameover(\..+)?)$/;
/** GameState fields that must never reach any client under any name. */
const SERVER_ONLY = new Set([
  "roles", "token", "hostToken", "questCards", "secrets", "deck", "checks", "excaliburLog",
  "trapLog", "flagHolderId", "ambushed", "voteMeta", "questMeta", "timerPausedAt",
]);
/** Player-view fields the TV must not carry. */
const PLAYER_ONLY = [
  "role", "me", "myVote", "myCard", "ladyTargets", "ladyResult", "excaliburTargets",
  "excaliburSeen", "trapsSeen", "plotSeen", "plotTurn", "assassin",
];
/** Who has legitimately seen something private this game, by kind. */
const newPrivy = () => ({ lady: new Set(), excalibur: new Set(), trap: new Set(), plot: new Set() });

function walk(v, path, visit) {
  visit(path, v);
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k, visit);
  }
}

/**
 * Read the TV's and every player's view and fail on anything one viewer shouldn't see:
 * a token, a server-only field, a role key tied to anyone but the viewer, or a private
 * result (Lady, Excalibur, trap, Plot) held by someone not in `privy`.
 */
async function sweep(ctx, roleOf, label, privy) {
  const tokens = [ctx.hostToken, ...ctx.players.map((p) => p.token)];
  for (const viewer of [null, ...ctx.players]) {
    const v = await readView(ctx.code, viewer ? viewer.token : ctx.hostToken);
    const leaks = [];
    const json = JSON.stringify(v);
    if (tokens.some((t) => json.includes(t))) leaks.push("a token");
    walk(v, "", (path, value) => {
      const key = path.split(".").pop();
      if (SERVER_ONLY.has(key)) leaks.push(`server-only field ${path}`);
      if (typeof value === "string" && ROLE_KEYS.has(value) && !ROLE_PATHS.test(path)) {
        leaks.push(`role "${value}" at ${path}`);
      }
    });
    if (!viewer) {
      for (const k of PLAYER_ONLY) if (k in v) leaks.push(`player field ${k}`);
    } else {
      const id = viewer.playerId;
      if (v.role && v.role.key !== roleOf[id]) leaks.push("someone else's role");
      if (v.ladyResult && !privy.lady.has(id)) leaks.push("a Lady result it didn't take");
      if (v.excaliburSeen.length && !privy.excalibur.has(id)) leaks.push("an Excalibur original it didn't switch");
      if (v.trapsSeen.length && !privy.trap.has(id)) leaks.push("a trapped card it didn't trap");
      if (v.plotSeen.length && !privy.plot.has(id)) leaks.push("a Plot result shown to someone else");
    }
    if (leaks.length) {
      throw new Error(`ASSERT: ${label}: ${viewer ? viewer.name : "the TV"}'s view leaks ${leaks.join("; ")}`);
    }
  }
  console.log("  ok:", `${label}: no view leaks a role, token, quest card or anyone else's private result`);
}

/** Begin the court in any room and swear everyone in; fills `ctx.roleOf`. */
async function dealRoom(ctx) {
  await post(`/api/room/${ctx.code}/action`, { token: ctx.hostToken, action: "beginCourt" });
  ctx.roleOf = {};
  for (const p of ctx.players) ctx.roleOf[p.playerId] = (await readView(ctx.code, p.token)).role.key;
  for (const p of ctx.players) await post(`/api/room/${ctx.code}/action`, { token: p.token, action: "ready" });
}

const { code, hostToken } = await post("/api/rooms");
console.log("room", code);
const act = (token, action, payload) =>
  post(`/api/room/${code}/action`, { token, action, ...payload });
const actStatus = (token, action, payload) =>
  postStatus(`/api/room/${code}/action`, { token, action, ...payload });

const names = ["Dana", "Miles", "Priya", "Sam", "Jordan"];
const players = [];
const roomA = { code, hostToken, players };
/** private results seen this game in the 5-player room; reset at each deal */
let privy = newPrivy();
/** who led the last team proposed through runMission */
let lastLeaderId = null;
/** whether a Lady check in this run fell on a switched Lancelot */
let ladySawSwitch = false;
for (const name of names) {
  const j = await post(`/api/room/${code}/join`, { name });
  players.push({ name, ...j });
}
assert(players.length === 5, "5 players joined");

let dup = false;
try { await post(`/api/room/${code}/join`, { name: "dana" }); } catch { dup = true; }
assert(dup, "duplicate name rejected");

const re = await post(`/api/room/${code}/join`, { token: players[0].token });
assert(re.playerId === players[0].playerId, "token rejoin reclaims seat");

async function dealAndSwearIn() {
  await act(hostToken, "beginCourt");
  privy = newPrivy();
  const roleOf = {};
  for (const p of players) {
    const pv = await readView(code, p.token);
    roleOf[p.playerId] = pv.role.key;
  }
  await sweep(roomA, roleOf, "the role reveal", privy);
  for (const p of players) await act(p.token, "ready");
  const tv = await readView(code, hostToken);
  assert(["proposal", "plotDeal"].includes(tv.phase), "all sworn in -> the first round");
  console.log("cast:", players.map((p) => `${p.name}=${roleOf[p.playerId]}`).join(" "));
  return roleOf;
}

/**
 * Propose a team, approve unanimously, play the given number of fail cards, ride out the beats.
 * `refused` rides too, has a Fail refused by the server, then plays Success.
 * `opts.sweep` labels a leak sweep run after the first card, while the quest is underway.
 */
async function runMission(roleOf, failers, refused = null, opts = {}) {
  let tv = await readView(code, hostToken);
  const n = tv.teamSize;
  lastLeaderId = tv.leaderId;
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const team = refused ? [refused, ...failers] : [...failers];
  for (const p of players) {
    if (team.length >= n) break;
    if (!team.includes(p)) team.push(p);
  }
  await act(leaderTok, "propose", { team: team.map((p) => p.playerId) });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "quest", "vote acked -> quest");
  if (refused) {
    let blocked = false;
    try { await act(refused.token, "questCard", { card: "fail" }); } catch { blocked = true; }
    assert(blocked, "loyal rider's fail card refused");
    await act(refused.token, "questCard", { card: "success" });
  }
  let swept = !opts.sweep;
  for (const p of team) {
    if (p === refused) continue;
    await act(p.token, "questCard", { card: failers.includes(p) ? "fail" : "success" });
    if (!swept) {
      swept = true;
      await sweep(roomA, roleOf, opts.sweep, privy);
    }
  }
  tv = await readView(code, hostToken);
  assert(tv.phase === "questReveal", "all cards -> questReveal");
  assert(tv.questReveal.fails === failers.length, `quest shows ${failers.length} fails`);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  console.log(`mission done -> ${tv.phase}`, JSON.stringify(tv.questResults));
  return tv;
}

/**
 * The Lady's holder examines an eligible player and passes the token. While the Lancelots
 * are switched she prefers a Lancelot (the check worth making); until then she leaves
 * them for a later check.
 */
async function runLady(roleOf) {
  let tv = await readView(code, hostToken);
  assert(tv.phase === "lady", "quest resolved -> the Lady's turn");
  const holder = players.find((p) => p.playerId === tv.lady.holderId);
  const hv = await readView(code, holder.token);
  assert(
    hv.ladyTargets.every((t) => !tv.lady.pastHolderIds.includes(t.id)),
    "the Lady can't examine a past holder"
  );
  const switched = tv.lancelot?.switched === true;
  const lancelot = (t) => isLancelotRole(roleOf[t.id]);
  const target =
    (switched ? hv.ladyTargets.find(lancelot) : hv.ladyTargets.find((t) => !lancelot(t))) ?? hv.ladyTargets[0];
  await act(holder.token, "ladyExamine", { targetId: target.id });
  const after = await readView(code, holder.token);
  const starting = EVIL.includes(roleOf[target.id]) ? "evil" : "good";
  const turned = switched && lancelot(target);
  assert(
    after.ladyResult.loyalty === (turned ? otherSide(starting) : starting),
    turned ? "the Lady shows a switched Lancelot's current side" : "the Lady shows the true loyalty"
  );
  if (turned) ladySawSwitch = true;
  for (const p of players.filter((p) => p !== holder)) {
    const pv = await readView(code, p.token);
    if (pv.ladyResult?.targetName === target.name) throw new Error("ASSERT: result leaked to " + p.name);
  }
  privy.lady.add(holder.playerId);
  await sweep(roomA, roleOf, "after a Lady check", privy);
  await act(holder.token, "ladyPass");
  tv = await readView(code, hostToken);
  assert(tv.phase === "proposal" && tv.lady.holderId === target.id, "the Lady passes to the examined player");
}

/* ---- game 1: default deck, assassination on, good players must succeed ---- */
await act(hostToken, "startSetup");
{
  const tv = await readView(code, hostToken);
  assert(
    ["merlin", "mistress", "mordred", "morgana"].every((r) => tv.config.specials.includes(r)) &&
      tv.config.specials.length === 4,
    "default specials: merlin, mistress, mordred, morgana"
  );
  assert(tv.config.rejectionVariant === "forfeit", "default rejection rule forfeits the quest");
  await act(hostToken, "updateConfig", { config: { specials: [...tv.config.specials, "oberon"] } });
  let full = false;
  try { await act(hostToken, "beginCourt"); } catch { full = true; }
  assert(full, "a third evil special can be chosen, but 5 players can't begin with it");
  await act(hostToken, "updateConfig", { config: { specials: tv.config.specials } });
}
let roleOf = await dealAndSwearIn();
let evils = players.filter((p) => EVIL.includes(roleOf[p.playerId]));
let goods = players.filter((p) => !evils.includes(p));
assert(evils.length === 2, "2 evil at 5 players");

// rejected vote passes the crown and lights a candle
{
  let tv = await readView(code, hostToken);
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  for (const team of [5, {}]) {
    const status = await actStatus(leaderTok, "propose", { team });
    assert(status === 400, `a malformed team (${JSON.stringify(team)}) is refused with a 400 (got ${status})`);
  }
  await act(leaderTok, "propose", { team: [goods[0].playerId, goods[1].playerId] });
  for (const p of players) await act(p.token, "vote", { vote: "reject" });
  tv = await readView(code, hostToken);
  assert(tv.voteReveal && !tv.voteReveal.approved, "rejection tallied");
  let early = false;
  try { await act(hostToken, "ack"); } catch { early = true; }
  assert(early, "early ack refused");
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.rejections === 1 && tv.phase === "proposal", "crown passed, candle snuffed");
}

let tv = await runMission(roleOf, [], null, { sweep: "mid-quest" }); // M1 ✓
tv = await runMission(roleOf, []); // M2 ✓
tv = await runMission(roleOf, [evils[0]], goods[0]); // M3 ✗ — a loyal rider tries to fail and can't
assert(tv.questResults[2] && tv.questResults[2].fails === 1, "only the evil fail card counted");
tv = await runMission(roleOf, []); // M4 ✓ -> three wins
assert(tv.phase === "assassination", "3 wins -> assassination");

{
  let chooser = null;
  for (const p of evils) {
    const pv = await readView(code, p.token);
    if (pv.assassin?.choosing) chooser = { p, pv };
  }
  assert(chooser, "flag holder is choosing");
  const merlinP = players.find((p) => roleOf[p.playerId] === "merlin");
  const targetIds = chooser.pv.assassin.targets.map((t) => t.id);
  assert(targetIds.includes(merlinP.playerId), "merlin among targets");
  await act(chooser.p.token, "assassinate", { targetId: merlinP.playerId });
  tv = await readView(code, hostToken);
  assert(tv.phase === "assassinationReveal" && tv.assassinReveal.hit, "blade lands on merlin");
  await sleep(5300);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "gameover" && tv.gameover.winner === "evil", "evil wins by assassination");
  assert(tv.gameover.recap.length === 4, "recap has 4 missions");
}

/* ---- game 2: assassination toggled off -> three quests decide it outright ---- */
await act(hostToken, "playAgain");
tv = await readView(code, hostToken);
assert(tv.phase === "setup" && tv.playerCount === 5, "play again -> setup, players kept");
await act(hostToken, "updateConfig", { config: { assassination: false, ladyOfTheLake: true } });
tv = await readView(code, hostToken);
assert(tv.config.assassination === false, "assassination toggled off");
assert(tv.config.ladyOfTheLake === true, "Lady of the Lake toggled on");

/* host restart mid-game -> back to setup, same seats, config kept */
roleOf = await dealAndSwearIn();
tv = await readView(code, hostToken);
assert(tv.leaderId === seatAfter(tv, lastLeaderId), "play again: the seat after the last leader to pick a team leads first");
const firstLeaderG2 = tv.leaderId;
await act(hostToken, "restart");
tv = await readView(code, hostToken);
assert(tv.phase === "setup" && tv.playerCount === 5, "restart mid-game -> setup, players kept");
assert(tv.config.assassination === false, "restart keeps config");
assert(tv.players.every((p) => !p.ready), "restart clears sworn-in state");

roleOf = await dealAndSwearIn();
{
  const tv = await readView(code, hostToken);
  const seats = [...tv.players].sort((a, b) => a.seat - b.seat);
  const li = seats.findIndex((p) => p.id === tv.leaderId);
  assert(
    tv.lady.holderId === seats[(li - 1 + seats.length) % seats.length].id,
    "the Lady starts on the first leader's right"
  );
  assert(tv.leaderId === firstLeaderG2, "a restart before any team was picked keeps the same first leader");
}

// five rejected proposals forfeit M1 to Evil and move on to M2
for (let i = 0; i < 5; i++) {
  tv = await readView(code, hostToken);
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const team = players.slice(0, tv.teamSize).map((p) => p.playerId);
  await act(leaderTok, "propose", { team });
  for (const p of players) await act(p.token, "vote", { vote: "reject" });
  await sleep(6100);
  await act(hostToken, "ack");
}
tv = await readView(code, hostToken);
assert(
  tv.phase === "proposal" && tv.mission === 1 && tv.rejections === 0 &&
    tv.questResults[0] && !tv.questResults[0].success,
  "5 rejections -> M1 forfeited, on to M2"
);

await runMission(roleOf, []); // M2 ✓
await runLady(roleOf);
await runMission(roleOf, []); // M3 ✓
await runLady(roleOf);
tv = await runMission(roleOf, []); // M4 ✓ — game over, so no third check
assert(
  tv.phase === "gameover" && tv.gameover.winner === "good",
  "3 wins with blade sheathed -> good wins outright, no assassination"
);

/* ---- game 3: Excalibur and Trapper on one quest ---- */
await act(hostToken, "playAgain");
await act(hostToken, "updateConfig", { config: { excalibur: true, trapper: true, ladyOfTheLake: false } });
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(tv.teamSize === tv.missionSizes[0] + 1, "Trapper adds one rider to the team");
  const leaderP = players.find((p) => p.playerId === tv.leaderId);
  const evil = players.find((p) => EVIL.includes(roleOf[p.playerId]));
  const team = [evil];
  for (const p of players) if (team.length < tv.teamSize && !team.includes(p)) team.push(p);
  const ids = team.map((p) => p.playerId);

  let kept = false;
  try { await act(leaderP.token, "propose", { team: ids, excaliburId: leaderP.playerId }); } catch { kept = true; }
  assert(kept, "the leader can't keep Excalibur");

  const wielder = team.find((p) => p !== leaderP && p !== evil);
  await act(leaderP.token, "propose", { team: ids, excaliburId: wielder.playerId });
  tv = await readView(code, hostToken);
  assert(tv.excalibur?.holderId === wielder.playerId, "the TV shows who carries Excalibur");
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");

  const played = {};
  for (const p of team) {
    played[p.playerId] = p === evil ? "fail" : "success";
    await act(p.token, "questCard", { card: played[p.playerId] });
  }
  tv = await readView(code, hostToken);
  assert(tv.phase === "excalibur", "all cards in -> Excalibur");

  await act(wielder.token, "excalibur", { targetId: evil.playerId });
  const wv = await readView(code, wielder.token);
  assert(
    wv.excaliburSeen.some((e) => e.targetName === evil.name && e.original === "fail"),
    "the wielder sees the card as originally played"
  );
  let leaked = false;
  for (const p of players.filter((p) => p !== wielder)) {
    if ((await readView(code, p.token)).excaliburSeen.length) leaked = true;
  }
  assert(!leaked, "no one else sees the original card");
  privy.excalibur.add(wielder.playerId);
  await sweep(roomA, roleOf, "after an Excalibur switch", privy);
  await act(wielder.token, "excaliburDone");
  played[evil.playerId] = "success";

  tv = await readView(code, hostToken);
  assert(tv.phase === "trap", "Excalibur sheathed -> the trap");
  const trappedP = team.includes(leaderP) ? leaderP : team[team.length - 1];
  await act(leaderP.token, "trap", { targetId: trappedP.playerId });
  tv = await readView(code, hostToken);
  assert(tv.phase === "trapReveal" && tv.trap.targetId === trappedP.playerId, "the TV names the trapped rider");
  const lv = await readView(code, leaderP.token);
  assert(
    lv.trapsSeen.some((t) => t.targetName === trappedP.name && t.card === played[trappedP.playerId]),
    "the leader sees the trapped card, after the switch"
  );
  privy.trap.add(leaderP.playerId);
  await sweep(roomA, roleOf, "at the trap", privy);
  await act(leaderP.token, "trapDone");

  tv = await readView(code, hostToken);
  const expectedFails = team.filter((p) => p !== trappedP && played[p.playerId] === "fail").length;
  assert(
    tv.phase === "questReveal" &&
      tv.questReveal.cards.length === tv.missionSizes[0] &&
      tv.questReveal.fails === expectedFails,
    "the trapped card is left out and the switched card counts"
  );
}

/* ---- game 4: Lancelots (known schedule, forced cards) and Guinevere ---- */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", {
  config: {
    assassination: true,
    excalibur: false,
    trapper: false,
    specials: ["merlin", "lancelotEvil", "guinevere"], // one Lancelot pulls in his pair
    lancelotSchedule: "known",
    lancelotForcedCards: true,
  },
});
tv = await readView(code, hostToken);
assert(
  ["merlin", "lancelotGood", "lancelotEvil", "guinevere"].every((r) => tv.config.specials.includes(r)),
  "Lancelots come as a pair"
);
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(tv.lancelot.schedule.length === 5, "five allegiance cards dealt face up");
  const byRole = (r) => players.find((p) => roleOf[p.playerId] === r);
  const good = byRole("lancelotGood");
  const evil = byRole("lancelotEvil");
  const view = async (p) => readView(code, p.token);

  const gv = await view(byRole("guinevere"));
  assert(
    JSON.stringify(gv.role.knowledge.names) === JSON.stringify([good.name, evil.name].sort((a, b) => a.localeCompare(b))),
    "Guinevere sees both Lancelots"
  );
  const av = await view(byRole("assassin"));
  assert(av.role.knowledge.names.includes(evil.name), "Evil sees the Evil Lancelot");
  const ev = await view(evil);
  assert(ev.role.knowledge.names.length === 0, "the Evil Lancelot sees no one");
  const mv = await view(byRole("merlin"));
  assert(mv.role.knowledge.names.includes(evil.name), "Merlin sees the starting Evil Lancelot");

  const goodNow = (await view(good)).role.allegiance;
  assert(goodNow === (tv.lancelot.switched ? "evil" : "good"), "round-1 card sets the Lancelots' sides");
  const nowEvil = goodNow === "evil" ? good : evil;
  const nowGood = nowEvil === good ? evil : good;

  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  await act(leaderTok, "propose", { team: [good.playerId, evil.playerId] });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");

  let refused = false;
  try { await act(nowEvil.token, "questCard", { card: "success" }); } catch { refused = true; }
  assert(refused, "a forced Evil Lancelot can't play Success");
  refused = false;
  try { await act(nowGood.token, "questCard", { card: "fail" }); } catch { refused = true; }
  assert(refused, "a forced Good Lancelot can't play Fail");
  await act(nowEvil.token, "questCard", { card: "fail" });
  await act(nowGood.token, "questCard", { card: "success" });
  tv = await readView(code, hostToken);
  assert(tv.phase === "questReveal" && tv.questReveal.fails === 1, "forced cards counted");
}

/*
 * ---- game 5: hidden Lancelot schedule with the Lady, and the blade finding Guinevere ----
 * Quests go ✓ ✗ ✓ ✗ ✓ so all three hidden cards flip (rounds 3–5) and the Lady checks three
 * times; whether a check falls on a switched Lancelot depends on the deal and is logged.
 */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", {
  config: { lancelotSchedule: "hidden", lancelotForcedCards: false, ladyOfTheLake: true },
});
roleOf = await dealAndSwearIn();
{
  const byRole = (r) => players.find((p) => roleOf[p.playerId] === r);
  const assassinP = byRole("assassin");
  const merlinP = byRole("merlin");
  const guinP = byRole("guinevere");
  assert(assassinP && merlinP && guinP, "Merlin, Guinevere and an Assassin are dealt");
  ladySawSwitch = false;
  await runMission(roleOf, [], null, { sweep: "mid-quest, Lancelots dealt" }); // Q1 ✓
  await runMission(roleOf, [assassinP]); // Q2 ✗
  await runLady(roleOf);
  await runMission(roleOf, []); // Q3 ✓
  await runLady(roleOf);
  await runMission(roleOf, [assassinP]); // Q4 ✗
  await runLady(roleOf);
  tv = await runMission(roleOf, []); // Q5 ✓
  assert(tv.phase === "assassination", "three wins with Merlin in -> assassination");
  assert(
    tv.lancelot.schedule === null && tv.lancelot.flips.length === 3,
    "the hidden deck flipped one card at the start of each of rounds 3–5"
  );
  console.log(
    ladySawSwitch
      ? "  (a Lady check fell on a switched Lancelot this run)"
      : "  (no Lady check fell on a switched Lancelot this run)"
  );
  const av = await readView(code, assassinP.token);
  assert(
    av.assassin?.choosing && av.assassin.targets.some((t) => t.id === guinP.playerId),
    "Guinevere is among the blade's targets"
  );
  await act(assassinP.token, "assassinate", { targetId: guinP.playerId });
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "assassinationReveal" &&
      tv.assassinReveal.hit &&
      tv.assassinReveal.markRole === "guinevere" &&
      tv.assassinReveal.guinevereName === guinP.name &&
      tv.assassinReveal.merlinName === merlinP.name,
    "with Merlin in, the blade finding Guinevere is a hit"
  );
  await sleep(5300);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "gameover" && tv.gameover.winner === "evil", "naming Guinevere wins for Evil");
  const switched = tv.lancelot.switched;
  assert(
    tv.gameover.cast.every((c) => {
      const p = players.find((x) => x.name === c.name);
      const starting = EVIL.includes(c.role) ? "evil" : "good";
      const side = isLancelotRole(c.role) && switched ? otherSide(starting) : starting;
      return c.role === roleOf[p.playerId] && c.allegiance === side;
    }),
    `the cast shows each player's side at the end (Lancelots ${switched ? "switched" : "on their starting sides"})`
  );
}

/*
 * ---- game 6: Guinevere without Merlin, and the unopposed rejection rule ----
 * With Guinevere in the deck the blade still falls when Merlin rests. Four rejections
 * first, so the 5th team rides without a vote.
 */
await act(hostToken, "playAgain");
await act(hostToken, "updateConfig", {
  config: {
    specials: ["lancelotGood", "lancelotEvil", "guinevere"],
    ladyOfTheLake: false,
    rejectionVariant: "unopposed",
  },
});
tv = await readView(code, hostToken);
assert(
  !tv.config.specials.includes("merlin") && tv.config.specials.includes("guinevere") && tv.config.assassination,
  "Guinevere and the Lancelots in, Merlin resting, assassination on"
);
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(
    tv.rolesInPlay.includes("assassin") && !tv.rolesInPlay.includes("merlin"),
    "with Guinevere in the deck, the Assassin is dealt even without Merlin"
  );
  for (let i = 0; i < 4; i++) {
    tv = await readView(code, hostToken);
    const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
    await act(leaderTok, "propose", { team: players.slice(0, tv.teamSize).map((p) => p.playerId) });
    for (const p of players) await act(p.token, "vote", { vote: "reject" });
    await sleep(6100);
    await act(hostToken, "ack");
  }
  tv = await readView(code, hostToken);
  assert(tv.phase === "proposal" && tv.rejections === 4, "four rejections, and the 5th leader proposes");
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  await act(leaderTok, "propose", { team: players.slice(0, tv.teamSize).map((p) => p.playerId) });
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "quest" && tv.votedIds.length === 0 && !tv.voteReveal,
    "unopposed: the 5th team rides without a vote"
  );
  for (const id of tv.proposalIds) {
    await act(players.find((p) => p.playerId === id).token, "questCard", { card: "success" });
  }
  tv = await readView(code, hostToken);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "proposal" && tv.questResults[0]?.success && tv.rejections === 0,
    "the unopposed quest counts and the candles relight"
  );
  await runMission(roleOf, []);
  tv = await runMission(roleOf, []);
  assert(tv.phase === "assassination", "three wins with Guinevere and no Merlin -> assassination");
  const assassinP = players.find((p) => roleOf[p.playerId] === "assassin");
  const guinP = players.find((p) => roleOf[p.playerId] === "guinevere");
  const av = await readView(code, assassinP.token);
  assert(
    av.assassin?.choosing && av.assassin.targets.some((t) => t.id === guinP.playerId),
    "the Assassin holds the blade and may name Guinevere"
  );
  await act(assassinP.token, "assassinate", { targetId: guinP.playerId });
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "assassinationReveal" &&
      tv.assassinReveal.hit &&
      tv.assassinReveal.markRole === "guinevere" &&
      tv.assassinReveal.merlinName === null &&
      tv.assassinReveal.guinevereName === guinP.name,
    "the blade finds Guinevere; the TV names no Merlin"
  );
  await sleep(5300);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "gameover" && tv.gameover.winner === "evil" && tv.gameover.recap[0].unopposed === true,
    "Evil wins, and the recap marks the first quest as ridden unopposed"
  );
}

/* ---- game 7: a forced vote timer runs out ---- */
await act(hostToken, "restart");
let badTimer = false;
try { await act(hostToken, "updateConfig", { config: { timerSeconds: { voting: 5 } } }); } catch { badTimer = true; }
assert(badTimer, "timers can't go below 10 seconds");
await act(hostToken, "updateConfig", {
  config: { timers: true, timerForce: true, timerSeconds: { voting: 10 } },
});
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(tv.timer && tv.timer.forced, "the TV gets a forced countdown");
  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  await act(leaderTok, "propose", { team: players.slice(0, tv.teamSize).map((p) => p.playerId) });
  await act(players[0].token, "vote", { vote: "approve" });
  await sleep(10600);
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "voteReveal" && tv.voteReveal.votes.every((x) => x.vote),
    "at zero, the missing votes are cast at random"
  );
}

/* ---- game 8: Targeting, with the Lady and a forfeit ---- */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", {
  config: {
    timers: false,
    targeting: true,
    specials: ["merlin", "mistress", "mordred", "morgana"],
    ladyOfTheLake: true,
    rejectionVariant: "forfeit",
  },
});
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(
    JSON.stringify(tv.availableQuests) === JSON.stringify([0, 1, 2, 3]),
    "the 5th quest is sealed until two others succeed"
  );
  let leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  const teamFor = (q) => players.slice(0, tv.missionSizes[q]).map((p) => p.playerId);
  let refused = false;
  try { await act(leaderTok, "propose", { team: teamFor(4), quest: 4 }); } catch { refused = true; }
  assert(refused, "the sealed 5th quest can't be chosen");
  refused = false;
  try { await act(leaderTok, "propose", { team: teamFor(2) }); } catch { refused = true; }
  assert(refused, "a quest must be chosen");

  await act(leaderTok, "propose", { team: teamFor(2), quest: 2 });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(tv.phase === "quest" && tv.mission === 2, "the team rides for the chosen quest");
  for (const id of teamFor(2)) {
    await act(players.find((p) => p.playerId === id).token, "questCard", { card: "success" });
  }
  tv = await readView(code, hostToken);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "proposal" && tv.round === 1 && tv.questResults[2]?.success && !tv.questResults[0],
    "the result lands on the chosen quest, and the round advances"
  );
  assert(!tv.availableQuests.includes(2), "an attempted quest can't be attempted again");
  leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  refused = false;
  try { await act(leaderTok, "propose", { team: teamFor(2), quest: 2 }); } catch { refused = true; }
  assert(refused, "proposing an attempted quest is refused");

  // the Lady counts resolved quests, not quest numbers: Q3 then Q1 brings her out
  await act(leaderTok, "propose", { team: teamFor(0), quest: 0 });
  for (const p of players) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  for (const id of teamFor(0)) {
    await act(players.find((p) => p.playerId === id).token, "questCard", { card: "success" });
  }
  tv = await readView(code, hostToken);
  await sleep(1600 + tv.questReveal.cards.length * 1200 + 2100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  assert(
    tv.phase === "lady" && tv.round === 2 && tv.questResults[0]?.success && tv.questResults[2]?.success && !tv.questResults[1],
    "the Lady comes after the 2nd resolved quest (Q3, then Q1)"
  );
  await runLady(roleOf);

  // four proposals for Q2, then a fifth for Q4: the forfeit lands on Q4
  for (let i = 0; i < 5; i++) {
    tv = await readView(code, hostToken);
    const q = i < 4 ? 1 : 3;
    leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
    await act(leaderTok, "propose", { team: teamFor(q), quest: q });
    for (const p of players) await act(p.token, "vote", { vote: "reject" });
    await sleep(6100);
    await act(hostToken, "ack");
  }
  tv = await readView(code, hostToken);
  assert(
    tv.questResults[3] && !tv.questResults[3].success && !tv.questResults[1],
    "the forfeit lands on the last proposal's quest"
  );
  assert(tv.phase === "lady", "a forfeited quest counts as resolved, so the Lady follows it");
  await runLady(roleOf);
}

/* ---- game 9: Plot cards ---- */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", { config: { targeting: false, trapper: true, ladyOfTheLake: false } });
await act(hostToken, "updateConfig", { config: { plotCards: true } });
tv = await readView(code, hostToken);
assert(tv.config.plotCards && !tv.config.trapper, "Plot cards switch Trapper off");
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(tv.phase === "plotDeal" && tv.plot.drawn.length === 1, "the leader draws 1 Plot card at 5 players");
  const leaderP = players.find((p) => p.playerId === tv.leaderId);
  const card = (await readView(code, leaderP.token)).plotTurn.cards[0];
  const status = await actStatus(leaderP.token, "plotDeal", { assignments: 5 });
  assert(status === 400, `malformed Plot assignments are refused with a 400 (got ${status})`);
  let kept = false;
  try { await act(leaderP.token, "plotDeal", { assignments: { [card.id]: leaderP.playerId } }); } catch { kept = true; }
  assert(kept, "the leader can't keep a Plot card");
  const to = players.find((p) => p !== leaderP);
  await act(leaderP.token, "plotDeal", { assignments: { [card.id]: to.playerId } });
  tv = await readView(code, hostToken);
  assert(tv.plot.deckCount === 6, "6 cards left in the 7-card deck");
  // the 5–6 deck's only use-immediately card, Restore Your Honor, has nothing to take in round 1
  assert(tv.phase === "proposal", "Plot cards handed out -> proposal");
  if (card.key === "charge") assert(tv.plot.charges.includes(to.playerId), "Charge stays in play");
  else if (card.key === "restoreHonor") assert(!tv.plot.hands.length, "Restore Your Honor with nothing to take does nothing");
  else
    assert(
      tv.plot.hands.some((h) => h.playerId === to.playerId && h.cards.some((c) => c.id === card.id)),
      "a held card sits face up in front of its holder"
    );

  const leaderTok = players.find((p) => p.playerId === tv.leaderId).token;
  await act(leaderTok, "propose", { team: players.slice(0, tv.teamSize).map((p) => p.playerId) });
  if (card.key === "charge") {
    const other = players.find((p) => p !== to);
    let early = false;
    try { await act(other.token, "vote", { vote: "approve" }); } catch { early = true; }
    assert(early, "Charge holders vote first");
  }
  for (const p of [to, ...players.filter((p) => p !== to)]) await act(p.token, "vote", { vote: "approve" });
  await sleep(6100);
  await act(hostToken, "ack");
  tv = await readView(code, hostToken);
  if (card.key === "kingReturns") {
    assert(tv.phase === "plotWindow" && tv.plot.window.askingId === to.playerId, "King Returns' holder is asked after an approval");
    await act(to.token, "plotPlay", {});
    tv = await readView(code, hostToken);
    assert(tv.rejections === 1 && !tv.plot.hands.length, "King Returns cancels the team as a rejected vote");
  } else {
    assert(tv.phase === "quest", "the approved team rides");
  }
  console.log(`  (Plot card this run: ${card.key})`);
}

/*
 * ---- game 10: a full 10-player game in its own room ----
 * Oberon in the deck (so the Assassin takes the 4th Evil seat), Lady of the Lake,
 * Excalibur and Plot cards on. A driver answers whatever phase comes up, since Plot
 * cards and seats are random: every team is approved, every Plot window passes, Excalibur
 * stays sheathed, and Evil fails only where planned. Quest 3 falls to one Fail; quest 4
 * survives one Fail because it needs two.
 */
{
  const room = await post("/api/rooms");
  const code10 = room.code;
  const host10 = room.hostToken;
  const act10 = (token, action, payload) => post(`/api/room/${code10}/action`, { token, action, ...payload });
  const view10 = (token) => readView(code10, token);
  const ps = [];
  for (const name of ["Ash", "Bea", "Cal", "Dee", "Eli", "Fay", "Gus", "Hal", "Ivy", "Jo"]) {
    ps.push({ name, ...(await post(`/api/room/${code10}/join`, { name })) });
  }
  const tokenOf = (id) => ps.find((p) => p.playerId === id).token;

  await act10(host10, "startSetup");
  await act10(host10, "updateConfig", {
    config: {
      specials: ["merlin", "mistress", "mordred", "morgana", "oberon"],
      ladyOfTheLake: true,
      excalibur: true,
      plotCards: true,
    },
  });
  let t = await view10(host10);
  assert(
    t.playerCount === 10 && JSON.stringify(t.missionSizes) === "[3,4,4,5,5]" && t.failsNeeded[3] === 2,
    "10 players: teams of 3-4-4-5-5, two Fails on the 4th"
  );
  await act10(host10, "beginCourt");

  const role = {};
  for (const p of ps) role[p.playerId] = (await view10(p.token)).role.key;
  const byRole = (r) => ps.filter((p) => role[p.playerId] === r);
  const evils10 = ps.filter((p) => EVIL.includes(role[p.playerId]));
  assert(
    evils10.length === 4 && byRole("assassin").length === 1 && byRole("oberon").length === 1,
    "4 Evil at 10: Mordred, Morgana, Oberon and an Assassin card"
  );
  const merlin = byRole("merlin")[0];
  const oberon = byRole("oberon")[0];
  const mordred = byRole("mordred")[0];
  const sees = async (p) => (await view10(p.token)).role.knowledge.names;
  const merlinSees = await sees(merlin);
  assert(merlinSees.includes(oberon.name) && !merlinSees.includes(mordred.name), "Merlin sees Oberon but not Mordred");
  assert((await sees(oberon)).length === 0, "Oberon sees no one");
  assert(!(await sees(mordred)).includes(oberon.name), "Evil doesn't see Oberon");

  for (const p of ps) await act10(p.token, "ready");
  t = await view10(host10);
  assert(t.phase === "plotDeal" && t.plot.drawn.length === 3, "the leader draws 3 Plot cards at 10 players");

  const failPlan = [0, 0, 1, 1, 0];
  const expectWin = [true, true, false, true, true];
  const failersFor = (q) => evils10.slice(0, failPlan[q]);
  const resolved = new Set();
  let ladyChecks = 0;
  const privy10 = newPrivy();
  for (let step = 0; step < 300; step++) {
    t = await view10(host10);
    if (t.phase === "assassination" || t.phase === "gameover") break;
    switch (t.phase) {
      case "plotDeal": {
        const others = ps.filter((p) => p.playerId !== t.leaderId);
        const assignments = Object.fromEntries(t.plot.drawn.map((c, i) => [c.id, others[i % others.length].playerId]));
        await act10(tokenOf(t.leaderId), "plotDeal", { assignments });
        break;
      }
      case "plotResolve": {
        const actor = t.plot.pending.actorId;
        const turn = (await view10(tokenOf(actor))).plotTurn;
        const choice =
          turn.key === "restoreHonor"
            ? { targetId: turn.takeable[0].playerId, cardId: turn.takeable[0].cardId }
            : { targetId: turn.targets[0].id };
        await act10(tokenOf(actor), "plotResolve", choice);
        // Are You the One shows the actor a loyalty; the other ★ loyalty cards show the chosen player one
        if (turn.key === "areYouTheOne") privy10.plot.add(actor);
        else if (turn.key !== "restoreHonor") privy10.plot.add(choice.targetId);
        break;
      }
      case "plotWindow":
        await act10(tokenOf(t.plot.window.askingId), "plotPass");
        break;
      case "lady": {
        const holder = tokenOf(t.lady.holderId);
        const target = (await view10(holder)).ladyTargets[0];
        await act10(holder, "ladyExamine", { targetId: target.id });
        const seen = (await view10(holder)).ladyResult;
        ladyChecks += 1;
        privy10.lady.add(t.lady.holderId);
        assert(
          seen.loyalty === (EVIL.includes(role[target.id]) ? "evil" : "good"),
          `Lady check ${ladyChecks} shows the true loyalty`
        );
        await act10(holder, "ladyPass");
        break;
      }
      case "proposal": {
        const team = [...failersFor(t.mission)];
        for (const p of ps) {
          if (team.length < t.teamSize && !team.includes(p) && !EVIL.includes(role[p.playerId])) team.push(p);
        }
        const wielder = team.find((p) => p.playerId !== t.leaderId);
        await act10(tokenOf(t.leaderId), "propose", {
          team: team.map((p) => p.playerId),
          excaliburId: wielder.playerId,
        });
        break;
      }
      case "voting":
        // Charge holders first, as the card requires
        for (const id of [...new Set([...t.plot.charges, ...ps.map((p) => p.playerId)])]) {
          if (!t.votedIds.includes(id)) await act10(tokenOf(id), "vote", { vote: "approve" });
        }
        break;
      case "voteReveal":
        await sleep(6100);
        await act10(host10, "ack");
        break;
      case "quest": {
        const failers = new Set(failersFor(t.mission).map((p) => p.playerId));
        for (const id of t.proposalIds) {
          await act10(tokenOf(id), "questCard", { card: failers.has(id) ? "fail" : "success" });
        }
        break;
      }
      case "excalibur":
        await act10(tokenOf(t.excalibur.holderId), "excalibur", { targetId: null });
        break;
      case "questReveal": {
        const q = t.mission;
        assert(
          t.questReveal.success === expectWin[q],
          `quest ${q + 1} ${expectWin[q] ? "succeeds" : "fails"} with ${failPlan[q]} Fail`
        );
        resolved.add(q);
        await sleep(1600 + t.questReveal.cards.length * 1200 + 2100);
        await act10(host10, "ack");
        break;
      }
      default:
        throw new Error("ASSERT: the 10-player driver hit an unexpected phase: " + t.phase);
    }
  }
  assert(t.phase === "assassination" && resolved.size === 4, "three quests won of four -> assassination");
  assert(ladyChecks === 2, "the Lady checked after quests 2 and 3, and not after the game was decided");
  await sweep({ code: code10, hostToken: host10, players: ps }, role, "10 players, at the assassination", privy10);

  const assassin = byRole("assassin")[0];
  const targets = (await view10(assassin.token)).assassin.targets.map((x) => x.id);
  assert(
    targets.includes(oberon.playerId) && !targets.includes(mordred.playerId),
    "the Assassin may name Oberon but not known Evil"
  );
  let refused = false;
  try { await act10(assassin.token, "assassinate", { targetId: mordred.playerId }); } catch { refused = true; }
  assert(refused, "naming a known Evil player is refused");
  const miss = ps.find((p) => !EVIL.includes(role[p.playerId]) && role[p.playerId] !== "merlin");
  await act10(assassin.token, "assassinate", { targetId: miss.playerId });
  await sleep(5300);
  await act10(host10, "ack");
  t = await view10(host10);
  assert(
    t.phase === "gameover" && t.gameover.winner === "good" && t.gameover.recap.length === 4,
    "the blade misses -> Good wins the 10-player game"
  );
}

/*
 * ---- games 11–12: 16 players in a third room ----
 * Seats fill one by one, checking the house tables at 11, 13 and 16.
 */
const C = { code: null, hostToken: null, players: [], roleOf: {} };
{
  const room = await post("/api/rooms");
  C.code = room.code;
  C.hostToken = room.hostToken;
}
const actC = (token, action, payload) => post(`/api/room/${C.code}/action`, { token, action, ...payload });
const viewC = (token) => readView(C.code, token);
const tokC = (id) => C.players.find((p) => p.playerId === id).token;
const nameC = (id) => C.players.find((p) => p.playerId === id).name;
{
  // copied from MISSION_SIZES and failsNeeded in lib/rules.ts
  const TABLES = {
    11: { sizes: [3, 4, 5, 6, 6], fails: [1, 1, 1, 2, 1] },
    13: { sizes: [4, 5, 5, 6, 8], fails: [1, 1, 1, 2, 2] },
    16: { sizes: [4, 5, 5, 6, 9], fails: [1, 1, 1, 2, 2] },
  };
  const names16 = [
    "Ada", "Ben", "Cora", "Dov", "Eve", "Finn", "Gail", "Hugo",
    "Iris", "Jude", "Kai", "Lena", "Moss", "Nell", "Otto", "Bartholomewski",
  ];
  for (const name of names16) {
    C.players.push({ name, ...(await post(`/api/room/${C.code}/join`, { name })) });
    const table = TABLES[C.players.length];
    if (table) {
      const t = await viewC(C.hostToken);
      assert(
        JSON.stringify(t.missionSizes) === JSON.stringify(table.sizes) &&
          JSON.stringify(t.failsNeeded) === JSON.stringify(table.fails),
        `${C.players.length} players: teams of ${table.sizes.join("-")}, Fails needed ${table.fails.join("-")}`
      );
    }
  }
  let full = false;
  try { await post(`/api/room/${C.code}/join`, { name: "Quill" }); } catch { full = true; }
  assert(full, "a 17th player is refused");
}

/*
 * ---- game 11: Plot cards at 16 (4 draws a round), with Excalibur and forced timers ----
 * The Plot timer is 10 s and every other timer 10 minutes, so only a Plot decision the
 * driver deliberately leaves alone is forced. The driver plays each held card the first
 * time it can and passes after that, deals copies of a held card to different players so
 * two holders can meet in one window, and steers quests toward a 2–2 split so the game
 * runs all five rounds. Whatever the deck deals is exercised and asserted, and the end
 * logs what was and wasn't covered.
 */
await actC(C.hostToken, "startSetup");
await actC(C.hostToken, "updateConfig", {
  config: {
    plotCards: true,
    excalibur: true,
    ladyOfTheLake: false,
    assassination: false,
    rejectionVariant: "forfeit",
    timers: true,
    timerForce: true,
    timerSeconds: {
      proposal: 600, voting: 600, quest: 600, assassination: 600,
      lady: 600, excalibur: 600, trap: 600, plot: 10,
    },
  },
});
await dealRoom(C);
{
  const evilIds = C.players.map((p) => p.playerId).filter((id) => EVIL.includes(C.roleOf[id]));
  const goodIds = C.players.map((p) => p.playerId).filter((id) => !evilIds.includes(id));
  assert(evilIds.length === 6, "6 Evil at 16 players");
  const loyalty = (id) => (evilIds.includes(id) ? "evil" : "good");
  const flip = (c) => (c === "fail" ? "success" : "fail");
  const HELD = ["kingReturns", "ambush", "leadToVictory", "weFoundYou"];
  const COVERAGE = [
    "leadToVictory", "leadToVictoryAfterVote", "kingReturns", "kingReturnsForfeit",
    "weFoundYou", "weFoundYouCard", "weFoundYouExcalibur", "ambush", "ambushAfterSwitch",
    "charge", "areYouTheOne", "trueNature", "showStrength", "restoreHonor", "E1",
  ];
  const covered = new Set();
  const drawnKeys = new Set();
  const privyC = newPrivy();
  /** this proposal's planned Fail players and Excalibur wielder */
  let plan = null;
  /** this quest's cards as they stand (after any Excalibur switch) */
  let played = {};
  let switchedId = null;
  let ltvLeftWaiting = false;
  let dealCursor = 0;
  let sweptRound = -1;
  // with a King Returns holder in play, reject up to 4 times so the card lands as the 5th rejection
  const forfeitSetup = (v) =>
    !covered.has("kingReturnsForfeit") && covered.has("kingReturns") && holdersIn(v, "kingReturns").length > 0;

  let t = await viewC(C.hostToken);
  assert(t.phase === "plotDeal" && t.plot.drawn.length === 4, "the leader draws 4 Plot cards at 16 players");
  for (let step = 0; step < 600; step++) {
    t = await viewC(C.hostToken);
    if (t.phase === "gameover" || t.phase === "assassination") break;
    switch (t.phase) {
      case "plotDeal": {
        const lead = t.leaderId;
        const turn = (await viewC(tokC(lead))).plotTurn;
        assert(
          turn?.kind === "deal" && typeof turn.turnId === "string" && turn.cards.length === t.plot.drawn.length,
          "the leader's phone is asked to hand out the drawn cards"
        );
        const s = bySeat(t);
        const li = s.indexOf(lead);
        const others = s.map((_, k) => s[(li + 1 + k) % s.length]).slice(0, s.length - 1);
        const given = new Set();
        const assignments = {};
        for (const card of t.plot.drawn) {
          drawnKeys.add(card.key);
          const holding = HELD.includes(card.key) ? holdersIn(t, card.key) : [];
          let to = null;
          for (let i = 0; i < others.length && !to; i++) {
            const id = others[(dealCursor + i) % others.length];
            if (!given.has(id) && !holding.includes(id)) to = id;
          }
          to ??= others[dealCursor % others.length];
          dealCursor += 1;
          given.add(to);
          assignments[card.id] = to;
        }
        await actC(tokC(lead), "plotDeal", { assignments });
        break;
      }
      case "plotResolve": {
        const { key, actorId } = t.plot.pending;
        const turn = (await viewC(tokC(actorId))).plotTurn;
        assert(turn?.kind === "resolve" && turn.key === key, `${nameC(actorId)}'s phone is asked to resolve ${key}`);
        if (key === "restoreHonor") {
          const take = turn.takeable[0];
          await actC(tokC(actorId), "plotResolve", { targetId: take.playerId, cardId: take.cardId });
          const u = await viewC(C.hostToken);
          const holds = (id) => u.plot.hands.some((h) => h.playerId === id && h.cards.some((c) => c.id === take.cardId));
          assert(
            holds(actorId) && !holds(take.playerId),
            `Restore Your Honor: ${nameC(actorId)} takes ${take.key} from ${take.name}`
          );
        } else if (key === "areYouTheOne") {
          const nb = neighbours(t, actorId);
          const offered = turn.targets.map((x) => x.id);
          assert(
            offered.length === 2 && nb.every((id) => offered.includes(id)),
            "Are You the One offers only the two neighbours"
          );
          const far = bySeat(t).find((id) => id !== actorId && !nb.includes(id));
          let refused = false;
          try { await actC(tokC(actorId), "plotResolve", { targetId: far }); } catch { refused = true; }
          assert(refused, "Are You the One refuses a player who isn't a neighbour");
          await actC(tokC(actorId), "plotResolve", { targetId: nb[0] });
          privyC.plot.add(actorId);
          const seen = (await viewC(tokC(actorId))).plotSeen;
          assert(
            seen.some((e) => e.via === key && e.round === t.round && e.subjectName === nameC(nb[0]) && e.loyalty === loyalty(nb[0])),
            "Are You the One: the holder sees the neighbour's true loyalty"
          );
        } else {
          // Show Your True Nature (the holder) or Show Your Strength (the leader): a chosen player sees the actor's loyalty
          if (key === "showStrength") assert(actorId === t.leaderId, "Show Your Strength is resolved by the leader");
          const viewer = turn.targets[0].id;
          await actC(tokC(actorId), "plotResolve", { targetId: viewer });
          privyC.plot.add(viewer);
          const seen = (await viewC(tokC(viewer))).plotSeen;
          assert(
            seen.some((e) => e.via === key && e.round === t.round && e.subjectName === nameC(actorId) && e.loyalty === loyalty(actorId)),
            `${key}: the chosen player sees ${nameC(actorId)}'s true loyalty`
          );
        }
        covered.add(key);
        break;
      }
      case "plotWindow": {
        const kind = t.plot.window.kind;
        const holders = holdersIn(t, kind).filter((id) => kind !== "leadToVictory" || id !== t.leaderId);
        if (!covered.has("E1") && holders.length >= 2 && t.plot.window.askingId === holders[0]) {
          // leave the first holder to the timer; the second must get a fresh 10 s
          assert(t.timer?.forced, "E1: a Plot window runs a forced timer");
          let u = t;
          const deadline = Date.now() + 25000;
          while (Date.now() < deadline) {
            await sleep(1000);
            u = await viewC(C.hostToken);
            if (u.phase !== "plotWindow" || u.plot.window.askingId !== holders[0]) break;
          }
          assert(
            u.phase === "plotWindow" && u.plot.window.kind === kind && u.plot.window.askingId === holders[1],
            `E1: at zero ${nameC(holders[0])} passes ${kind} and ${nameC(holders[1])} is asked`
          );
          const left = u.timer ? u.timer.endsAt - u.serverNow : -1;
          assert(left >= 8500, `E1: the next holder gets a fresh Plot timer (${(left / 1000).toFixed(1)} s of 10)`);
          covered.add("E1");
          break;
        }
        const h = t.plot.window.askingId;
        const turn = (await viewC(tokC(h))).plotTurn;
        assert(turn?.kind === "window" && turn.key === kind, `${nameC(h)}'s phone is asked about ${kind}`);
        const pass = () => actC(tokC(h), "plotPass");
        if (kind === "leadToVictory") {
          if (covered.has("leadToVictory")) {
            // every leader turn follows a vote, so a second window means the block was lifted
            if (ltvLeftWaiting) covered.add("leadToVictoryAfterVote");
            await pass();
            break;
          }
          const queued = holders.filter((id) => id !== h);
          await actC(tokC(h), "plotPlay", {});
          const u = await viewC(C.hostToken);
          assert(u.leaderId === h, "Lead to Victory: the holder becomes leader");
          if (queued.length) {
            assert(
              !(u.phase === "plotWindow" && u.plot.window.kind === "leadToVictory"),
              "Lead to Victory: once one is played, the others wait for a vote"
            );
            ltvLeftWaiting = true;
          }
          covered.add("leadToVictory");
        } else if (kind === "kingReturns") {
          const fifth = t.rejections === 4;
          if (covered.has(fifth ? "kingReturnsForfeit" : "kingReturns")) {
            await pass();
            break;
          }
          await actC(tokC(h), "plotPlay", {});
          const u = await viewC(C.hostToken);
          if (fifth) {
            const r = u.questResults[t.mission];
            assert(
              r && !r.success && r.fails === 0 && (u.phase === "gameover" || (u.round === t.round + 1 && u.rejections === 0)),
              `King Returns as the 5th rejection forfeits quest ${t.mission + 1}`
            );
            covered.add("kingReturnsForfeit");
          } else {
            assert(
              u.rejections === t.rejections + 1 &&
                u.leaderId === seatAfter(t, t.leaderId) &&
                u.round === t.round &&
                !u.questResults[t.mission],
              "King Returns cancels the approved team as a rejected vote and passes the lead"
            );
            covered.add("kingReturns");
          }
        } else if (kind === "weFoundYou") {
          if (covered.has("weFoundYou")) {
            await pass();
            break;
          }
          const opts = turn.targets.map((x) => x.id);
          const target =
            opts.find((id) => id !== plan?.wielder && !plan?.failers.has(id)) ??
            opts.find((id) => id !== plan?.wielder) ??
            opts[0];
          await actC(tokC(h), "plotPlay", { targetId: target });
          const u = await viewC(C.hostToken);
          assert(
            u.plot.spotlit.some((x) => x.playerId === target && x.card === null),
            `We Found You: ${nameC(target)} will play face up`
          );
          covered.add("weFoundYou");
        } else {
          if (covered.has("ambush")) {
            await pass();
            break;
          }
          const opts = turn.targets.map((x) => x.id);
          const target = opts.includes(switchedId) ? switchedId : opts.find((id) => id !== h) ?? opts[0];
          await actC(tokC(h), "plotPlay", { targetId: target });
          privyC.plot.add(h);
          const seen = (await viewC(tokC(h))).plotSeen;
          assert(
            seen.some((e) => e.via === "ambush" && e.round === t.round && e.subjectName === nameC(target) && e.loyalty === null && e.card === played[target]),
            `Ambush: ${nameC(h)} sees ${nameC(target)}'s card${target === switchedId ? " as Excalibur left it" : ""}`
          );
          covered.add("ambush");
          if (target === switchedId) covered.add("ambushAfterSwitch");
        }
        break;
      }
      case "proposal": {
        if (t.rejections === 0 && sweptRound !== t.round) {
          sweptRound = t.round;
          await sweep(C, C.roleOf, `16 players, round ${t.round + 1}`, privyC);
        }
        const done = t.questResults.filter(Boolean);
        const aimWin = done.filter((r) => r.success).length <= done.filter((r) => !r.success).length;
        // an Ambush holder waits for this quest: arm a Fail for Excalibur to switch (or a Success, when aiming to lose)
        const ambushNext = !covered.has("ambush") && holdersIn(t, "ambush").length > 0;
        const failers = aimWin ? (ambushNext ? [evilIds[0]] : []) : evilIds.slice(0, t.failsNeeded[t.mission]);
        const team = [...failers, ...goodIds].slice(0, t.teamSize);
        const wielder = team.find((id) => id !== t.leaderId && !failers.includes(id));
        plan = { failers: new Set(failers), wielder, aimWin };
        played = {};
        switchedId = null;
        await actC(tokC(t.leaderId), "propose", { team, excaliburId: wielder });
        break;
      }
      case "voting": {
        const choice = forfeitSetup(t) && t.rejections < 4 ? "reject" : "approve";
        const charges = t.plot.charges;
        const firstCharge = charges.length > 0 && !covered.has("charge");
        if (firstCharge) {
          const other = bySeat(t).find((id) => !charges.includes(id) && !t.votedIds.includes(id));
          let early = false;
          try { await actC(tokC(other), "vote", { vote: choice }); } catch { early = true; }
          assert(early, "Charge: everyone else waits for the Charge holders");
        }
        for (const id of charges) if (!t.votedIds.includes(id)) await actC(tokC(id), "vote", { vote: choice });
        if (firstCharge) {
          const u = await viewC(C.hostToken);
          assert(
            u.phase === "voting" && u.plot.chargeVotes?.length === charges.length && u.plot.chargeVotes.every((x) => x.vote === choice),
            "Charge: the holders' votes show face up before anyone else votes"
          );
          covered.add("charge");
        }
        for (const id of bySeat(t)) {
          if (!charges.includes(id) && !t.votedIds.includes(id)) await actC(tokC(id), "vote", { vote: choice });
        }
        break;
      }
      case "voteReveal":
        await sleep(6100);
        await actC(C.hostToken, "ack");
        break;
      case "quest": {
        const spot = t.plot.spotlit.map((x) => x.playerId);
        for (const id of [...spot, ...t.proposalIds.filter((id) => !spot.includes(id))]) {
          if (played[id]) continue;
          played[id] = plan?.failers.has(id) ? "fail" : "success";
          await actC(tokC(id), "questCard", { card: played[id] });
          if (spot.includes(id) && !covered.has("weFoundYouCard")) {
            const u = await viewC(C.hostToken);
            assert(
              u.phase === "quest" && u.plot.spotlit.find((x) => x.playerId === id)?.card === played[id],
              "We Found You: the target's card shows on the TV as soon as it's played"
            );
            covered.add("weFoundYouCard");
          }
        }
        break;
      }
      case "excalibur": {
        const wielder = t.excalibur.holderId;
        const spot = t.plot.spotlit.map((x) => x.playerId);
        const spotTarget = spot.find((id) => id !== wielder);
        if (spotTarget && !covered.has("weFoundYouExcalibur")) {
          const wv = await viewC(tokC(wielder));
          assert(!wv.excaliburTargets.some((x) => x.id === spotTarget), "Excalibur's targets leave out the face-up card");
          let refused = false;
          try { await actC(tokC(wielder), "excalibur", { targetId: spotTarget }); } catch { refused = true; }
          assert(refused, "Excalibur can't switch a card played face up");
          covered.add("weFoundYouExcalibur");
        }
        const free = t.proposalIds.filter((id) => id !== wielder && !spot.includes(id));
        const ambushNext = !covered.has("ambush") && holdersIn(t, "ambush").length > 0;
        const want = plan?.aimWin ? "fail" : "success";
        const x = ambushNext ? free.find((id) => played[id] === want) ?? free[0] ?? null : null;
        await actC(tokC(wielder), "excalibur", { targetId: x });
        if (x) {
          played[x] = flip(played[x]);
          switchedId = x;
          privyC.excalibur.add(wielder);
          await actC(tokC(wielder), "excaliburDone");
        }
        break;
      }
      case "excaliburReveal":
        await actC(tokC(t.excalibur.holderId), "excaliburDone");
        break;
      case "questReveal": {
        const fails = Object.values(played).filter((c) => c === "fail").length;
        assert(
          t.questReveal.cards.length === t.proposalIds.length && t.questReveal.fails === fails,
          `quest ${t.mission + 1}: every card counts as played or switched (${fails} Fail)`
        );
        await sleep(1600 + t.questReveal.cards.length * 1200 + 2100);
        await actC(C.hostToken, "ack");
        break;
      }
      default:
        throw new Error("ASSERT: the 16-player driver hit an unexpected phase: " + t.phase);
    }
  }
  assert(t.phase === "gameover", "the 16-player Plot game plays to the end");
  await sweep(C, C.roleOf, "16 players, game over", privyC);
  console.log(`  Plot cards drawn this run: ${[...drawnKeys].join(", ")}`);
  console.log(`  exercised: ${COVERAGE.filter((k) => covered.has(k)).join(", ") || "nothing"}`);
  console.log(`  not exercised this run: ${COVERAGE.filter((k) => !covered.has(k)).join(", ") || "nothing"}`);
  console.log(
    "  (Lead to Victory after an unopposed ride needs two holders under the unopposed rule; game 6 covers the ride itself)"
  );
}

/* ---- game 12: Trapper and Targeting at 16: the 5th quest takes 10 riders and shows 9 cards ---- */
await actC(C.hostToken, "playAgain");
await actC(C.hostToken, "updateConfig", {
  config: { trapper: true, targeting: true, excalibur: false, timers: false, assassination: true },
});
{
  let t = await viewC(C.hostToken);
  assert(
    t.config.trapper && !t.config.plotCards && t.targeting && t.missionSizes[4] + t.extraRiders === 10,
    "16 players with Trapper: the 5th quest takes 10 riders"
  );
  await dealRoom(C);
  const goods = C.players.map((p) => p.playerId).filter((id) => !EVIL.includes(C.roleOf[id]));
  const privyT = newPrivy();
  const ride = async (quest, sweepAtTrap) => {
    let v = await viewC(C.hostToken);
    const lead = v.leaderId;
    const team = goods.slice(0, v.missionSizes[quest] + v.extraRiders);
    await actC(tokC(lead), "propose", { team, quest });
    v = await viewC(C.hostToken);
    assert(v.phase === "voting" && v.mission === quest && v.teamSize === team.length, `quest ${quest + 1}: ${team.length} riders proposed`);
    for (const id of bySeat(v)) await actC(tokC(id), "vote", { vote: "approve" });
    await sleep(6100);
    await actC(C.hostToken, "ack");
    for (const id of team) await actC(tokC(id), "questCard", { card: "success" });
    v = await viewC(C.hostToken);
    assert(v.phase === "trap", "all cards in -> the trap");
    await actC(tokC(lead), "trap", { targetId: team[0] });
    privyT.trap.add(lead);
    if (sweepAtTrap) await sweep(C, C.roleOf, "16 players, at the trap", privyT);
    await actC(tokC(lead), "trapDone");
    v = await viewC(C.hostToken);
    assert(
      v.phase === "questReveal" && v.questReveal.cards.length === team.length - 1 && v.questReveal.success,
      `quest ${quest + 1}: the trap leaves ${team.length - 1} cards`
    );
    await sleep(1600 + v.questReveal.cards.length * 1200 + 2100);
    await actC(C.hostToken, "ack");
    return viewC(C.hostToken);
  };
  await ride(0, false);
  t = await ride(1, false);
  assert(t.availableQuests.includes(4), "two wins unseal the 5th quest");
  let refused = false;
  try {
    await actC(tokC(t.leaderId), "propose", { team: goods.slice(0, 9), quest: 4 });
  } catch {
    refused = true;
  }
  assert(refused, "the 5th quest refuses 9 riders under Trapper");
  t = await ride(4, true);
  assert(t.phase === "assassination", "three wins -> assassination");
}

console.log("\nALL PASSED");
process.exit(0);

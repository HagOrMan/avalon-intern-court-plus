// End-to-end game flow test against a running server.
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

const EVIL = ["mordred", "morgana", "assassin", "minion", "oberon"];

const { code, hostToken } = await post("/api/rooms");
console.log("room", code);
const act = (token, action, payload) =>
  post(`/api/room/${code}/action`, { token, action, ...payload });

const names = ["Dana", "Miles", "Priya", "Sam", "Jordan"];
const players = [];
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
  const roleOf = {};
  for (const p of players) {
    const pv = await readView(code, p.token);
    roleOf[p.playerId] = pv.role.key;
  }
  for (const p of players) await act(p.token, "ready");
  const tv = await readView(code, hostToken);
  assert(tv.phase === "proposal", "all sworn in -> proposal");
  console.log("cast:", players.map((p) => `${p.name}=${roleOf[p.playerId]}`).join(" "));
  return roleOf;
}

/**
 * Propose a team, approve unanimously, play the given number of fail cards, ride out the beats.
 * `refused` rides too, has a Fail refused by the server, then plays Success.
 */
async function runMission(roleOf, failers, refused = null) {
  let tv = await readView(code, hostToken);
  const n = tv.teamSize;
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
  for (const p of team) {
    if (p === refused) continue;
    await act(p.token, "questCard", { card: failers.includes(p) ? "fail" : "success" });
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

/** The Lady's holder examines the first eligible player and passes the token. */
async function runLady(roleOf) {
  let tv = await readView(code, hostToken);
  assert(tv.phase === "lady", "quest resolved -> the Lady's turn");
  const holder = players.find((p) => p.playerId === tv.lady.holderId);
  const hv = await readView(code, holder.token);
  const target = hv.ladyTargets[0];
  assert(
    hv.ladyTargets.every((t) => !tv.lady.pastHolderIds.includes(t.id)),
    "the Lady can't examine a past holder"
  );
  await act(holder.token, "ladyExamine", { targetId: target.id });
  const after = await readView(code, holder.token);
  const expected = EVIL.includes(roleOf[target.id]) ? "evil" : "good";
  assert(after.ladyResult.loyalty === expected, "the Lady shows the true loyalty");
  for (const p of players.filter((p) => p !== holder)) {
    const pv = await readView(code, p.token);
    if (pv.ladyResult?.targetName === target.name) throw new Error("ASSERT: result leaked to " + p.name);
  }
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

let tv = await runMission(roleOf, []); // M1 ✓
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

console.log("\nALL PASSED");
process.exit(0);

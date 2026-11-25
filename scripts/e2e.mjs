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

// starting sides; a Lancelot's current side comes from his own view
const EVIL = ["mordred", "morgana", "assassin", "minion", "oberon", "lancelotEvil"];

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
  assert(["proposal", "plotDeal"].includes(tv.phase), "all sworn in -> the first round");
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

/* ---- game 5: a forced vote timer runs out ---- */
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

/* ---- game 6: Targeting ---- */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", {
  config: { timers: false, targeting: true, specials: ["merlin", "mistress", "mordred", "morgana"] },
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
}

/* ---- game 7: Plot cards ---- */
await act(hostToken, "restart");
await act(hostToken, "updateConfig", { config: { targeting: false, trapper: true } });
await act(hostToken, "updateConfig", { config: { plotCards: true } });
tv = await readView(code, hostToken);
assert(tv.config.plotCards && !tv.config.trapper, "Plot cards switch Trapper off");
roleOf = await dealAndSwearIn();
{
  tv = await readView(code, hostToken);
  assert(tv.phase === "plotDeal" && tv.plot.drawn.length === 1, "the leader draws 1 Plot card at 5 players");
  const leaderP = players.find((p) => p.playerId === tv.leaderId);
  const card = (await readView(code, leaderP.token)).plotTurn.cards[0];
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

console.log("\nALL PASSED");
process.exit(0);

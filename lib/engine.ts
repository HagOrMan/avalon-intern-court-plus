import type {
  AllegianceCard,
  Config,
  ExcaliburUse,
  GameState,
  MissionRecord,
  Player,
  QuestCard,
  RoleKey,
  TrapRecord,
  Vote,
} from "./types";
import {
  ASSASSIN_REVEAL_MS,
  AUTO_ADVANCE_GRACE_MS,
  BLADE_CHOICES,
  LANCELOT_HIDDEN_DECK,
  LANCELOT_KNOWN_DECK,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MISSION_SIZES,
  OPTIONAL_ROLES,
  VOTE_REVEAL_MS,
  bladeRole,
  buildRoleList,
  deckProblem,
  failsNeeded,
  isEvil,
  normalizeConfig,
  questRevealMs,
  secureRandom,
  shuffle,
} from "./rules";

export class GameError extends Error {}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new GameError(msg);
}

export function createRoom(code: string, hostToken: string, now = Date.now()): GameState {
  return {
    code,
    hostToken,
    phase: "lobby",
    players: [],
    config: normalizeConfig({}),
    roles: {},
    rolesInPlay: [],
    flagHolderId: null,
    leaderIndex: 0,
    mission: 0,
    rejections: 0,
    proposal: [],
    votes: {},
    voteMeta: null,
    lastVote: null,
    questCards: {},
    questMeta: null,
    history: [],
    assassinTargetId: null,
    assassinRevealAt: null,
    lady: null,
    excaliburHolderId: null,
    excaliburLog: [],
    trapLog: [],
    winner: null,
    winReason: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function addPlayer(s: GameState, p: { id: string; token: string; name: string }): GameState {
  assert(s.phase === "lobby" || s.phase === "setup", "The court has already convened");
  const name = p.name.trim().slice(0, 14);
  assert(name.length >= 1, "A name is required");
  assert(s.players.length < MAX_PLAYERS, `The court is full (${MAX_PLAYERS} seats)`);
  assert(
    !s.players.some((q) => q.name.toLowerCase() === name.toLowerCase()),
    "That name is already seated"
  );
  const player: Player = { id: p.id, token: p.token, name, seat: s.players.length, ready: false };
  return { ...s, players: [...s.players, player] };
}

/** Host kick or a player leaving their own seat. */
export function removePlayer(s: GameState, playerId: string): GameState {
  assert(s.phase === "lobby" || s.phase === "setup", "Seats are locked once the court convenes");
  const players = s.players
    .filter((p) => p.id !== playerId)
    .map((p, i) => ({ ...p, seat: i }));
  return { ...s, players };
}

/**
 * Re-deal the circle: leader rotation follows seat order, which is otherwise join order.
 * `nextLeader` is kept on purpose — whoever was owed the lead from last game still gets
 * it first; only who follows them changes. See docs/fairness.md.
 */
export function shuffleSeats(s: GameState, rng: () => number = secureRandom): GameState {
  assert(s.phase === "setup", "Seats can only be shuffled during Court Setup");
  // `players` array order is the seat order (leader() and the deal index into it)
  const players = shuffle(s.players, rng).map((p, i) => ({ ...p, seat: i }));
  return { ...s, players };
}

export function startSetup(s: GameState): GameState {
  assert(s.phase === "lobby", "Not in the lobby");
  assert(s.players.length >= MIN_PLAYERS, `Need at least ${MIN_PLAYERS} players`);
  return { ...s, phase: "setup" };
}

export function updateConfig(s: GameState, cfg: Partial<Config>): GameState {
  assert(s.phase === "setup", "Configuration is only open during Court Setup");
  const cur = normalizeConfig(s.config);
  const wanted = cfg.specials ?? cur.specials;
  assert(Array.isArray(wanted), "Unknown roles");
  const specials = OPTIONAL_ROLES.filter((r) => wanted.includes(r));
  // the Mistress's sight is built around Merlin; without him she would see Morgana alone
  if (!specials.includes("merlin") && specials.includes("mistress"))
    specials.splice(specials.indexOf("mistress"), 1);
  // the Lancelots are one pair: adding or removing either side does both
  const hadPair = cur.specials.includes("lancelotGood");
  const pairOn = hadPair
    ? specials.includes("lancelotGood") && specials.includes("lancelotEvil")
    : specials.includes("lancelotGood") || specials.includes("lancelotEvil");
  for (const r of ["lancelotGood", "lancelotEvil"] as RoleKey[]) {
    if (pairOn && !specials.includes(r)) specials.push(r);
    if (!pairOn && specials.includes(r)) specials.splice(specials.indexOf(r), 1);
  }
  // Guinevere's sight is the Lancelots; without them she has nothing to see
  if (!pairOn && specials.includes("guinevere")) specials.splice(specials.indexOf("guinevere"), 1);
  const lancelotSchedule = cfg.lancelotSchedule ?? cur.lancelotSchedule;
  assert(["none", "hidden", "known"].includes(lancelotSchedule), "Unknown Lancelot schedule");
  // seat counts aren't checked here: players can still join during setup, so an overfull
  // deck is allowed and refused at beginCourt
  const assassinFlag = cfg.assassinFlag ?? cur.assassinFlag;
  assert(BLADE_CHOICES.includes(assassinFlag), "The blade belongs to Evil");
  const rejectionVariant = cfg.rejectionVariant ?? cur.rejectionVariant;
  assert(
    ["forfeit", "official", "unopposed"].includes(rejectionVariant),
    "Unknown rejection variant"
  );
  return {
    ...s,
    config: {
      specials,
      assassinFlag,
      assassination: !!(cfg.assassination ?? cur.assassination),
      rejectionVariant,
      oberonHiddenFromMerlin: !!(cfg.oberonHiddenFromMerlin ?? cur.oberonHiddenFromMerlin),
      goodMayFail: !!(cfg.goodMayFail ?? cur.goodMayFail),
      ladyOfTheLake: !!(cfg.ladyOfTheLake ?? cur.ladyOfTheLake),
      excalibur: !!(cfg.excalibur ?? cur.excalibur),
      trapper: !!(cfg.trapper ?? cur.trapper),
      lancelotSchedule,
      lancelotForcedCards: !!(cfg.lancelotForcedCards ?? cur.lancelotForcedCards),
      lancelotEvilKnown: !!(cfg.lancelotEvilKnown ?? cur.lancelotEvilKnown),
      lancelotsMeet: !!(cfg.lancelotsMeet ?? cur.lancelotsMeet),
    },
  };
}

/** Deal roles and enter the private-reveal phase. */
export function beginCourt(s: GameState, rng: () => number = secureRandom): GameState {
  assert(s.phase === "setup", "Not in Court Setup");
  const n = s.players.length;
  assert(n >= MIN_PLAYERS, `Need at least ${MIN_PLAYERS} players`);
  const config = normalizeConfig(s.config);
  const problem = deckProblem(n, config.specials);
  assert(!problem, problem ?? "");
  const dealt = shuffle(buildRoleList(n, config), rng);
  const roles: Record<string, RoleKey> = {};
  s.players.forEach((p, i) => (roles[p.id] = dealt[i]));

  const blade = bladeRole(n, config);
  const flagHolderId = blade ? s.players.find((p) => roles[p.id] === blade)!.id : null;
  const leaderIndex = firstLeaderIndex(s, rng);
  // the Lady starts on the first leader's right; leadership passes to higher seats, so that's one seat back
  const ladyStart = s.players[(leaderIndex - 1 + n) % n].id;

  return {
    ...s,
    config,
    phase: "reveal",
    roles,
    rolesInPlay: [...dealt].sort(),
    flagHolderId,
    lady: config.ladyOfTheLake
      ? { holderId: ladyStart, pastHolderIds: [ladyStart], checks: [] }
      : null,
    lancelot: config.specials.includes("lancelotGood")
      ? {
          switched: false,
          deck: config.lancelotSchedule === "hidden" ? shuffle(LANCELOT_HIDDEN_DECK, rng) : [],
          schedule:
            config.lancelotSchedule === "known"
              ? shuffle(LANCELOT_KNOWN_DECK, rng).slice(0, 5)
              : null,
          flips: [],
        }
      : null,
    players: s.players.map((p) => ({ ...p, ready: false })),
    leaderIndex,
    nextLeader: null,
    mission: 0,
    rejections: 0,
    proposal: [],
    votes: {},
    voteMeta: null,
    lastVote: null,
    questCards: {},
    questMeta: null,
    history: [],
    assassinTargetId: null,
    assassinRevealAt: null,
    excaliburHolderId: null,
    excaliburLog: [],
    trapLog: [],
    winner: null,
    winReason: null,
  };
}

function firstLeaderIndex(s: GameState, rng: () => number): number {
  const n = s.players.length;
  const carry = s.nextLeader;
  if (carry && carry.playerCount === n) {
    const i = s.players.findIndex((p) => p.id === carry.playerId);
    if (i >= 0) return i;
  }
  return Math.floor(rng() * n);
}

export function playerReady(s: GameState, playerId: string): GameState {
  assert(s.phase === "reveal", "Not in the reveal phase");
  const players = s.players.map((p) => (p.id === playerId ? { ...p, ready: true } : p));
  const next: GameState = { ...s, players };
  if (!players.every((p) => p.ready)) return next;
  return { ...startRound(next, 0), phase: "proposal" };
}

/**
 * A player's current side. The same as their role's, except that the Lancelots trade
 * sides while `lancelot.switched` is set.
 */
export function allegianceOf(s: GameState, playerId: string): "good" | "evil" {
  const role = s.roles[playerId];
  const starting = isEvil(role) ? "evil" : "good";
  const lancelot = role === "lancelotGood" || role === "lancelotEvil";
  if (!lancelot || !s.lancelot?.switched) return starting;
  return starting === "evil" ? "good" : "evil";
}

/**
 * Resolve the allegiance card for the start of a round (mission index), if any: the
 * face-up schedule covers rounds 1–5; hidden draws flip one card for rounds 3–5.
 */
function startRound(s: GameState, mission: number): GameState {
  const l = s.lancelot;
  if (!l) return s;
  let card: AllegianceCard | undefined;
  let deck = l.deck;
  if (l.schedule) {
    card = l.schedule[mission];
  } else if (mission >= 2 && deck.length) {
    card = deck[0];
    deck = deck.slice(1);
  }
  if (!card) return s;
  return {
    ...s,
    lancelot: {
      ...l,
      deck,
      switched: card === "switch" ? !l.switched : l.switched,
      flips: [...l.flips, { round: mission + 1, card }],
    },
  };
}

export function leader(s: GameState): Player {
  return s.players[s.leaderIndex % s.players.length];
}

/** Riders the leader picks: the mission size, plus one for the Trapper to remove. */
export function teamSize(s: GameState): number {
  return MISSION_SIZES[s.players.length][s.mission] + (s.config.trapper === true ? 1 : 0);
}

/** In the unopposed variant, the 5th proposal after 4 rejections skips the vote entirely. */
function isUnopposedProposal(s: GameState): boolean {
  return s.config.rejectionVariant === "unopposed" && s.rejections >= 4;
}

export function propose(
  s: GameState,
  playerId: string,
  team: string[],
  excaliburId: string | null = null
): GameState {
  assert(s.phase === "proposal", "Not accepting proposals");
  assert(leader(s).id === playerId, "Only the leader proposes");
  const unique = [...new Set(team)];
  const size = teamSize(s);
  assert(unique.length === size, `Choose exactly ${size}`);
  assert(
    unique.every((id) => s.players.some((p) => p.id === id)),
    "Unknown player in proposal"
  );
  let excaliburHolderId: string | null = null;
  if (s.config.excalibur === true) {
    assert(excaliburId && unique.includes(excaliburId), "Give Excalibur to a rider");
    assert(excaliburId !== playerId, "The leader cannot keep Excalibur");
    excaliburHolderId = excaliburId;
  }
  if (isUnopposedProposal(s)) {
    return {
      ...s,
      proposal: unique,
      excaliburHolderId,
      votes: {},
      voteMeta: null,
      lastVote: { approve: 0, reject: 0, unopposed: true },
      questCards: {},
      phase: "quest",
    };
  }
  return { ...s, proposal: unique, excaliburHolderId, votes: {}, voteMeta: null, phase: "voting" };
}

export function vote(s: GameState, playerId: string, v: Vote, now = Date.now()): GameState {
  assert(s.phase === "voting", "Not voting now");
  assert(v === "approve" || v === "reject", "Unknown vote");
  assert(!(playerId in s.votes), "Your vote is sealed — no unvote");
  const votes = { ...s.votes, [playerId]: v };
  const next: GameState = { ...s, votes };
  if (Object.keys(votes).length === s.players.length) {
    const approve = Object.values(votes).filter((x) => x === "approve").length;
    const reject = s.players.length - approve;
    next.phase = "voteReveal";
    next.voteMeta = { approve, reject, approved: approve > reject, revealAt: now };
  }
  return next;
}

export function ackVoteReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "voteReveal" && s.voteMeta, "Nothing to acknowledge");
  const elapsed = now - s.voteMeta.revealAt;
  assert(force || elapsed >= VOTE_REVEAL_MS - 250, "The court is still watching");
  const { approve, reject, approved } = s.voteMeta;
  // votes are never recorded on screen afterward — cleared here, tally kept for the recap
  const base: GameState = { ...s, votes: {}, voteMeta: null };
  if (approved) {
    return {
      ...base,
      lastVote: { approve, reject, unopposed: false },
      questCards: {},
      phase: "quest",
    };
  }
  const rejections = s.rejections + 1;
  if (rejections >= 5 && s.config.rejectionVariant === "official") {
    return {
      ...base,
      rejections,
      phase: "gameover",
      winner: "evil",
      winReason: "Five proposals rejected — the court collapses into Mordred's hands.",
    };
  }
  if (rejections >= 5 && s.config.rejectionVariant === "forfeit") {
    return closeMission(base, {
      mission: s.mission,
      team: [],
      approve,
      reject,
      unopposed: false,
      forfeited: true,
      fails: 0,
      success: false,
    });
  }
  return {
    ...base,
    rejections,
    leaderIndex: (s.leaderIndex + 1) % s.players.length,
    proposal: [],
    excaliburHolderId: null,
    phase: "proposal",
  };
}

export function playQuestCard(
  s: GameState,
  playerId: string,
  card: QuestCard,
  now = Date.now(),
  rng: () => number = secureRandom
): GameState {
  assert(s.phase === "quest", "No quest underway");
  assert(s.proposal.includes(playerId), "You do not ride on this mission");
  assert(!(playerId in s.questCards), "Your card is cast");
  assert(card === "success" || card === "fail", "Unknown card");
  const side = allegianceOf(s, playerId);
  const role = s.roles[playerId];
  if ((role === "lancelotGood" || role === "lancelotEvil") && s.config.lancelotForcedCards === true) {
    assert(card === (side === "evil" ? "fail" : "success"), "Lancelot's heart decides this card");
  }
  assert(
    card === "success" || side === "evil" || s.config.goodMayFail === true,
    "The loyal cannot fail a quest"
  );
  const questCards = { ...s.questCards, [playerId]: card };
  const next: GameState = { ...s, questCards };
  if (Object.keys(questCards).length < s.proposal.length) return next;
  if (s.excaliburHolderId) return { ...next, phase: "excalibur" };
  return afterExcalibur(next, now, rng);
}

/** Once the sword has resolved (or there was none): the trap, else straight to the reveal. */
function afterExcalibur(s: GameState, now: number, rng: () => number): GameState {
  if (s.config.trapper === true) return { ...s, phase: "trap" };
  return revealQuest(s, now, rng);
}

/** Shuffle the counted cards (all of them, less any trapped one) and start the reveal beat. */
function revealQuest(s: GameState, now: number, rng: () => number): GameState {
  const trapped = currentTrap(s)?.targetId;
  const counted = s.proposal.filter((id) => id !== trapped).map((id) => s.questCards[id]);
  const cards = shuffle(counted, rng);
  const fails = cards.filter((c) => c === "fail").length;
  const success = fails < failsNeeded(s.players.length)[s.mission];
  return { ...s, phase: "questReveal", questMeta: { cards, fails, success, revealAt: now } };
}

export function currentExcalibur(s: GameState): ExcaliburUse | null {
  return s.excaliburLog?.find((e) => e.mission === s.mission) ?? null;
}

export function currentTrap(s: GameState): TrapRecord | null {
  return s.trapLog?.find((t) => t.mission === s.mission) ?? null;
}

/**
 * The wielder switches another rider's played card (targetId) or sheathes the sword (null).
 * A switch goes on to a private beat where only the wielder sees the original card.
 */
export function wieldExcalibur(
  s: GameState,
  playerId: string,
  targetId: string | null,
  now = Date.now(),
  rng: () => number = secureRandom
): GameState {
  assert(s.phase === "excalibur", "Excalibur is not drawn");
  assert(s.excaliburHolderId === playerId, "Excalibur is not yours");
  if (targetId === null) {
    const log = [...(s.excaliburLog ?? []), { mission: s.mission, holderId: playerId, targetId: null, original: null }];
    return afterExcalibur({ ...s, excaliburLog: log }, now, rng);
  }
  assert(targetId !== playerId, "Excalibur cannot turn on its wielder");
  assert(s.proposal.includes(targetId), "Excalibur reaches only the company");
  const original = s.questCards[targetId];
  const switched: QuestCard = original === "success" ? "fail" : "success";
  return {
    ...s,
    phase: "excaliburReveal",
    questCards: { ...s.questCards, [targetId]: switched },
    excaliburLog: [...(s.excaliburLog ?? []), { mission: s.mission, holderId: playerId, targetId, original }],
  };
}

/** The wielder has seen the original card. */
export function excaliburDone(
  s: GameState,
  playerId: string,
  now = Date.now(),
  rng: () => number = secureRandom
): GameState {
  assert(s.phase === "excaliburReveal", "Excalibur is sheathed");
  assert(s.excaliburHolderId === playerId, "Excalibur is not yours");
  return afterExcalibur(s, now, rng);
}

/** The leader removes one rider's card (their own allowed) and sees it in private. */
export function trapCard(s: GameState, playerId: string, targetId: string): GameState {
  assert(s.phase === "trap", "No trap is set");
  assert(leader(s).id === playerId, "Only the leader sets the trap");
  assert(s.proposal.includes(targetId), "The trap reaches only the company");
  const record = { mission: s.mission, leaderId: playerId, targetId, card: s.questCards[targetId] };
  return { ...s, phase: "trapReveal", trapLog: [...(s.trapLog ?? []), record] };
}

/** The leader has seen the trapped card; the rest are revealed. */
export function trapDone(
  s: GameState,
  playerId: string,
  now = Date.now(),
  rng: () => number = secureRandom
): GameState {
  assert(s.phase === "trapReveal", "No trap is sprung");
  assert(leader(s).id === playerId, "Only the leader sets the trap");
  return revealQuest(s, now, rng);
}

export function ackQuestReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "questReveal" && s.questMeta, "Nothing to acknowledge");
  const elapsed = now - s.questMeta.revealAt;
  assert(force || elapsed >= questRevealMs(s.questMeta.cards.length) - 250, "The cards are still turning");
  const { fails, success } = s.questMeta;
  return closeMission(s, {
    mission: s.mission,
    team: s.proposal.map((id) => s.players.find((p) => p.id === id)!.name),
    approve: s.lastVote?.approve ?? 0,
    reject: s.lastVote?.reject ?? 0,
    unopposed: s.lastVote?.unopposed ?? false,
    fails,
    success,
  });
}

/** Record a finished mission (ridden or forfeited), then end the game or move to the next. */
function closeMission(s: GameState, record: MissionRecord): GameState {
  const history = [...s.history, record];
  const wins = history.filter((h) => h.success).length;
  const losses = history.filter((h) => !h.success).length;
  const base: GameState = {
    ...s,
    history,
    questCards: {},
    questMeta: null,
    lastVote: null,
    proposal: [],
    excaliburHolderId: null,
  };
  if (losses >= 3) {
    return {
      ...base,
      phase: "gameover",
      winner: "evil",
      winReason: "Three quests have failed. Mordred's court stands revealed and victorious.",
    };
  }
  if (wins >= 3) {
    if (s.flagHolderId) {
      return { ...base, phase: "assassination" };
    }
    return {
      ...base,
      phase: "gameover",
      winner: "good",
      winReason: "Three quests won. With no blade raised against Merlin, the light holds.",
    };
  }
  // the Lady examines after quests 2, 3 and 4 are resolved, forfeits included.
  // The next round's allegiance card resolves first, so she sees a Lancelot's new side.
  const ladyTurn = !!s.lady && record.mission >= 1 && record.mission <= 3;
  return {
    ...startRound(base, s.mission + 1),
    mission: s.mission + 1,
    rejections: 0,
    leaderIndex: (s.leaderIndex + 1) % s.players.length,
    phase: ladyTurn ? "lady" : "proposal",
  };
}

/** Players the current Lady may examine: anyone who has never held the token. */
export function ladyTargets(s: GameState): Player[] {
  const lady = s.lady;
  if (!lady) return [];
  return s.players.filter((p) => !lady.pastHolderIds.includes(p.id));
}

export function ladyExamine(s: GameState, playerId: string, targetId: string): GameState {
  assert(s.phase === "lady" && s.lady, "The Lady is not abroad");
  assert(s.lady.holderId === playerId, "The Lady is not yours");
  assert(targetId !== playerId, "The Lady cannot look upon her own bearer");
  assert(
    ladyTargets(s).some((p) => p.id === targetId),
    "That courtier has borne the Lady and cannot be examined"
  );
  const loyalty = allegianceOf(s, targetId);
  return {
    ...s,
    phase: "ladyReveal",
    lady: { ...s.lady, checks: [...s.lady.checks, { holderId: playerId, targetId, loyalty }] },
  };
}

/** The holder has seen the result; the examined player takes the token. */
export function ladyPass(s: GameState, playerId: string): GameState {
  assert(s.phase === "ladyReveal" && s.lady, "The Lady is not abroad");
  assert(s.lady.holderId === playerId, "The Lady is not yours");
  const check = s.lady.checks[s.lady.checks.length - 1];
  return {
    ...s,
    phase: "proposal",
    lady: {
      ...s.lady,
      holderId: check.targetId,
      pastHolderIds: [...s.lady.pastHolderIds, check.targetId],
    },
  };
}

export function assassinate(
  s: GameState,
  playerId: string,
  targetId: string,
  now = Date.now()
): GameState {
  assert(s.phase === "assassination", "The blade is not drawn");
  assert(s.flagHolderId === playerId, "The blade is not yours");
  assert(targetId !== playerId, "You cannot strike yourself");
  const target = s.players.find((p) => p.id === targetId);
  assert(target, "Unknown target");
  assert(!knownEvilTo(s, playerId).includes(targetId), "That courtier already serves Mordred");
  const targetRole = s.roles[targetId];
  const hit = isAssassinMark(targetRole);
  return {
    ...s,
    assassinTargetId: targetId,
    assassinRevealAt: now,
    phase: "assassinationReveal",
    winner: hit ? "evil" : "good",
    winReason: hit
      ? targetRole === "guinevere"
        ? `The blade finds Guinevere. ${target.name} falls, and the court breaks with her.`
        : `The blade finds Merlin. ${target.name} falls, and with him the light.`
      : `The blade misses. ${target.name} was no wizard — the light holds.`,
  };
}

/** Roles whose death at the blade wins the game for Evil. */
export function isAssassinMark(role: RoleKey): boolean {
  return role === "merlin" || role === "guinevere";
}

/**
 * Players the blade holder saw as Evil at night, and so can't target: their Evil kin,
 * less Oberon (unseen) and the Evil Lancelot unless that variant shows him. Oberon
 * holding the blade saw no one. Night sight is fixed, so a later Lancelot switch doesn't
 * change this.
 */
export function knownEvilTo(s: GameState, holderId: string): string[] {
  const holderRole = s.roles[holderId];
  if (holderRole === "oberon" || holderRole === "lancelotEvil") return [];
  return s.players
    .filter((p) => {
      const r = s.roles[p.id];
      if (p.id === holderId || !isEvil(r) || r === "oberon") return false;
      return r !== "lancelotEvil" || s.config.lancelotEvilKnown !== false;
    })
    .map((p) => p.id);
}

export function ackAssassinationReveal(s: GameState, now = Date.now(), force = false): GameState {
  assert(s.phase === "assassinationReveal" && s.assassinRevealAt, "Nothing to acknowledge");
  assert(force || now - s.assassinRevealAt >= ASSASSIN_REVEAL_MS - 250, "The court holds its breath");
  return { ...s, phase: "gameover" };
}

/** Back to Court Setup with the same seats. Allowed from gameover or mid-game (host restart). */
export function playAgain(s: GameState): GameState {
  assert(s.phase !== "lobby" && s.phase !== "setup", "The court has not convened yet");
  // a leader restarted before proposing (reveal, the Lady's turn, proposal) never picked a team, so they keep the lead
  const leaderPicked = !["reveal", "lady", "ladyReveal", "proposal"].includes(s.phase);
  const n = s.players.length;
  const nextIndex = (s.leaderIndex + (leaderPicked ? 1 : 0)) % n;
  return {
    ...createRoom(s.code, s.hostToken, s.createdAt),
    players: s.players.map((p) => ({ ...p, ready: false })),
    nextLeader: { playerId: s.players[nextIndex].id, playerCount: n },
    config: s.config,
    phase: "setup",
    updatedAt: Date.now(),
  };
}

/** Lazily advance scripted beats if the TV never acked (disconnects, dead room). */
export function autoAdvance(s: GameState, now = Date.now()): GameState | null {
  if (s.phase === "voteReveal" && s.voteMeta) {
    if (now - s.voteMeta.revealAt >= VOTE_REVEAL_MS + AUTO_ADVANCE_GRACE_MS)
      return ackVoteReveal(s, now, true);
  }
  if (s.phase === "questReveal" && s.questMeta) {
    if (
      now - s.questMeta.revealAt >=
      questRevealMs(s.questMeta.cards.length) + AUTO_ADVANCE_GRACE_MS
    )
      return ackQuestReveal(s, now, true);
  }
  if (s.phase === "assassinationReveal" && s.assassinRevealAt) {
    if (now - s.assassinRevealAt >= ASSASSIN_REVEAL_MS + AUTO_ADVANCE_GRACE_MS)
      return ackAssassinationReveal(s, now, true);
  }
  return null;
}

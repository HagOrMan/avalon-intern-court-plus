import type {
  AllegianceCard,
  Config,
  ExcaliburUse,
  GameState,
  MissionRecord,
  Player,
  PlotCard,
  PlotCardKey,
  PlotPending,
  PlotState,
  PlotThen,
  PlotWindowKind,
  QuestCard,
  RoleKey,
  TimerKey,
  TrapRecord,
  Vote,
} from "./types";
import {
  ASSASSIN_REVEAL_MS,
  AUTO_ADVANCE_GRACE_MS,
  BLADE_CHOICES,
  DEFAULT_TIMER_SECONDS,
  TIMER_FOR_PHASE,
  TIMER_MAX_S,
  TIMER_MIN_S,
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
import { PLOT_INFO, plotDeck, plotDraws } from "./plots";

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
  const timerSeconds = { ...cur.timerSeconds };
  for (const [key, secs] of Object.entries(cfg.timerSeconds ?? {})) {
    assert(key in DEFAULT_TIMER_SECONDS, "Unknown timer");
    assert(
      Number.isInteger(secs) && secs >= TIMER_MIN_S && secs <= TIMER_MAX_S,
      `Timers run from ${TIMER_MIN_S} seconds to ${TIMER_MAX_S / 60} minutes`
    );
    timerSeconds[key as TimerKey] = secs;
  }
  // seat counts aren't checked here: players can still join during setup, so an overfull
  // deck is allowed and refused at beginCourt
  const assassinFlag = cfg.assassinFlag ?? cur.assassinFlag;
  assert(BLADE_CHOICES.includes(assassinFlag), "The blade belongs to Evil");
  const rejectionVariant = cfg.rejectionVariant ?? cur.rejectionVariant;
  assert(
    ["forfeit", "official", "unopposed"].includes(rejectionVariant),
    "Unknown rejection variant"
  );
  // Plot cards and Trapper never run together: switching one on switches the other off
  let plotCards = !!(cfg.plotCards ?? cur.plotCards);
  let trapper = !!(cfg.trapper ?? cur.trapper);
  if (plotCards && trapper) {
    if (cfg.trapper === true) plotCards = false;
    else trapper = false;
  }
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
      trapper,
      lancelotSchedule,
      lancelotForcedCards: !!(cfg.lancelotForcedCards ?? cur.lancelotForcedCards),
      lancelotEvilKnown: !!(cfg.lancelotEvilKnown ?? cur.lancelotEvilKnown),
      lancelotsMeet: !!(cfg.lancelotsMeet ?? cur.lancelotsMeet),
      targeting: !!(cfg.targeting ?? cur.targeting),
      plotCards,
      timers: !!(cfg.timers ?? cur.timers),
      timerForce: !!(cfg.timerForce ?? cur.timerForce),
      timerSeconds,
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
    plot: config.plotCards
      ? {
          deck: shuffle(plotDeck(n).map((key, i) => ({ id: `plot${i}`, key })), rng),
          discard: [],
          drawn: [],
          hands: {},
          charges: [],
          pending: [],
          window: null,
          strongLeaderBlocked: false,
          spotlit: [],
          ambushed: [],
          secrets: [],
          events: [],
        }
      : null,
    players: s.players.map((p) => ({ ...p, ready: false })),
    leaderIndex,
    nextLeader: null,
    mission: 0,
    quest: null,
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
  return enterRound(startRound(next, 0));
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

/** The quest being attempted: the proposal's choice, else (no Targeting) the round's. */
export function currentQuest(s: GameState): number {
  return s.quest ?? s.mission;
}

/**
 * Quests the leader may attempt now. Without Targeting, only the round's own. With it,
 * any quest not yet attempted, and the 5th only once two others have succeeded.
 */
export function availableQuests(s: GameState): number[] {
  if (s.config.targeting !== true) return [s.mission];
  const attempted = s.history.map((h) => h.mission);
  const wins = s.history.filter((h) => h.success).length;
  return [0, 1, 2, 3, 4].filter((q) => !attempted.includes(q) && (q !== 4 || wins >= 2));
}

/** Riders the leader picks: the quest's size, plus one for the Trapper to remove. */
export function teamSize(s: GameState, quest = currentQuest(s)): number {
  return MISSION_SIZES[s.players.length][quest] + (s.config.trapper === true ? 1 : 0);
}

/** In the unopposed variant, the 5th proposal after 4 rejections skips the vote entirely. */
function isUnopposedProposal(s: GameState): boolean {
  return s.config.rejectionVariant === "unopposed" && s.rejections >= 4;
}

export function propose(
  s: GameState,
  playerId: string,
  team: string[],
  excaliburId: string | null = null,
  questChoice: number | null = null
): GameState {
  assert(s.phase === "proposal", "Not accepting proposals");
  assert(leader(s).id === playerId, "Only the leader proposes");
  const quest = s.config.targeting === true ? questChoice : s.mission;
  assert(
    quest !== null && availableQuests(s).includes(quest),
    "That quest can't be attempted now"
  );
  const unique = [...new Set(team)];
  const size = teamSize(s, quest);
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
    // no vote is taken, so King Returns has nothing to cancel
    return enterQuest({
      ...s,
      quest,
      proposal: unique,
      excaliburHolderId,
      votes: {},
      voteMeta: null,
      lastVote: { approve: 0, reject: 0, unopposed: true },
    });
  }
  return { ...s, quest, proposal: unique, excaliburHolderId, votes: {}, voteMeta: null, phase: "voting" };
}

/** Players with a Charge in play: they vote first, face up. */
export function chargeHolders(s: GameState): string[] {
  return [...new Set(s.plot?.charges ?? [])];
}

export function vote(s: GameState, playerId: string, v: Vote, now = Date.now()): GameState {
  assert(s.phase === "voting", "Not voting now");
  assert(v === "approve" || v === "reject", "Unknown vote");
  assert(!(playerId in s.votes), "Your vote is sealed — no unvote");
  const charges = chargeHolders(s);
  assert(
    charges.includes(playerId) || charges.every((id) => id in s.votes),
    "Charge holders vote first"
  );
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
  // votes are never recorded on screen afterward — cleared here, tally kept for the recap.
  // A vote has now been taken, so Lead to Victory can be played again.
  const base: GameState = {
    ...s,
    votes: {},
    voteMeta: null,
    plot: s.plot ? { ...s.plot, strongLeaderBlocked: false } : s.plot,
  };
  if (approved) {
    const next: GameState = { ...base, lastVote: { approve, reject, unopposed: false } };
    const holders = holdersOf(next, "kingReturns");
    if (holders.length) return openWindow(next, "kingReturns", holders, "quest");
    return enterQuest(next);
  }
  return rejectTeam(base, approve, reject);
}

/**
 * A team falls: rejected by vote, or cancelled by King Returns (which counts as a
 * rejected vote). Five in a row ends the quest or the game per the rejection rule.
 */
function rejectTeam(s: GameState, approve: number, reject: number): GameState {
  const rejections = s.rejections + 1;
  if (rejections >= 5 && s.config.rejectionVariant === "official") {
    return {
      ...s,
      rejections,
      phase: "gameover",
      winner: "evil",
      winReason: "Five proposals rejected — the court collapses into Mordred's hands.",
    };
  }
  if (rejections >= 5 && s.config.rejectionVariant === "forfeit") {
    return closeMission(s, {
      mission: currentQuest(s),
      team: [],
      approve,
      reject,
      unopposed: false,
      forfeited: true,
      fails: 0,
      success: false,
    });
  }
  return toLeaderTurn(
    {
      ...s,
      rejections,
      leaderIndex: (s.leaderIndex + 1) % s.players.length,
      proposal: [],
      quest: null,
      excaliburHolderId: null,
    },
    false
  );
}

/** The team is approved (or rides unopposed): ask any We Found You holders, then cards. */
function enterQuest(s: GameState): GameState {
  const next: GameState = {
    ...s,
    questCards: {},
    phase: "quest",
    plot: s.plot ? { ...s.plot, spotlit: [] } : s.plot,
  };
  const holders = holdersOf(next, "weFoundYou");
  return holders.length ? openWindow(next, "weFoundYou", holders, "cards") : next;
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

/**
 * Once the sword has resolved (or there was none): the trap, else any Ambush holders
 * (who look after Excalibur, per the rules), else straight to the reveal.
 */
function afterExcalibur(s: GameState, now: number, rng: () => number): GameState {
  if (s.config.trapper === true) return { ...s, phase: "trap" };
  const holders = holdersOf(s, "ambush");
  if (holders.length) return openWindow(s, "ambush", holders, "reveal");
  return revealQuest(s, now, rng);
}

/** Shuffle the counted cards (all of them, less any trapped one) and start the reveal beat. */
function revealQuest(s: GameState, now: number, rng: () => number): GameState {
  const trapped = currentTrap(s)?.targetId;
  const counted = s.proposal.filter((id) => id !== trapped).map((id) => s.questCards[id]);
  const cards = shuffle(counted, rng);
  const fails = cards.filter((c) => c === "fail").length;
  const success = fails < failsNeeded(s.players.length)[currentQuest(s)];
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
  assert(!s.plot?.spotlit.includes(targetId), "Excalibur cannot switch a card played face up");
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
    mission: currentQuest(s),
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
    quest: null,
    excaliburHolderId: null,
    plot: s.plot ? { ...s.plot, spotlit: [] } : s.plot,
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
  // the Lady examines once the 2nd, 3rd and 4th quests are resolved (counted, not by
  // quest number, since Targeting can take them in any order), forfeits included.
  // The next round's allegiance card resolves first, so she sees a Lancelot's new side.
  const ladyTurn = !!s.lady && history.length >= 2 && history.length <= 4;
  const next: GameState = {
    ...startRound(base, s.mission + 1),
    mission: s.mission + 1,
    rejections: 0,
    leaderIndex: (s.leaderIndex + 1) % s.players.length,
  };
  return ladyTurn ? { ...next, phase: "lady" } : enterRound(next);
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
  return enterRound({
    ...s,
    lady: {
      ...s.lady,
      holderId: check.targetId,
      pastHolderIds: [...s.lady.pastHolderIds, check.targetId],
    },
  });
}

/* ---------------------------------------------------------------- Plot cards */

/** Player ids clockwise from the leader, leader first: the rules' order of precedence. */
function seatOrderFromLeader(s: GameState): string[] {
  const n = s.players.length;
  return Array.from({ length: n }, (_, i) => s.players[(s.leaderIndex + i) % n].id);
}

/** Holders of a held Plot card, in precedence order. Empty when Plot cards are off. */
export function holdersOf(s: GameState, key: PlotCardKey): string[] {
  const hands = s.plot?.hands ?? {};
  return seatOrderFromLeader(s).filter((id) => (hands[id] ?? []).some((c) => c.key === key));
}

function withPlot(s: GameState, patch: Partial<PlotState>): GameState {
  return { ...s, plot: { ...s.plot!, ...patch } };
}

function openWindow(s: GameState, kind: PlotWindowKind, queue: string[], then: PlotThen): GameState {
  return withPlot({ ...s, phase: "plotWindow" }, { window: { kind, queue, then } });
}

/** Pick up wherever a window or the Plot step left off. */
function plotContinue(s: GameState, then: PlotThen, now = Date.now(), rng = secureRandom): GameState {
  const closed = s.plot ? withPlot(s, { window: null }) : s;
  switch (then) {
    case "draw":
      return drawPlots(closed, rng);
    case "proposal":
      return { ...closed, phase: "proposal" };
    case "quest":
      return enterQuest(closed);
    case "cards":
      return { ...closed, phase: "quest" };
    case "reveal":
      return revealQuest(closed, now, rng);
  }
}

/** A new round: Ambush checks reset, then the leader's turn begins with the Plot draw. */
function enterRound(s: GameState): GameState {
  return toLeaderTurn(s.plot ? withPlot(s, { ambushed: [] }) : s, true);
}

/**
 * Before any leader acts: Lead to Victory holders may take the lead (unless one was
 * played since the last vote). At a round's start the Plot draw follows; otherwise the
 * proposal.
 */
function toLeaderTurn(s: GameState, roundStart: boolean): GameState {
  if (!s.plot) return { ...s, phase: "proposal" };
  const then: PlotThen = roundStart ? "draw" : "proposal";
  const lead = leader(s).id;
  const holders = holdersOf(s, "leadToVictory").filter((id) => id !== lead);
  if (!s.plot.strongLeaderBlocked && holders.length) return openWindow(s, "leadToVictory", holders, then);
  return plotContinue(s, then);
}

/** The leader draws this round's Plot cards; the discards are reshuffled if the deck runs short. */
function drawPlots(s: GameState, rng: () => number): GameState {
  const p = s.plot!;
  const want = plotDraws(s.players.length);
  let deck = p.deck;
  let discard = p.discard;
  if (deck.length < want && discard.length) {
    deck = [...deck, ...shuffle(discard, rng)];
    discard = [];
  }
  const drawn = deck.slice(0, want);
  const next = withPlot(s, { deck: deck.slice(drawn.length), discard, drawn });
  return { ...next, phase: drawn.length ? "plotDeal" : "proposal" };
}

/** Other players' held cards, which Restore Your Honor can take. */
export function takeableCards(s: GameState, actorId: string): { playerId: string; card: PlotCard }[] {
  const hands = s.plot?.hands ?? {};
  return seatOrderFromLeader(s)
    .filter((id) => id !== actorId)
    .flatMap((id) => (hands[id] ?? []).map((card) => ({ playerId: id, card })));
}

/** The two players beside this one (Are You the One). */
export function neighboursOf(s: GameState, playerId: string): string[] {
  const n = s.players.length;
  const i = s.players.findIndex((p) => p.id === playerId);
  return [s.players[(i - 1 + n) % n].id, s.players[(i + 1) % n].id];
}

/** The leader hands every drawn card to another player: `assignments` maps card id → player id. */
export function plotDeal(s: GameState, playerId: string, assignments: Record<string, string>): GameState {
  assert(s.phase === "plotDeal" && s.plot, "No Plot cards to hand out");
  assert(leader(s).id === playerId, "Only the leader hands out Plot cards");
  const p = s.plot;
  const hands = { ...p.hands };
  const charges = [...p.charges];
  const pending: PlotPending[] = [];
  for (const card of p.drawn) {
    const to = assignments?.[card.id];
    assert(
      to && to !== playerId && s.players.some((x) => x.id === to),
      "Hand each Plot card to another player"
    );
    const type = PLOT_INFO[card.key].type;
    if (type === "held") hands[to] = [...(hands[to] ?? []), card];
    else if (type === "permanent") charges.push(to);
    else pending.push({ card, holderId: to, actorId: card.key === "showStrength" ? playerId : to });
  }
  // use-immediately cards resolve clockwise from the leader, by who was handed them
  const order = seatOrderFromLeader(s);
  pending.sort((a, b) => order.indexOf(a.holderId) - order.indexOf(b.holderId));
  const events = [
    ...p.events,
    ...p.drawn.map((c) => ({
      round: s.mission,
      key: c.key,
      kind: "given" as const,
      byId: playerId,
      targetId: assignments[c.id],
    })),
  ];
  return nextPending(withPlot(s, { hands, charges, pending, drawn: [], events }));
}

/** Move to the next use-immediately card, skipping a Restore Your Honor with nothing to take. */
function nextPending(s: GameState): GameState {
  const p = s.plot!;
  let pending = p.pending;
  let discard = p.discard;
  while (pending.length && pending[0].card.key === "restoreHonor" && !takeableCards(s, pending[0].actorId).length) {
    discard = [...discard, pending[0].card];
    pending = pending.slice(1);
  }
  const next = withPlot(s, { pending, discard });
  return { ...next, phase: pending.length ? "plotResolve" : "proposal" };
}

/**
 * Resolve the next use-immediately card. `targetId` is the neighbour (Are You the One),
 * the viewer (Show Your True Nature, Show Your Strength), or the player to take from
 * (Restore Your Honor, with `cardId`).
 */
export function plotResolve(
  s: GameState,
  playerId: string,
  targetId: string | null,
  cardId: string | null = null
): GameState {
  assert(s.phase === "plotResolve" && s.plot && s.plot.pending.length, "Nothing to resolve");
  const p = s.plot;
  const { card, actorId } = p.pending[0];
  assert(actorId === playerId, "This Plot card isn't yours to resolve");
  assert(
    targetId && targetId !== playerId && s.players.some((x) => x.id === targetId),
    "Choose another player"
  );
  let hands = p.hands;
  let secrets = p.secrets;
  const loyaltyOf = (viewerId: string, subjectId: string) => ({
    round: s.mission,
    viewerId,
    subjectId,
    via: card.key,
    loyalty: allegianceOf(s, subjectId),
    card: null,
  });
  switch (card.key) {
    case "areYouTheOne":
      assert(neighboursOf(s, playerId).includes(targetId), "Choose the player on your left or right");
      secrets = [...secrets, loyaltyOf(playerId, targetId)];
      break;
    case "trueNature":
    case "showStrength":
      // the actor (the holder, or the leader for Show Your Strength) shows their own loyalty
      secrets = [...secrets, loyaltyOf(targetId, playerId)];
      break;
    case "restoreHonor": {
      const theirs = hands[targetId] ?? [];
      const taken = theirs.find((c) => c.id === cardId);
      assert(taken, "Choose one of their held Plot cards");
      hands = {
        ...hands,
        [targetId]: theirs.filter((c) => c.id !== cardId),
        [playerId]: [...(hands[playerId] ?? []), taken],
      };
      break;
    }
  }
  const events = [...p.events, { round: s.mission, key: card.key, kind: "used" as const, byId: playerId, targetId }];
  return nextPending(
    withPlot(s, {
      hands,
      secrets,
      events,
      discard: [...p.discard, card],
      pending: p.pending.slice(1),
    })
  );
}

/** The asked holder declines; the next holder is asked, or play moves on. */
export function plotPass(s: GameState, playerId: string, now = Date.now(), rng = secureRandom): GameState {
  const w = s.plot?.window;
  assert(s.phase === "plotWindow" && w, "No Plot card can be played now");
  assert(w.queue[0] === playerId, "It isn't your turn to decide");
  return advanceWindow(s, now, rng);
}

function advanceWindow(s: GameState, now: number, rng: () => number): GameState {
  const w = s.plot!.window!;
  const queue = w.queue.slice(1);
  if (queue.length) return withPlot(s, { window: { ...w, queue } });
  return plotContinue(s, w.then, now, rng);
}

/** The asked holder plays the card the window is for (`targetId`: a rider, for We Found You and Ambush). */
export function plotPlay(
  s: GameState,
  playerId: string,
  targetId: string | null,
  now = Date.now(),
  rng = secureRandom
): GameState {
  const w = s.plot?.window;
  assert(s.phase === "plotWindow" && w, "No Plot card can be played now");
  assert(w.queue[0] === playerId, "It isn't your turn to decide");
  const p = s.plot!;
  const hand = p.hands[playerId] ?? [];
  const card = hand.find((c) => c.key === w.kind);
  assert(card, "You don't hold that card");
  const spent = withPlot(s, {
    hands: { ...p.hands, [playerId]: hand.filter((c) => c.id !== card.id) },
    discard: [...p.discard, card],
    events: [...p.events, { round: s.mission, key: w.kind, kind: "used", byId: playerId, targetId }],
  });
  switch (w.kind) {
    case "leadToVictory": {
      // no other Lead to Victory until a vote has been taken, so the window closes
      const lead = { ...spent, leaderIndex: s.players.findIndex((x) => x.id === playerId) };
      return plotContinue(withPlot(lead, { strongLeaderBlocked: true }), w.then, now, rng);
    }
    case "kingReturns": {
      const v = s.lastVote;
      return rejectTeam(withPlot(spent, { window: null }), v?.approve ?? 0, v?.reject ?? 0);
    }
    case "weFoundYou":
      assert(
        targetId && s.proposal.includes(targetId) && targetId !== playerId && !p.spotlit.includes(targetId),
        "Choose another rider who isn't already playing face up"
      );
      return advanceWindow(withPlot(spent, { spotlit: [...p.spotlit, targetId] }), now, rng);
    case "ambush": {
      assert(
        targetId && s.proposal.includes(targetId) && !p.ambushed.includes(targetId),
        "Choose a rider whose card no one has checked this round"
      );
      const secret = {
        round: s.mission,
        viewerId: playerId,
        subjectId: targetId,
        via: "ambush" as const,
        loyalty: null,
        card: s.questCards[targetId],
      };
      return advanceWindow(
        withPlot(spent, { ambushed: [...p.ambushed, targetId], secrets: [...p.secrets, secret] }),
        now,
        rng
      );
    }
  }
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
  // a leader restarted before proposing (reveal, the Lady, the Plot draw, proposal) never picked a team, so they keep the lead
  const beforeProposal =
    ["reveal", "lady", "ladyReveal", "proposal", "plotDeal", "plotResolve"].includes(s.phase) ||
    (s.phase === "plotWindow" && s.plot?.window?.kind === "leadToVictory");
  const leaderPicked = !beforeProposal;
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

/**
 * Lazily advance scripted beats if the TV never acked (disconnects, dead room), and,
 * only when the host turned on forced timers, decide at random for anyone who let a
 * timed decision run out.
 */
export function autoAdvance(
  s: GameState,
  now = Date.now(),
  rng: () => number = secureRandom
): GameState | null {
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
  const endsAt = timerEndsAt(s);
  if (endsAt !== null && s.config.timerForce === true && now >= endsAt) {
    try {
      return forceDecision(s, now, rng);
    } catch (e) {
      if (e instanceof GameError) return null;
      throw e;
    }
  }
  return null;
}

/** When the current phase's timer runs out, or null if it isn't timed (or timers are off). */
export function timerEndsAt(s: GameState): number | null {
  const key = TIMER_FOR_PHASE[s.phase];
  if (!key || s.config.timers !== true || !s.phaseStartedAt) return null;
  return s.phaseStartedAt + normalizeConfig(s.config).timerSeconds[key] * 1000;
}

/** Record when a phase began, so its timer counts from there. */
export function stampPhase(prev: GameState, next: GameState, now: number): GameState {
  return next.phase === prev.phase ? next : { ...next, phaseStartedAt: now };
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * The card a timed-out rider plays: whatever their side forces, Success for Good,
 * and a coin flip for anyone free to choose Evil's way.
 */
function fallbackCard(s: GameState, playerId: string, rng: () => number): QuestCard {
  const side = allegianceOf(s, playerId);
  const role = s.roles[playerId];
  const lancelot = role === "lancelotGood" || role === "lancelotEvil";
  if (lancelot && s.config.lancelotForcedCards === true) return side === "evil" ? "fail" : "success";
  if (side === "good") return "success";
  return rng() < 0.5 ? "fail" : "success";
}

/** Make the outstanding choice(s) of the current phase at random, through the normal engine moves. */
function forceDecision(s: GameState, now: number, rng: () => number): GameState {
  switch (s.phase) {
    case "proposal": {
      const lead = leader(s).id;
      const quest = pick(availableQuests(s), rng);
      const team = shuffle(s.players, rng).slice(0, teamSize(s, quest)).map((p) => p.id);
      const sword = s.config.excalibur === true ? pick(team.filter((id) => id !== lead), rng) : null;
      return propose(s, lead, team, sword, quest);
    }
    case "voting": {
      // Charge holders first, as the rules require
      let next = s;
      const order = [...new Set([...chargeHolders(s), ...s.players.map((p) => p.id)])];
      for (const id of order) {
        if (!(id in next.votes)) next = vote(next, id, rng() < 0.5 ? "approve" : "reject", now);
      }
      return next;
    }
    case "plotDeal": {
      const lead = leader(s).id;
      const others = s.players.filter((p) => p.id !== lead).map((p) => p.id);
      const assignments = Object.fromEntries(s.plot!.drawn.map((c) => [c.id, pick(others, rng)]));
      return plotDeal(s, lead, assignments);
    }
    case "plotResolve": {
      const { card, actorId } = s.plot!.pending[0];
      if (card.key === "restoreHonor") {
        const choice = pick(takeableCards(s, actorId), rng);
        return plotResolve(s, actorId, choice.playerId, choice.card.id);
      }
      const targets =
        card.key === "areYouTheOne"
          ? neighboursOf(s, actorId)
          : s.players.filter((p) => p.id !== actorId).map((p) => p.id);
      return plotResolve(s, actorId, pick(targets, rng));
    }
    case "plotWindow":
      // declining is the choice that changes nothing
      return plotPass(s, s.plot!.window!.queue[0], now, rng);
    case "quest": {
      let next = s;
      for (const id of s.proposal) {
        if (!(id in next.questCards)) next = playQuestCard(next, id, fallbackCard(next, id, rng), now, rng);
      }
      return next;
    }
    case "assassination": {
      const holder = s.flagHolderId!;
      const known = knownEvilTo(s, holder);
      const targets = s.players.filter((p) => p.id !== holder && !known.includes(p.id));
      return assassinate(s, holder, pick(targets, rng).id, now);
    }
    case "lady":
      return ladyExamine(s, s.lady!.holderId, pick(ladyTargets(s), rng).id);
    case "ladyReveal":
      return ladyPass(s, s.lady!.holderId);
    case "excalibur": {
      const holder = s.excaliburHolderId!;
      const choices: (string | null)[] = [null, ...s.proposal.filter((id) => id !== holder)];
      return wieldExcalibur(s, holder, pick(choices, rng), now, rng);
    }
    case "excaliburReveal":
      return excaliburDone(s, s.excaliburHolderId!, now, rng);
    case "trap":
      return trapCard(s, leader(s).id, pick(s.proposal, rng));
    case "trapReveal":
      return trapDone(s, leader(s).id, now, rng);
    default:
      return s;
  }
}

import type {
  Allegiance,
  AllegianceCard,
  Config,
  GameState,
  MissionRecord,
  Phase,
  PlotCardKey,
  PlotWindowKind,
  QuestCard,
  RejectionVariant,
  RoleKey,
  Vote,
} from "./types";
import { ROLES } from "./roles";
import { MISSION_SIZES, PRESENCE_MS, failsNeeded, isEvil, normalizeConfig } from "./rules";
import {
  allegianceOf,
  availableQuests,
  chargeHolders,
  neighboursOf,
  takeableCards,
  currentExcalibur,
  currentQuest,
  currentTrap,
  isAssassinMark,
  knownEvilTo,
  ladyTargets,
  leader,
  timerEndsAt,
  turnKey,
} from "./engine";

export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  ready: boolean;
  connected: boolean;
}

export interface CastEntry {
  name: string;
  role: RoleKey;
  /** side at the end of the game: differs from the role's only for a switched Lancelot */
  allegiance: Allegiance;
}

interface CommonView {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  playerCount: number;
  missionSizes: number[];
  /** Fail cards needed per mission */
  failsNeeded: number[];
  leaderId: string | null;
  leaderName: string | null;
  /**
   * The quest being attempted (0..4). Under Targeting, before a team is proposed, no
   * quest is chosen yet and this is just the round; check `questChosen`.
   */
  mission: number;
  questChosen: boolean;
  /** the round: how many quests have been resolved (0..4) */
  round: number;
  targeting: boolean;
  /** quests the leader may attempt now (Targeting: unattempted, and the 5th only after two wins) */
  availableQuests: number[];
  /** the Trapper adds this many riders to every team */
  extraRiders: number;
  rejections: number;
  rejectionVariant: RejectionVariant;
  /** public table rule; the phone's quest screen depends on it */
  goodMayFail: boolean;
  /** public table rule: each Lancelot must play their current side's card */
  lancelotForcedCards: boolean;
  rolesInPlay: RoleKey[];
  proposalIds: string[];
  proposalNames: string[];
  votedIds: string[];
  /** per-mission results for the quest track (null = not yet played) */
  questResults: ({ success: boolean; fails: number } | null)[];
  /** who holds and who has held the Lady is open information; results never appear here */
  lady: {
    holderId: string;
    holderName: string;
    pastHolderIds: string[];
    /** during ladyReveal, the player being examined */
    examinedName: string | null;
  } | null;
  /** riders the leader picks this mission: the mission size, +1 with Trapper */
  teamSize: number;
  excaliburOn: boolean;
  /** this proposal's sword: who holds it is public, and so is whose card it switched */
  excalibur: {
    holderId: string;
    holderName: string;
    resolved: boolean;
    /** null while unresolved or when sheathed */
    targetName: string | null;
  } | null;
  /** this mission's trapped rider; the card itself never appears here */
  trap: { targetId: string; targetName: string } | null;
  /**
   * Allegiance cards are public once face up; the hidden deck's unflipped cards and who
   * the Lancelots are never appear here.
   */
  lancelot: {
    schedule: AllegianceCard[] | null;
    flips: { round: number; card: AllegianceCard }[];
    switched: boolean;
  } | null;
  /** the current decision's countdown (server time); `forced` = random choices at zero */
  timer: { endsAt: number; forced: boolean } | null;
  /**
   * Plot cards are public once drawn: hands, Charges, who is being asked, who played what
   * on whom. The face-down deck and every private result stay out.
   */
  plot: {
    deckCount: number;
    drawn: { id: string; key: PlotCardKey }[];
    hands: { playerId: string; cards: { id: string; key: PlotCardKey }[] }[];
    charges: string[];
    window: { kind: PlotWindowKind; askingId: string; askingName: string } | null;
    pending: { key: PlotCardKey; actorId: string; actorName: string; holderName: string } | null;
    /** riders playing face up this quest; their card shows once played */
    spotlit: { playerId: string; name: string; card: QuestCard | null }[];
    /** Charge holders' votes, public once all of them have voted */
    chargeVotes: { playerId: string; name: string; vote: Vote }[] | null;
    lastEvent: { key: PlotCardKey; kind: "given" | "used"; byName: string; targetName: string | null } | null;
  } | null;
  serverNow: number;
}

export interface TvView extends CommonView {
  kind: "tv";
  config: Config;
  voteReveal: {
    votes: { name: string; vote: Vote }[];
    approve: number;
    reject: number;
    approved: boolean;
    revealAt: number;
  } | null;
  quest: { teamNames: string[]; cardsIn: number; cardsNeeded: number } | null;
  questReveal: { cards: QuestCard[]; fails: number; success: boolean; revealAt: number } | null;
  assassinReveal: {
    accusedName: string;
    /** null when Merlin isn't dealt (the blade still falls for Guinevere) */
    merlinName: string | null;
    /** null when Guinevere isn't dealt */
    guinevereName: string | null;
    hit: boolean;
    /** the role the blade found when it hit (Merlin or Guinevere) */
    markRole: RoleKey | null;
    revealAt: number;
  } | null;
  gameover: { winner: string; winReason: string; cast: CastEntry[]; recap: MissionRecord[] } | null;
}

export interface Knowledge {
  label: string;
  names: string[];
  note: string | null;
}

export interface PlayerView extends CommonView {
  kind: "player";
  me: { id: string; name: string; seat: number; ready: boolean };
  isLeader: boolean;
  role: {
    key: RoleKey;
    name: string;
    sigil: string;
    allegiance: "good" | "evil";
    flavor: string;
    coaching: string;
    knowledge: Knowledge | null;
    flagHolder: boolean;
  } | null;
  myVote: Vote | null;
  onTeam: boolean;
  myCard: QuestCard | null;
  cardsIn: number;
  cardsNeeded: number;
  voteResult: { approved: boolean; approve: number; reject: number } | null;
  assassin: { choosing: boolean; targets: { id: string; name: string }[] } | null;
  /** set only for the Lady's holder while choosing */
  ladyTargets: { id: string; name: string }[] | null;
  /** this player's own Lady check, if they made one; no one else's view carries it */
  ladyResult: { targetName: string; loyalty: Allegiance } | null;
  /** set only for the wielder while choosing: the other riders */
  excaliburTargets: { id: string; name: string }[] | null;
  /** original cards this player saw by switching them; only the wielder's view carries these */
  excaliburSeen: { mission: number; targetName: string; original: QuestCard }[];
  /** cards this player trapped as leader; only their view carries these */
  trapsSeen: { mission: number; targetName: string; card: QuestCard }[];
  /** private results from Plot cards that only this player saw (a loyalty or a quest card) */
  plotSeen: { round: number; via: PlotCardKey; subjectName: string; loyalty: Allegiance | null; card: QuestCard | null }[];
  /** the Plot decision this player owes right now, if any */
  plotTurn: {
    /** unique per decision, even two identical decisions in a row by this player */
    turnId: string;
    kind: "deal" | "resolve" | "window";
    key?: PlotCardKey;
    /** deal: the drawn cards to hand out */
    cards?: { id: string; key: PlotCardKey }[];
    /** players (or riders) this player may choose */
    targets: { id: string; name: string }[];
    /** Restore Your Honor: other players' held cards */
    takeable: { playerId: string; name: string; cardId: string; key: PlotCardKey }[];
  } | null;
  gameover: { winner: string; winReason: string; myRole: RoleKey; cast: CastEntry[] } | null;
  paused: boolean;
}

function common(s: GameState, seen: Record<string, number>, now: number): CommonView {
  const started = s.phase !== "lobby" && s.phase !== "setup";
  const lead = started && s.players.length > 0 ? leader(s) : null;
  const questResults: CommonView["questResults"] = [null, null, null, null, null];
  for (const h of s.history) questResults[h.mission] = { success: h.success, fails: h.fails };
  const idToName = (id: string) => s.players.find((p) => p.id === id)?.name ?? "?";
  return {
    code: s.code,
    phase: s.phase,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      ready: p.ready,
      connected: now - (seen[p.id] ?? 0) < PRESENCE_MS,
    })),
    playerCount: s.players.length,
    missionSizes: MISSION_SIZES[s.players.length] ?? MISSION_SIZES[5],
    failsNeeded: failsNeeded(s.players.length),
    leaderId: lead?.id ?? null,
    leaderName: lead?.name ?? null,
    mission: currentQuest(s),
    questChosen: s.config.targeting !== true || s.quest != null,
    round: s.mission,
    targeting: s.config.targeting === true,
    availableQuests: started ? availableQuests(s) : [],
    extraRiders: s.config.trapper === true ? 1 : 0,
    rejections: s.rejections,
    rejectionVariant: s.config.rejectionVariant,
    goodMayFail: s.config.goodMayFail === true,
    lancelotForcedCards: s.config.lancelotForcedCards === true,
    rolesInPlay: s.rolesInPlay,
    proposalIds: s.proposal,
    proposalNames: s.proposal.map(idToName),
    votedIds: s.phase === "voting" ? Object.keys(s.votes) : [],
    questResults,
    lady: s.lady
      ? {
          holderId: s.lady.holderId,
          holderName: idToName(s.lady.holderId),
          pastHolderIds: s.lady.pastHolderIds,
          examinedName:
            s.phase === "ladyReveal" && s.lady.checks.length
              ? idToName(s.lady.checks[s.lady.checks.length - 1].targetId)
              : null,
        }
      : null,
    teamSize:
      (MISSION_SIZES[s.players.length] ?? MISSION_SIZES[5])[currentQuest(s)] +
      (s.config.trapper === true ? 1 : 0),
    excaliburOn: s.config.excalibur === true,
    excalibur: (() => {
      const holderId = s.excaliburHolderId;
      if (!holderId) return null;
      const use = ["excalibur", "excaliburReveal", "trap", "trapReveal", "questReveal"].includes(s.phase)
        ? currentExcalibur(s)
        : null;
      return {
        holderId,
        holderName: idToName(holderId),
        resolved: !!use,
        targetName: use?.targetId ? idToName(use.targetId) : null,
      };
    })(),
    trap: (() => {
      const t = ["trapReveal", "questReveal"].includes(s.phase) ? currentTrap(s) : null;
      return t ? { targetId: t.targetId, targetName: idToName(t.targetId) } : null;
    })(),
    lancelot: s.lancelot
      ? { schedule: s.lancelot.schedule, flips: s.lancelot.flips, switched: s.lancelot.switched }
      : null,
    timer: (() => {
      const endsAt = timerEndsAt(s);
      return endsAt === null ? null : { endsAt, forced: s.config.timerForce === true };
    })(),
    plot: plotPublic(s, idToName),
    serverNow: now,
  };
}

function plotPublic(s: GameState, idToName: (id: string) => string): CommonView["plot"] {
  const p = s.plot;
  if (!p) return null;
  const charges = chargeHolders(s);
  const chargesVoted = s.phase === "voting" && charges.length > 0 && charges.every((id) => id in s.votes);
  const last = p.events[p.events.length - 1];
  const inQuest = ["quest", "plotWindow", "excalibur", "excaliburReveal", "questReveal"].includes(s.phase);
  return {
    deckCount: p.deck.length,
    drawn: p.drawn.map((c) => ({ id: c.id, key: c.key })),
    hands: s.players
      .filter((pl) => (p.hands[pl.id] ?? []).length)
      .map((pl) => ({ playerId: pl.id, cards: p.hands[pl.id].map((c) => ({ id: c.id, key: c.key })) })),
    charges,
    window:
      s.phase === "plotWindow" && p.window
        ? { kind: p.window.kind, askingId: p.window.queue[0], askingName: idToName(p.window.queue[0]) }
        : null,
    pending:
      s.phase === "plotResolve" && p.pending.length
        ? {
            key: p.pending[0].card.key,
            actorId: p.pending[0].actorId,
            actorName: idToName(p.pending[0].actorId),
            holderName: idToName(p.pending[0].holderId),
          }
        : null,
    spotlit: inQuest
      ? p.spotlit.map((id) => ({ playerId: id, name: idToName(id), card: s.questCards[id] ?? null }))
      : [],
    chargeVotes: chargesVoted
      ? charges.map((id) => ({ playerId: id, name: idToName(id), vote: s.votes[id] }))
      : null,
    lastEvent: last
      ? {
          key: last.key,
          kind: last.kind,
          byName: idToName(last.byId),
          targetName: last.targetId ? idToName(last.targetId) : null,
        }
      : null,
  };
}

/** What this player must decide in a Plot step right now, if anything. */
function plotTurnFor(s: GameState, playerId: string): PlayerView["plotTurn"] {
  const p = s.plot;
  if (!p) return null;
  const nameOf = (id: string) => s.players.find((x) => x.id === id)?.name ?? "?";
  const others = s.players.filter((x) => x.id !== playerId).map((x) => ({ id: x.id, name: x.name }));
  const turnId = turnKey(s);
  if (s.phase === "plotDeal" && leader(s).id === playerId) {
    return { turnId, kind: "deal", cards: p.drawn.map((c) => ({ id: c.id, key: c.key })), targets: others, takeable: [] };
  }
  if (s.phase === "plotResolve" && p.pending[0]?.actorId === playerId) {
    const key = p.pending[0].card.key;
    if (key === "restoreHonor") {
      const takeable = takeableCards(s, playerId).map((t) => ({
        playerId: t.playerId,
        name: nameOf(t.playerId),
        cardId: t.card.id,
        key: t.card.key,
      }));
      return { turnId, kind: "resolve", key, targets: [], takeable };
    }
    const targets =
      key === "areYouTheOne"
        ? neighboursOf(s, playerId).map((id) => ({ id, name: nameOf(id) }))
        : others;
    return { turnId, kind: "resolve", key, targets, takeable: [] };
  }
  if (s.phase === "plotWindow" && p.window?.queue[0] === playerId) {
    const kind = p.window.kind;
    const riders = s.proposal.map((id) => ({ id, name: nameOf(id) }));
    const targets =
      kind === "weFoundYou"
        ? riders.filter((r) => r.id !== playerId && !p.spotlit.includes(r.id))
        : kind === "ambush"
          ? riders.filter((r) => !p.ambushed.includes(r.id))
          : [];
    return { turnId, kind: "window", key: kind, targets, takeable: [] };
  }
  return null;
}

function castList(s: GameState): CastEntry[] {
  return s.players.map((p) => ({ name: p.name, role: s.roles[p.id], allegiance: allegianceOf(s, p.id) }));
}

export function tvView(s: GameState, seen: Record<string, number>, now = Date.now()): TvView {
  const idToName = (id: string) => s.players.find((p) => p.id === id)?.name ?? "?";
  return {
    kind: "tv",
    ...common(s, seen, now),
    config: normalizeConfig(s.config),
    voteReveal:
      s.phase === "voteReveal" && s.voteMeta
        ? {
            votes: [...s.players]
              .sort((a, b) => a.seat - b.seat)
              .map((p) => ({ name: p.name, vote: s.votes[p.id] })),
            approve: s.voteMeta.approve,
            reject: s.voteMeta.reject,
            approved: s.voteMeta.approved,
            revealAt: s.voteMeta.revealAt,
          }
        : null,
    quest:
      s.phase === "quest"
        ? {
            teamNames: s.proposal.map(idToName),
            cardsIn: Object.keys(s.questCards).length,
            cardsNeeded: s.proposal.length,
          }
        : null,
    questReveal: s.phase === "questReveal" && s.questMeta ? { ...s.questMeta } : null,
    assassinReveal:
      s.phase === "assassinationReveal" && s.assassinTargetId
        ? {
            accusedName: idToName(s.assassinTargetId),
            merlinName: s.players.find((p) => s.roles[p.id] === "merlin")?.name ?? null,
            guinevereName: s.players.find((p) => s.roles[p.id] === "guinevere")?.name ?? null,
            hit: isAssassinMark(s.roles[s.assassinTargetId]),
            markRole: isAssassinMark(s.roles[s.assassinTargetId]) ? s.roles[s.assassinTargetId] : null,
            revealAt: s.assassinRevealAt!,
          }
        : null,
    gameover:
      s.phase === "gameover"
        ? {
            winner: s.winner!,
            winReason: s.winReason ?? "",
            cast: castList(s),
            recap: s.history,
          }
        : null,
  };
}

function knowledgeFor(s: GameState, playerId: string): Knowledge | null {
  const role = s.roles[playerId];
  const bySeat = [...s.players].sort((a, b) => a.seat - b.seat);
  const namesOf = (pred: (r: RoleKey) => boolean, excludeSelf = true) =>
    bySeat
      .filter((p) => (excludeSelf ? p.id !== playerId : true) && pred(s.roles[p.id]))
      .map((p) => p.name);
  const inPlay = (r: RoleKey) => s.rolesInPlay.includes(r);

  if (role === "merlin") {
    const wraith = s.config.oberonHiddenFromMerlin === true;
    const hidden = (r: RoleKey) => r === "mordred" || (wraith && r === "oberon");
    const hiders = (["mordred", "oberon"] as RoleKey[]).filter((r) => hidden(r) && inPlay(r));
    return {
      label: "KNOWN TO YOU — EVIL WALKS AS:",
      names: namesOf((r) => isEvil(r) && !hidden(r)),
      note: hiders.length
        ? `(${hiders.map((r) => ROLES[r].name).join(" and ")} ${hiders.length > 1 ? "hide" : "hides"} from you)`
        : null,
    };
  }
  if (role === "mistress") {
    // alphabetical so the order says nothing about which is which
    const pair = namesOf((r) => r === "merlin" || r === "morgana").sort((a, b) =>
      a.localeCompare(b)
    );
    return {
      label: "TWO FIGURES SHIMMER — ONE IS YOUR MERLIN:",
      names: pair,
      note: inPlay("morgana") ? "(the other is Morgana, wearing his face)" : "(your sight is clear — this is Merlin)",
    };
  }
  if (role === "oberon") {
    return {
      label: "KNOWN TO YOU:",
      names: [],
      note: "No one. You are evil, alone, and unlisted among your own.",
    };
  }
  const lancelot = (r: RoleKey) => r === "lancelotGood" || r === "lancelotEvil";
  if (role === "guinevere") {
    // alphabetical so the order says nothing about which side is which
    return {
      label: "THE TWO LANCELOTS:",
      names: namesOf(lancelot).sort((a, b) => a.localeCompare(b)),
      note: "(one began loyal, one began with Mordred; hearts may turn)",
    };
  }
  if (lancelot(role)) {
    // the Evil Lancelot never sees Evil; the pair see each other only in that variant
    const meet = s.config.lancelotsMeet === true;
    return {
      label: "KNOWN TO YOU:",
      names: meet ? namesOf(lancelot) : [],
      note: meet ? "(your counterpart Lancelot)" : "No one. Your heart is your own.",
    };
  }
  if (isEvil(role)) {
    const evilLancelotSeen = s.config.lancelotEvilKnown !== false;
    const unseen = (["oberon", "lancelotEvil"] as RoleKey[]).filter(
      (r) => inPlay(r) && (r === "oberon" || !evilLancelotSeen)
    );
    return {
      label: "YOUR KIN IN SHADOW:",
      names: namesOf(
        (r) => isEvil(r) && r !== "oberon" && (r !== "lancelotEvil" || evilLancelotSeen)
      ),
      note: unseen.length
        ? `(${unseen.map((r) => (r === "oberon" ? "Oberon" : "the Evil Lancelot")).join(" and ")} ${unseen.length > 1 ? "walk" : "walks"} unseen, even by you)`
        : null,
    };
  }
  return null;
}

export function playerView(
  s: GameState,
  playerId: string,
  seen: Record<string, number>,
  now = Date.now()
): PlayerView | null {
  const me = s.players.find((p) => p.id === playerId);
  if (!me) return null;
  const role = s.roles[playerId];
  const dealt = !!role && s.phase !== "lobby" && s.phase !== "setup";
  const onTeam = s.proposal.includes(playerId);
  const hostSeen = seen["host"] ?? 0;
  const midGame = !["lobby", "setup", "gameover"].includes(s.phase);
  const flagHolder = s.flagHolderId === playerId;
  const info = dealt ? ROLES[role] : null;

  return {
    kind: "player",
    ...common(s, seen, now),
    me: { id: me.id, name: me.name, seat: me.seat, ready: me.ready },
    isLeader: dealt && leader(s).id === playerId,
    role:
      dealt && info
        ? {
            key: role,
            name: info.name,
            sigil: info.sigil,
            allegiance: allegianceOf(s, playerId),
            flavor: info.flavor,
            coaching: info.coaching,
            knowledge: knowledgeFor(s, playerId),
            flagHolder,
          }
        : null,
    myVote: s.phase === "voting" ? s.votes[playerId] ?? null : null,
    onTeam,
    myCard: s.phase === "quest" ? s.questCards[playerId] ?? null : null,
    cardsIn: s.phase === "quest" ? Object.keys(s.questCards).length : 0,
    cardsNeeded: s.phase === "quest" ? s.proposal.length : 0,
    voteResult:
      s.phase === "voteReveal" && s.voteMeta
        ? {
            approved: s.voteMeta.approved,
            approve: s.voteMeta.approve,
            reject: s.voteMeta.reject,
          }
        : null,
    assassin:
      s.phase === "assassination" && flagHolder
        ? {
            choosing: true,
            targets: s.players
              .filter((p) => p.id !== playerId && !knownEvilTo(s, playerId).includes(p.id))
              .map((p) => ({ id: p.id, name: p.name })),
          }
        : null,
    ladyTargets:
      s.phase === "lady" && s.lady?.holderId === playerId
        ? [...ladyTargets(s)]
            .sort((a, b) => a.seat - b.seat)
            .map((p) => ({ id: p.id, name: p.name }))
        : null,
    excaliburTargets:
      s.phase === "excalibur" && s.excaliburHolderId === playerId
        ? s.proposal
            .filter((id) => id !== playerId && !s.plot?.spotlit.includes(id))
            .map((id) => s.players.find((p) => p.id === id)!)
            .sort((a, b) => a.seat - b.seat)
            .map((p) => ({ id: p.id, name: p.name }))
        : null,
    plotSeen: (s.plot?.secrets ?? [])
      .filter((x) => x.viewerId === playerId)
      .map((x) => ({
        round: x.round,
        via: x.via,
        subjectName: s.players.find((p) => p.id === x.subjectId)?.name ?? "?",
        loyalty: x.loyalty,
        card: x.card,
      })),
    plotTurn: plotTurnFor(s, playerId),
    excaliburSeen: (s.excaliburLog ?? [])
      .filter((e) => e.holderId === playerId && e.targetId && e.original)
      .map((e) => ({
        mission: e.mission,
        targetName: s.players.find((p) => p.id === e.targetId)?.name ?? "?",
        original: e.original!,
      })),
    trapsSeen: (s.trapLog ?? [])
      .filter((t) => t.leaderId === playerId)
      .map((t) => ({
        mission: t.mission,
        targetName: s.players.find((p) => p.id === t.targetId)?.name ?? "?",
        card: t.card,
      })),
    ladyResult: (() => {
      const mine = s.lady?.checks.find((c) => c.holderId === playerId);
      if (!mine) return null;
      return {
        targetName: s.players.find((p) => p.id === mine.targetId)?.name ?? "?",
        loyalty: mine.loyalty,
      };
    })(),
    gameover:
      s.phase === "gameover"
        ? { winner: s.winner!, winReason: s.winReason ?? "", myRole: role, cast: castList(s) }
        : null,
    paused: midGame && now - hostSeen > PRESENCE_MS,
  };
}

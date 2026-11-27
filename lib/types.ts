export type RoleKey =
  | "merlin"
  | "mistress"
  | "servant"
  | "mordred"
  | "morgana"
  | "assassin"
  | "minion"
  | "oberon"
  /** the two Lancelots, named by their starting side; see allegianceOf for the current one */
  | "lancelotGood"
  | "lancelotEvil"
  | "guinevere";

export type Allegiance = "good" | "evil";

export type Phase =
  | "lobby"
  | "setup"
  | "reveal"
  | "lady"
  | "ladyReveal"
  | "proposal"
  | "voting"
  | "voteReveal"
  | "quest"
  | "excalibur"
  | "excaliburReveal"
  | "trap"
  | "trapReveal"
  | "questReveal"
  | "plotDeal"
  | "plotResolve"
  | "plotWindow"
  | "assassination"
  | "assassinationReveal"
  | "gameover";

export type Vote = "approve" | "reject";
export type QuestCard = "success" | "fail";

export interface Player {
  id: string;
  token: string;
  name: string;
  seat: number;
  ready: boolean;
}

/**
 * What a 5th consecutive rejection does:
 * forfeit = Evil wins that quest; official = Evil wins the game (rulebook);
 * unopposed = the 5th leader's team rides without a vote.
 */
export type RejectionVariant = "forfeit" | "official" | "unopposed";

export interface Config {
  /** optional roles the host has put in the deck (see OPTIONAL_ROLES); Servants / Minions fill the rest */
  specials: RoleKey[];
  /**
   * "assassin" = a dedicated Assassin card when an Evil seat is free for it; otherwise the
   * named Evil special carries the blade as an add-on. Resolved by `bladeRole`.
   */
  assassinFlag: RoleKey;
  /** false = no endgame Merlin guess: three quests alone decide the game */
  assassination: boolean;
  rejectionVariant: RejectionVariant;
  /** "Wraith" variant: Oberon is hidden from Merlin as well as from Evil */
  oberonHiddenFromMerlin: boolean;
  /** house variant: Good riders may play Fail */
  goodMayFail: boolean;
  /** Lady of the Lake: loyalty checks before missions 3, 4 and 5 */
  ladyOfTheLake: boolean;
  /** Excalibur: the leader arms one rider, who may switch another rider's played card */
  excalibur: boolean;
  /** Trapper (Hostile Intent): one extra rider; the leader removes and privately sees one card */
  trapper: boolean;
  /**
   * Lancelot allegiance switches. "hidden": a face-down 5-card deck (3 blank, 2 switch),
   * one flipped at the start of rounds 3–5. "known": 5 of a 7-card deck (5 blank, 2 switch)
   * dealt face up at the start, card k applying at the start of round k.
   */
  lancelotSchedule: "none" | "hidden" | "known";
  /** each Lancelot must play the card of their current side */
  lancelotForcedCards: boolean;
  /** Evil sees the starting-Evil Lancelot at night (he still doesn't see them) */
  lancelotEvilKnown: boolean;
  /** the two Lancelots see each other at night */
  lancelotsMeet: boolean;
  /** Targeting: the leader picks which unattempted quest the team attempts */
  targeting: boolean;
  /** Plot cards (The Plot Thickens). Never on together with `trapper`. */
  plotCards: boolean;
  /** show a countdown on the TV for each timed decision */
  timers: boolean;
  /** at zero, decide at random for anyone who hasn't; off = the countdown is advisory only */
  timerForce: boolean;
  /** seconds per decision, each within TIMER_MIN_S..TIMER_MAX_S */
  timerSeconds: Record<TimerKey, number>;
}

/** The decisions that can be timed. The role reveal has no timer. */
export type TimerKey =
  | "proposal"
  | "voting"
  | "quest"
  | "assassination"
  | "lady"
  | "excalibur"
  | "trap"
  | "plot";

export type PlotCardKey =
  | "kingReturns"
  | "ambush"
  | "leadToVictory"
  | "charge"
  | "restoreHonor"
  | "areYouTheOne"
  | "trueNature"
  | "showStrength"
  | "weFoundYou";

export interface PlotCard {
  id: string;
  key: PlotCardKey;
}

/** The held cards, and so the moments the game stops to ask their holders. */
export type PlotWindowKind = "leadToVictory" | "kingReturns" | "weFoundYou" | "ambush";

/** What follows once a window closes. */
export type PlotThen = "draw" | "proposal" | "quest" | "cards" | "reveal";

export interface PlotPending {
  card: PlotCard;
  /** who was handed the card */
  holderId: string;
  /** who makes its choice: the holder, or the leader for Show Your Strength */
  actorId: string;
}

/** A private result. Server only; each viewer's view carries their own. */
export interface PlotSecret {
  round: number;
  viewerId: string;
  subjectId: string;
  via: PlotCardKey;
  loyalty: Allegiance | null;
  card: QuestCard | null;
}

export interface PlotEvent {
  round: number;
  key: PlotCardKey;
  kind: "given" | "used";
  byId: string;
  targetId: string | null;
}

export interface PlotState {
  /** face down. Server only. */
  deck: PlotCard[];
  discard: PlotCard[];
  /** drawn by the leader, face up, waiting to be handed out */
  drawn: PlotCard[];
  /** held (⚔) cards, face up in front of each player */
  hands: Record<string, PlotCard[]>;
  /** players with a Charge in play (one entry per card) */
  charges: string[];
  /** use-immediately cards still to resolve, in precedence order */
  pending: PlotPending[];
  /** a moment when holders of one held card are asked in turn; queue[0] is being asked */
  window: { kind: PlotWindowKind; queue: string[]; then: PlotThen } | null;
  /** a Lead to Victory was played; no other until a vote has been taken */
  strongLeaderBlocked: boolean;
  /** riders playing face up this quest (We Found You) */
  spotlit: string[];
  /** riders whose card was Ambushed this round */
  ambushed: string[];
  secrets: PlotSecret[];
  events: PlotEvent[];
}

export type AllegianceCard = "switch" | "blank";

export interface LancelotState {
  /** true while the Lancelots are on the opposite of their starting sides */
  switched: boolean;
  /** hidden schedule: the face-down cards still to flip. Server only. */
  deck: AllegianceCard[];
  /** known schedule: public; card k applies at the start of round k + 1 */
  schedule: AllegianceCard[] | null;
  /** cards resolved so far; public */
  flips: { round: number; card: AllegianceCard }[];
}

/** One mission's Excalibur outcome. `original` is server only, shown to the wielder alone. */
export interface ExcaliburUse {
  /** the round (GameState.mission), not the quest number */
  mission: number;
  holderId: string;
  /** null = the wielder sheathed the sword */
  targetId: string | null;
  original: QuestCard | null;
}

/** One mission's trap. `card` (after any Excalibur switch) is server only, shown to the leader alone. */
export interface TrapRecord {
  /** the round (GameState.mission), not the quest number */
  mission: number;
  leaderId: string;
  targetId: string;
  card: QuestCard;
}

export interface LadyCheck {
  holderId: string;
  targetId: string;
  /** server only; each holder's view carries their own check's result and nothing else */
  loyalty: Allegiance;
}

export interface LadyState {
  holderId: string;
  /** everyone who has held the token, current holder included; none of them can be examined */
  pastHolderIds: string[];
  checks: LadyCheck[];
}

export interface MissionRecord {
  mission: number;
  team: string[]; // player names; empty when forfeited
  approve: number;
  reject: number;
  unopposed: boolean;
  /** lost to five rejected proposals, no team rode */
  forfeited?: boolean;
  fails: number;
  success: boolean;
}

export interface VoteMeta {
  approve: number;
  reject: number;
  approved: boolean;
  revealAt: number;
}

export interface QuestMeta {
  cards: QuestCard[]; // shuffled — order carries no information
  fails: number;
  success: boolean;
  revealAt: number;
}

export interface GameState {
  code: string;
  hostToken: string;
  phase: Phase;
  /** server time the current decision began; stamped by `stampPhase` whenever `turnKey` changes */
  phaseStartedAt?: number;
  /**
   * Set while the current timer is paused because the TV is gone; `autoAdvance` shifts
   * `phaseStartedAt` forward by the paused time when the TV returns. Server only.
   */
  timerPausedAt?: number | null;
  players: Player[];
  config: Config;
  /** playerId -> role. Server only — stripped from every client view. */
  roles: Record<string, RoleKey>;
  /** public once dealt: the multiset of roles at the table, no name attached */
  rolesInPlay: RoleKey[];
  /** resolved at deal time: playerId holding the assassin flag (null = no assassination phase) */
  flagHolderId: string | null;
  leaderIndex: number;
  /**
   * Set by playAgain: who leads first next game, so the rotation continues across games.
   * Honored only if the table still has `playerCount` seats and that player is seated;
   * otherwise the first leader is random.
   */
  nextLeader?: { playerId: string; playerCount: number } | null;
  /** the round: how many quests have been resolved (0..4). Drives the Lady, Lancelot draws and logs. */
  mission: number;
  /**
   * The quest (0..4) the current proposal attempts; null until a team is proposed. Equal
   * to `mission` unless Targeting is on. Read it through `currentQuest`.
   */
  quest?: number | null;
  rejections: number;
  proposal: string[]; // playerIds
  votes: Record<string, Vote>;
  voteMeta: VoteMeta | null;
  /** carried from the approving vote so the mission record can include it */
  lastVote: { approve: number; reject: number; unopposed: boolean } | null;
  questCards: Record<string, QuestCard>;
  questMeta: QuestMeta | null;
  history: MissionRecord[];
  assassinTargetId: string | null;
  assassinRevealAt: number | null;
  /** null when the module is off; absent in rooms saved before it existed */
  lady?: LadyState | null;
  /** null when no Lancelots are dealt; absent in rooms saved before the module existed */
  lancelot?: LancelotState | null;
  /** null when Plot cards are off */
  plot?: PlotState | null;
  /** the rider the leader armed for the current proposal */
  excaliburHolderId?: string | null;
  excaliburLog?: ExcaliburUse[];
  trapLog?: TrapRecord[];
  winner: Allegiance | null;
  winReason: string | null;
  createdAt: number;
  updatedAt: number;
}

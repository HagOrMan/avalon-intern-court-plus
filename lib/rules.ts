import type { AllegianceCard, Config, Phase, RoleKey, TimerKey } from "./types";

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 16;

/**
 * Mission team sizes per player count (index = mission 0..4). 5–10 are the official
 * tables; 11–16 are a house extension. docs/rules.md §6 has the derivation; change both together.
 */
export const MISSION_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
  11: [3, 4, 5, 6, 6],
  12: [4, 5, 5, 6, 6],
  13: [4, 5, 5, 6, 8],
  14: [4, 5, 5, 6, 8],
  15: [4, 5, 5, 6, 9],
  16: [4, 5, 5, 6, 9],
};

/** Fail cards needed to fail each mission: the 4th needs two at 7+, the 5th too at 13+. */
export function failsNeeded(playerCount: number): number[] {
  if (playerCount >= 13) return [1, 1, 1, 2, 2];
  if (playerCount >= 7) return [1, 1, 1, 2, 1];
  return [1, 1, 1, 1, 1];
}

/** ⌈n/3⌉: exact for every official count (5–10), extended unchanged to 16. */
export function evilCount(playerCount: number): number {
  return Math.ceil(playerCount / 3);
}

export const GOOD_ROLES: RoleKey[] = ["merlin", "mistress", "servant", "lancelotGood", "guinevere"];
export const EVIL_ROLES: RoleKey[] = ["mordred", "morgana", "assassin", "minion", "oberon", "lancelotEvil"];

/**
 * A role's *starting* side. Only the Lancelots can change sides mid-game, so anything
 * that depends on a player's current side (cards, Lady checks, the cast) uses
 * `allegianceOf` in engine.ts instead. Night knowledge and seat counting use this.
 */
export function isEvil(role: RoleKey): boolean {
  return EVIL_ROLES.includes(role);
}

/**
 * Roles the host picks into the deck, at any player count. The Assassin isn't here:
 * `bladeRole` decides whether it gets a card. Servants and Minions are fillers.
 * The Lancelots always come as a pair (`updateConfig` keeps them together), and
 * Guinevere needs them.
 */
export const OPTIONAL_ROLES: RoleKey[] = [
  "merlin",
  "mistress",
  "guinevere",
  "lancelotGood",
  "mordred",
  "morgana",
  "oberon",
  "lancelotEvil",
];
export const DEFAULT_SPECIALS: RoleKey[] = ["merlin", "mistress", "mordred", "morgana"];

/** Evil roles that can carry the blade as an add-on when no Assassin card fits. */
export const BLADE_CHOICES: RoleKey[] = ["assassin", "mordred", "morgana", "oberon"];
/** Who carries the blade when the configured holder can't. Never a Lancelot. */
export const FLAG_PRIORITY: RoleKey[] = ["morgana", "mordred", "oberon"];

type StoredConfig = Partial<Config> & { disabled?: RoleKey[] };

/**
 * Rooms live in Redis for up to ROOM_TTL_SECONDS and may have been saved by an older
 * deploy with missing fields (or a `disabled` list instead of `specials`). Read config
 * through this so a deploy doesn't break a court mid-session.
 */
export function normalizeConfig(c: StoredConfig): Config {
  return {
    specials: c.specials ?? DEFAULT_SPECIALS.filter((r) => !c.disabled?.includes(r)),
    assassinFlag: c.assassinFlag ?? "assassin",
    assassination: c.assassination !== false,
    rejectionVariant: c.rejectionVariant ?? "forfeit",
    oberonHiddenFromMerlin: c.oberonHiddenFromMerlin === true,
    goodMayFail: c.goodMayFail === true,
    ladyOfTheLake: c.ladyOfTheLake === true,
    excalibur: c.excalibur === true,
    trapper: c.trapper === true,
    lancelotSchedule: c.lancelotSchedule ?? "hidden",
    lancelotForcedCards: c.lancelotForcedCards === true,
    lancelotEvilKnown: c.lancelotEvilKnown !== false,
    lancelotsMeet: c.lancelotsMeet === true,
    timers: c.timers === true,
    timerForce: c.timerForce === true,
    timerSeconds: { ...DEFAULT_TIMER_SECONDS, ...(c.timerSeconds ?? {}) },
  };
}

export const TIMER_MIN_S = 10;
export const TIMER_MAX_S = 600;
export const DEFAULT_TIMER_SECONDS: Record<TimerKey, number> = {
  proposal: 120,
  voting: 60,
  quest: 60,
  assassination: 60,
  lady: 60,
  excalibur: 60,
  trap: 60,
};
/** Which timer runs in each phase. A module's "reveal" step shares its choice's timer. */
export const TIMER_FOR_PHASE: Partial<Record<Phase, TimerKey>> = {
  proposal: "proposal",
  voting: "voting",
  quest: "quest",
  assassination: "assassination",
  lady: "lady",
  ladyReveal: "lady",
  excalibur: "excalibur",
  excaliburReveal: "excalibur",
  trap: "trap",
  trapReveal: "trap",
};

/** Allegiance decks: hidden flips 3 of 5 (rounds 3–5); known deals 5 of 7 face up (rounds 1–5). */
export const LANCELOT_HIDDEN_DECK: AllegianceCard[] = ["switch", "switch", "blank", "blank", "blank"];
export const LANCELOT_KNOWN_DECK: AllegianceCard[] = [
  "switch",
  "switch",
  "blank",
  "blank",
  "blank",
  "blank",
  "blank",
];

/** Why `specials` can't be dealt at this player count, or null if it can. */
export function deckProblem(playerCount: number, specials: RoleKey[]): string | null {
  const evil = evilCount(playerCount);
  const good = playerCount - evil;
  const g = specials.filter((r) => !isEvil(r)).length;
  const e = specials.filter(isEvil).length;
  if (g > good || e > evil) {
    const min = minPlayersFor(specials);
    return min
      ? `This court needs at least ${min} players for its ${e} Evil and ${g} Good roles. Seat more players or rest a role.`
      : `No court of up to ${MAX_PLAYERS} can seat ${e} Evil and ${g} Good roles. Rest a role.`;
  }
  return null;
}

/** Smallest table that seats every chosen special, or null if none up to MAX_PLAYERS does. */
export function minPlayersFor(specials: RoleKey[]): number | null {
  const g = specials.filter((r) => !isEvil(r)).length;
  const e = specials.filter(isEvil).length;
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    if (evilCount(n) >= e && n - evilCount(n) >= g) return n;
  }
  return null;
}

/**
 * The role that carries the assassin's blade, or null for no assassination.
 * A configured add-on holder wins if it's in the deck. Otherwise the Assassin gets its own
 * card if an Evil seat is free, and failing that the blade rides on an Evil special.
 */
export function bladeRole(playerCount: number, c: Config): RoleKey | null {
  if (!c.assassination || !c.specials.includes("merlin")) return null;
  const evilSpecials = c.specials.filter(isEvil);
  if (c.assassinFlag !== "assassin" && evilSpecials.includes(c.assassinFlag)) return c.assassinFlag;
  if (evilSpecials.length < evilCount(playerCount)) return "assassin";
  return FLAG_PRIORITY.find((r) => evilSpecials.includes(r)) ?? null;
}

/** Full deck for a game. Callers check `deckProblem` first. */
export function buildRoleList(playerCount: number, c: Config): RoleKey[] {
  const evil = evilCount(playerCount);
  const good = playerCount - evil;
  const goodSpecials = c.specials.filter((r) => !isEvil(r));
  const evilSpecials = c.specials.filter(isEvil);
  if (bladeRole(playerCount, c) === "assassin") evilSpecials.push("assassin");
  const roles: RoleKey[] = [...goodSpecials];
  for (let i = goodSpecials.length; i < good; i++) roles.push("servant");
  roles.push(...evilSpecials);
  for (let i = evilSpecials.length; i < evil; i++) roles.push("minion");
  return roles;
}

/**
 * Uniform float in [0, 1) with 53 bits from the platform CSPRNG (Web Crypto, present in
 * Node and browsers). Every game draw defaults to this rather than Math.random, whose
 * state is shared with everything else in the process and can be reconstructed from its
 * outputs. See docs/fairness.md.
 */
export function secureRandom(): number {
  const w = new Uint32Array(2);
  crypto.getRandomValues(w);
  return ((w[0] >>> 5) * 2 ** 26 + (w[1] >>> 6)) / 2 ** 53; // (27 bits · 2^26 + 26 bits) / 2^53
}

/** Room codes: 4 uppercase letters, no I/O (0/1 excluded by being letters-only). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export function randomCode(rng: () => number = secureRandom): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

/**
 * Fisher–Yates: every permutation equally likely. The bounds matter — j must range over
 * [0, i] inclusive. [0, i) is Sattolo's algorithm (no element can stay put) and [0, n) is
 * the biased "naive" shuffle. See docs/fairness.md.
 */
export function shuffle<T>(arr: T[], rng: () => number = secureRandom): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Scripted TV beat timings (ms) — the server refuses to advance before these elapse. */
export const VOTE_REVEAL_MS = 800 + 500 + 600 + 4000; // stillness + flip + stamp + hold
export function questRevealMs(cardCount: number): number {
  return 1600 + cardCount * 1200 + 2000; // fly-in/shuffle + per-card beat + hold on last
}
export const ASSASSIN_REVEAL_MS = 5000;
/** grace after the scripted beat before the server advances on its own (TV gone, etc.) */
export const AUTO_ADVANCE_GRACE_MS = 12000;

export const ROOM_TTL_SECONDS = 12 * 60 * 60;

/** courts one client IP may create per sliding window */
export const ROOM_CREATE_LIMIT = 5;
export const ROOM_CREATE_WINDOW_MS = 10 * 60 * 1000;

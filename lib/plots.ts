import type { PlotCardKey } from "./types";

export type PlotType = "held" | "permanent" | "immediate";

/** Avalon names (Resistance names in docs/rules.md §2.8). */
export const PLOT_INFO: Record<PlotCardKey, { name: string; type: PlotType; text: string }> = {
  kingReturns: {
    name: "King Returns",
    type: "held",
    text: "After a team is approved, cancel it: it counts as a rejected vote and the lead passes.",
  },
  ambush: {
    name: "Ambush",
    type: "held",
    text: "After quest cards are played, secretly look at one rider's card.",
  },
  leadToVictory: {
    name: "Lead to Victory",
    type: "held",
    text: "Before a leader acts, become the leader.",
  },
  charge: {
    name: "Charge",
    type: "permanent",
    text: "For the rest of the game, you vote first and face up.",
  },
  restoreHonor: {
    name: "Restore Your Honor",
    type: "immediate",
    text: "Take one held Plot card from another player.",
  },
  areYouTheOne: {
    name: "Are You the One",
    type: "immediate",
    text: "See the loyalty of the player on your left or right.",
  },
  trueNature: {
    name: "Show Your True Nature",
    type: "immediate",
    text: "Show your loyalty to one player of your choice.",
  },
  showStrength: {
    name: "Show Your Strength",
    type: "immediate",
    text: "The leader shows their loyalty to one player of their choice.",
  },
  weFoundYou: {
    name: "We Found You",
    type: "held",
    text: "Before quest cards are played, make one rider play face up.",
  },
};

export const PLOT_SIGIL: Record<PlotType, string> = { held: "⚔", permanent: "⛨", immediate: "★" };

/** The 7 cards for 5–6 players. */
const SMALL: PlotCardKey[] = [
  "leadToVictory",
  "leadToVictory",
  "ambush",
  "ambush",
  "kingReturns",
  "restoreHonor",
  "charge",
];
/** Added at 7+ players, for 15 in all. */
const ADDED: PlotCardKey[] = [
  "kingReturns",
  "kingReturns",
  "charge",
  "areYouTheOne",
  "areYouTheOne",
  "trueNature",
  "showStrength",
  "weFoundYou",
];

export function plotDeck(playerCount: number): PlotCardKey[] {
  return playerCount <= 6 ? SMALL : [...SMALL, ...ADDED];
}

/** Cards the leader draws each round: 1/2/3 officially (5–10), 4 at 11+ (house rule). */
export function plotDraws(playerCount: number): number {
  if (playerCount <= 6) return 1;
  if (playerCount <= 8) return 2;
  if (playerCount <= 10) return 3;
  return 4;
}

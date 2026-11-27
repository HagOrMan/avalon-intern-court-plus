import type { RejectionVariant, RoleKey, TimerKey } from "@/lib/types";
import type { SetupOption } from "./SetupDialog";

/** Each role's part, shown by its ⓘ in Court Setup. Keep in step with docs/rules.md. */
export const ROLE_TEXT: Partial<Record<RoleKey, string>> = {
  merlin:
    "Good. Sees every Evil player at the start, except Mordred (and Oberon, when Oberon is hidden from Merlin). If the blade names him after three Good wins, Evil wins. Resting Merlin also rests the Mistress.",
  mistress:
    "Good (Percival in the rulebook). Sees Merlin and Morgana without knowing which is which; with no Morgana in the deck she sees Merlin plainly. Needs Merlin.",
  guinevere:
    "Good. Sees both Lancelots, but not which side each started on. A second mark for the blade: naming her wins for Evil, just like naming Merlin. With Guinevere in the deck the assassination happens even when Merlin rests. Needs the Lancelots.",
  lancelotGood:
    "One Good and one Evil Lancelot, taking a Good and an Evil seat. Each wins with the side he is on at the end, and allegiance cards may swap them. A Lancelot never carries the blade. Set how they work under Customize → Lancelot variants.",
  mordred: "Evil. Hidden from Merlin. Sees the other Evil players, and they see him.",
  morgana:
    "Evil. Appears to the Mistress as a second Merlin. Sees the other Evil players, and they see her.",
  oberon:
    "Evil, but alone: he doesn't see the other Evil players and they don't see him. Merlin sees him, unless Oberon is set to hide from Merlin too (Wraith).",
  assassin:
    "Evil. Dealt into a free Evil seat and carries the blade: after three Good wins, names one player. Naming Merlin (or Guinevere) wins for Evil.",
  servant: "Good, with no special knowledge. Servants fill every Good seat no special role takes.",
  minion: "Evil. Sees the other Evil players (except Oberon). Minions fill every Evil seat no special role takes.",
};

export function roleState(inPlay: boolean, evil: boolean): string {
  return inPlay
    ? "In play: this role is dealt this game."
    : `Resting: this role isn't dealt; a ${evil ? "Minion" : "Servant"} takes its seat.`;
}

export const REJECTION_OPTIONS: SetupOption<RejectionVariant>[] = [
  {
    key: "forfeit",
    label: "5 REJECTIONS ⇒ QUEST FAILS",
    text: "House rule (default). The fifth rejected team in a row loses that quest to Evil, and play moves on to the next quest.",
  },
  {
    key: "official",
    label: "5 REJECTIONS ⇒ EVIL WINS",
    text: "Official rule. The fifth rejected team in a row on the same quest wins the game for Evil.",
  },
  {
    key: "unopposed",
    label: "5TH LEADER PICKS UNOPPOSED",
    text: "House rule. After four rejections, the fifth leader's team rides without a vote.",
  },
];

export const BLADE_TEXT: Partial<Record<RoleKey, string>> = {
  assassin: "A dedicated Assassin card is dealt into a free Evil seat and carries the blade.",
  mordred: "Mordred carries the blade as an add-on. No Assassin card is dealt.",
  morgana: "Morgana carries the blade as an add-on. No Assassin card is dealt.",
  oberon:
    "Oberon carries the blade as an add-on. He saw no one at night, so he may name anyone, Evil included. No Assassin card is dealt.",
};

export const ASSASSINATION_TEXT = {
  on: "After Good wins three quests, Evil may talk it over, then the blade holder names one player. Naming Merlin (or Guinevere, when dealt) wins the game for Evil; otherwise Good wins.",
  onNoMark:
    "On, but neither Merlin nor Guinevere is in the deck, so there's no one to name: three successful quests win for Good outright.",
  off: "No assassination. Three successful quests win for Good outright, so Merlin can steer openly.",
};

export const OBERON_OPTIONS: SetupOption<"seen" | "hidden">[] = [
  {
    key: "seen",
    label: "MERLIN SEES HIM",
    text: "Official. Merlin sees Oberon among the Evil players; the other Evil players still don't.",
  },
  {
    key: "hidden",
    label: "HIDDEN FROM MERLIN TOO",
    text: "The Wraith variant. No one sees Oberon at night, Merlin included.",
  },
];

export const GOOD_FAIL_OPTIONS: SetupOption<"must" | "may">[] = [
  {
    key: "must",
    label: "GOOD MUST SUCCEED",
    text: "Official. Good riders can only play Success. Their phones still show both buttons, and both play Success, so a glance at a screen gives nothing away.",
  },
  {
    key: "may",
    label: "ANYONE MAY FAIL",
    text: "House rule. Good riders may also play Fail.",
  },
];

export const MODULE_TEXT = {
  lady: {
    on: "A token, not a role. It starts with the player on the first leader's right. After the 2nd, 3rd and 4th quests are resolved, its holder privately sees one player's loyalty (Good or Evil, never the role), then hands them the token. No one who has held it can be examined. What the holder says about it is up to them.",
    off: "No Lady of the Lake.",
  },
  excalibur: {
    on: "With each team, the leader gives Excalibur to a rider other than themselves. After the cards are played, the holder may switch one other rider's card (Success ↔ Fail) and privately sees the card as it was first played. Who was switched is public.",
    off: "No Excalibur.",
  },
  trapper: {
    on: "The leader picks one extra rider. After the cards are played, the leader takes one rider's card out of the quest and sees it privately; the rest are revealed as usual. Can't be on with Plot cards.",
    off: "No Trapper.",
  },
  targeting: {
    on: "The leader picks which unattempted quest the team attempts, and the team size follows that quest. The 5th quest stays sealed until two others have succeeded.",
    off: "Quests are attempted in order, 1 to 5.",
  },
  plot: (draws: number) => ({
    on: `At the start of each round the leader draws ${draws} Plot card${draws === 1 ? "" : "s"} and hands each to another player, face up. Some are used at once, some are held until their moment, and Charge stays in play. Private results show only on the viewer's phone. Can't be on with Trapper.`,
    off: "No Plot cards.",
  }),
  timers: {
    on: "A countdown shows on the TV for each decision (the role reveal has none). By default it's only a reminder: at zero it reads TIME and nothing happens. Under Edit, set each length, and set At zero to Force to make random choices for anyone who hasn't decided.",
    off: "No countdowns.",
  },
};

export const TIMER_TEXT: Record<TimerKey, string> = {
  proposal: "How long the leader has to choose a team (and, with Targeting, a quest).",
  voting: "How long the court has to vote on a team.",
  quest: "How long riders have to play their quest cards.",
  assassination: "How long the blade holder has to name a player.",
  lady: "How long the Lady's holder has to choose, and then to read and pass the token.",
  excalibur: "How long Excalibur's holder has to choose, and then to read the original card.",
  trap: "How long the leader has to trap a card, and then to read it.",
  plot: "How long each Plot decision takes: handing out cards, each card used at once, and each holder asked whether to play a held card.",
};

export const TIMER_FORCE_OPTIONS: SetupOption<"remind" | "force">[] = [
  {
    key: "remind",
    label: "JUST A REMINDER",
    text: "At zero the countdown reads TIME and nothing else happens. A player who stepped away can still decide.",
  },
  {
    key: "force",
    label: "FORCE · RANDOM CHOICE",
    text: "At zero, whoever hasn't decided gets a random legal choice: a random team, vote, target or Plot decision; Good riders always play Success. Timers pause while the TV is disconnected.",
  },
];

export const LANCELOT_SCHEDULE_OPTIONS: SetupOption<"hidden" | "known" | "none">[] = [
  {
    key: "hidden",
    label: "HIDDEN · FLIPPED ROUNDS 3–5",
    text: "Variant 1. A face-down deck of 5 cards (2 Switch, 3 blank). One card flips at the start of rounds 3, 4 and 5; on a Switch, the Lancelots trade sides.",
  },
  {
    key: "known",
    label: "KNOWN · 5 DEALT FACE UP",
    text: "Variant 2. Five cards from a 7-card deck (2 Switch, 5 blank) are dealt face up at the start. Card k says whether the Lancelots switch at the start of round k, so a switch can come as early as round 1.",
  },
  {
    key: "none",
    label: "NONE · NO SWITCHES",
    text: "No allegiance cards. Each Lancelot stays on his starting side all game.",
  },
];

export const LANCELOT_CARD_OPTIONS: SetupOption<"free" | "forced">[] = [
  {
    key: "free",
    label: "FREE CHOICE",
    text: "Variant 1. Each Lancelot plays under the usual quest-card rule for his current side: the Evil one may play either card.",
  },
  {
    key: "forced",
    label: "FORCED BY CURRENT SIDE",
    text: "Variant 2. The currently Evil Lancelot must play Fail and the currently Good one must play Success. Both still see two buttons.",
  },
];

export const LANCELOT_EVIL_OPTIONS: SetupOption<"sees" | "blind">[] = [
  {
    key: "sees",
    label: "SEES THE EVIL LANCELOT",
    text: "Variants 1 and 2. Evil sees the starting-Evil Lancelot at night, but he doesn't see them. The blade can't name him.",
  },
  {
    key: "blind",
    label: "DOESN'T SEE HIM",
    text: "The online variant. Evil isn't told who the Evil Lancelot is.",
  },
];

export const LANCELOT_MEET_OPTIONS: SetupOption<"apart" | "meet">[] = [
  {
    key: "apart",
    label: "DON'T MEET",
    text: "Neither Lancelot learns who the other is.",
  },
  {
    key: "meet",
    label: "SEE EACH OTHER",
    text: "Variant 3. The two Lancelots see each other at night. Each knows his own side, so each also knows the other is on the opposite one, and after a switch they still are. Recommended for larger groups.",
  },
];

export const LANCELOT_VARIANTS_NOTE =
  "Officially only one variant is used at a time. V1: hidden cards, free choice, Evil sees him. V2: known cards, forced, Evil sees him. V3: the Lancelots meet. Here each switch can be set on its own.";

"use client";

import { useState } from "react";
import type { TvView } from "@/lib/views";
import type { RejectionVariant, RoleKey, TimerKey } from "@/lib/types";
import { ROLES } from "@/lib/roles";
import { plotDraws } from "@/lib/plots";
import {
  BLADE_CHOICES,
  OPTIONAL_ROLES,
  bladeRole,
  deckProblem,
  evilCount,
  failsNeeded,
  isEvil,
  minPlayersFor,
  TIMER_MAX_S,
  TIMER_MIN_S,
} from "@/lib/rules";

const TIMER_ROWS: [TimerKey, string][] = [
  ["proposal", "Proposal"],
  ["voting", "Vote"],
  ["quest", "Quest cards"],
  ["assassination", "Assassination"],
  ["lady", "Lady of the Lake"],
  ["excalibur", "Excalibur"],
  ["trap", "Trap"],
  ["plot", "Plot cards"],
];
const TIMER_STEPS = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600];

function formatSecs(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const REJECTION_ORDER: RejectionVariant[] = ["forfeit", "official", "unopposed"];
const REJECTION_LABEL: Record<RejectionVariant, string> = {
  forfeit: "5 REJECTIONS ⇒ QUEST FAILS",
  official: "5 REJECTIONS ⇒ EVIL WINS",
  unopposed: "5TH LEADER PICKS UNOPPOSED",
};

function advisory(v: TvView): string {
  const n = v.playerCount;
  const on = (r: RoleKey) => v.config.specials.includes(r);
  const problem = deckProblem(n, v.config.specials);
  if (problem) return problem;
  if (!on("merlin"))
    return on("guinevere") && v.config.assassination
      ? "Without Merlin the court plays blind and his Mistress rests; the blade falls for Guinevere alone."
      : "Without Merlin the court plays blind: his Mistress rests with him, and no blade falls at the end.";
  if (!v.config.assassination)
    return "The blade is sheathed: three quests alone decide it, and Merlin may steer openly.";
  if (on("mordred") && on("morgana") && n === 7)
    return "Mordred and Morgana together at 7 is punishing for Good. Consider resting Mordred for a first game.";
  if (!on("mistress") && on("morgana"))
    return "Morgana with no Mistress to fool is a wasted mask. Consider resting her too.";
  if (!on("morgana") && on("mistress"))
    return "Without Morgana, the Mistress sees her Merlin plainly. Good grows strong.";
  if (on("oberon") && v.config.oberonHiddenFromMerlin)
    return "Oberon walks as a wraith, hidden from Merlin and Evil alike.";
  if (!on("mordred")) return "With Mordred resting, Merlin sees every evil face. Kind to new courts.";
  return "The court is balanced as the old laws prescribe.";
}

const goldBtn = {
  font: "600 20px var(--font-body)",
  letterSpacing: "0.06em",
  color: "var(--ground)",
  background: "var(--gold)",
  padding: "6px 16px",
} as const;
const ghostBtn = {
  font: "600 20px var(--font-body)",
  letterSpacing: "0.06em",
  color: "rgba(237,230,214,0.6)",
  border: "1px solid rgba(237,230,214,0.3)",
  padding: "5px 15px",
} as const;
const tagStyle = {
  font: "600 20px var(--font-body)",
  letterSpacing: "0.1em",
  color: "rgba(237,230,214,0.6)",
  border: "1px solid rgba(237,230,214,0.3)",
  padding: "4px 14px",
} as const;

export function TvSetup({
  v,
  act,
}: {
  v: TvView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [customize, setCustomize] = useState(false);
  const n = v.playerCount;
  const evil = evilCount(n);
  const good = n - evil;
  const fails = failsNeeded(n);
  const { specials } = v.config;
  const on = (r: RoleKey) => specials.includes(r);

  // Customize sub-panels that would overflow the settings column
  const [panel, setPanel] = useState<"lancelot" | "timers" | "modules" | null>(null);
  const modulesSummary = [
    v.config.ladyOfTheLake && "LADY",
    v.config.excalibur && "EXCALIBUR",
    v.config.trapper && "TRAPPER",
    v.config.targeting && "TARGETING",
    v.config.plotCards && "PLOT",
  ]
    .filter(Boolean)
    .join(" · ");
  // the two Lancelots share one row (the server keeps them paired)
  const pair: RoleKey[] = ["lancelotGood", "lancelotEvil"];
  const goodOptions = OPTIONAL_ROLES.filter((r) => !isEvil(r) && !pair.includes(r));
  const evilOptions = OPTIONAL_ROLES.filter((r) => isEvil(r) && !pair.includes(r));
  const goodChosen = specials.filter((r) => !isEvil(r)).length;
  const evilChosen = specials.filter(isEvil).length;
  const blade = bladeRole(n, v.config);
  const assassinCard = blade === "assassin";
  const servantCount = Math.max(0, good - goodChosen);
  const minionCount = Math.max(0, evil - evilChosen - (assassinCard ? 1 : 0));

  const setConfig = (config: Record<string, unknown>) => act("updateConfig", { config });
  const toggle = (r: RoleKey) =>
    setConfig({ specials: on(r) ? specials.filter((x) => x !== r) : [...specials, r] });

  const bladeChoices = BLADE_CHOICES.filter((r) => (r === "assassin" ? evilChosen < evil : on(r)));

  const bladeTag = (
    <span style={{ color: "var(--evil-text)", font: "600 20px var(--font-body)", marginLeft: 10 }}>
      ✕ carries the blade
    </span>
  );

  const lancelotOn = on("lancelotGood");
  const roleRow = (r: RoleKey) => {
    const isPair = r === "lancelotGood";
    const chosen = on(r);
    // the server keeps the Mistress out while Merlin rests, and Guinevere out without the Lancelots
    const locked = (r === "mistress" && !on("merlin")) || (r === "guinevere" && !lancelotOn);
    // players still join during setup, so an overfull deck is allowed; Begin refuses it
    const needs = minPlayersFor(chosen ? specials : [...specials, ...(isPair ? pair : [r])]);
    const short = needs === null || needs > n;
    const label = isPair ? `${ROLES[r].sigil} Lancelot ×2 · one Good, one Evil` : `${ROLES[r].sigil} ${ROLES[r].name}`;
    const toggleRow = () =>
      isPair
        ? setConfig({ specials: chosen ? specials.filter((x) => !pair.includes(x)) : [...specials, ...pair] })
        : toggle(r);
    return (
      <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ opacity: chosen ? 1 : 0.45 }}>
          {label}
          {chosen && blade === r && bladeTag}
          {short && !locked && (
            <span style={{ color: "var(--evil-text)", font: "600 20px var(--font-body)", marginLeft: 10 }}>
              {needs === null ? "no court is large enough" : `needs ${needs}+ players`}
            </span>
          )}
        </span>
        <button
          onClick={toggleRow}
          disabled={locked}
          style={chosen ? { ...goldBtn, letterSpacing: "0.1em", padding: "6px 18px" } : { ...ghostBtn, letterSpacing: "0.1em", padding: "5px 16px", opacity: locked ? 0.5 : 1 }}
        >
          {chosen ? "IN PLAY" : "RESTING"}
        </button>
      </div>
    );
  };

  const fillRow = (label: string, count: number, side: "GOOD" | "EVIL") =>
    count > 0 ? (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label} ×{count}</span>
        <span style={tagStyle}>FILLS {side}</span>
      </div>
    ) : null;

  const switchRow = (label: string, active: boolean, onText: string, offText: string, onClick: () => void) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{label}</span>
      <button onClick={onClick} style={active ? goldBtn : ghostBtn}>
        {active ? onText : offText}
      </button>
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
      <div style={{ width: 800, background: "var(--surface)", border: "1px solid rgba(201,162,75,0.5)", padding: 48 }}>
        <div className="serif" style={{ font: "700 60px var(--font-serif)", color: "var(--gold)", marginBottom: 8 }}>
          Court Setup — {n} players
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 16,
            alignItems: "center",
            font: "600 24px var(--font-body)",
            letterSpacing: "0.08em",
            background: "rgba(237,230,214,0.08)",
            padding: "10px 20px",
            marginBottom: 28,
          }}
        >
          <span style={{ color: "var(--good-text)" }}>◯ {good} GOOD</span>
          <span style={{ color: "rgba(237,230,214,0.4)" }}>·</span>
          <span style={{ color: "var(--evil-text)" }}>◆ {evil} EVIL</span>
          <span style={{ color: "rgba(237,230,214,0.5)" }}>— ratio locked by the rules</span>
        </div>
        <div style={{ display: "grid", gap: 14, font: "500 28px var(--font-body)" }}>
          {goodOptions.map(roleRow)}
          {fillRow("Servant", servantCount, "GOOD")}
          {roleRow("lancelotGood")}
          {evilOptions.map(roleRow)}
          {assassinCard && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                {ROLES.assassin.sigil} {ROLES.assassin.name}
                {bladeTag}
              </span>
              <span style={tagStyle}>FREE SEAT</span>
            </div>
          )}
          {fillRow("Minion", minionCount, "EVIL")}
        </div>
        <div
          className="serif"
          style={{
            fontStyle: "italic",
            font: "italic 400 28px/1.45 var(--font-serif)",
            color: deckProblem(n, specials) ? "var(--evil-text)" : "var(--parchment-75)",
            borderTop: "1px solid rgba(237,230,214,0.15)",
            marginTop: 28,
            paddingTop: 20,
          }}
        >
          {advisory(v)}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
          <button className="btn-gold" style={{ flex: 1, fontSize: 28, padding: 20 }} onClick={() => act("beginCourt")}>
            Begin the court
          </button>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 28, padding: 20 }} onClick={() => setCustomize((c) => !c)}>
            {customize ? "Close" : "Customize"}
          </button>
        </div>
        <button
          onClick={() => act("backToLobby")}
          style={{ marginTop: 18, font: "500 20px var(--font-body)", letterSpacing: "0.08em", color: "var(--parchment-55)" }}
        >
          ← BACK TO THE GATES
        </button>
      </div>

      <div style={{ width: 620 }}>
        <div style={{ font: "600 24px var(--font-body)", letterSpacing: "0.18em", color: "rgba(237,230,214,0.5)", marginBottom: 20 }}>
          MISSIONS AT {n} PLAYERS
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {v.missionSizes.map((size, i) => (
            <div
              key={i}
              style={{
                width: 92,
                height: 92,
                border: fails[i] >= 2 ? "4px solid var(--gold)" : "4px solid rgba(201,162,75,0.6)",
                boxShadow: fails[i] >= 2 ? "0 0 0 6px var(--surface), 0 0 0 8px rgba(201,162,75,0.5)" : undefined,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "700 40px var(--font-serif)",
                position: "relative",
              }}
              className="serif"
            >
              {size}
              {fails[i] >= 2 && (
                <span
                  style={{
                    position: "absolute",
                    bottom: -40,
                    font: "600 18px var(--font-body)",
                    letterSpacing: "0.08em",
                    color: "var(--gold)",
                    whiteSpace: "nowrap",
                  }}
                >
                  2 FAILS
                </span>
              )}
            </div>
          ))}
        </div>

        {customize && panel === "modules" ? (
          <div style={{ marginTop: 64, display: "grid", gap: 16, font: "500 24px var(--font-body)" }}>
            {switchRow(
              "Lady of the Lake",
              v.config.ladyOfTheLake,
              "◈ CHECKS AFTER QUESTS 2–4",
              "OFF",
              () => setConfig({ ladyOfTheLake: !v.config.ladyOfTheLake })
            )}
            {switchRow(
              "Excalibur",
              v.config.excalibur,
              "⚔ LEADER ARMS A RIDER",
              "OFF",
              () => setConfig({ excalibur: !v.config.excalibur })
            )}
            {switchRow(
              "Trapper",
              v.config.trapper,
              "⌖ ONE EXTRA RIDER, ONE CARD TRAPPED",
              "OFF",
              () => setConfig({ trapper: !v.config.trapper })
            )}
            {switchRow(
              "Targeting",
              v.config.targeting,
              "◎ LEADER PICKS THE QUEST",
              "OFF · QUESTS IN ORDER",
              () => setConfig({ targeting: !v.config.targeting })
            )}
            {switchRow(
              "Plot cards",
              v.config.plotCards,
              `★ LEADER DRAWS ${plotDraws(n)} A ROUND`,
              "OFF",
              () => setConfig({ plotCards: !v.config.plotCards })
            )}
            <div style={{ font: "400 20px/1.5 var(--font-body)", color: "var(--parchment-55)" }}>
              Targeting: any unattempted quest, but the 5th only after two others succeed.
              Plot cards and Trapper can&apos;t both be on; turning one on turns the other off.
            </div>
            <button onClick={() => setPanel(null)} style={{ ...ghostBtn, justifySelf: "start" }}>
              ‹ BACK
            </button>
          </div>
        ) : customize && panel === "timers" ? (
          <div style={{ marginTop: 64, display: "grid", gap: 14, font: "500 24px var(--font-body)" }}>
            {TIMER_ROWS.map(([key, label]) => {
              const secs = v.config.timerSeconds[key];
              const step = (d: number) => {
                const next =
                  d > 0
                    ? TIMER_STEPS.find((x) => x > secs)
                    : [...TIMER_STEPS].reverse().find((x) => x < secs);
                if (next !== undefined) setConfig({ timerSeconds: { [key]: next } });
              };
              return (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button style={ghostBtn} onClick={() => step(-1)} disabled={secs <= TIMER_MIN_S}>−</button>
                    <span style={{ minWidth: 90, textAlign: "center" }}>{formatSecs(secs)}</span>
                    <button style={ghostBtn} onClick={() => step(1)} disabled={secs >= TIMER_MAX_S}>+</button>
                  </span>
                </div>
              );
            })}
            {switchRow(
              "At zero",
              v.config.timerForce,
              "FORCE · RANDOM CHOICE",
              "JUST A REMINDER",
              () => setConfig({ timerForce: !v.config.timerForce })
            )}
            <div style={{ font: "400 20px/1.5 var(--font-body)", color: "var(--parchment-55)" }}>
              Countdowns show on the TV only. Forcing picks at random for anyone who hasn&apos;t
              decided; Good riders always play Success.
            </div>
            <button onClick={() => setPanel(null)} style={{ ...ghostBtn, justifySelf: "start" }}>
              ‹ BACK
            </button>
          </div>
        ) : customize && panel === "lancelot" && lancelotOn ? (
          <div style={{ marginTop: 64, display: "grid", gap: 16, font: "500 24px var(--font-body)" }}>
            {switchRow(
              "Allegiance cards",
              v.config.lancelotSchedule !== "none",
              v.config.lancelotSchedule === "hidden"
                ? "HIDDEN · FLIPPED ROUNDS 3–5"
                : "KNOWN · 5 DEALT FACE UP",
              "NONE · NO SWITCHES",
              () => {
                const order = ["hidden", "known", "none"] as const;
                const i = order.indexOf(v.config.lancelotSchedule);
                setConfig({ lancelotSchedule: order[(i + 1) % order.length] });
              }
            )}
            {switchRow(
              "Quest cards",
              v.config.lancelotForcedCards,
              "FORCED BY CURRENT SIDE",
              "FREE CHOICE",
              () => setConfig({ lancelotForcedCards: !v.config.lancelotForcedCards })
            )}
            {switchRow(
              "Evil at night",
              v.config.lancelotEvilKnown,
              "SEES THE EVIL LANCELOT",
              "DOESN'T SEE HIM",
              () => setConfig({ lancelotEvilKnown: !v.config.lancelotEvilKnown })
            )}
            {switchRow(
              "Lancelots at night",
              v.config.lancelotsMeet,
              "SEE EACH OTHER",
              "DON'T MEET",
              () => setConfig({ lancelotsMeet: !v.config.lancelotsMeet })
            )}
            <div style={{ font: "400 20px/1.5 var(--font-body)", color: "var(--parchment-55)" }}>
              Officially only one variant is used at a time. V1: hidden cards, free choice,
              Evil sees him. V2: known cards, forced, Evil sees him. V3: Lancelots meet.
            </div>
            <button onClick={() => setPanel(null)} style={{ ...ghostBtn, justifySelf: "start" }}>
              ‹ BACK
            </button>
          </div>
        ) : customize ? (
          <div style={{ marginTop: 64, display: "grid", gap: 16, font: "500 24px var(--font-body)" }}>
            {lancelotOn &&
              switchRow("Lancelot variants", true, "EDIT ›", "", () => setPanel("lancelot"))}
            {switchRow(
              "Rejection rule",
              true,
              REJECTION_LABEL[v.config.rejectionVariant],
              "",
              () => {
                const i = REJECTION_ORDER.indexOf(v.config.rejectionVariant);
                setConfig({ rejectionVariant: REJECTION_ORDER[(i + 1) % REJECTION_ORDER.length] });
              }
            )}
            {switchRow(
              "Assassination",
              v.config.assassination,
              on("merlin")
                ? on("guinevere")
                  ? "✕ EVIL NAMES MERLIN OR GUINEVERE"
                  : "✕ EVIL NAMES MERLIN AT THE END"
                : on("guinevere")
                  ? "✕ EVIL NAMES GUINEVERE"
                  : "✕ ON · NO ONE TO NAME",
              "OFF — QUESTS ALONE DECIDE",
              () => setConfig({ assassination: !v.config.assassination })
            )}
            {blade &&
              bladeChoices.length > 1 &&
              switchRow("Assassin's blade", true, `✕ ${ROLES[blade].name.toUpperCase()}`, "", () => {
                const i = bladeChoices.indexOf(blade);
                setConfig({ assassinFlag: bladeChoices[(i + 1) % bladeChoices.length] });
              })}
            {on("oberon") &&
              switchRow(
                "Oberon",
                v.config.oberonHiddenFromMerlin,
                "HIDDEN FROM MERLIN TOO",
                "MERLIN SEES HIM",
                () => setConfig({ oberonHiddenFromMerlin: !v.config.oberonHiddenFromMerlin })
              )}
            {switchRow(
              "Quest cards",
              v.config.goodMayFail,
              "ANYONE MAY FAIL",
              "GOOD MUST SUCCEED",
              () => setConfig({ goodMayFail: !v.config.goodMayFail })
            )}
            {switchRow("Modules", true, modulesSummary ? `${modulesSummary} ›` : "NONE · EDIT ›", "", () => setPanel("modules"))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Timers</span>
              <span style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfig({ timers: !v.config.timers })}
                  style={v.config.timers ? goldBtn : ghostBtn}
                >
                  {v.config.timers ? (v.config.timerForce ? "⧗ ON · FORCED" : "⧗ ON") : "OFF"}
                </button>
                <button onClick={() => setPanel("timers")} style={ghostBtn}>
                  EDIT ›
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div style={{ font: "400 26px/1.5 var(--font-body)", color: "rgba(237,230,214,0.55)", marginTop: 70 }}>
            Customize: choose any special role; each notes the players it needs. Plain Servants
            and Minions fill the rest. The Assassin takes a free Evil seat, or the blade passes
            to another Evil role. The last configuration persists for the next game.
          </div>
        )}

        <div style={{ marginTop: 40, borderTop: "1px solid rgba(237,230,214,0.15)", paddingTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ font: "600 24px var(--font-body)", letterSpacing: "0.18em", color: "rgba(237,230,214,0.5)" }}>
              LEADERSHIP PASSES
            </span>
            <button onClick={() => act("shuffleSeats")} style={goldBtn}>
              ⟳ SHUFFLE SEATS
            </button>
          </div>
          <div style={{ font: "500 22px/1.6 var(--font-body)", color: "var(--parchment-75)" }}>
            {[...v.players]
              .sort((a, b) => a.seat - b.seat)
              .map((p) => p.name)
              .join("  →  ")}
            <span style={{ color: "rgba(237,230,214,0.4)" }}>  ↺</span>
          </div>
        </div>
      </div>
    </div>
  );
}

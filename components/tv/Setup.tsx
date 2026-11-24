"use client";

import { useState } from "react";
import type { TvView } from "@/lib/views";
import type { RejectionVariant, RoleKey } from "@/lib/types";
import { ROLES } from "@/lib/roles";
import {
  BLADE_CHOICES,
  OPTIONAL_ROLES,
  bladeRole,
  deckProblem,
  evilCount,
  failsNeeded,
  isEvil,
  minPlayersFor,
} from "@/lib/rules";

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
    return "Without Merlin the court plays blind: his Mistress rests with him, and no blade falls at the end.";
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

  const goodOptions = OPTIONAL_ROLES.filter((r) => !isEvil(r));
  const evilOptions = OPTIONAL_ROLES.filter(isEvil);
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

  const roleRow = (r: RoleKey) => {
    const chosen = on(r);
    // the server keeps the Mistress out while Merlin rests
    const locked = r === "mistress" && !on("merlin");
    // players still join during setup, so an overfull deck is allowed; Begin refuses it
    const needs = minPlayersFor(chosen ? specials : [...specials, r]);
    const short = needs === null || needs > n;
    return (
      <div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ opacity: chosen ? 1 : 0.45 }}>
          {ROLES[r].sigil} {ROLES[r].name}
          {chosen && blade === r && bladeTag}
          {short && !locked && (
            <span style={{ color: "var(--evil-text)", font: "600 20px var(--font-body)", marginLeft: 10 }}>
              {needs === null ? "no court is large enough" : `needs ${needs}+ players`}
            </span>
          )}
        </span>
        <button
          onClick={() => toggle(r)}
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

        {customize ? (
          <div style={{ marginTop: 64, display: "grid", gap: 16, font: "500 24px var(--font-body)" }}>
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
              "✕ EVIL NAMES MERLIN AT THE END",
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
            {switchRow(
              "Lady of the Lake",
              v.config.ladyOfTheLake,
              "◈ CHECKS BEFORE QUESTS 3–5",
              "OFF",
              () => setConfig({ ladyOfTheLake: !v.config.ladyOfTheLake })
            )}
            {["Discussion timers", "Excalibur"].map((label) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.4 }}>
                <span>{label}</span>
                <span style={{ font: "600 18px var(--font-body)", letterSpacing: "0.1em", border: "1px solid rgba(237,230,214,0.3)", padding: "4px 14px" }}>
                  v2
                </span>
              </div>
            ))}
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

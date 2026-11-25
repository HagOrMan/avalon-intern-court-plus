"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";
import type { PlotCardKey } from "@/lib/types";
import { PLOT_INFO, PLOT_SIGIL } from "@/lib/plots";

type Act = (a: string, p?: Record<string, unknown>) => Promise<boolean>;

export function PlotCardFace({ cardKey, compact = false }: { cardKey: PlotCardKey; compact?: boolean }) {
  const info = PLOT_INFO[cardKey];
  return (
    <div
      style={{
        border: "1px solid rgba(201,162,75,0.5)",
        background: "rgba(237,230,214,0.05)",
        padding: compact ? "6px 10px" : "10px 12px",
        textAlign: "left",
      }}
    >
      <div className="serif" style={{ font: `600 ${compact ? 15 : 18}px var(--font-serif)`, color: "var(--gold)" }}>
        {PLOT_SIGIL[info.type]} {info.name}
      </div>
      {!compact && (
        <div style={{ font: "400 12px/1.5 var(--font-body)", color: "var(--parchment-75)" }}>{info.text}</div>
      )}
    </div>
  );
}

const chip = (on: boolean) => ({
  font: "500 13px var(--font-body)",
  padding: "6px 10px",
  border: `1px solid ${on ? "var(--gold)" : "rgba(237,230,214,0.3)"}`,
  background: on ? "var(--gold)" : "transparent",
  color: on ? "var(--ground)" : "var(--parchment)",
});

/** The leader hands each drawn card to another player. */
export function PlotDealScreen({ v, act }: { v: PlayerView; act: Act }) {
  const turn = v.plotTurn!;
  const cards = turn.cards ?? [];
  const [to, setTo] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const done = cards.every((c) => to[c.id]);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, overflowY: "auto" }}>
      <div className="serif" style={{ font: "700 26px var(--font-serif)", color: "var(--gold)", textAlign: "center" }}>
        Hand out the Plot cards
      </div>
      <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)", textAlign: "center" }}>
        every card goes to another player, face up · not to yourself
      </div>
      {cards.map((c) => (
        <div key={c.id} style={{ display: "grid", gap: 6 }}>
          <PlotCardFace cardKey={c.key} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {turn.targets.map((t) => (
              <button key={t.id} style={chip(to[c.id] === t.id)} onClick={() => setTo((cur) => ({ ...cur, [c.id]: t.id }))}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        className="btn-gold"
        style={{ marginTop: "auto" }}
        disabled={!done || busy}
        onClick={async () => {
          setBusy(true);
          if (!(await act("plotDeal", { assignments: to }))) setBusy(false);
        }}
      >
        {done ? "Hand them out" : "Choose a player for every card"}
      </button>
    </div>
  );
}

/** A use-immediately card: choose the neighbour, the viewer, or the card to take. */
export function PlotResolveScreen({ v, act }: { v: PlayerView; act: Act }) {
  const turn = v.plotTurn!;
  const key = turn.key!;
  const [busy, setBusy] = useState(false);
  const send = async (payload: Record<string, unknown>) => {
    setBusy(true);
    if (!(await act("plotResolve", payload))) setBusy(false);
  };
  const prompt: Partial<Record<PlotCardKey, string>> = {
    areYouTheOne: "Whose loyalty will you see?",
    trueNature: "Who will see your loyalty?",
    showStrength: "Who will see your loyalty?",
    restoreHonor: "Which card will you take?",
  };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
      <PlotCardFace cardKey={key} />
      <div className="serif" style={{ font: "600 20px var(--font-serif)", textAlign: "center" }}>{prompt[key]}</div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {key === "restoreHonor"
          ? turn.takeable.map((t) => (
              <button
                key={t.cardId}
                className="row-pick"
                disabled={busy}
                onClick={() => send({ targetId: t.playerId, cardId: t.cardId })}
              >
                <span>{t.name}</span>
                <span style={{ color: "var(--gold)" }}>{PLOT_INFO[t.key].name}</span>
              </button>
            ))
          : turn.targets.map((t) => (
              <button key={t.id} className="row-pick" disabled={busy} onClick={() => send({ targetId: t.id })}>
                <span>{t.name}</span>
              </button>
            ))}
      </div>
    </div>
  );
}

/** The asked holder plays their card (choosing a rider where needed) or passes. */
export function PlotWindowScreen({ v, act }: { v: PlayerView; act: Act }) {
  const turn = v.plotTurn!;
  const key = turn.key!;
  const needsTarget = key === "weFoundYou" || key === "ambush";
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async (action: string, payload?: Record<string, unknown>) => {
    setBusy(true);
    if (!(await act(action, payload))) setBusy(false);
  };
  const ask: Partial<Record<PlotCardKey, string>> = {
    leadToVictory: "Take the lead before the leader acts?",
    kingReturns: "The team was approved. Cancel it?",
    weFoundYou: "Make a rider play face up?",
    ambush: "Look at one played card?",
  };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 14 }}>
      <PlotCardFace cardKey={key} />
      <div className="serif" style={{ font: "600 20px var(--font-serif)", textAlign: "center" }}>{ask[key]}</div>
      {needsTarget && (
        <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
          {turn.targets.map((t) => (
            <button
              key={t.id}
              className={`row-pick${target === t.id ? " picked" : ""}`}
              onClick={() => setTarget((cur) => (cur === t.id ? null : t.id))}
            >
              <span>{t.name}</span>
              {target === t.id && <span style={{ color: "var(--gold)" }}>chosen</span>}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
        <button
          className="btn-gold"
          disabled={busy || (needsTarget && !target)}
          onClick={() => send("plotPlay", { targetId: needsTarget ? target : null })}
        >
          Play {PLOT_INFO[key].name}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={() => send("plotPass")}>
          Keep it for later
        </button>
      </div>
    </div>
  );
}

/** One private result, for the role peek. Neutral colours, like the Lady. */
export function PlotSeenLine({ seen }: { seen: PlayerView["plotSeen"][number] }) {
  const what = seen.card
    ? `played ${seen.card === "success" ? "Success" : "Fail"}`
    : seen.loyalty === "good"
      ? "is loyal to Arthur"
      : "serves Mordred";
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 4 }}>
      <div style={{ font: "600 10px var(--font-body)", letterSpacing: "0.14em", color: "var(--parchment-55)" }}>
        {PLOT_INFO[seen.via].name.toUpperCase()} · ROUND {seen.round + 1}
      </div>
      <div className="serif" style={{ font: "600 20px var(--font-serif)", color: "var(--parchment)" }}>
        {seen.subjectName} {what}
      </div>
    </div>
  );
}

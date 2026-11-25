"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";

export function ProposeScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [sword, setSword] = useState<string | null>(null);
  const [stamped, setStamped] = useState(false);
  // under Targeting the leader also picks which quest this team attempts
  const [quest, setQuest] = useState<number | null>(v.targeting ? null : v.mission);
  const sizeOf = (q: number) => v.missionSizes[q] + v.extraRiders;
  const n = quest === null ? 0 : sizeOf(quest);
  const remaining = quest === null ? 1 : n - picked.length;

  const chooseQuest = (q: number) => {
    setQuest(q);
    setPicked((cur) => cur.slice(0, sizeOf(q)));
  };
  // the leader can't keep Excalibur, so it goes to another rider before proposing
  const needsSword = v.excaliburOn && remaining === 0 && !(sword && picked.includes(sword));
  const swordChoices = picked.filter((id) => id !== v.me.id);
  const nameOf = (id: string) => v.players.find((p) => p.id === id)?.name ?? "?";

  const toggle = (id: string) => {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < n ? [...cur, id] : cur
    );
  };

  const confirm = async () => {
    setStamped(true);
    const ok = await act("propose", {
      team: picked,
      excaliburId: v.excaliburOn ? sword : null,
      quest,
    });
    if (!ok) setStamped(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
      {v.targeting && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {[0, 1, 2, 3, 4].map((q) => {
            const open = v.availableQuests.includes(q);
            return (
              <button
                key={q}
                className={quest === q ? "btn-gold" : "btn-ghost"}
                style={{ width: "auto", padding: "6px 10px", fontSize: 13, opacity: open ? 1 : 0.3 }}
                disabled={!open}
                onClick={() => chooseQuest(q)}
              >
                Q{q + 1} · {sizeOf(q)}
                {v.failsNeeded[q] > 1 ? " ·2✕" : ""}
              </button>
            );
          })}
        </div>
      )}
      <div className="serif" style={{ font: "600 24px var(--font-serif)", textAlign: "center" }}>
        {quest === null ? "Choose a quest to attempt" : `Choose ${n} for Mission ${quest + 1}`}
      </div>
      <div
        style={{
          font: "400 12px var(--font-body)",
          color: "var(--parchment-55)",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        {quest === null ? "the riders come next" : `${picked.length} of ${n} chosen`}
        {v.rejectionVariant === "unopposed" && v.rejections >= 4
          ? " · the 5th proposal rides unopposed"
          : ""}
      </div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {[...v.players]
          .sort((a, b) => a.seat - b.seat)
          .map((p) => {
            const isPicked = picked.includes(p.id);
            return (
              <button
                key={p.id}
                className={`row-pick${isPicked ? " picked" : ""}`}
                onClick={() => toggle(p.id)}
              >
                <span>
                  {p.name}
                  {p.id === v.me.id ? " (you)" : ""}
                </span>
                <span style={{ color: isPicked ? "var(--gold)" : "rgba(237,230,214,0.3)" }}>
                  {isPicked ? (sword === p.id && v.excaliburOn ? "⚔ Excalibur" : "✦ chosen") : "○"}
                </span>
              </button>
            );
          })}
      </div>
      {v.excaliburOn && remaining === 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ font: "600 11px var(--font-body)", letterSpacing: "0.12em", color: "var(--parchment-55)", textAlign: "center" }}>
            ⚔ GIVE EXCALIBUR TO
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {swordChoices.map((id) => (
              <button
                key={id}
                className={sword === id ? "btn-gold" : "btn-ghost"}
                style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}
                onClick={() => setSword(id)}
              >
                {nameOf(id)}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className={remaining === 0 && !needsSword ? `btn-gold${stamped ? " stamp-in" : ""}` : "btn-ghost"}
        style={{ marginTop: "auto", opacity: remaining === 0 && !needsSword ? 1 : 0.4 }}
        disabled={remaining !== 0 || needsSword || stamped}
        onClick={confirm}
      >
        {quest === null
          ? "Propose — choose a quest first"
          : remaining !== 0
          ? `Propose — choose ${remaining} more`
          : needsSword
            ? "Give Excalibur to a rider"
            : "Propose this company"}
      </button>
    </div>
  );
}

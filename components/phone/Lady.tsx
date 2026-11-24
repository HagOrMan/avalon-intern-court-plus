"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";

/** The holder picks whom to examine. */
export function LadyChooseScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [marked, setMarked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const targets = v.ladyTargets ?? [];
  const markedName = targets.find((t) => t.id === marked)?.name;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
      <div className="serif" style={{ font: "700 28px var(--font-serif)", color: "var(--gold)", textAlign: "center" }}>
        The Lady of the Lake
      </div>
      <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)", textAlign: "center", marginBottom: 8 }}>
        choose one courtier whose loyalty you will see · they take the Lady after
      </div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {targets.map((t) => (
          <button
            key={t.id}
            className={`row-pick${marked === t.id ? " picked" : ""}`}
            style={marked === t.id ? { borderWidth: 2, fontWeight: 600 } : undefined}
            onClick={() => setMarked((cur) => (cur === t.id ? null : t.id))}
          >
            <span>{t.name}</span>
            {marked === t.id && <span style={{ color: "var(--gold)" }}>◈ chosen</span>}
          </button>
        ))}
      </div>
      <button className="btn-gold" style={{ marginTop: "auto" }} disabled={!marked} onClick={() => setConfirming(true)}>
        Look into their heart
      </button>
      {confirming && marked && (
        <div className="pause-overlay" style={{ background: "rgba(7,8,15,0.94)" }}>
          <div className="serif" style={{ font: "600 26px var(--font-serif)" }}>Examine {markedName}?</div>
          <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)" }}>
            The court will see whom you chose.
          </div>
          <button
            className="btn-gold"
            style={{ maxWidth: 280 }}
            onClick={async () => {
              await act("ladyExamine", { targetId: marked });
              setConfirming(false);
            }}
          >
            ◈ Examine {markedName}
          </button>
          <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={() => setConfirming(false)}>
            Choose again
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The verdict, in neutral colours so a glance at the screen can't read it; plain text
 * only while held. Shared by the result screen and the role peek.
 */
export function LadyVerdict({ result }: { result: NonNullable<PlayerView["ladyResult"]> }) {
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
      <div style={{ font: "600 10px var(--font-body)", letterSpacing: "0.14em", color: "var(--parchment-55)" }}>
        THE LADY SHOWED YOU
      </div>
      <div className="serif" style={{ font: "600 22px var(--font-serif)", color: "var(--parchment)" }}>
        {result.targetName} {result.loyalty === "good" ? "is loyal to Arthur" : "serves Mordred"}
      </div>
    </div>
  );
}

/** The holder reads the result in private, then passes the token on. */
export function LadyResultScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [held, setHeld] = useState(false);
  const [passing, setPassing] = useState(false);
  const result = v.ladyResult;
  if (!result) return null;

  const holdProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      setHeld(true);
    },
    onPointerUp: () => setHeld(false),
    onPointerLeave: () => setHeld(false),
    onPointerCancel: () => setHeld(false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
        {held ? (
          <LadyVerdict result={result} />
        ) : (
          <>
            <div className="flame" style={{ fontSize: 34, color: "var(--gold)" }}>◈</div>
            <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>
              {result.targetName} hands you a sealed card
            </div>
            <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 270 }}>
              Hold the seal to read it. What you tell the court is up to you. You can recall
              it later from your ROLE chip.
            </div>
          </>
        )}
      </div>
      <button
        className={held ? "btn-gold" : "btn-ghost"}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
        {...holdProps}
      >
        {held ? "◉ Holding — release to hide" : "◉ Hold to read"}
      </button>
      <button
        className="btn-gold"
        disabled={passing}
        onClick={async () => {
          setPassing(true);
          if (!(await act("ladyPass"))) setPassing(false);
        }}
      >
        Pass the Lady to {result.targetName}
      </button>
    </div>
  );
}

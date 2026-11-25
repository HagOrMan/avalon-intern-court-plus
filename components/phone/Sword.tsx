"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";
import type { QuestCard } from "@/lib/types";

type Act = (a: string, p?: Record<string, unknown>) => Promise<boolean>;

/** A private card, readable only while held, in neutral colours so a glance can't read it. */
function SecretScreen({
  cover,
  secret,
  actionLabel,
  onAction,
}: {
  cover: { sigil: string; title: string; sub: string };
  secret: React.ReactNode;
  actionLabel: string;
  onAction: () => Promise<boolean>;
}) {
  const [held, setHeld] = useState(false);
  const [busy, setBusy] = useState(false);
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
          secret
        ) : (
          <>
            <div className="flame" style={{ fontSize: 34, color: "var(--gold)" }}>{cover.sigil}</div>
            <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>{cover.title}</div>
            <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 270 }}>{cover.sub}</div>
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
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          if (!(await onAction())) setBusy(false);
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** One line naming a card, used in the secret screens and the role peek. */
export function CardLine({ label, name, card }: { label: string; name: string; card: QuestCard }) {
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
      <div style={{ font: "600 10px var(--font-body)", letterSpacing: "0.14em", color: "var(--parchment-55)" }}>
        {label}
      </div>
      <div className="serif" style={{ font: "600 22px var(--font-serif)", color: "var(--parchment)" }}>
        {name} played {card === "success" ? "Success" : "Fail"}
      </div>
    </div>
  );
}

/** A row picker with a confirm overlay, shared by Excalibur and the trap. */
function PickScreen({
  title,
  sub,
  rows,
  mark,
  confirmLabel,
  confirmSub,
  onConfirm,
  extra,
}: {
  title: string;
  sub: string;
  rows: { id: string; name: string }[];
  mark: string;
  confirmLabel: (name: string) => string;
  confirmSub: string;
  onConfirm: (id: string) => Promise<boolean>;
  extra?: React.ReactNode;
}) {
  const [marked, setMarked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const markedName = rows.find((t) => t.id === marked)?.name ?? "";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 14 }}>
      <div className="serif" style={{ font: "700 28px var(--font-serif)", color: "var(--gold)", textAlign: "center" }}>
        {title}
      </div>
      <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)", textAlign: "center", marginBottom: 8 }}>
        {sub}
      </div>
      <div style={{ display: "grid", gap: 8, overflowY: "auto" }}>
        {rows.map((t) => (
          <button
            key={t.id}
            className={`row-pick${marked === t.id ? " picked" : ""}`}
            style={marked === t.id ? { borderWidth: 2, fontWeight: 600 } : undefined}
            onClick={() => setMarked((cur) => (cur === t.id ? null : t.id))}
          >
            <span>{t.name}</span>
            {marked === t.id && <span style={{ color: "var(--gold)" }}>{mark}</span>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
        <button className="btn-gold" disabled={!marked} onClick={() => setConfirming(true)}>
          {marked ? confirmLabel(markedName) : "Choose a rider"}
        </button>
        {extra}
      </div>
      {confirming && marked && (
        <div className="pause-overlay" style={{ background: "rgba(7,8,15,0.94)" }}>
          <div className="serif" style={{ font: "600 26px var(--font-serif)" }}>{confirmLabel(markedName)}?</div>
          <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)" }}>{confirmSub}</div>
          <button
            className="btn-gold"
            style={{ maxWidth: 280 }}
            onClick={async () => {
              await onConfirm(marked);
              setConfirming(false);
            }}
          >
            {confirmLabel(markedName)}
          </button>
          <button className="btn-ghost" style={{ maxWidth: 280 }} onClick={() => setConfirming(false)}>
            Choose again
          </button>
        </div>
      )}
    </div>
  );
}

export function ExcaliburScreen({ v, act }: { v: PlayerView; act: Act }) {
  return (
    <PickScreen
      title="Excalibur"
      sub="switch one rider's played card, or keep the sword sheathed · you'll see the card they chose"
      rows={v.excaliburTargets ?? []}
      mark="⚔ marked"
      confirmLabel={(name) => `Switch ${name}'s card`}
      confirmSub="The court will see whose card you switched."
      onConfirm={(id) => act("excalibur", { targetId: id })}
      extra={
        <button className="btn-ghost" onClick={() => act("excalibur", { targetId: null })}>
          Keep the sword sheathed
        </button>
      }
    />
  );
}

export function ExcaliburSeenScreen({ v, act }: { v: PlayerView; act: Act }) {
  const seen = v.excaliburSeen.find((e) => e.mission === v.round);
  if (!seen) return null;
  return (
    <SecretScreen
      cover={{
        sigil: "⚔",
        title: `You switched ${seen.targetName}'s card`,
        sub: "Hold to see the card they first played. You can recall it later from your ROLE chip.",
      }}
      secret={<CardLine label="BEFORE YOUR SWITCH" name={seen.targetName} card={seen.original} />}
      actionLabel="Sheathe Excalibur"
      onAction={() => act("excaliburDone")}
    />
  );
}

export function TrapScreen({ v, act }: { v: PlayerView; act: Act }) {
  const rows = [...v.players]
    .filter((p) => v.proposalIds.includes(p.id))
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({ id: p.id, name: p.id === v.me.id ? `${p.name} (you)` : p.name }));
  return (
    <PickScreen
      title="Set the trap"
      sub="take one rider's card out of the quest and see it yourself · yours is allowed"
      rows={rows}
      mark="⌖ trapped"
      confirmLabel={(name) => `Trap ${name}`}
      confirmSub="The court will see whom you trapped, but not the card."
      onConfirm={(id) => act("trap", { targetId: id })}
    />
  );
}

export function TrapSeenScreen({ v, act }: { v: PlayerView; act: Act }) {
  const seen = v.trapsSeen.find((t) => t.mission === v.round);
  if (!seen) return null;
  return (
    <SecretScreen
      cover={{
        sigil: "⌖",
        title: `You trapped ${seen.targetName}`,
        sub: "Hold to see their card. It won't count toward the quest. What you say about it is up to you.",
      }}
      secret={<CardLine label="THE TRAPPED CARD" name={seen.targetName} card={seen.card} />}
      actionLabel="Reveal the rest"
      onAction={() => act("trapDone")}
    />
  );
}

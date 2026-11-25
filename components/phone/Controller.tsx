"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/components/useRoom";
import type { PlayerView } from "@/lib/views";
import { Crest } from "@/components/Crest";
import { KnowledgeBox, RoleReveal } from "./RoleReveal";
import { ProposeScreen } from "./Propose";
import { QuestScreen, VoteScreen } from "./VoteQuest";
import { AssassinScreen } from "./Assassin";
import { LadyChooseScreen, LadyResultScreen, LadyVerdict } from "./Lady";
import { CardLine, ExcaliburScreen, ExcaliburSeenScreen, TrapScreen, TrapSeenScreen } from "./Sword";
import { PlotCardFace, PlotDealScreen, PlotResolveScreen, PlotSeenLine, PlotWindowScreen } from "./Plot";
import { PLOT_INFO } from "@/lib/plots";
import { Plate } from "@/components/Plate";
import { MAX_PLAYERS } from "@/lib/rules";

/** Hold the header chip to privately recall your role mid-game; release to hide. */
function RolePeek({ v, onOpen }: { v: PlayerView; onOpen: () => void }) {
  const [held, setHeld] = useState(false);
  const myPlots = v.plot?.hands.find((h) => h.playerId === v.me.id)?.cards ?? [];
  const myCharge = v.plot?.charges.includes(v.me.id) ?? false;
  // the overlay covers the chip, so end the hold from window-level events
  useEffect(() => {
    if (!held) return;
    const off = () => setHeld(false);
    window.addEventListener("pointerup", off);
    window.addEventListener("pointercancel", off);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("pointerup", off);
      window.removeEventListener("pointercancel", off);
      window.removeEventListener("blur", off);
    };
  }, [held]);

  const role = v.role;
  if (!role) {
    return (
      <span className="flame" style={{ color: "var(--gold)" }}>
        ✦
      </span>
    );
  }
  return (
    <>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          setHeld(true);
          onOpen();
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to recall your role"
        style={{
          font: "600 11px var(--font-body)",
          letterSpacing: "0.1em",
          color: "var(--gold)",
          border: "1px solid rgba(201,162,75,0.45)",
          borderRadius: 2,
          padding: "2px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        <span className="flame">{role.sigil}</span> ROLE
      </button>
      {held && (
        <div
          className="pause-overlay"
          style={{ background: "rgba(11,13,24,0.95)", gap: 14, padding: 24 }}
        >
          <Plate role={role.key} width={180} showFlavor={false} allegiance={role.allegiance} />
          {role.knowledge && (
            <div style={{ width: "100%", maxWidth: 320 }}>
              <KnowledgeBox knowledge={role.knowledge} />
            </div>
          )}
          {role.flagHolder && role.key !== "assassin" && (
            <div style={{ font: "400 12px var(--font-body)", color: "var(--evil-text)" }}>
              You carry the assassin&apos;s flag.
            </div>
          )}
          {v.ladyResult && <LadyVerdict result={v.ladyResult} />}
          {v.excaliburSeen.map((e) => (
            <CardLine key={`x${e.mission}`} label={`EXCALIBUR · ROUND ${e.mission + 1}`} name={e.targetName} card={e.original} />
          ))}
          {v.trapsSeen.map((t) => (
            <CardLine key={`t${t.mission}`} label={`TRAPPED · ROUND ${t.mission + 1}`} name={t.targetName} card={t.card} />
          ))}
          {v.plotSeen.map((seen, i) => (
            <PlotSeenLine key={`p${i}`} seen={seen} />
          ))}
          {(myPlots.length > 0 || myCharge) && (
            <div style={{ width: "100%", maxWidth: 320, display: "grid", gap: 4 }}>
              {myCharge && <PlotCardFace cardKey="charge" compact />}
              {myPlots.map((c) => (
                <PlotCardFace key={c.id} cardKey={c.key} compact />
              ))}
            </div>
          )}
          <div
            style={{
              font: "600 11px var(--font-body)",
              letterSpacing: "0.12em",
              color: "var(--parchment-55)",
            }}
          >
            ◉ RELEASE TO HIDE
          </div>
        </div>
      )}
    </>
  );
}

function Header({ v, onPeek }: { v: PlayerView; onPeek: () => void }) {
  const leaderLabel =
    v.leaderId === v.me.id ? "♛ YOU" : v.leaderName ? `♛ ${v.leaderName}` : "—";
  return (
    <div className="phone-header" style={{ alignItems: "center" }}>
      <RolePeek v={v} onOpen={onPeek} />
      <span>
        {v.phase === "gameover"
          ? "ENDGAME"
          : v.targeting
            ? `ROUND ${v.round + 1} / 5`
            : `MISSION ${v.mission + 1} / 5`}
      </span>
      <span>{v.phase === "gameover" ? "—" : leaderLabel}</span>
    </div>
  );
}

export function Waiting({
  title,
  sub,
  dark = false,
}: {
  title: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
        opacity: dark ? 0.8 : 1,
      }}
    >
      <div className="serif" style={{ font: "600 24px var(--font-serif)", lineHeight: 1.3 }}>
        {title}
      </div>
      {sub && (
        <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 280 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Controller({
  code,
  token,
  onLeave,
}: {
  code: string;
  token: string;
  onLeave: () => void;
}) {
  const { view: v, fatal, toast, act } = useRoom<PlayerView>(code, token);
  const [showLeave, setShowLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // private Plot results read so far; a newer one shows a nudge to hold the ROLE chip
  const [plotRead, setPlotRead] = useState(0);
  const unreadPlot = (v?.plotSeen.length ?? 0) > plotRead;

  const leave = async () => {
    setLeaving(true);
    if (await act("leave")) onLeave();
    else setLeaving(false);
  };

  // the stream reports our own departure as a kick; don't flash that while leaving
  if (fatal && !leaving) {
    return (
      <main className="phone-screen" style={{ justifyContent: "center", gap: 18, textAlign: "center" }}>
        <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>{fatal}</div>
        <button className="btn-ghost" onClick={onLeave}>
          Return to the gates
        </button>
      </main>
    );
  }
  if (!v) {
    return (
      <main className="phone-screen" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="kicker flame" style={{ color: "var(--gold)" }}>
          Entering the court…
        </div>
      </main>
    );
  }

  const body = () => {
    switch (v.phase) {
      case "lobby":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              textAlign: "center",
            }}
          >
            <Crest name={v.me.name} size={64} />
            <div className="serif" style={{ font: "700 30px var(--font-serif)" }}>{v.me.name}</div>
            <div style={{ color: "var(--parchment-55)", font: "400 14px var(--font-body)" }}>
              You are seated. The court gathers on the TV —<br />
              {v.playerCount} of {MAX_PLAYERS} seats filled.
            </div>
            <button
              onClick={() => setShowLeave(true)}
              style={{ color: "var(--parchment-55)", font: "500 12px var(--font-body)", letterSpacing: "0.1em", marginTop: 24 }}
            >
              LEAVE SEAT
            </button>
            {showLeave && (
              <div className="pause-overlay">
                <div className="serif" style={{ font: "600 22px var(--font-serif)" }}>Leave the court?</div>
                <button className="btn-ghost" style={{ maxWidth: 260 }} disabled={leaving} onClick={leave}>
                  Leave
                </button>
                <button className="btn-gold" style={{ maxWidth: 260 }} onClick={() => setShowLeave(false)}>
                  Stay seated
                </button>
              </div>
            )}
          </div>
        );
      case "setup":
        return (
          <Waiting
            title="The Game Master shapes the court…"
            sub="Roles are being chosen on the TV. Your part comes next."
          />
        );
      case "reveal":
        return <RoleReveal v={v} act={act} />;
      case "plotDeal":
        if (v.plotTurn?.kind === "deal") return <PlotDealScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.leaderName} draws Plot cards`}
            sub="They hand each one to another player, face up."
          />
        );
      case "plotResolve":
        if (v.plotTurn?.kind === "resolve") return <PlotResolveScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.plot?.pending?.actorName} resolves ${v.plot?.pending ? PLOT_INFO[v.plot.pending.key].name : "a Plot card"}`}
            sub="Whatever it shows goes to one player alone."
          />
        );
      case "plotWindow":
        if (v.plotTurn?.kind === "window") return <PlotWindowScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.plot?.window?.askingName} may play ${v.plot?.window ? PLOT_INFO[v.plot.window.kind].name : "a Plot card"}…`}
            sub="Holders are asked in turn, clockwise from the leader."
          />
        );
      case "lady":
        if (v.ladyTargets) return <LadyChooseScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.lady?.holderName} holds the Lady of the Lake…`}
            sub="They choose one courtier whose loyalty they will see."
          />
        );
      case "ladyReveal":
        if (v.lady?.holderId === v.me.id) return <LadyResultScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.lady?.holderName} examines ${v.lady?.examinedName}`}
            sub="Only the Lady's bearer sees the card. What they claim is up to them."
          />
        );
      case "proposal":
        if (v.isLeader) return <ProposeScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.leaderName} considers the court…`}
            sub={
              v.targeting
                ? "They choose which quest to attempt, and its company."
                : `They must choose ${v.teamSize} for Mission ${v.mission + 1}.`
            }
          />
        );
      case "voting":
        return <VoteScreen v={v} act={act} />;
      case "voteReveal":
        return (
          <Waiting
            title="The court has spoken"
            sub={
              v.voteResult
                ? `${v.voteResult.approved ? "Approved" : "Rejected"}, ${v.voteResult.approve} – ${v.voteResult.reject}. Eyes on the TV.`
                : "Eyes on the TV."
            }
          />
        );
      case "quest":
        if (v.onTeam) return <QuestScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.proposalNames.join(" and ")} ride for Mission ${v.mission + 1}`}
            sub={`${v.cardsIn} of ${v.cardsNeeded} cards cast.`}
          />
        );
      case "excalibur":
        if (v.excaliburTargets) return <ExcaliburScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.excalibur?.holderName} weighs Excalibur…`}
            sub="They may switch one rider's played card."
          />
        );
      case "excaliburReveal":
        if (v.excalibur?.holderId === v.me.id) return <ExcaliburSeenScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.excalibur?.holderName} turns Excalibur on ${v.excalibur?.targetName}`}
            sub="One played card has been switched."
          />
        );
      case "trap":
        if (v.isLeader) return <TrapScreen v={v} act={act} />;
        return <Waiting title={`${v.leaderName} sets the trap…`} sub="One rider's card will be taken out of the quest." />;
      case "trapReveal":
        if (v.isLeader) return <TrapSeenScreen v={v} act={act} />;
        return (
          <Waiting
            title={`${v.leaderName} has trapped ${v.trap?.targetName}`}
            sub="Only the leader sees that card. What they say about it is up to them."
          />
        );
      case "questReveal":
        return <Waiting title="The cards are cast" sub="Watch the table." />;
      case "assassination":
        if (v.assassin?.choosing) return <AssassinScreen v={v} act={act} />;
        return (
          <Waiting
            dark
            title="The Assassin considers the court…"
            sub="Three quests are won. One blade remains."
          />
        );
      case "assassinationReveal":
        return <Waiting dark title="The blade falls" sub="Eyes on the TV." />;
      case "gameover": {
        const g = v.gameover!;
        const good = g.winner === "good";
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              textAlign: "center",
            }}
          >
            <div
              className="serif"
              style={{
                font: "700 30px var(--font-serif)",
                color: good ? "var(--good-text)" : "var(--evil-text)",
              }}
            >
              {good ? "◯ The light holds" : "◆ Mordred prevails"}
            </div>
            <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-75)", maxWidth: 300 }}>
              {g.winReason}
            </div>
            {v.role && <Plate role={v.role.key} width={180} showFlavor={false} allegiance={v.role.allegiance} />}
            <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
              The full unmasking is on the TV. The Game Master can call another game.
            </div>
          </div>
        );
      }
    }
  };

  return (
    <main className="phone-screen">
      <Header v={v} onPeek={() => setPlotRead(v.plotSeen.length)} />
      {unreadPlot && (
        <div style={{ font: "600 11px var(--font-body)", letterSpacing: "0.12em", color: "var(--gold)", textAlign: "center", padding: "6px 0" }}>
          ◉ SOMETHING FOR YOUR EYES ONLY · HOLD ROLE TO READ
        </div>
      )}
      {body()}
      {v.paused && (
        <div className="pause-overlay">
          <div className="flame" style={{ fontSize: 28, color: "var(--gold)" }}>✦</div>
          <div className="serif" style={{ font: "600 24px var(--font-serif)" }}>The court sleeps</div>
          <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 280 }}>
            The TV has lost its connection. The game is paused and will resume when the Game
            Master returns.
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

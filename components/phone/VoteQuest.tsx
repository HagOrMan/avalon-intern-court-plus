"use client";

import { useState } from "react";
import type { PlayerView } from "@/lib/views";
import { secureRandom } from "@/lib/rules";

export function VoteScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  // optimistic: stamp immediately, server reconciles
  const [castLocal, setCastLocal] = useState<"approve" | "reject" | null>(null);
  const cast = v.myVote ?? castLocal;
  // Charge: its holders vote first and face up; everyone else waits for them
  const charges = v.plot?.charges ?? [];
  const iCharge = charges.includes(v.me.id);
  const waitingOnCharge = !iCharge && charges.some((id) => !v.votedIds.includes(id));

  const voteFor = async (vote: "approve" | "reject") => {
    setCastLocal(vote);
    const ok = await act("vote", { vote });
    if (!ok) setCastLocal(null);
  };

  if (cast) {
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
        <div
          className={`vote-btn ${cast} stamp-in`}
          style={{ flex: "none", width: 180, height: 150, opacity: 0.7 }}
        >
          <span style={{ fontSize: 30 }}>{cast === "approve" ? "◯" : "◆"}</span>
          <span>{cast === "approve" ? "APPROVE" : "REJECT"}</span>
        </div>
        <div className="serif" style={{ font: "600 22px var(--font-serif)" }}>
          Sealed
        </div>
        <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
          Waiting for the court · {v.votedIds.length} of {v.playerCount} votes cast
        </div>
      </div>
    );
  }

  if (waitingOnCharge) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
        <div className="serif" style={{ font: "600 22px var(--font-serif)" }}>The Charge votes first</div>
        <div style={{ font: "400 13px var(--font-body)", color: "var(--parchment-55)", maxWidth: 260 }}>
          Their vote{charges.length > 1 ? "s are" : " is"} shown on the TV before anyone else votes.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      {iCharge && (
        <div style={{ font: "600 11px var(--font-body)", letterSpacing: "0.12em", color: "var(--gold)", textAlign: "center" }}>
          ⛨ CHARGE · YOU VOTE FIRST, FACE UP
        </div>
      )}
      {(v.plot?.chargeVotes ?? []).map((c) => (
        <div key={c.playerId} style={{ font: "500 13px var(--font-body)", color: "var(--parchment-75)", textAlign: "center" }}>
          ⛨ {c.name} voted {c.vote === "approve" ? "◯ Approve" : "◆ Reject"}
        </div>
      ))}
      <div
        className="serif"
        style={{ font: "600 20px var(--font-serif)", textAlign: "center", lineHeight: 1.35 }}
      >
        {v.leaderName} proposes
        <br />
        {v.proposalNames.join(" · ")}
        {v.excalibur && (
          <div style={{ font: "500 13px var(--font-body)", color: "var(--gold)", marginTop: 4 }}>
            ⚔ {v.excalibur.holderName} carries Excalibur
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        <button className="vote-btn approve" onClick={() => voteFor("approve")}>
          <span style={{ fontSize: 34 }}>◯</span>
          <span>APPROVE</span>
        </button>
        <button className="vote-btn reject" onClick={() => voteFor("reject")}>
          <span style={{ fontSize: 30 }}>◆</span>
          <span>REJECT</span>
        </button>
      </div>
      <div style={{ textAlign: "center", font: "400 11px var(--font-body)", color: "rgba(237,230,214,0.4)" }}>
        your vote locks when cast · revealed all at once on the TV
      </div>
    </div>
  );
}

export function QuestScreen({
  v,
  act,
}: {
  v: PlayerView;
  act: (a: string, p?: Record<string, unknown>) => Promise<boolean>;
}) {
  const [castLocal, setCastLocal] = useState<"success" | "fail" | null>(null);
  const cast = v.myCard ?? castLocal;
  // so onlookers can't read the card from whether a thumb went high or low
  const [failOnTop] = useState(() => secureRandom() < 0.5);
  // Anyone whose card is forced still gets two buttons, so their screen and thumb look
  // like a free rider's: a loyal rider's red button plays Success, a forced Evil
  // Lancelot's green one plays Fail. See docs/fairness.md §6.
  const forcedLancelot =
    v.lancelotForcedCards && (v.role?.key === "lancelotGood" || v.role?.key === "lancelotEvil");
  const evilNow = v.role?.allegiance === "evil";
  const loyal = !evilNow && (forcedLancelot || !v.goodMayFail);
  const mustFail = evilNow && forcedLancelot;

  const play = async (card: "success" | "fail") => {
    setCastLocal(card);
    const ok = await act("questCard", { card });
    if (!ok) setCastLocal(null);
  };

  if (cast) {
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
        <div className="serif stamp-in" style={{ font: "600 26px var(--font-serif)", color: "var(--gold)" }}>
          Your card is cast
        </div>
        <div style={{ font: "400 12px var(--font-body)", color: "var(--parchment-55)" }}>
          {v.cardsIn} of {v.cardsNeeded} cards on the table · shuffled before they turn
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
      <div className="serif" style={{ font: "600 24px var(--font-serif)", textAlign: "center" }}>
        You ride for Mission {v.mission + 1}
      </div>
      {v.plot?.spotlit.some((x) => x.playerId === v.me.id) && (
        <div style={{ font: "600 11px var(--font-body)", letterSpacing: "0.12em", color: "var(--gold)", textAlign: "center" }}>
          WE FOUND YOU · YOUR CARD IS PLAYED FACE UP
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: failOnTop ? "column-reverse" : "column",
          gap: 14,
        }}
      >
        <button className="vote-btn approve" onClick={() => play(mustFail ? "fail" : "success")}>
          <span style={{ fontSize: 34 }}>◯</span>
          <span>{mustFail ? "FAIL" : "SUCCESS"}</span>
        </button>
        <button className="vote-btn reject" onClick={() => play(loyal ? "success" : "fail")}>
          <span style={{ fontSize: 30 }}>◆</span>
          <span>{loyal ? "SUCCESS" : "FAIL"}</span>
        </button>
      </div>
    </div>
  );
}

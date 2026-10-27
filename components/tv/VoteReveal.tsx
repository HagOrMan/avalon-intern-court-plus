"use client";

import type { TvView } from "@/lib/views";
import { useNow } from "./TvApp";
import { QuestTrack, Candles } from "./RoundTable";

/** TV-4 · THE dramatic beat: 800ms stillness → one simultaneous 500ms flip → wax stamp at +600 → hold 4s → burn. */
export function VoteReveal({ v, clockOffset }: { v: TvView; clockOffset: number }) {
  const now = useNow(true, 80);
  const r = v.voteReveal!;
  const t = now + clockOffset - r.revealAt;
  const flipped = t >= 800;
  const stamped = t >= 800 + 500 + 600;
  const burning = t >= 800 + 500 + 600 + 4000;

  const names = v.proposalNames;
  const nameList = names.length === 2 ? names.join(" and ") : names.join(", ");

  // past 8 voters the cards split into two even rows, shrunk so both clear the result stamp
  const twoRows = r.votes.length > 8;
  const cardW = twoRows ? 120 : 184;
  const cardH = twoRows ? 166 : 256;
  const gap = 44;
  const perRow = Math.ceil(r.votes.length / (twoRows ? 2 : 1));

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <QuestTrack v={v} />
      <Candles v={v} />
      <div
        className="serif"
        style={{
          position: "absolute",
          top: 210,
          left: 0,
          right: 0,
          textAlign: "center",
          font: "600 64px var(--font-serif)",
        }}
      >
        The court has spoken
      </div>
      <div
        style={{
          position: "absolute",
          top: twoRows ? 300 : 340,
          left: 0,
          right: 0,
          width: perRow * cardW + (perRow - 1) * gap,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: twoRows ? `20px ${gap}px` : gap,
        }}
      >
        {r.votes.map(({ name, vote }) => {
          const approve = vote === "approve";
          return (
            <div key={name} style={{ textAlign: "center", width: cardW }} className={burning ? "burn-away" : ""}>
              <div className="flip-card" style={{ width: cardW, height: cardH }}>
                <div className={`flip-inner${flipped ? " flipped" : ""}`}>
                  {/* face */}
                  <div
                    className="flip-face"
                    style={
                      approve
                        ? {
                            background: "var(--good-fill)",
                            border: "2px solid var(--good-border)",
                            borderRadius: "50% 50% 8px 8px / 18% 18% 8px 8px",
                          }
                        : {
                            background: "var(--evil-fill)",
                            border: "2px solid var(--evil-border)",
                          }
                    }
                  >
                    <span style={{ fontSize: twoRows ? 40 : 52 }}>{approve ? "◯" : "◆"}</span>
                    <span style={{ font: `600 ${twoRows ? 20 : 24}px var(--font-body)`, letterSpacing: "0.1em" }}>
                      {approve ? "APPROVE" : "REJECT"}
                    </span>
                  </div>
                  {/* back */}
                  <div
                    className="flip-face flip-back"
                    style={{
                      background: "linear-gradient(135deg, #191d33, #10131f)",
                      border: "1px solid rgba(201,162,75,0.8)",
                      boxShadow: "0 0 24px rgba(201,162,75,0.25)",
                    }}
                  >
                    <span className="serif" style={{ font: "700 52px var(--font-serif)", color: "var(--gold)" }}>
                      ✦
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ font: `500 ${twoRows ? 22 : 26}px var(--font-body)`, marginTop: twoRows ? 10 : 16 }}>
                {name}
              </div>
            </div>
          );
        })}
      </div>
      {stamped && (
        <>
          <div
            className="serif stamp-in"
            style={{
              position: "absolute",
              bottom: 180,
              left: 0,
              right: 0,
              textAlign: "center",
              font: "700 88px var(--font-serif)",
              color: "var(--gold)",
            }}
          >
            {r.approved ? "Approved" : "Rejected"}, {r.approve} – {r.reject}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 110,
              left: 0,
              right: 0,
              textAlign: "center",
              font: "400 30px var(--font-body)",
              color: "rgba(237,230,214,0.6)",
            }}
          >
            {r.approved
              ? `${nameList} ride for Mission ${v.mission + 1}`
              : v.rejections + 1 >= 5 && v.rejectionVariant === "official"
                ? "The fifth candle gutters out…"
                : "The crown passes on"}
          </div>
        </>
      )}
    </div>
  );
}

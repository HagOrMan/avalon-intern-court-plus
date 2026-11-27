"use client";

import type { TvView } from "@/lib/views";
import { Crest } from "@/components/Crest";
import { PLOT_INFO, PLOT_SIGIL } from "@/lib/plots";

/** Quest track: resolved ◯/◆, current ringed gold, two-fail double-ringed. */
export function QuestTrack({ v }: { v: TvView }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 36,
        alignItems: "center",
      }}
    >
      {v.missionSizes.map((size, i) => {
        const res = v.questResults[i];
        const current = v.questChosen && i === v.mission && !res;
        // Targeting: the 5th quest stays sealed until two others succeed
        const sealed = v.targeting && !res && !v.availableQuests.includes(i) && i === 4;
        const twoFail = v.failsNeeded[i] >= 2;
        if (res && !res.success) {
          return (
            <div
              key={i}
              style={{
                width: 88,
                height: 88,
                background: "var(--evil)",
                border: "4px solid var(--gold)",
                transform: "rotate(45deg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ transform: "rotate(-45deg)", font: "700 32px var(--font-body)" }}>✕</span>
            </div>
          );
        }
        return (
          <div
            key={i}
            className="serif"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: res?.success ? "var(--good)" : undefined,
              border: res?.success
                ? "4px solid var(--gold)"
                : current
                  ? "4px solid rgba(201,162,75,0.9)"
                  : "4px solid rgba(201,162,75,0.35)",
              boxShadow: current
                ? "0 0 36px rgba(201,162,75,0.35)"
                : twoFail && !res
                  ? "0 0 0 6px var(--ground), 0 0 0 8px rgba(201,162,75,0.3)"
                  : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 36px var(--font-serif)",
              color: res?.success ? "var(--parchment)" : current ? "var(--gold)" : "rgba(237,230,214,0.5)",
              position: "relative",
              opacity: sealed ? 0.45 : 1,
            }}
          >
            {res?.success ? "◯" : size}
            {sealed && (
              <span
                style={{
                  position: "absolute",
                  top: -30,
                  font: "600 14px var(--font-body)",
                  letterSpacing: "0.1em",
                  color: "rgba(237,230,214,0.6)",
                  whiteSpace: "nowrap",
                }}
              >
                SEALED · 2 WINS
              </span>
            )}
            {twoFail && !res && (
              <span
                style={{
                  position: "absolute",
                  bottom: -32,
                  font: "600 16px var(--font-body)",
                  letterSpacing: "0.08em",
                  color: "rgba(201,162,75,0.7)",
                  whiteSpace: "nowrap",
                }}
              >
                2 FAILS
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Lancelot's allegiance cards, top-left: a known schedule shows all five face up; hidden
 * draws show rounds 3–5 face down until flipped. ⇄ = switch, — = no change.
 */
export function AllegianceTrack({ v }: { v: TvView }) {
  const l = v.lancelot;
  if (!l || (!l.schedule && v.config.lancelotSchedule !== "hidden")) return null;
  const rounds = l.schedule ? [1, 2, 3, 4, 5] : [3, 4, 5];
  return (
    <div style={{ position: "absolute", top: 52, left: 80, display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ font: "600 18px var(--font-body)", letterSpacing: "0.1em", color: "rgba(237,230,214,0.5)", marginRight: 6 }}>
        ⚜ LANCELOT
      </span>
      {rounds.map((round) => {
        const flip = l.flips.find((f) => f.round === round);
        const card = l.schedule ? l.schedule[round - 1] : flip?.card;
        const resolved = !!flip;
        return (
          <div
            key={round}
            title={`Round ${round}`}
            style={{
              width: 40,
              height: 54,
              border: `1px solid ${resolved ? "var(--gold)" : "rgba(201,162,75,0.4)"}`,
              background: resolved ? "rgba(201,162,75,0.15)" : "linear-gradient(135deg, #191d33, #10131f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 22px var(--font-body)",
              color: card === "switch" ? "var(--gold)" : "rgba(237,230,214,0.55)",
              opacity: resolved || l.schedule ? 1 : 0.7,
            }}
          >
            {card ? (card === "switch" ? "⇄" : "—") : "?"}
          </div>
        );
      })}
      {l.switched && (
        <span style={{ font: "600 18px var(--font-body)", letterSpacing: "0.08em", color: "var(--gold)", marginLeft: 6 }}>
          SWITCHED
        </span>
      )}
    </div>
  );
}

/** Five candles top-right; one snuffs per rejected proposal. */
export function Candles({ v }: { v: TvView }) {
  return (
    <div style={{ position: "absolute", top: 60, right: 80, display: "flex", gap: 16, alignItems: "flex-end" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const lit = i >= v.rejections;
        return (
          <div
            key={i}
            style={{
              width: 14,
              height: 40,
              background: lit ? "rgba(237,230,214,0.85)" : "rgba(237,230,214,0.25)",
              position: "relative",
            }}
          >
            {lit && (
              <span
                className="flame"
                style={{
                  position: "absolute",
                  top: -16,
                  left: 1,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--gold)",
                }}
              />
            )}
          </div>
        );
      })}
      <span
        style={{
          font: "600 18px var(--font-body)",
          letterSpacing: "0.1em",
          color: "rgba(237,230,214,0.5)",
          marginLeft: 12,
          alignSelf: "center",
        }}
      >
        REJECTIONS
      </span>
    </div>
  );
}

/**
 * A seat's public Plot state: held cards, a Charge (and its vote once all Charges have
 * voted), and a face-up quest card. Plot cards are open information under the rules.
 */
function SeatPlots({ v, playerId, small }: { v: TvView; playerId: string; small: boolean }) {
  const plot = v.plot!;
  const cards = plot.hands.find((h) => h.playerId === playerId)?.cards ?? [];
  const charge = plot.charges.includes(playerId);
  const chargeVote = plot.chargeVotes?.find((c) => c.playerId === playerId)?.vote;
  const spot = plot.spotlit.find((x) => x.playerId === playerId);
  if (!cards.length && !charge && !spot) return null;
  const size = small ? 13 : 15;
  return (
    <div style={{ display: "grid", gap: 2, font: `600 ${size}px var(--font-body)`, letterSpacing: "0.06em", color: "var(--parchment-75)" }}>
      {cards.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 10px" }}>
          {cards.map((c) => (
            <span key={c.id} style={{ whiteSpace: "nowrap" }}>
              {PLOT_SIGIL[PLOT_INFO[c.key].type]} {PLOT_INFO[c.key].name.toUpperCase()}
            </span>
          ))}
        </div>
      )}
      {charge && (
        <div style={{ color: "var(--gold)" }}>
          ⛨ CHARGE{chargeVote ? (chargeVote === "approve" ? " · ◯ APPROVE" : " · ◆ REJECT") : ""}
        </div>
      )}
      {spot && (
        <div style={{ color: "var(--gold)" }}>
          FACE UP{spot.card ? (spot.card === "success" ? " · ◯ SUCCESS" : " · ◆ FAIL") : ""}
        </div>
      )}
    </div>
  );
}

/**
 * Seats sit on a stadium-shaped track: straight top and bottom rows with rounded ends. It
 * uses the stage's width rather than its height, so the bottom row stays above the banner
 * and the top row below the quest track. `top`/`bottom` are crest centres.
 */
const TRACK = { cx: 960, top: 240, bottom: 740, halfStraight: 560, endRadius: 230 };
/**
 * The table outline sits midway between the two rows of crests, so both rows look equally
 * far from it. The top row's names and Plot cards hang into the gap above it.
 */
const TABLE = { left: 400, right: 400, top: 400, height: 180 };
/** Plot text inside the table outline. */
const CENTRE = { left: 420, right: 420, top: 410, height: 160 };
/** Gold outline that follows a selected crest's shield shape (a filter on the parent sees the clip). */
const SELECTED_OUTLINE = [
  "drop-shadow(2px 0 0 var(--gold))",
  "drop-shadow(-2px 0 0 var(--gold))",
  "drop-shadow(0 2px 0 var(--gold))",
  "drop-shadow(0 -2px 0 var(--gold))",
  "drop-shadow(0 0 14px rgba(201,162,75,0.55))",
].join(" ");
/** Longest banner, in characters, that stays on one line at the banner's size. */
const BANNER_CHARS = 72;
const SEAT_W = 220;

/**
 * Crest centres spaced evenly by distance along the track, clockwise from top centre
 * (seat 0). Even spacing by distance, not angle, keeps the rounded ends from bunching.
 */
function seatPoints(n: number): { x: number; y: number }[] {
  const { cx, top, bottom, halfStraight: s, endRadius: e } = TRACK;
  const cy = (top + bottom) / 2;
  const h = (bottom - top) / 2;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const path: { x: number; y: number }[] = [];
  for (let x = cx; x < cx + s; x += 4) path.push({ x, y: top });
  for (let a = -90; a < 90; a++) path.push({ x: cx + s + e * Math.cos(rad(a)), y: cy + h * Math.sin(rad(a)) });
  for (let x = cx + s; x > cx - s; x -= 4) path.push({ x, y: bottom });
  for (let a = 90; a < 270; a++) path.push({ x: cx - s + e * Math.cos(rad(a)), y: cy + h * Math.sin(rad(a)) });
  for (let x = cx - s; x <= cx; x += 4) path.push({ x, y: top });
  const dist = [0];
  for (let i = 1; i < path.length; i++) {
    dist.push(dist[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  const total = dist[dist.length - 1];
  const points: { x: number; y: number }[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (k * total) / n;
    while (j < dist.length - 1 && dist[j + 1] <= d) j++;
    points.push(path[j]);
  }
  return points;
}

function joinNames(names: string[]): string {
  return names.length === 2 ? names.join(" and ") : names.join(", ");
}

/** TV-3 · the persistent round table. */
export function RoundTable({ v }: { v: TvView }) {
  const players = [...v.players].sort((a, b) => a.seat - b.seat);
  const n = players.length;
  const crowded = n > 10;
  const crest = crowded ? 56 : 72;
  const points = seatPoints(n);

  const banner = () => {
    if (v.phase === "plotDeal" && v.plot) {
      const k = v.plot.drawn.length;
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{v.leaderName}</span> draws {k} Plot card
          {k === 1 ? "" : "s"}
        </>
      );
    }
    if (v.phase === "plotResolve" && v.plot?.pending) {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{v.plot.pending.actorName}</span> resolves{" "}
          {PLOT_INFO[v.plot.pending.key].name}…
        </>
      );
    }
    if (v.phase === "plotWindow" && v.plot?.window) {
      return (
        <>
          Will <span style={{ color: "var(--gold)" }}>{v.plot.window.askingName}</span> play{" "}
          {PLOT_INFO[v.plot.window.kind].name}?
        </>
      );
    }
    if (v.phase === "lady") {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>◈ {v.lady?.holderName}</span> raises the Lady of
          the Lake…
        </>
      );
    }
    if (v.phase === "ladyReveal") {
      return (
        <>
          {v.lady?.holderName} looks into{" "}
          <span style={{ color: "var(--gold)" }}>{v.lady?.examinedName}</span>&apos;s heart
        </>
      );
    }
    if (v.phase === "proposal") {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{v.leaderName}</span> chooses{" "}
          {v.targeting ? "a quest and its company…" : `${v.teamSize} for Mission ${v.mission + 1}…`}
        </>
      );
    }
    // a company too long for one line is counted instead; its riders are lit on the table
    if (v.phase === "voting") {
      const tail = ` for Mission ${v.mission + 1} — the court votes`;
      const listed = joinNames(v.proposalNames);
      const company =
        `${v.leaderName} proposes ${listed}${tail}`.length <= BANNER_CHARS
          ? listed
          : `${v.proposalNames.length} riders`;
      return (
        <>
          {v.leaderName} proposes <span style={{ color: "var(--gold)" }}>{company}</span>
          {tail}
        </>
      );
    }
    if (v.phase === "quest") {
      const names = v.quest?.teamNames ?? [];
      const tail = ` ride for Mission ${v.mission + 1} · ${v.quest?.cardsIn} of ${v.quest?.cardsNeeded} cards cast`;
      const listed = joinNames(names);
      const company = `${listed}${tail}`.length <= BANNER_CHARS ? listed : `${names.length} riders`;
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{company}</span>
          {tail}
        </>
      );
    }
    if (v.phase === "excalibur") {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>⚔ {v.excalibur?.holderName}</span> weighs Excalibur…
        </>
      );
    }
    if (v.phase === "excaliburReveal") {
      return (
        <>
          {v.excalibur?.holderName} switches{" "}
          <span style={{ color: "var(--gold)" }}>{v.excalibur?.targetName}</span>&apos;s card
        </>
      );
    }
    if (v.phase === "trap") {
      return (
        <>
          <span style={{ color: "var(--gold)" }}>{v.leaderName}</span> sets the trap…
        </>
      );
    }
    if (v.phase === "trapReveal") {
      return (
        <>
          {v.leaderName} has trapped{" "}
          <span style={{ color: "var(--gold)" }}>{v.trap?.targetName}</span>&apos;s card
        </>
      );
    }
    return null;
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <QuestTrack v={v} />
      <Candles v={v} />
      <AllegianceTrack v={v} />
      <div
        style={{
          position: "absolute",
          left: TABLE.left,
          right: TABLE.right,
          top: TABLE.top,
          height: TABLE.height,
          border: "1px solid rgba(201,162,75,0.2)",
          borderRadius: 9999,
        }}
      />
      {players.map((p, i) => {
        const { x, y } = points[i];
        const isLeader = p.id === v.leaderId;
        const chosen = v.proposalIds.includes(p.id);
        const voted = v.votedIds.includes(p.id);
        // anchored at the crest, not centred, so a seat's cards and markers grow downward
        // and the crowns and crests of every seat stay on the track
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: x - SEAT_W / 2,
              top: y - crest / 2,
              width: SEAT_W,
              textAlign: "center",
              zIndex: 2,
              opacity: p.connected ? 1 : 0.45,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <div style={{ position: "relative" }}>
                {isLeader && (
                  <div
                    className="flame"
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: 0,
                      right: 0,
                      fontSize: crowded ? 28 : 34,
                      color: "var(--gold)",
                      lineHeight: 1.1,
                    }}
                  >
                    ♛
                  </div>
                )}
                <div style={{ filter: chosen ? SELECTED_OUTLINE : "none", transition: "filter 300ms ease-out" }}>
                  <Crest name={p.name} size={crest} lifted={chosen} />
                </div>
                {voted && (
                  <div
                    className="rise-in"
                    style={{
                      position: "absolute",
                      right: -30,
                      bottom: -6,
                      width: 40,
                      height: 54,
                      background: "linear-gradient(135deg, #191d33, #10131f)",
                      border: "1px solid rgba(201,162,75,0.8)",
                      boxShadow: "0 0 16px rgba(201,162,75,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span className="serif" style={{ font: "700 20px var(--font-serif)", color: "var(--gold)" }}>✦</span>
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                font: `600 ${crowded ? 20 : 26}px var(--font-body)`,
                color: chosen || isLeader ? "var(--gold)" : "var(--parchment)",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </div>
            {v.plot && <SeatPlots v={v} playerId={p.id} small={crowded} />}
            {v.excalibur?.holderId === p.id && (
              <div style={{ font: `600 ${crowded ? 14 : 16}px var(--font-body)`, letterSpacing: "0.1em", color: "var(--gold)" }}>
                ⚔ EXCALIBUR
              </div>
            )}
            {v.trap?.targetId === p.id && (
              <div className="rise-in" style={{ font: `700 ${crowded ? 16 : 20}px var(--font-body)`, letterSpacing: "0.1em", color: "var(--gold)" }}>
                ⌖ TRAPPED
              </div>
            )}
            {v.lady?.holderId === p.id && (
              <div style={{ font: `600 ${crowded ? 14 : 16}px var(--font-body)`, letterSpacing: "0.1em", color: "var(--gold)" }}>
                ◈ LADY
              </div>
            )}
            {!p.connected && (
              <div style={{ font: "500 16px var(--font-body)", color: "var(--evil-text)" }}>
                adrift
              </div>
            )}
          </div>
        );
      })}
      {v.plot && (
        <div
          style={{
            position: "absolute",
            left: CENTRE.left,
            right: CENTRE.right,
            top: CENTRE.top,
            height: CENTRE.height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            textAlign: "center",
          }}
        >
          {v.phase === "plotDeal" && v.plot.drawn.length > 0 && (
            <div className="serif" style={{ font: "600 34px/1.3 var(--font-serif)", color: "var(--gold)" }}>
              {v.plot.drawn.map((c) => `${PLOT_SIGIL[PLOT_INFO[c.key].type]} ${PLOT_INFO[c.key].name}`).join("  ·  ")}
            </div>
          )}
          {v.plot.lastEvent && (
            <div style={{ font: "500 26px/1.35 var(--font-body)", color: "rgba(237,230,214,0.6)" }}>
              {v.plot.lastEvent.kind === "given"
                ? `${v.plot.lastEvent.byName} handed ${PLOT_INFO[v.plot.lastEvent.key].name} to ${v.plot.lastEvent.targetName}`
                : `${v.plot.lastEvent.byName} played ${PLOT_INFO[v.plot.lastEvent.key].name}${v.plot.lastEvent.targetName ? ` · ${v.plot.lastEvent.targetName}` : ""}`}
            </div>
          )}
        </div>
      )}
      <div
        className="serif"
        style={{
          position: "absolute",
          bottom: 52,
          left: 40,
          right: 40,
          textAlign: "center",
          font: "600 48px var(--font-serif)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {banner()}
      </div>
    </div>
  );
}

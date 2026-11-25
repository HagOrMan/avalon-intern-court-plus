import { PORTRAITS, ROLES } from "@/lib/roles";
import { LQIP } from "@/lib/lqip";
import type { Allegiance, RoleKey } from "@/lib/types";

/** Square stand-in for roles with no portrait file yet: the role's sigil on the card back. */
export function SigilTile({ role, style }: { role: RoleKey; style?: React.CSSProperties }) {
  return (
    <div
      role="img"
      aria-label={ROLES[role].name}
      style={{
        background: "linear-gradient(135deg, #191d33, #10131f)",
        border: "1px solid rgba(201,162,75,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--gold)",
        ...style,
      }}
    >
      <span className="serif" style={{ fontSize: "3em", lineHeight: 1 }}>{ROLES[role].sigil}</span>
    </div>
  );
}

export function Plate({
  role,
  width = 208,
  showFlavor = true,
  suffix,
  allegiance,
}: {
  role: RoleKey;
  width?: number;
  showFlavor?: boolean;
  suffix?: string | null;
  /** the holder's current side, when it can differ from the role's (a switched Lancelot) */
  allegiance?: Allegiance;
}) {
  const info = ROLES[role];
  const evil = (allegiance ?? info.allegiance) === "evil";
  const nameSize = Math.max(16, Math.round(width * 0.115));
  const portrait = PORTRAITS[role];
  return (
    <div className="plate" style={{ width }}>
      <div className="flame" style={{ fontSize: Math.max(14, width * 0.09), color: "var(--gold)", lineHeight: 1 }}>
        {info.sigil}
      </div>
      {portrait ? (
        // blurred LQIP paints first; the real crop replaces it on load
        <img
          src={portrait}
          alt={info.name}
          style={{
            width: "100%",
            aspectRatio: "1",
            objectFit: "cover",
            border: "1px solid rgba(201,162,75,0.5)",
            display: "block",
            backgroundImage: `url(${LQIP[role]})`,
            backgroundSize: "cover",
          }}
        />
      ) : (
        <SigilTile role={role} style={{ width: "100%", aspectRatio: "1", fontSize: width * 0.2 }} />
      )}
      <div className="serif" style={{ fontWeight: 700, fontSize: nameSize, lineHeight: 1.15, color: "var(--parchment)" }}>
        {info.name}
      </div>
      {showFlavor && (
        <div
          className="serif"
          style={{
            fontStyle: "italic",
            fontSize: Math.max(11, Math.round(width * 0.062)),
            lineHeight: 1.4,
            color: "var(--parchment-75)",
          }}
        >
          {info.flavor}
        </div>
      )}
      <div className={`chip ${evil ? "evil" : "good"}`} style={{ marginTop: "auto" }}>
        {evil ? "◆ MORDRED'S" : "◯ LOYAL"}
        {suffix ? ` · ${suffix}` : ""}
      </div>
    </div>
  );
}

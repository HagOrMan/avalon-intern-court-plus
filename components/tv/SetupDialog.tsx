"use client";

/** A setting's choice, with what it means at the table. */
export interface SetupOption<K extends string = string> {
  key: K;
  label: string;
  text: string;
}

/**
 * What the Setup dialog shows: one setting's current meaning ("info"), or every option of a
 * multi-way setting to pick from ("choose").
 */
export type SetupDialogState =
  | { kind: "info"; title: string; current: string; text: string; note?: string }
  | {
      kind: "choose";
      title: string;
      options: SetupOption[];
      selected: string;
      note?: string;
      onPick: (key: string) => void;
    };

/** The ⓘ beside a setting's label. */
export function InfoDot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`About ${label}`}
      style={{
        width: 30,
        height: 30,
        marginLeft: 12,
        borderRadius: "50%",
        border: "1px solid rgba(201,162,75,0.6)",
        color: "var(--gold)",
        font: "italic 600 20px/1 var(--font-serif)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        flex: "none",
      }}
    >
      i
    </button>
  );
}

/** Covers the Setup screen (it renders inside the 1920×1080 stage). Click outside to close. */
export function SetupDialog({ state, onClose }: { state: SetupDialogState; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "rgba(7,8,15,0.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 1040,
          maxHeight: 940,
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid rgba(201,162,75,0.6)",
          padding: 48,
          display: "grid",
          gap: 22,
        }}
      >
        <div className="serif" style={{ font: "700 46px var(--font-serif)", color: "var(--gold)" }}>
          {state.title}
        </div>
        {state.kind === "info" ? (
          <>
            <div
              style={{
                justifySelf: "start",
                font: "600 22px var(--font-body)",
                letterSpacing: "0.08em",
                color: "var(--ground)",
                background: "var(--gold)",
                padding: "6px 16px",
              }}
            >
              {state.current}
            </div>
            <div style={{ font: "400 28px/1.5 var(--font-body)", color: "var(--parchment)" }}>{state.text}</div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {state.options.map((o) => {
              const picked = o.key === state.selected;
              return (
                <button
                  key={o.key}
                  onClick={() => {
                    if (!picked) state.onPick(o.key);
                    onClose();
                  }}
                  style={{
                    textAlign: "left",
                    display: "grid",
                    gap: 8,
                    padding: "18px 24px",
                    border: `${picked ? 2 : 1}px solid ${picked ? "var(--gold)" : "rgba(237,230,214,0.25)"}`,
                    background: picked ? "rgba(201,162,75,0.12)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      font: "600 24px var(--font-body)",
                      letterSpacing: "0.08em",
                      color: picked ? "var(--gold)" : "var(--parchment)",
                    }}
                  >
                    {picked ? "✓ " : ""}
                    {o.label}
                  </span>
                  <span style={{ font: "400 24px/1.45 var(--font-body)", color: "var(--parchment-75)" }}>
                    {o.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {state.note && (
          <div style={{ font: "400 22px/1.5 var(--font-body)", color: "var(--parchment-55)" }}>{state.note}</div>
        )}
        <button
          onClick={onClose}
          style={{
            justifySelf: "start",
            font: "600 22px var(--font-body)",
            letterSpacing: "0.08em",
            color: "rgba(237,230,214,0.7)",
            border: "1px solid rgba(237,230,214,0.3)",
            padding: "8px 20px",
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

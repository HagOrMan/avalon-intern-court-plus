"use client";

import { useEffect, useState } from "react";
import { TvApp } from "@/components/tv/TvApp";

interface HostCreds {
  code: string;
  hostToken: string;
}

export default function HostPage() {
  const [creds, setCreds] = useState<HostCreds | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not raise a court");
        return;
      }
      const next = { code: body.code, hostToken: body.hostToken };
      localStorage.setItem("court:host", JSON.stringify(next));
      setCreds(next);
    } catch {
      setError("Could not reach the realm — check the connection.");
    }
  };

  useEffect(() => {
    // ?code=…&hostToken=… hands this screen a room created elsewhere (scripts/playtest.mjs).
    // The token is a host credential, so it leaves the address bar before anyone copies the link.
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    const urlToken = params.get("hostToken");
    if (urlCode && urlToken) {
      const handed = { code: urlCode.toUpperCase(), hostToken: urlToken };
      try {
        localStorage.setItem("court:host", JSON.stringify(handed));
      } catch {}
      params.delete("code");
      params.delete("hostToken");
      const rest = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash
      );
      setCreds(handed);
      return;
    }
    try {
      const raw = localStorage.getItem("court:host");
      if (raw) {
        setCreds(JSON.parse(raw));
        return;
      }
    } catch {}
    createRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <main className="tv-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 16 }}>
          <div className="serif" style={{ font: "600 32px var(--font-serif)" }}>{error}</div>
          <button className="btn-gold" onClick={createRoom}>
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!creds) {
    return (
      <main className="tv-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="kicker flame" style={{ color: "var(--gold)" }}>Raising the court…</div>
      </main>
    );
  }
  return (
    <TvApp
      code={creds.code}
      hostToken={creds.hostToken}
      onRoomLost={() => {
        localStorage.removeItem("court:host");
        setCreds(null);
        createRoom();
      }}
    />
  );
}

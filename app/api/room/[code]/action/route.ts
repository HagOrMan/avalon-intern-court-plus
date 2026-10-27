import { NextRequest, NextResponse } from "next/server";
import {
  GameError,
  ackAssassinationReveal,
  ackQuestReveal,
  ackVoteReveal,
  assassinate,
  beginCourt,
  playAgain,
  playerReady,
  playQuestCard,
  propose,
  removePlayer,
  startSetup,
  updateConfig,
  vote,
} from "@/lib/engine";
import { mutateRoom } from "@/lib/store";
import type { GameState } from "@/lib/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toUpperCase();
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new GameError("Malformed request");
    const token: string = body.token;
    const action: string = body.action;
    if (!token || !action) throw new GameError("Malformed request");

    await mutateRoom(code, (s: GameState) => {
      const isHost = token === s.hostToken;
      const player = s.players.find((p) => p.token === token);

      if (isHost) {
        switch (action) {
          case "startSetup":
            return startSetup(s);
          case "updateConfig":
            return updateConfig(s, body.config ?? {});
          case "beginCourt":
            return beginCourt(s);
          case "backToLobby":
            if (s.phase !== "setup") throw new GameError("Not in setup");
            return { ...s, phase: "lobby" as const };
          case "kick":
            return removePlayer(s, body.playerId);
          case "ack":
            if (s.phase === "voteReveal") return ackVoteReveal(s);
            if (s.phase === "questReveal") return ackQuestReveal(s);
            if (s.phase === "assassinationReveal") return ackAssassinationReveal(s);
            return s; // stale ack after an auto-advance — harmless
          case "playAgain":
          case "restart":
            return playAgain(s);
          default:
            throw new GameError("Unknown host action");
        }
      }

      if (!player) throw new GameError("You are not seated at this court");
      switch (action) {
        case "ready":
          return playerReady(s, player.id);
        case "leave":
          return removePlayer(s, player.id);
        case "propose":
          return propose(s, player.id, body.team ?? []);
        case "vote":
          return vote(s, player.id, body.vote);
        case "questCard":
          return playQuestCard(s, player.id, body.card);
        case "assassinate":
          return assassinate(s, player.id, body.targetId);
        default:
          throw new GameError("Unknown action");
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GameError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createRoom, GameError } from "@/lib/engine";
import { getStore } from "@/lib/store";
import { ROOM_CREATE_LIMIT, ROOM_CREATE_WINDOW_MS, randomCode } from "@/lib/rules";

export async function POST(req: NextRequest) {
  const store = getStore();
  // Vercel sets x-forwarded-for to the real client IP; a whole office on one network shares a budget
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await store.rateLimit(`create:${ip}`, ROOM_CREATE_LIMIT, ROOM_CREATE_WINDOW_MS, Date.now()))) {
    return NextResponse.json(
      { error: "Too many courts raised from here — wait a few minutes and try again" },
      { status: 429 }
    );
  }
  const hostToken = crypto.randomUUID();
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const state = createRoom(code, hostToken);
    if (await store.create(code, state)) {
      return NextResponse.json({ code, hostToken });
    }
  }
  return NextResponse.json(
    { error: new GameError("Could not seat a new court — try again").message },
    { status: 500 }
  );
}

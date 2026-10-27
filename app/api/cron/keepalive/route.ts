import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Invoked daily by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when that env var is set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const now = Date.now();
    const backend = await getStore().keepAlive(now);
    return NextResponse.json({ ok: true, backend, at: now });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

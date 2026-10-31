import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredScenes } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredScenes();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scene cleanup failed", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) return false;

  const expected = `Bearer ${secret}`;
  const received = Buffer.from(header);
  const actual = Buffer.from(expected);
  if (received.length !== actual.length) return false;
  return timingSafeEqual(received, actual);
}

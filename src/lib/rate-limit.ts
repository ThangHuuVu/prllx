type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [entryKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(entryKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function clientIp(headerList: Headers): string {
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);

  const vercelForwarded = headerList.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);
    if (last) return last.slice(0, 128);
  }

  return "unknown";
}

export const SCENE_READ_LIMIT = 60;
export const SCENE_READ_WINDOW_MS = 60_000;

export function limitSceneRead(headerList: Headers): RateLimitResult {
  if (process.env.NODE_ENV === "development") {
    return { ok: true };
  }
  return rateLimit(
    `scene-read:${clientIp(headerList)}`,
    SCENE_READ_LIMIT,
    SCENE_READ_WINDOW_MS,
  );
}

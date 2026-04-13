import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Redis-backed limits via Upstash (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 * Without those env vars, a per-process memory limiter runs (fine for local dev; use Upstash in production
 * so all serverless instances share one counter).
 */
export class RepeatRateLimitError extends Error {
  constructor(message = "Too many requests. Try again shortly.") {
    super(message);
    this.name = "RepeatRateLimitError";
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function isUpstashRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Best-effort client IP for rate limiting (trust your reverse proxy / Vercel headers only). */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

class MemorySlidingWindow {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  async allow(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let stamps = this.hits.get(key) ?? [];
    stamps = stamps.filter((t) => t > windowStart);
    if (stamps.length >= this.max) {
      this.hits.set(key, stamps);
      return false;
    }
    stamps.push(now);
    this.hits.set(key, stamps);
    if (this.hits.size > 25_000) this.prune(windowStart);
    return true;
  }

  private prune(windowStart: number) {
    for (const [k, stamps] of this.hits) {
      const next = stamps.filter((t) => t > windowStart);
      if (next.length === 0) this.hits.delete(k);
      else this.hits.set(k, next);
    }
  }
}

function createUpstashLimiter(prefix: string, maxPerMinute: number) {
  const redis = Redis.fromEnv();
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxPerMinute, "1 m"),
    prefix,
    analytics: false,
  });
}

const ipPerMin = () => envInt("REPEAT_RATE_LIMIT_IP_PER_MIN", 200);
const userGeneralPerMin = () => envInt("REPEAT_RATE_LIMIT_USER_GENERAL_PER_MIN", 100);
const userQueryPerMin = () => envInt("REPEAT_RATE_LIMIT_USER_QUERY_PER_MIN", 24);
const trackingIpPerMin = () => envInt("PROFILE_TRACKING_RATE_LIMIT_IP_PER_MIN", 90);
const trackingUserPerMin = () => envInt("PROFILE_TRACKING_RATE_LIMIT_USER_PER_MIN", 60);

let upstashRepeatIp: Ratelimit | null = null;
let upstashRepeatUserGeneral: Ratelimit | null = null;
let upstashRepeatUserQuery: Ratelimit | null = null;
let upstashTrackingIp: Ratelimit | null = null;
let upstashTrackingUser: Ratelimit | null = null;

let memRepeatIp: MemorySlidingWindow | null = null;
let memRepeatUserGeneral: MemorySlidingWindow | null = null;
let memRepeatUserQuery: MemorySlidingWindow | null = null;
let memTrackingIp: MemorySlidingWindow | null = null;
let memTrackingUser: MemorySlidingWindow | null = null;

function minuteMs() {
  return 60_000;
}

export async function assertRepeatApiIpLimit(request: Request): Promise<void> {
  const ip = getRequestIp(request);
  const key = `ip:${ip}`;
  if (isUpstashRedisConfigured()) {
    if (!upstashRepeatIp) {
      upstashRepeatIp = createUpstashLimiter("ratelimit:repeat:ip", ipPerMin());
    }
    const { success } = await upstashRepeatIp.limit(key);
    if (!success) throw new RepeatRateLimitError();
    return;
  }
  if (!memRepeatIp) memRepeatIp = new MemorySlidingWindow(ipPerMin(), minuteMs());
  if (!(await memRepeatIp.allow(key))) throw new RepeatRateLimitError();
}

export async function assertRepeatUserGeneralLimit(userId: string): Promise<void> {
  const key = `user:${userId}`;
  if (isUpstashRedisConfigured()) {
    if (!upstashRepeatUserGeneral) {
      upstashRepeatUserGeneral = createUpstashLimiter(
        "ratelimit:repeat:user:general",
        userGeneralPerMin()
      );
    }
    const { success } = await upstashRepeatUserGeneral.limit(key);
    if (!success) throw new RepeatRateLimitError();
    return;
  }
  if (!memRepeatUserGeneral) {
    memRepeatUserGeneral = new MemorySlidingWindow(userGeneralPerMin(), minuteMs());
  }
  if (!(await memRepeatUserGeneral.allow(key))) throw new RepeatRateLimitError();
}

export async function assertRepeatUserQueryLimit(userId: string): Promise<void> {
  const key = `user:${userId}`;
  if (isUpstashRedisConfigured()) {
    if (!upstashRepeatUserQuery) {
      upstashRepeatUserQuery = createUpstashLimiter(
        "ratelimit:repeat:user:query",
        userQueryPerMin()
      );
    }
    const { success } = await upstashRepeatUserQuery.limit(key);
    if (!success) throw new RepeatRateLimitError();
    return;
  }
  if (!memRepeatUserQuery) {
    memRepeatUserQuery = new MemorySlidingWindow(userQueryPerMin(), minuteMs());
  }
  if (!(await memRepeatUserQuery.allow(key))) throw new RepeatRateLimitError();
}

export async function assertProfileTrackingIpLimit(request: Request): Promise<void> {
  const ipKey = `ip:${getRequestIp(request)}`;

  if (isUpstashRedisConfigured()) {
    if (!upstashTrackingIp) {
      upstashTrackingIp = createUpstashLimiter("ratelimit:profile:ip", trackingIpPerMin());
    }
    const { success } = await upstashTrackingIp.limit(ipKey);
    if (!success) throw new RepeatRateLimitError();
    return;
  }

  if (!memTrackingIp) memTrackingIp = new MemorySlidingWindow(trackingIpPerMin(), minuteMs());
  if (!(await memTrackingIp.allow(ipKey))) throw new RepeatRateLimitError();
}

export async function assertProfileTrackingUserLimit(userId: string): Promise<void> {
  const userKey = `user:${userId}`;

  if (isUpstashRedisConfigured()) {
    if (!upstashTrackingUser) {
      upstashTrackingUser = createUpstashLimiter("ratelimit:profile:user", trackingUserPerMin());
    }
    const { success } = await upstashTrackingUser.limit(userKey);
    if (!success) throw new RepeatRateLimitError();
    return;
  }

  if (!memTrackingUser) memTrackingUser = new MemorySlidingWindow(trackingUserPerMin(), minuteMs());
  if (!(await memTrackingUser.allow(userKey))) throw new RepeatRateLimitError();
}

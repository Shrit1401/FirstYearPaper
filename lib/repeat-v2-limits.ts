import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getRequestIp } from "./repeat-rate-limit";
import { RepeatV2Error } from "./repeat-v2-store";

const recent = new Map<string, number[]>();
let distributed: Ratelimit | undefined;
let localFallbackUntil = 0;

function allowLocalRequest(key: string) {
  const cutoff = Date.now() - 60_000;
  const hits = (recent.get(key) ?? []).filter((time) => time > cutoff);
  const allowed = hits.length < 8;
  if (allowed) hits.push(Date.now());
  recent.set(key, hits);
  if (recent.size > 10_000) {
    for (const [ip, times] of recent) {
      if (!times.some((time) => time > cutoff)) recent.delete(ip);
    }
  }
  return allowed;
}

function limiterFailureReason(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/unauthori[sz]ed|wrongpass|invalid.*token|authentication|forbidden/i.test(message)) return "authentication failed";
  if (/timeout|aborted/i.test(message)) return "connection timed out";
  if (/fetch failed|network|ENOTFOUND|ECONN/i.test(message)) return "connection failed";
  if (/invalid.*url|missing.*url|configuration/i.test(message)) return "invalid configuration";
  return "service error";
}

/** Existing trusted-proxy IP convention, with a shared Redis counter when configured. */
export async function assertRepeatV2SolveLimit(request: Request) {
  const key = getRequestIp(request);
  let allowed: boolean;
  const isDevelopment = process.env.NODE_ENV === "development";
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && !(isDevelopment && Date.now() < localFallbackUntil)) {
    try {
      distributed ??= new Ratelimit({
        redis: Redis.fromEnv({ retry: false, signal: () => AbortSignal.timeout(2_000) }),
        limiter: Ratelimit.slidingWindow(8, "1 m"),
        prefix: "ratelimit:repeat:v2:solve",
        analytics: false,
        // The library's default timeout permits requests. Production must fail
        // closed, so the Redis request signal controls the timeout instead.
        timeout: 0,
      });
      allowed = (await distributed.limit(key)).success;
    } catch (error) {
      const reason = limiterFailureReason(error);
      if (!isDevelopment) {
        console.warn(`[Repeat] Shared request limiter unavailable: ${reason}.`);
        throw new RepeatV2Error("The teacher's request limit service is temporarily unavailable. Please try again shortly.", "rate_limit_unavailable", 503);
      }
      localFallbackUntil = Date.now() + 60_000;
      console.warn(`[Repeat] Shared request limiter unavailable: ${reason}. Using the local development limit for one minute.`);
      allowed = allowLocalRequest(key);
    }
  } else {
    allowed = allowLocalRequest(key);
  }
  if (!allowed) {
    throw new RepeatV2Error("You have asked for several solutions recently. Please wait a minute and try again.", "rate_limit", 429);
  }
}

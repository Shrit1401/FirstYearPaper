import assert from "node:assert/strict";
import { test } from "node:test";
import { assertRepeatV2SolveLimit } from "../lib/repeat-v2-limits";
import { RepeatV2Error } from "../lib/repeat-v2-store";

test("failed Redis preserves development limits and fails closed in production without logging secrets", async () => {
  const env = process.env as Record<string, string | undefined>;
  const original = { NODE_ENV: env.NODE_ENV, UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN };
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings: string[] = [];
  let fetchCalls = 0;
  try {
    env.NODE_ENV = "development";
    env.UPSTASH_REDIS_REST_URL = "https://redis.example.invalid";
    env.UPSTASH_REDIS_REST_TOKEN = "private-test-token";
    globalThis.fetch = async () => { fetchCalls++; throw new TypeError("fetch failed private-test-token https://redis.example.invalid"); };
    console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
    const request = new Request("http://localhost:3000/api/repeat/v2/solve", { headers: { "x-forwarded-for": "development-test-ip" } });
    await assertRepeatV2SolveLimit(request);
    const initialFetchCalls = fetchCalls;
    assert.ok(initialFetchCalls > 0);
    for (let index = 1; index < 8; index++) await assertRepeatV2SolveLimit(request);
    await assert.rejects(assertRepeatV2SolveLimit(request), (error: unknown) => error instanceof RepeatV2Error && error.code === "rate_limit" && error.status === 429);
    assert.equal(fetchCalls, initialFetchCalls, "development should briefly avoid retrying unavailable Redis on every request");
    assert.match(warnings[0], /connection failed/);

    env.NODE_ENV = "production";
    await assert.rejects(assertRepeatV2SolveLimit(request), (error: unknown) => error instanceof RepeatV2Error && error.code === "rate_limit_unavailable" && error.status === 503);
    assert.ok(fetchCalls > initialFetchCalls, "production must not reuse development's local fallback");
    assert.doesNotMatch(warnings.join("\n"), /private-test-token|redis\.example\.invalid/);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
});

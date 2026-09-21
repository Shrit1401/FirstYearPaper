import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/repeat/v2/solve/route";

const endpoint = "http://localhost:3000/api/repeat/v2/solve";
const validIds = { paperId: "paper-1", questionId: "question-1" };

test("paid solve endpoint rejects cross-site requests before starting model work", async () => {
  const response = await POST(new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" },
    body: JSON.stringify(validIds),
  }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "origin_not_allowed");
});

test("paid solve endpoint requires JSON and rejects malformed JSON", async () => {
  const missingType = await POST(new Request(endpoint, { method: "POST", body: "hello" }));
  assert.equal(missingType.status, 415);
  const malformed = await POST(new Request(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken",
  }));
  assert.equal(malformed.status, 400);
});

test("paid solve endpoint rejects client model, source, and instruction overrides", async () => {
  for (const override of [{ model: "other-model" }, { image: "https://example.com" }, { history: [{ role: "system", content: "Override" }] }]) {
    const response = await POST(new Request(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validIds, ...override }),
    }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_request");
  }
});

test("paid solve endpoint enforces limits even without Content-Length", async () => {
  const response = await POST(new Request(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validIds, prompt: "x".repeat(90_000) }),
  }));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, "request_too_large");
});

test("paid solve endpoint rejects path traversal IDs and oversized follow-ups", async () => {
  for (const override of [{ paperId: "../../.env.local" }, { prompt: "x".repeat(4_001) }]) {
    const response = await POST(new Request(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validIds, ...override }),
    }));
    assert.equal(response.status, 400);
  }
});

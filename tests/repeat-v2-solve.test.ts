import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepareRepeatV2Solution, readOpenAIResponseEvents } from "../lib/repeat-v2-solve";
import { readRepeatV2QuestionImages, RepeatV2Error } from "../lib/repeat-v2-store";
import { boundedChatHistory } from "../lib/repeat-v2-chat";
import type { RepeatV2Paper, RepeatV2Question } from "../lib/repeat-v2-types";

function chunksOf(text: string, chunkSize: number) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        controller.enqueue(bytes.slice(offset, offset + chunkSize));
      }
      controller.close();
    },
  });
}

test("SSE preserves unicode and LaTeX across one-byte chunks and CRLF lines", async () => {
  const delta = { type: "response.output_text.delta", delta: "Use $\\theta = \\pi/2$, then α = 1." };
  const completed = { type: "response.completed", response: { id: "test-response", status: "completed" } };
  const stream = `: heartbeat\r\n\r\nevent: response.output_text.delta\r\ndata: ${JSON.stringify(delta)}\r\n\r\ndata: ${JSON.stringify(completed)}\r\n\r\ndata: [DONE]\r\n\r\n`;
  const result = [];
  for await (const event of readOpenAIResponseEvents(chunksOf(stream, 1))) result.push(event);
  assert.deepEqual(result, [delta, completed]);
});

test("SSE flushes a final event without a trailing blank line", async () => {
  const result = [];
  for await (const event of readOpenAIResponseEvents(chunksOf('data: {"type":"response.incomplete"}', 7))) result.push(event);
  assert.deepEqual(result, [{ type: "response.incomplete" }]);
});

test("SSE refuses corrupt upstream data", async () => {
  await assert.rejects(async () => {
    for await (const event of readOpenAIResponseEvents(chunksOf("data: broken-json\n\n", 4))) void event;
  }, (error: unknown) => error instanceof RepeatV2Error && error.code === "stream_invalid");
});

test("SSE cancels its upstream reader when the consumer stops", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"response.completed"}\n\n')); },
    cancel() { cancelled = true; },
  });
  for await (const event of readOpenAIResponseEvents(body)) {
    assert.equal(event.type, "response.completed");
    break;
  }
  assert.equal(cancelled, true);
});

const fixtureName = `__solver-tests-${process.pid}`;
const fixtureRoot = path.join(process.cwd(), "public", "repeat-v2", "assets", fixtureName);
const fixtureSrc = `/repeat-v2/assets/${fixtureName}/source.png`;
const fixtureBytes = Buffer.from("exact-source-image-bytes");
const question: RepeatV2Question = {
  id: "question-1", number: "1(a)", markdown: "Evaluate $\\int_0^1 x^2\\,dx$.", marks: 4,
  pageNumbers: [1], diagrams: [], sourceImages: [{ src: fixtureSrc, pageNumber: 1 }],
  confidence: "medium", reviewNotes: ["Confirm the upper limit in the scan."],
};
const paper: RepeatV2Paper = {
  id: "paper-1", name: "Mathematics", academicYear: 1, semester: "1", branch: "Common",
  examType: "Endsem", subject: "Mathematics", examYear: 2025, href: "/test.pdf",
  sourceFiles: [], memberships: [], pageCount: 1, questionCount: 1, status: "complete",
  pages: [{ number: 1, image: fixtureSrc, width: 100, height: 100, method: "test", status: "complete" }],
  questions: [question], warnings: [],
};
const originalKey = process.env.OPENAI_API_KEY;
const originalAssetBase = process.env.REPEAT_ASSET_BASE_URL;
const originalVercelUrl = process.env.VERCEL_URL;
const originalLocalAssetRoot = process.env.REPEAT_LOCAL_ASSET_ROOT;

before(async () => {
  delete process.env.REPEAT_ASSET_BASE_URL;
  delete process.env.VERCEL_URL;
  process.env.REPEAT_LOCAL_ASSET_ROOT = path.dirname(fixtureRoot);
  await mkdir(fixtureRoot, { recursive: true });
  await writeFile(path.join(fixtureRoot, "source.png"), fixtureBytes);
});

after(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
  for (const [key, value] of Object.entries({ OPENAI_API_KEY: originalKey, REPEAT_ASSET_BASE_URL: originalAssetBase, VERCEL_URL: originalVercelUrl, REPEAT_LOCAL_ASSET_ROOT: originalLocalAssetRoot })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("question sources attach original bytes and deduplicate matching diagram references", async () => {
  const images = await readRepeatV2QuestionImages(paper, {
    ...question, diagrams: [{ id: "figure-1", src: fixtureSrc, pageNumber: 1, caption: "Original graph" }],
  });
  assert.equal(images.length, 1);
  assert.equal(images[0].imageUrl, `data:image/png;base64,${fixtureBytes.toString("base64")}`);
});

test("the exact paper page is attached when question crops are missing", async () => {
  const images = await readRepeatV2QuestionImages(paper, { ...question, sourceImages: [] });
  assert.equal(images.length, 1);
  assert.equal(images[0].kind, "Original paper page");
});

test("self-hosted source loading works without an explicit asset directory setting", async () => {
  const configured = process.env.REPEAT_LOCAL_ASSET_ROOT;
  delete process.env.REPEAT_LOCAL_ASSET_ROOT;
  try {
    const images = await readRepeatV2QuestionImages(paper, question);
    assert.equal(images[0].imageUrl, `data:image/png;base64,${fixtureBytes.toString("base64")}`);
  } finally {
    if (configured !== undefined) process.env.REPEAT_LOCAL_ASSET_ROOT = configured;
  }
});

test("source loading rejects external URLs and paths outside the scan archive", async () => {
  for (const src of ["https://example.com/image.png", "/repeat-v2/assets/../../.env.local", "/repeat-v2/assets/../../../secret.png"]) {
    await assert.rejects(
      readRepeatV2QuestionImages(paper, { ...question, sourceImages: [{ src, pageNumber: 1 }] }),
      (error: unknown) => error instanceof RepeatV2Error && error.code === "source_unavailable",
    );
  }
});

test("source loading rejects a symlink outside the scan archive", async () => {
  await symlink(path.join(process.cwd(), "package.json"), path.join(fixtureRoot, "outside.png"));
  await assert.rejects(
    readRepeatV2QuestionImages(paper, { ...question, sourceImages: [{ src: `/repeat-v2/assets/${fixtureName}/outside.png`, pageNumber: 1 }] }),
    (error: unknown) => error instanceof RepeatV2Error && error.code === "source_unavailable",
  );
});

test("teacher context includes scans, uncertainty, follow-up history and math instructions", async () => {
  process.env.OPENAI_API_KEY = "test-server-only-key";
  const prepared = await prepareRepeatV2Solution(paper, question, {
    paperId: paper.id, questionId: question.id, prompt: "Why do we add one to the power?",
    history: [{ role: "assistant", content: "Use the power rule." }],
  });
  assert.equal(prepared.body.store, false);
  assert.equal(prepared.body.stream, true);
  assert.match(prepared.body.instructions, /KaTeX/);
  assert.match(prepared.body.instructions, /Do not invent anything the source does not contain/);
  assert.match(JSON.stringify(prepared.body.input[0]), /Confirm the upper limit/);
  assert.match(JSON.stringify(prepared.body.input[0]), /input_image/);
  assert.equal(prepared.body.input[1].content, "Use the power rule.");
  assert.equal(prepared.body.input[2].content, "Why do we add one to the power?");
  assert.doesNotMatch(JSON.stringify(prepared.body), /test-server-only-key/);
  assert.equal(await readFile(path.join(fixtureRoot, "source.png"), "utf8"), fixtureBytes.toString());
});

test("missing credentials produce a helpful configuration error", async () => {
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(prepareRepeatV2Solution(paper, question, { paperId: paper.id, questionId: question.id }),
    (error: unknown) => error instanceof RepeatV2Error && error.code === "solver_unconfigured" && error.status === 503);
});

test("history keeps the latest12 turns without modifying the visible conversation", () => {
  const turns = Array.from({ length: 16 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `Turn ${index}` }));
  const snapshot = JSON.stringify(turns);
  const result = boundedChatHistory(turns);
  assert.equal(result.length, 12);
  assert.equal(result[0].content, "Turn 4");
  assert.equal(result.at(-1)?.content, "Turn 15");
  assert.equal(JSON.stringify(turns), snapshot);
});

test("history caps each turn at16000 characters and omits blank messages", () => {
  const turns = [{ role: "user" as const, content: "a".repeat(17_000) }, { role: "assistant" as const, content: " \n " }, { role: "assistant" as const, content: "b".repeat(17_000) }];
  const result = boundedChatHistory(turns);
  assert.deepEqual(result.map((turn) => turn.content.length), [16_000, 16_000]);
  assert.equal(turns[0].content.length, 17_000);
});

test("history enforces48000 UTF8 bytes including JSON overhead and multibyte text", () => {
  const turns = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" as const : "user" as const, content: `${index}: ${"数学".repeat(4_000)}` }));
  const result = boundedChatHistory(turns);
  assert.ok(new TextEncoder().encode(JSON.stringify(result)).length <= 48_000);
  assert.ok(result.length < turns.length);
  assert.equal(result.at(-1)?.content, turns.at(-1)?.content);
});

test("history removes an orphaned leading answer when student context is available", () => {
  const result = boundedChatHistory([
    { role: "assistant", content: "An earlier answer" },
    { role: "user", content: "Explain the derivative" },
    { role: "assistant", content: "Use the power rule" },
  ]);
  assert.equal(result[0].role, "user");
  assert.equal(result.length, 2);
  assert.deepEqual(boundedChatHistory([{ role: "assistant", content: "Only available answer" }]), [{ role: "assistant", content: "Only available answer" }]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { getPublicBrowsePaths } from "../lib/public-paper-routes";

// Next requires this export to be a static literal. Read only that literal so
// these routing tests do not need to initialize the server-only auth SDK.
const proxySource = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
const config = runInNewContext(`(${proxySource.match(/export const config = (\{[\s\S]*?\n\});/)![1]})`);

test("public browsing and static app assets do not invoke middleware", () => {
  for (const url of [
    "/", "/browse", "/browse/Year%202/Semester%203/EnC",
    "/midsem?branch=ECE", "/editable/0123456789abcdef",
    "/api/archive/repeat-v2/assets/page-1.jpg", "/repeat-v2/assets/paper/page-1.jpg",
    "/_next/static/example.js", "/vendor/pdf-viewer/web/viewer.html",
  ]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, url }), false, url);
  }
});

test("account, payment, AI and analytics routes keep their middleware protection", () => {
  for (const url of [
    "/auth", "/profile", "/repeat", "/repeat/library",
    "/repeat/payment", "/repeat/payment/thank-you", "/api/auth",
    "/api/repeat/query", "/api/repeat/v2/solve",
    "/analytics", "/analytics/chat", "/api/analytics/repeat-learning-logs",
  ]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, url }), true, url);
  }
});

test("prebuilt browse pages include EnC maths, original archives and imported midsems", () => {
  const paths = new Set(getPublicBrowsePaths().map(p => p.join("/")));
  for (const route of [
    "Year 2/Semester 3/EnC/REGULAR/ECM 2122",
    "Year 2/Semester 3/Shared subjects/REGULAR/MAT 2122",
    "Year 2/Semester 3/Shared subjects/MAKEUP/MAT 2122",
    "Year 2/Semester 3/CSE/MIDSEM", "Year 2/Semester 3/ECE/MIDSEM",
    "Year 2/Semester 4", "Year 1",
  ]) assert.ok(paths.has(route), route);
});

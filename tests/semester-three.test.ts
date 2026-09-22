import assert from "node:assert/strict";
import test from "node:test";
import { getBranches, getExamTypes, getSubjectsList, getSemesters } from "../lib/papers";
import catalog from "../public/midsem/second-year-index.json";
import repeat from "../public/repeat-v2/index.json";
import review from "../scripts/second-year-midsem-review.json";
import assets from "../lib/convex-asset-map.json";

test("second-year browsing contains only the new CSE and ECE midsems", () => {
  assert.deepEqual(getSemesters("Year 2"), ["Semester 3"]);
  assert.deepEqual(getBranches("Year 2", "Semester 3"), ["CSE", "ECE"]);
  const hrefs = [];
  for (const branch of ["CSE", "ECE"]) {
    assert.deepEqual(getExamTypes("Year 2", "Semester 3", branch), ["MIDSEM"]);
    hrefs.push(...getSubjectsList("Year 2", "Semester 3", branch, "MIDSEM").flatMap(s => s.papers.map(p => p.href)));
    assert.deepEqual(getSubjectsList("Year 2", "Semester 3", branch, "ENDSEM"), []);
  }
  assert.deepEqual(hrefs.sort(), catalog.papers.flatMap(p => p.files.map(f => f.href)).sort());
});

test("all 37 reviewed sources are accounted for once with honest document types", () => {
  const sources = catalog.papers.flatMap(p => p.sources);
  assert.equal(catalog.papers.length, 25);
  assert.equal(sources.length, 37);
  assert.equal(new Set(sources.map(s => s.sha256)).size, 37);
  assert.equal(sources.reduce((n, s) => n + s.pageCount, 0), 275);
  assert.deepEqual(Object.fromEntries(["question", "solutions", "combined"].map(kind => [kind, sources.filter(s => s.kind === kind).length])), { question: 17, solutions: 12, combined: 8 });
  assert.deepEqual(sources.map(s => s.sha256).sort(), review.papers.flatMap(p => p.sources.map(s => s.sha256)).sort());
  const maths = catalog.papers.find(p => p.id === "mat-2126-2023")!;
  assert.equal(maths.files.length, 1);
  assert.equal(maths.files[0].pageCount, 3);
  const solutionOnly = catalog.papers.find(p => p.id === "mat-2152-undated")!;
  assert.deepEqual(solutionOnly.files.map(f => f.kind), ["solutions"]);
  assert.match(solutionOnly.notes, /Question paper not supplied/);
});

test("every imported paper and original source has a hosted asset", () => {
  const map = assets as Record<string, { sha256: string; url: string }>;
  for (const paper of catalog.papers) {
    for (const file of paper.files) assert.ok(map[file.href]?.url, file.href);
    for (const source of paper.sources) assert.equal(map[source.href]?.sha256, source.sha256);
  }
});

test("Repeat does not list second-year endsems or endsem-derived sets", () => {
  const secondYear = repeat.papers.filter(p => p.academicYear === 2);
  assert.ok(secondYear.length > 0);
  for (const paper of secondYear) {
    assert.equal(paper.examType, "MIDSEM");
    assert.ok(!paper.id.endsWith("-ensemble"));
  }
});

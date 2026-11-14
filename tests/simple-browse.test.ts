import assert from "node:assert/strict";
import test from "node:test";
import index from "../lib/simple-index.json";
import {
  FULL_ARCHIVE_BRANCHES,
  FULL_ARCHIVE_SUBJECTS,
  MAX_PAPERS,
  allPapers,
  YEAR_TWO_BRANCHES,
  YEAR_TWO_SEMESTERS,
  getSimpleBrowsePaths,
  getYearOneSubjects,
  getYearTwoBranchGroups,
  getYearTwoSubject,
  isVisiblePaper,
  type SimplePaper,
} from "../lib/simple-browse";

function checkList(where: string, papers: SimplePaper[], full = false) {
  assert.ok(papers.length > 0, `${where}: empty`);
  assert.equal(new Set(papers.map((p) => p.href)).size, papers.length, `${where}: duplicate paper`);
  const dates = papers.map((p) => p.date ?? "");
  assert.deepEqual(dates, [...dates].sort().reverse(), `${where}: not newest first`);
  if (full) {
    for (const p of papers) assert.ok(isVisiblePaper(p), `${where}: hidden exam type shown`);
    return;
  }
  assert.ok(papers.length <= MAX_PAPERS, `${where}: more than ${MAX_PAPERS} papers`);
  for (const p of papers) {
    assert.ok(isVisiblePaper(p), `${where}: hidden exam type shown`);
    assert.ok(p.kind === "Question paper" || p.kind === "Paper + solutions", `${where}: answer scheme took a slot`);
  }
}

test("every subject lists distinct papers newest first; CSE and Year 1 keep at most three", () => {
  const routes = new Set(getSimpleBrowsePaths().map((p) => p.join("/")));
  let shown = 0;
  for (const s of getYearOneSubjects()) {
    assert.ok(routes.has(`Year 1/subject/${s.slug}`));
    checkList(`Year 1/${s.slug}`, s.papers);
    shown += s.papers.length;
  }
  for (const sem of YEAR_TWO_SEMESTERS) {
    for (const b of YEAR_TWO_BRANCHES) {
      const groups = getYearTwoBranchGroups(sem, b.id);
      const codes = groups.flatMap((g) => g.subjects.map((s) => s.code));
      assert.equal(new Set(codes).size, codes.length, `${sem}/${b.id}: subject listed twice`);
      for (const s of groups.flatMap((g) => g.subjects)) {
        const full = FULL_ARCHIVE_BRANCHES.has(b.id);
        checkList(`${sem}/${b.id}/${s.code}`, s.papers, full);
        for (const o of s.olderSubjects ?? []) checkList(`${sem}/${b.id}/${s.code}/${o.code}`, o.papers, true);
        assert.ok(getYearTwoSubject(sem, b.id, s.code));
        assert.ok(routes.has(`Year 2/${sem}/${b.id}/subject/${s.code}`));
        shown += s.papers.length;
      }
    }
  }
  console.log(`simple-browse: ${shown} paper slots across all subject pages`);
});

test("CSE Semester 3 lists this year's CSS syllabus, with no OOP", () => {
  const current = getYearTwoBranchGroups("Semester 3", "CSE").find((g) => g.id === "current")!;
  assert.deepEqual(current.subjects.map((s) => s.code), ["CSS 2101", "CSS 2102", "CSS 2103", "CSS 2104", "MAT 2101"]);
  assert.ok(!current.subjects.some((s) => /object oriented/i.test(s.title)));
  for (const s of current.subjects) assert.ok(s.papers[0]!.date! >= "2025-11", `${s.code}: newest paper is old`);
});

test("ECE and EnC show every visible archived paper, with no cap", () => {
  type Raw = { code: string; papers: SimplePaper[] };
  const raw = index as unknown as { year2: Record<string, Raw[]> };
  for (const sem of YEAR_TWO_SEMESTERS) {
    const byCode = new Map(raw.year2[sem]!.map((s) => [s.code, s]));
    for (const branch of FULL_ARCHIVE_BRANCHES) {
      for (const s of getYearTwoBranchGroups(sem, branch).flatMap((g) => g.subjects)) {
        const codes = [s.code, ...(s.olderSubjects ?? []).map((o) => o.code)];
        const expected = codes.flatMap((c) => byCode.get(c)?.papers ?? []).filter(isVisiblePaper).length;
        assert.equal(allPapers(s).length, expected, `${sem}/${branch}/${s.code}: papers missing`);
      }
    }
  }
});

test("CSE DCCN shows its own papers plus every older Data Communication paper, without duplicate scans", () => {
  assert.ok(FULL_ARCHIVE_SUBJECTS["CSS 2102"]);
  const dccn = getYearTwoSubject("Semester 3", "CSE", "CSS 2102")!;
  assert.ok(dccn.papers.length >= 2);
  assert.ok(dccn.papers.every((p) => p.code === "CSS 2102"));
  const older = allPapers(dccn).filter((p) => p.code !== "CSS 2102");
  assert.ok(older.length > MAX_PAPERS, `only ${older.length} older papers`);
  const sittings = older.map((p) => `${p.code}|${p.exam}|${p.date}`);
  assert.equal(new Set(sittings).size, sittings.length, "a sitting is listed twice");
});

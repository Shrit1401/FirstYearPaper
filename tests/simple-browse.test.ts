import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PAPERS,
  YEAR_TWO_BRANCHES,
  YEAR_TWO_SEMESTERS,
  getSimpleBrowsePaths,
  getYearOneSubjects,
  getYearTwoBranchGroups,
  getYearTwoSubject,
  isVisiblePaper,
  type SimplePaper,
} from "../lib/simple-browse";

function checkList(where: string, papers: SimplePaper[]) {
  assert.ok(papers.length > 0, `${where}: empty`);
  assert.ok(papers.length <= MAX_PAPERS, `${where}: more than ${MAX_PAPERS} papers`);
  assert.equal(new Set(papers.map((p) => p.href)).size, papers.length, `${where}: duplicate paper`);
  for (const p of papers) {
    assert.ok(isVisiblePaper(p), `${where}: hidden exam type shown`);
    assert.ok(p.kind === "Question paper" || p.kind === "Paper + solutions", `${where}: answer scheme took a slot`);
  }
  const dates = papers.map((p) => p.date ?? "");
  assert.deepEqual(dates, [...dates].sort().reverse(), `${where}: not newest first`);
}

test("every subject shows at most three recent, distinct question papers", () => {
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
        checkList(`${sem}/${b.id}/${s.code}`, s.papers);
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

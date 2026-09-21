import assert from "node:assert/strict";
import test from "node:test";
import { getBranches, getExamTypes, getSubjectsList } from "../lib/papers";
import { semesterThreeBranch } from "../lib/semester-three";

test("Semester 3 separates CSE, EnC and ECE without losing original papers", () => {
  const branches = getBranches("Year 2", "Semester 3");
  assert.deepEqual(branches, ["CSE", "EnC", "ECE", "Shared subjects"]);
  for (const exam of getExamTypes("Year 2", "Semester 3", "All Programs")) {
    const original = getSubjectsList("Year 2", "Semester 3", "All Programs", exam);
    const grouped = branches.flatMap(branch => getSubjectsList("Year 2", "Semester 3", branch, exam));
    assert.deepEqual(grouped.map(s => s.name).sort(), original.map(s => s.name).sort());
    assert.deepEqual(grouped.flatMap(s => s.papers.map(p => p.href)).sort(), original.flatMap(s => s.papers.map(p => p.href)).sort());
  }
});
test("historical course prefixes stay in the correct branch, ambiguous maths remains shared", () => {
  for (const code of ["CSE 2121", "CSS 2101", "IT 2121", "ICT 2153"]) assert.equal(semesterThreeBranch(code), "CSE");
  assert.equal(semesterThreeBranch("ECM 2121"), "EnC");
  assert.equal(semesterThreeBranch("ECE 2121"), "ECE");
  assert.equal(semesterThreeBranch("MAT 2122"), "Shared subjects");
  assert.deepEqual(getBranches("Year 2", "Semester 4"), ["All Programs"]);
});

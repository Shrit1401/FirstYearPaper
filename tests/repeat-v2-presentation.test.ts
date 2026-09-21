import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPaperChoice } from "../lib/repeat-v2-presentation";
import type { RepeatV2PaperSummary } from "../lib/repeat-v2-types";

const paper: RepeatV2PaperSummary = {
  id: "paper-1", name: "2025-26 Makeup - MAT_1103 - ENGINEERING MATHEMATICS.pdf",
  academicYear: 1, semester: "Semester 1", branch: "All Programs", subject: "Engineering Mathematics",
  examYear: 2025, examType: "MAKEUP", subjectCode: "MAT 1103", href: "/paper.pdf",
  sourceFiles: [], memberships: [], pageCount: 2, questionCount: 15, status: "complete",
};

test("paper choice uses the actual metadata exam year, not the academic range in its name", () => {
  assert.deepEqual(formatPaperChoice(paper), {
    label: "2025 · Makeup · MAT 1103",
    detail: "2025-26 Makeup - MAT_1103 - Engineering Mathematics",
  });
});

test("known exam categories and separator variants get friendly names without reclassifying unknown types", () => {
  for (const [examType, expected] of [
    ["MIDSEM", "Mid semester"], ["mid-semester", "Mid semester"],
    ["ENDSEM", "End semester"], ["END_SEM", "End semester"],
    ["MAKE-UP", "Makeup"], ["REGULAR", "Regular"],
    ["INTERNAL ASSESSMENT", "Internal Assessment"],
  ]) {
    assert.equal(formatPaperChoice({ ...paper, examType }).label, `2025 · ${expected} · MAT 1103`);
  }
});

test("source detail removes wrappers but preserves course identifiers, numerals and answer-scheme distinctions", () => {
  const result = formatPaperChoice({ ...paper,
    name: " (verified) MAT 2126-MAT-2126-MAT_2155 - ENGINEERING MATHEMATICS - III (answer scheme).PDF ",
    examYear: 2023, examType: "ENDSEM", subjectCode: "MAT 2126",
  });
  assert.equal(result.label, "2023 · End semester · MAT 2126");
  assert.equal(result.detail, "MAT 2126-MAT-2126-MAT_2155 - Engineering Mathematics - III (answer scheme)");
  assert.equal(formatPaperChoice({ ...paper, name: "BI0 1071 - BIOLOGY FOR ENGINEERS", subjectCode: "BI0 1071" }).detail, "BI0 1071 - Biology For Engineers");
});

test("missing metadata is not guessed from filename dates or course codes", () => {
  const result = formatPaperChoice({ ...paper, name: "CHM-1072-CHM-05-Mar-2025", examYear: null, subjectCode: null, examType: "MIDSEM" });
  assert.equal(result.label, "Mid semester");
  assert.equal(result.detail, "CHM-1072-CHM-05-Mar-2025");
  assert.deepEqual(formatPaperChoice({ ...paper, name: "", subject: "", examYear: null, examType: "", subjectCode: undefined }), { label: "Question paper", detail: "Question paper" });
});

test("source detail still distinguishes papers that share a concise label", () => {
  const first = formatPaperChoice({ ...paper, name: "MAT 1103 - QUESTION PAPER (SET A)" });
  const second = formatPaperChoice({ ...paper, name: "MAT 1103 - QUESTION PAPER (SET B)" });
  assert.equal(first.label, second.label);
  assert.notEqual(first.detail, second.detail);
  assert.match(first.detail, /\(Set A\)$/);
  assert.match(second.detail, /\(Set B\)$/);
});

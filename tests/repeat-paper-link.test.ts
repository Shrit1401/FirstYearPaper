import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../public/repeat-v2/index.json";
import midsem from "../public/midsem/index.json";
import { findLinkedRepeatPaper } from "../lib/repeat-paper-link";
import type { RepeatV2Catalog } from "../lib/repeat-v2-types";
const library = catalog as RepeatV2Catalog;
test("all generated question and answer PDF links select their matching Repeat paper", () => {
  for (const paper of midsem.papers) assert.equal(findLinkedRepeatPaper(library, paper.id)?.href, paper.paperUrl);
});
test("original PDF links match source aliases, including encoded names and page fragments", () => {
  const paper = library.papers.find(p => p.sourceFiles.length > 1)!;
  const source = paper.sourceFiles[1].href;
  assert.equal(findLinkedRepeatPaper(library, "", source + "#page=2")?.id, paper.id);
  assert.equal(findLinkedRepeatPaper(library, "", decodeURIComponent(source))?.id, paper.id);
});
test("unknown links never silently select another paper", () => {
  assert.equal(findLinkedRepeatPaper(library, "missing"), undefined);
  assert.equal(findLinkedRepeatPaper(library, "", "/not-in-library.pdf"), undefined);
  assert.equal(findLinkedRepeatPaper(library), undefined);
});

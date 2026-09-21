import fs from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import katex from "katex";
import "katex/contrib/mhchem";

const root = process.cwd();
const papersDir = path.join(root, "public", "repeat-v2", "papers");
const output = path.join(root, "generated", "repeat-v2", "math-validation.json");
const processor = unified().use(remarkParse).use(remarkMath);
const failures = [];
let papers = 0;
let questions = 0;
let expressions = 0;

function checkControls(value, paperId, questionId) {
  const controls = value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g);
  if (controls) failures.push({ paperId, questionId, latex: "", error: `Unexpected control characters: ${[...new Set(controls.map((char) => char.charCodeAt(0)))].join(", ")}` });
}

function inspect(node, paperId, questionId) {
  if (node.type === "math" || node.type === "inlineMath") {
    expressions += 1;
    try {
      katex.renderToString(node.value, {
        throwOnError: true,
        strict: "ignore",
        displayMode: node.type === "math",
        trust: false,
      });
    } catch (error) {
      failures.push({ paperId, questionId, latex: node.value, error: String(error.message) });
    }
  }
  for (const child of node.children ?? []) inspect(child, paperId, questionId);
}

for (const file of await fs.readdir(papersDir)) {
  if (!file.endsWith(".json")) continue;
  const paper = JSON.parse(await fs.readFile(path.join(papersDir, file), "utf8"));
  if (!paper.pages.some((page) => page.method.startsWith("openai-vision:") || page.method === "direct-visual-transcription")) continue;
  papers += 1;
  for (const question of paper.questions) {
    questions += 1;
    checkControls(question.markdown, paper.id, question.id);
    inspect(processor.parse(question.markdown), paper.id, question.id);
    for (const diagram of question.diagrams) {
      checkControls(diagram.caption, paper.id, `${question.id}:diagram:${diagram.id}`);
      inspect(processor.parse(diagram.caption), paper.id, `${question.id}:diagram:${diagram.id}`);
    }
  }
}

const report = { generatedAt: new Date().toISOString(), papers, questions, expressions, failures };
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ papers, questions, expressions, failures: failures.length, report: path.relative(root, output) }));
if (failures.length > 0) process.exitCode = 1;

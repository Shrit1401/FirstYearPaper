import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const workspaceRoot = process.cwd();
const publicRoot = path.join(workspaceRoot, "public");
const manifestPath = path.join(workspaceRoot, "lib", "papers-manifest.json");
const outputRoot = path.join(publicRoot, "ocr", "papers");
const indexPath = path.join(publicRoot, "ocr", "papers-index.json");
const reportPath = path.join(workspaceRoot, "lib", "ocr-report.json");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paper-ocr-"));
const force = process.argv.includes("--force");
const limit = Number(
  process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 0,
);
const requestedConcurrency = Number(
  process.argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ||
    4,
);
const concurrency = Math.max(1, Math.min(8, requestedConcurrency));
const sparsePageThreshold = 700;

function collectPapers(manifest) {
  const papers = [];
  for (const [year, yearData] of Object.entries(manifest.years || {})) {
    for (const [semester, semesterData] of Object.entries(yearData.sems || {})) {
      for (const [branch, branchData] of Object.entries(
        semesterData.branches || {},
      )) {
        for (const [examType, examData] of Object.entries(branchData || {})) {
          for (const [subject, subjectData] of Object.entries(
            examData.subjects || {},
          )) {
            for (const paper of subjectData.papers || []) {
              papers.push({
                ...paper,
                year,
                semester,
                branch,
                examType,
                subject,
              });
            }
          }
        }
      }
    }
  }
  return papers.sort((a, b) => a.href.localeCompare(b.href));
}

function nonWhitespaceLength(value) {
  return value.replace(/\s/g, "").length;
}

function cleanExtractedText(value) {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\u00ad/g, "")
    .split("\n")
    .filter((line) => !/^\s*about:srcdoc\s*$/i.test(line))
    .map((line) => line.replace(/^[ \t]{3,}/, "  "))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function convertMathLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;
  if (trimmed.includes("$")) return line.replace(/\$/g, "\\$");
  if (/\b(exam|date|time|marks|duration|end)\b/i.test(trimmed)) return line;

  const mathMarkers =
    trimmed.match(/[=+*/^<>∫∑√∞≤≥≠∂πθαβγλμσφω²³₀₁₂₃₄₅₆₇₈₉]/g) || [];
  const longWords = trimmed.match(/[A-Za-z]{4,}/g) || [];
  const hasStrongMathMarker = /[=∫∑√∞≤≥≠∂]/.test(trimmed);
  const looksLikeFormula =
    hasStrongMathMarker &&
    mathMarkers.length >= 1 &&
    longWords.length <= 5 &&
    trimmed.length <= 180 &&
    !/[.!?]\s+[A-Z]/.test(trimmed);

  if (!looksLikeFormula) return line;

  const latex = trimmed
    .replace(/\\/g, "\\backslash ")
    .replace(/∫/g, "\\int ")
    .replace(/∑/g, "\\sum ")
    .replace(/∞/g, "\\infty ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\ne ")
    .replace(/∂/g, "\\partial ")
    .replace(/π/g, "\\pi ")
    .replace(/θ/g, "\\theta ")
    .replace(/α/g, "\\alpha ")
    .replace(/β/g, "\\beta ")
    .replace(/γ/g, "\\gamma ")
    .replace(/λ/g, "\\lambda ")
    .replace(/μ/g, "\\mu ")
    .replace(/σ/g, "\\sigma ")
    .replace(/φ/g, "\\phi ")
    .replace(/ω/g, "\\omega ")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/²/g, "^{2}")
    .replace(/³/g, "^{3}")
    .replace(/₀/g, "_{0}")
    .replace(/₁/g, "_{1}")
    .replace(/₂/g, "_{2}")
    .replace(/₃/g, "_{3}")
    .replace(/₄/g, "_{4}")
    .replace(/₅/g, "_{5}")
    .replace(/₆/g, "_{6}")
    .replace(/₇/g, "_{7}")
    .replace(/₈/g, "_{8}")
    .replace(/₉/g, "_{9}")
    .replace(/%/g, "\\%");

  const indentation = line.match(/^\s*/)?.[0] || "";
  return indentation + "$$" + latex + "$$";
}

function toEditableSource(text) {
  return cleanExtractedText(text)
    .split("\n")
    .map(convertMathLine)
    .join("  \n");
}

async function run(command, args, options = {}) {
  return runFile(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
}

async function getPageCount(pdfPath) {
  const { stdout } = await run("pdfinfo", [pdfPath]);
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error("Could not read page count");
  return Number(match[1]);
}

async function extractNativePages(pdfPath, pageCount) {
  const { stdout } = await run("pdftotext", [
    "-layout",
    "-enc",
    "UTF-8",
    pdfPath,
    "-",
  ]);
  const parts = stdout.split("\f");
  if (parts.length > pageCount && !parts.at(-1)?.trim()) parts.pop();
  while (parts.length < pageCount) parts.push("");
  return parts.slice(0, pageCount);
}

async function ocrPage(pdfPath, paperId, pageNumber) {
  const prefix = path.join(tempRoot, paperId + "-page-" + pageNumber);
  const imagePath = prefix + ".png";
  await run("pdftoppm", [
    "-f",
    String(pageNumber),
    "-l",
    String(pageNumber),
    "-singlefile",
    "-r",
    "190",
    "-png",
    pdfPath,
    prefix,
  ]);
  try {
    const { stdout } = await run("tesseract", [
      imagePath,
      "stdout",
      "-l",
      "eng",
      "--psm",
      "6",
    ]);
    return stdout;
  } finally {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
}

async function processPaper(paper) {
  const outputPath = path.join(outputRoot, paper.editableId + ".json");
  if (!force && fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    return {
      entry: {
        id: existing.id,
        name: existing.name,
        href: existing.href,
        pageCount: existing.pages.length,
      },
      stats: existing.stats,
      cached: true,
    };
  }

  const decodedHref = decodeURIComponent(paper.href);
  const pdfPath = path.join(publicRoot, decodedHref.replace(/^\/+/, ""));
  const pageCount = await getPageCount(pdfPath);
  const nativePages = await extractNativePages(pdfPath, pageCount);
  const pages = [];
  let nativePageCount = 0;
  let ocrPageCount = 0;
  let lowConfidencePageCount = 0;

  for (let index = 0; index < pageCount; index += 1) {
    const nativeText = cleanExtractedText(nativePages[index] || "");
    const nativeLength = nonWhitespaceLength(nativeText);
    let selectedText = nativeText;
    let method = "text-layer";
    let ocrLength = 0;

    if (nativeLength < sparsePageThreshold) {
      try {
        const ocrText = cleanExtractedText(
          await ocrPage(pdfPath, paper.editableId, index + 1),
        );
        ocrLength = nonWhitespaceLength(ocrText);
        if (
          ocrLength > nativeLength * 1.08 ||
          (nativeLength < 120 && ocrLength > nativeLength)
        ) {
          selectedText = ocrText;
          method = "image-ocr";
        }
      } catch {
        lowConfidencePageCount += 1;
      }
    }

    if (method === "image-ocr") ocrPageCount += 1;
    else nativePageCount += 1;
    if (nonWhitespaceLength(selectedText) < 120) lowConfidencePageCount += 1;

    pages.push({
      number: index + 1,
      method,
      source: toEditableSource(selectedText),
      nativeCharacters: nativeLength,
      ocrCharacters: ocrLength,
    });
  }

  const document = {
    version: 2,
    id: paper.editableId,
    name: paper.name,
    href: paper.href,
    metadata: {
      year: paper.year,
      semester: paper.semester,
      branch: paper.branch,
      examType: paper.examType,
      subject: paper.subject,
    },
    pages,
    stats: {
      nativePageCount,
      ocrPageCount,
      lowConfidencePageCount,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(document) + "\n", "utf8");
  return {
    entry: {
      id: paper.editableId,
      name: paper.name,
      href: paper.href,
      pageCount,
    },
    stats: document.stats,
    cached: false,
  };
}

async function runPool(items, workerCount, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        results[index] = {
          error: error instanceof Error ? error.message : String(error),
          paper: items[index],
        };
      }
      if ((index + 1) % 25 === 0 || index + 1 === items.length) {
        console.log("Processed " + (index + 1) + " of " + items.length);
      }
    }
  }

  await Promise.all(
    Array.from({ length: workerCount }, () => consume()),
  );
  return results;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const allPapers = collectPapers(manifest);
const papers = limit > 0 ? allPapers.slice(0, limit) : allPapers;
fs.mkdirSync(outputRoot, { recursive: true });
const results = await runPool(papers, concurrency, processPaper);
const completed = results.filter((result) => result && !result.error);
const failures = results.filter((result) => result?.error);
const index = Object.fromEntries(
  completed.map((result) => [result.entry.id, result.entry]),
);

fs.mkdirSync(path.dirname(indexPath), { recursive: true });
fs.writeFileSync(indexPath, JSON.stringify(index) + "\n", "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  manifestPapers: papers.length,
  completedPapers: completed.length,
  failedPapers: failures.length,
  totalPages: completed.reduce(
    (sum, result) => sum + result.entry.pageCount,
    0,
  ),
  textLayerPages: completed.reduce(
    (sum, result) => sum + (result.stats?.nativePageCount || 0),
    0,
  ),
  imageOcrPages: completed.reduce(
    (sum, result) => sum + (result.stats?.ocrPageCount || 0),
    0,
  ),
  lowConfidencePages: completed.reduce(
    (sum, result) => sum + (result.stats?.lowConfidencePageCount || 0),
    0,
  ),
  failures: failures.map((failure) => ({
    id: failure.paper?.editableId,
    href: failure.paper?.href,
    error: failure.error,
  })),
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
fs.rmSync(tempRoot, { recursive: true, force: true });

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;

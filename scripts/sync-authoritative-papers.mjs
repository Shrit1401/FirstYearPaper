import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_SOURCE =
  "/Users/shritaake/Downloads/MAHE BLR OLD QPs 2022-2025/MIT 2021-26";
const sourceRoot = path.resolve(process.argv[2] || DEFAULT_SOURCE);
const targetRoot = path.join(
  process.cwd(),
  "public",
  "authoritative",
  "MIT 2021-26",
);
const reportPath = path.join(process.cwd(), "lib", "papers-source-report.json");

function walkPdfs(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkPdfs(fullPath));
    else if (entry.name.toLowerCase().endsWith(".pdf")) files.push(fullPath);
  }
  return files;
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function hasPdfHeader(filePath) {
  const handle = fs.openSync(filePath, "r");
  const header = Buffer.alloc(5);
  try {
    fs.readSync(handle, header, 0, header.length, 0);
  } finally {
    fs.closeSync(handle);
  }
  return header.toString("ascii") === "%PDF-";
}

if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) {
  throw new Error("Authoritative paper folder not found: " + sourceRoot);
}

const sourceFiles = walkPdfs(sourceRoot).sort();
const expectedTargets = new Set();
const skipped = [];
let copied = 0;
let unchanged = 0;

for (const sourceFile of sourceFiles) {
  const relativePath = path.relative(sourceRoot, sourceFile);
  const targetFile = path.join(targetRoot, relativePath);

  if (!hasPdfHeader(sourceFile)) {
    skipped.push({
      path: relativePath,
      reason: "File does not contain a PDF header",
    });
    continue;
  }

  expectedTargets.add(targetFile);
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });

  if (
    fs.existsSync(targetFile) &&
    fs.statSync(targetFile).size === fs.statSync(sourceFile).size &&
    sha256(targetFile) === sha256(sourceFile)
  ) {
    unchanged += 1;
    continue;
  }

  fs.copyFileSync(sourceFile, targetFile);
  copied += 1;
}

let removed = 0;
for (const existingFile of walkPdfs(targetRoot)) {
  if (!expectedTargets.has(existingFile)) {
    fs.unlinkSync(existingFile);
    removed += 1;
  }
}

const report = {
  source: sourceRoot,
  target: targetRoot,
  generatedAt: new Date().toISOString(),
  sourcePdfCount: sourceFiles.length,
  validPdfCount: expectedTargets.size,
  copied,
  unchanged,
  removed,
  skipped,
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log("Authoritative paper sync complete");
console.log("  Source PDFs: " + sourceFiles.length);
console.log("  Valid PDFs: " + expectedTargets.size);
console.log("  Copied or updated: " + copied);
console.log("  Unchanged: " + unchanged);
console.log("  Removed stale files: " + removed);
console.log("  Skipped invalid files: " + skipped.length);
console.log("  Report: " + reportPath);

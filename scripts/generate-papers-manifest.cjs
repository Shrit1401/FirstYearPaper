/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(process.cwd(), "public");
const SKIP_DIRS = new Set(["solutions", "output", ".DS_Store"]);

// ── Helpers ────────────────────────────────────────────────────────────────

function* walkPdfs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkPdfs(full);
    else if (e.name.toLowerCase().endsWith(".pdf")) yield full;
  }
}

function beautifyPaperName(raw) {
  let n = raw.replace(/\.pdf$/i, "");
  n = n.replace(/\{/g, "(");
  n = n.replace(/^\(verified\)\s*/i, "");
  n = n.replace(/\(verified\)/gi, "");
  // strip one or more leading course-code prefixes e.g. "BIO-1071-CHM-" or "ECE 1051 "
  n = n.replace(/^([A-Z]{2,5}[\s-]\d{3,4}[\s-])+/i, "");
  n = n.replace(/^[A-Z]{3}-/i, "");
  n = n.replace(/^00[\s-]/, "");
  const ymd = n.match(/^(\d{4})-(\d{2})-(\d{2})(.*)/);
  if (ymd) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [, y, m, d, rest] = ymd;
    const mi = parseInt(m, 10);
    const ms = mi >= 1 && mi <= 12 ? months[mi - 1] : m;
    const ds = d === "00" ? "" : d;
    n = `${ds ? ds + " " : ""}${ms} ${y}${rest}`;
  } else {
    n = n.replace(/-/g, " ");
  }
  n = n.replace(/\s*\(/g, " (").replace(/\s{2,}/g, " ");
  return n.trim();
}

function cleanSubjectName(raw) {
  const lower = raw.trim().toLowerCase();
  if (["all subject","all subjects","all","all subect","all suject","all subejct","all subect"].includes(lower)) return "All Subjects";
  if (lower.startsWith("all su")) return "All Subjects";
  if (lower === "vommon subject" || lower === "vommon") return "Common Subject";
  return raw.trim();
}

function ensurePath(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (!cur[k]) cur[k] = {};
    cur = cur[k];
  }
  return cur;
}

function sortPapers(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj.papers)) obj.papers.sort((a, b) => a.name.localeCompare(b.name));
  for (const v of Object.values(obj)) if (v && typeof v === "object") sortPapers(v);
}

// ── New structure ──────────────────────────────────────────────────────────
// public/YEAR{N}/SEM{N}/BRANCH/ACADYEAR/EXAMTYPE/[SUBJECT/]*.pdf

const YEAR_MAP = { YEAR1: "Year 1", YEAR2: "Year 2", YEAR3: "Year 3", YEAR4: "Year 4" };
const SEM_MAP = {
  SEM1: "Semester 1", SEM2: "Semester 2", SEM3: "Semester 3",
  SEM4: "Semester 4", SEM5: "Semester 5", SEM6: "Semester 6", SEM7: "Semester 7",
};
const FALLBACK_SEM_MAP = {
  YEAR1: "Semester 1 / 2",
  YEAR2: "Semester 3 / 4",
  YEAR3: "Semester 5 / 6",
  YEAR4: "Semester 7 / 8",
};
// Which SEM dirs live under each YEAR dir
const YEAR_SEMS = {
  YEAR1: ["SEM1", "SEM2"],
  YEAR2: ["SEM3", "SEM4"],
  YEAR3: ["SEM5", "SEM6"],
  YEAR4: ["SEM7"],
};

const yearsData = {};

function inferExamType(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("mid")) return "MIDSEM";
  return "ENDSEM";
}

function inferSubjectName(raw) {
  return cleanSubjectName(
    raw
      .replace(/\bmid\s*sem\b/gi, "")
      .replace(/\bend\s*sem\b/gi, "")
      .replace(/\bendsm\b/gi, "")
      .replace(/\bmidsem\b/gi, "")
      .replace(/\bendsem\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*[-–]\s*$/g, "")
      .trim()
  );
}

function pushPaper(target, pdfPath) {
  if (!target.papers) target.papers = [];
  const rel = path.relative(PUBLIC, pdfPath);
  const baseName = path.basename(pdfPath);
  target.papers.push({
    name: beautifyPaperName(baseName),
    verified: /\(verified\)/i.test(baseName),
    href: "/" + rel.split(path.sep).map(encodeURIComponent).join("/"),
  });
}

for (const [yearDir, yearLabel] of Object.entries(YEAR_MAP)) {
  const yearPath = path.join(PUBLIC, yearDir);
  if (!fs.existsSync(yearPath)) continue;
  const yearEntries = fs.readdirSync(yearPath, { withFileTypes: true });
  const hasSemHierarchy = yearEntries.some((entry) => entry.isDirectory() && YEAR_SEMS[yearDir]?.includes(entry.name));

  if (hasSemHierarchy) {
    for (const semDir of (YEAR_SEMS[yearDir] || [])) {
      const semLabel = SEM_MAP[semDir];
      const semPath = path.join(yearPath, semDir);
      if (!fs.existsSync(semPath)) continue;

      for (const branchEntry of fs.readdirSync(semPath, { withFileTypes: true })) {
        if (!branchEntry.isDirectory() || SKIP_DIRS.has(branchEntry.name)) continue;
        const branchName = branchEntry.name.trim();
        const branchPath = path.join(semPath, branchName);

        for (const acadEntry of fs.readdirSync(branchPath, { withFileTypes: true })) {
          if (!acadEntry.isDirectory() || SKIP_DIRS.has(acadEntry.name)) continue;
          const acadPath = path.join(branchPath, acadEntry.name);

          for (const examEntry of fs.readdirSync(acadPath, { withFileTypes: true })) {
            if (!examEntry.isDirectory() || SKIP_DIRS.has(examEntry.name)) continue;
            const examType = inferExamType(examEntry.name);
            const examPath = path.join(acadPath, examEntry.name);

            const entries = fs.readdirSync(examPath, { withFileTypes: true })
              .filter(e => !SKIP_DIRS.has(e.name));
            const subjectDirs = entries.filter(e => e.isDirectory());
            const directPdfs = entries.filter(e => !e.isDirectory() && e.name.toLowerCase().endsWith(".pdf"));

            // PDFs directly in examType folder → "All Subjects"
            if (directPdfs.length > 0) {
              const target = ensurePath(yearsData, yearLabel, "sems", semLabel, "branches", branchName, examType, "subjects", "All Subjects");
              for (const pdf of directPdfs) {
                pushPaper(target, path.join(examPath, pdf.name));
              }
            }

            for (const subjectEntry of subjectDirs) {
              const subjectName = cleanSubjectName(subjectEntry.name);
              const subjectPath2 = path.join(examPath, subjectEntry.name);
              const target = ensurePath(yearsData, yearLabel, "sems", semLabel, "branches", branchName, examType, "subjects", subjectName);
              for (const pdfPath of walkPdfs(subjectPath2)) {
                pushPaper(target, pdfPath);
              }
            }
          }
        }
      }
    }
    continue;
  }

  const fallbackSemLabel = FALLBACK_SEM_MAP[yearDir] ?? "All Semesters";

  for (const branchEntry of yearEntries) {
    if (!branchEntry.isDirectory() || SKIP_DIRS.has(branchEntry.name)) continue;
    const branchName = branchEntry.name.trim();
    const branchPath = path.join(yearPath, branchName);
    const branchEntries = fs.readdirSync(branchPath, { withFileTypes: true }).filter((entry) => !SKIP_DIRS.has(entry.name));
    const directPdfs = branchEntries.filter((entry) => !entry.isDirectory() && entry.name.toLowerCase().endsWith(".pdf"));

    if (directPdfs.length > 0) {
      const target = ensurePath(yearsData, yearLabel, "sems", fallbackSemLabel, "branches", branchName, "ENDSEM", "subjects", "All Subjects");
      for (const pdf of directPdfs) {
        pushPaper(target, path.join(branchPath, pdf.name));
      }
    }

    for (const subjectEntry of branchEntries.filter((entry) => entry.isDirectory())) {
      const examType = inferExamType(subjectEntry.name);
      const subjectName = inferSubjectName(subjectEntry.name);
      const subjectPath = path.join(branchPath, subjectEntry.name);
      const target = ensurePath(
        yearsData,
        yearLabel,
        "sems",
        fallbackSemLabel,
        "branches",
        branchName,
        examType,
        "subjects",
        subjectName || "All Subjects"
      );

      for (const pdfPath of walkPdfs(subjectPath)) {
        pushPaper(target, pdfPath);
      }
    }
  }
}

// ── Legacy structure ───────────────────────────────────────────────────────
// public/YEAR1/Common  public/YEAR1/Core stream  public/YEAR1/CS Stream
// These keep their old stream-based shape so existing links still work.

const LEGACY_STREAMS = ["Core stream", "Common", "CS Stream"];
const streamsData = {};

for (const streamName of LEGACY_STREAMS) {
  const streamDir = path.join(PUBLIC, "YEAR1", streamName);
  if (!fs.existsSync(streamDir)) continue;

  const bySubject = new Map();

  function* walkLegacy(base) {
    const full = path.join(streamDir, base);
    if (!fs.existsSync(full)) return;
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        yield { rel, isDir: true };
        yield* walkLegacy(rel);
      } else if (e.name.toLowerCase().endsWith(".pdf")) {
        yield { rel, isDir: false };
      }
    }
  }

  for (const { rel, isDir } of walkLegacy("")) {
    if (isDir) continue;
    const lastSlash = rel.lastIndexOf("/");
    const sub = lastSlash >= 0 ? rel.slice(0, lastSlash) : "";
    const origName = lastSlash >= 0 ? rel.slice(lastSlash + 1) : rel;
    const name = beautifyPaperName(origName);
    // href must point to the actual file: /YEAR1/Core stream/...
    const href = "/" + ["YEAR1", streamName, ...rel.split("/")].map(encodeURIComponent).join("/");
    if (!bySubject.has(sub)) bySubject.set(sub, []);
    bySubject.get(sub).push({ name, href, verified: /\(verified\)/i.test(origName) });
  }

  const subjects = [];
  for (const sub of Array.from(bySubject.keys()).sort()) {
    const papers = bySubject.get(sub);
    papers.sort((a, b) => a.name.localeCompare(b.name));
    subjects.push({
      name: sub ? cleanSubjectName(sub.split("/").pop()) : streamName,
      path: sub,
      papers,
    });
  }
  streamsData[streamName] = { name: streamName, subjects };
}

// ── Write ──────────────────────────────────────────────────────────────────

sortPapers(yearsData);

const manifest = { years: yearsData, streams: streamsData };
const outPath = path.join(process.cwd(), "lib", "papers-manifest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");

let newCount = 0;
function countNew(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj.papers)) newCount += obj.papers.length;
  for (const v of Object.values(obj)) if (v && typeof v === "object") countNew(v);
}
countNew(yearsData);

let legacyCount = 0;
for (const s of Object.values(streamsData)) for (const sub of s.subjects) legacyCount += sub.papers.length;

console.log(`Wrote ${outPath}`);
console.log(`  New (Year 1–4): ${newCount} papers`);
console.log(`  Legacy streams: ${legacyCount} papers`);
console.log(`  Total: ${newCount + legacyCount} papers`);

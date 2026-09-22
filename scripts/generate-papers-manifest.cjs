/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function editablePaperId(href) {
  return crypto.createHash("sha256").update(href).digest("hex").slice(0, 16);
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
  YEAR1: "Student scans · Sem 1 & 2",
  YEAR2: "Student scans · Sem 3 & 4",
  YEAR3: "Student scans · Sem 5 & 6",
  YEAR4: "Student scans · Sem 7 & 8",
};
// Which SEM dirs live under each YEAR dir
const YEAR_SEMS = {
  YEAR1: ["SEM1", "SEM2"],
  YEAR2: ["SEM3", "SEM4"],
  YEAR3: ["SEM5", "SEM6"],
  YEAR4: ["SEM7"],
};

const yearsData = {};
let authoritativeYearsData = {};
const AUTHORITATIVE_ROOT = path.join(
  PUBLIC,
  "authoritative",
  "MIT 2021-26"
);
const HAS_AUTHORITATIVE_ARCHIVE = fs.existsSync(AUTHORITATIVE_ROOT);
const LOCAL_YEAR_ONE_ROOT = path.join(PUBLIC, "YEAR1");

const ROMAN_SEMESTERS = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

function inferSemester(relativePath) {
  const directories = relativePath.split(path.sep).slice(0, -1).reverse();
  for (const directory of directories) {
    let match =
      directory.match(/semester\s*([1-8])/i) ||
      directory.match(/sem\s*([1-8])(?!\s*(?:and|&|,))/i) ||
      directory.match(/\b([1-8])(?:st|nd|rd|th)?\s*sem\b/i);
    if (match) return Number(match[1]);

    match = directory.match(/\b(VIII|VII|VI|IV|V|III|II|I)\s*Sem\b/i);
    if (match) return ROMAN_SEMESTERS[match[1].toUpperCase()] ?? null;
  }
  return null;
}

function inferAcademicYear(relativePath) {
  const topDirectory = relativePath.split(path.sep)[0] ?? "";
  const match = topDirectory.match(/(20\d{2})-(20)?(\d{2})/);
  if (!match) return "Unknown session";
  return match[1] + "-" + match[3];
}

function inferCourseCode(fileName) {
  const baseName = fileName
    .replace(/\.pdf$/i, "")
    .replace(/^\((?:MITB|verified)\)\s*/i, "")
    .trim();
  const match = baseName.match(
    /^([A-Z0-9]{1,5})[\s_-]*([0-9][0-9A-Z]{2,4}H?)(?:[\s_-]+(CHM|PHY|B))?/i
  );
  if (!match) return "Other Subjects";
  const prefix = match[1].toUpperCase() === "BI0" ? "BIO" : match[1].toUpperCase();
  return [prefix, match[2].toUpperCase(), match[3]?.toUpperCase()]
    .filter(Boolean)
    .join(" ");
}

function getAuthoritativeLocation(relativePath) {
  const normalized = relativePath.toLowerCase();
  const semester = inferSemester(relativePath);

  if (normalized.includes("b.tech hons")) {
    return {
      yearLabel: "B.Tech Hons",
      semesterLabel: "Honours",
      branchLabel: "B.Tech Hons",
    };
  }

  if (normalized.includes("mtech") || normalized.includes("m.tech")) {
    return {
      yearLabel: "M.Tech",
      semesterLabel: semester ? "Semester " + semester : "All Semesters",
      branchLabel: "M.Tech",
    };
  }

  if (!semester) {
    return {
      yearLabel: "Other Programs",
      semesterLabel: "All Semesters",
      branchLabel: "All Programs",
    };
  }

  return {
    yearLabel: "Year " + Math.ceil(semester / 2),
    semesterLabel: "Semester " + semester,
    branchLabel: "All Programs",
  };
}

function buildAuthoritativeManifest() {
  if (!HAS_AUTHORITATIVE_ARCHIVE) return {};

  const data = {};
  for (const pdfPath of walkPdfs(AUTHORITATIVE_ROOT)) {
    const relativePath = path.relative(AUTHORITATIVE_ROOT, pdfPath);
    const location = getAuthoritativeLocation(relativePath);
    const academicYear = inferAcademicYear(relativePath);
    const examType = relativePath.toLowerCase().includes("makeup")
      ? "MAKEUP"
      : "REGULAR";
    const baseName = path.basename(pdfPath);
    const subjectName = inferCourseCode(baseName);
    const target = ensurePath(
      data,
      location.yearLabel,
      "sems",
      location.semesterLabel,
      "branches",
      location.branchLabel,
      examType,
      "subjects",
      subjectName
    );

    if (!target.papers) target.papers = [];
    const hrefPath = path.relative(PUBLIC, pdfPath);
    const href =
      "/" +
      hrefPath
        .split(path.sep)
        .map(encodeURIComponent)
        .join("/");
    target.papers.push({
      name:
        academicYear +
        " " +
        (examType === "MAKEUP" ? "Makeup" : "Regular") +
        " - " +
        baseName.replace(/\.pdf$/i, ""),
      verified: true,
      href,
      editableId: editablePaperId(href),
    });
  }

  const ordered = {};
  for (const yearLabel of [
    "Year 1",
    "Year 2",
    "Year 3",
    "Year 4",
    "B.Tech Hons",
    "M.Tech",
    "Other Programs",
  ]) {
    if (data[yearLabel]) ordered[yearLabel] = data[yearLabel];
  }
  return ordered;
}

authoritativeYearsData = buildAuthoritativeManifest();

function addSemesterOneMidsemPapers(data) {
  if (!HAS_AUTHORITATIVE_ARCHIVE || !fs.existsSync(LOCAL_YEAR_ONE_ROOT)) return;

  const candidates = Array.from(walkPdfs(LOCAL_YEAR_ONE_ROOT))
    .filter((pdfPath) => /mid\s*sem/i.test(path.relative(LOCAL_YEAR_ONE_ROOT, pdfPath)))
    .filter((pdfPath) => /(?:aug|sep|oct|september|october)/i.test(path.basename(pdfPath)))
    .sort();
  const seenHashes = new Set();

  for (const pdfPath of candidates) {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(pdfPath)).digest("hex");
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);

    const baseName = path.basename(pdfPath);
    const subjectName = inferCourseCode(baseName);
    const target = ensurePath(
      data,
      "Year 1",
      "sems",
      "Semester 1",
      "branches",
      "All Programs",
      "MIDSEM",
      "subjects",
      subjectName
    );
    if (!target.papers) target.papers = [];

    const hrefPath = path.relative(PUBLIC, pdfPath);
    const href = "/" + hrefPath.split(path.sep).map(encodeURIComponent).join("/");
    const paperYear = baseName.match(/20\d{2}/)?.[0];
    target.papers.push({
      name:
        (paperYear ? paperYear + " " : "") +
        "Mid-sem - " +
        baseName.replace(/\.pdf$/i, ""),
      verified: /\(MITB\)|\(QP\)/i.test(baseName),
      href,
    });
  }
}

addSemesterOneMidsemPapers(authoritativeYearsData);

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
  const href = "/" + rel.split(path.sep).map(encodeURIComponent).join("/");
  target.papers.push({
    name: beautifyPaperName(baseName),
    verified: /\(verified\)/i.test(baseName),
    href,
    editableId: editablePaperId(href),
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
    bySubject.get(sub).push({
      name,
      href,
      editableId: editablePaperId(href),
      verified: /\(verified\)/i.test(origName),
    });
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

// ── Merge community folders into the authoritative archive ────────────────
// public/YEAR1..3 hold student-contributed scans (midsems, older years, extra
// copies). Keep every file that is not a byte-identical duplicate of an
// authoritative PDF or of another community file, so nothing on disk is hidden.

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectHrefs(data, out = new Set()) {
  if (!data || typeof data !== "object") return out;
  if (Array.isArray(data.papers)) for (const paper of data.papers) out.add(paper.href);
  for (const value of Object.values(data)) if (value && typeof value === "object") collectHrefs(value, out);
  return out;
}

function mergeCommunityPapers(target, community) {
  if (!HAS_AUTHORITATIVE_ARCHIVE) return { added: 0, skipped: 0 };
  const seen = new Set();
  for (const pdfPath of walkPdfs(AUTHORITATIVE_ROOT)) seen.add(hashFile(pdfPath));
  const indexed = collectHrefs(target);
  let added = 0;
  let skipped = 0;

  function visit(node, pathKeys) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.papers)) {
      for (const paper of node.papers) {
        if (indexed.has(paper.href)) { skipped += 1; continue; }
        const filePath = path.join(PUBLIC, decodeURIComponent(paper.href.slice(1)));
        if (!fs.existsSync(filePath)) continue;
        const hash = hashFile(filePath);
        if (seen.has(hash)) { skipped += 1; continue; }
        seen.add(hash);
        const bucket = ensurePath(target, ...pathKeys);
        if (!bucket.papers) bucket.papers = [];
        bucket.papers.push({ ...paper, community: true });
        indexed.add(paper.href);
        added += 1;
      }
      return;
    }
    for (const [key, value] of Object.entries(node)) visit(value, [...pathKeys, key]);
  }

  for (const [yearLabel, yearData] of Object.entries(community)) visit(yearData, [yearLabel]);
  return { added, skipped };
}

const communityMerge = mergeCommunityPapers(authoritativeYearsData, yearsData);

// ── Write ──────────────────────────────────────────────────────────────────

const manifestYears = HAS_AUTHORITATIVE_ARCHIVE
  ? authoritativeYearsData
  : yearsData;
manifestYears["Year 2"] = require("./sync-second-year-midsems.cjs").secondYearMidsems();
sortPapers(manifestYears);

const manifest = {
  years: manifestYears,
  streams: HAS_AUTHORITATIVE_ARCHIVE ? {} : streamsData,
};
const outPath = path.join(process.cwd(), "lib", "papers-manifest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");

let newCount = 0;
function countNew(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj.papers)) newCount += obj.papers.length;
  for (const v of Object.values(obj)) if (v && typeof v === "object") countNew(v);
}
countNew(manifestYears);

let legacyCount = 0;
for (const s of Object.values(streamsData)) for (const sub of s.subjects) legacyCount += sub.papers.length;

console.log(`Wrote ${outPath}`);
const indexedLegacyCount = HAS_AUTHORITATIVE_ARCHIVE ? 0 : legacyCount;
console.log(`  Indexed papers: ${newCount}`);
if (HAS_AUTHORITATIVE_ARCHIVE) console.log(`  Community papers merged: ${communityMerge.added} (skipped ${communityMerge.skipped} duplicates)`);
console.log(`  Legacy streams: ${indexedLegacyCount} papers`);
console.log(`  Total: ${newCount + indexedLegacyCount} papers`);

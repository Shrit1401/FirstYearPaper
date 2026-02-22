const fs = require("fs");
const path = require("path");

const STREAMS = ["Core stream", "Common", "CS Stream"];
const SKIP_DIRS = new Set(["solutions", "output"]);
const PUBLIC = path.join(process.cwd(), "public");

function* walkDir(publicDir, dir, base = "") {
  const full = path.join(publicDir, dir, base);
  if (!fs.existsSync(full)) return;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const fullPath = path.join(publicDir, dir, rel);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield { rel, full: fullPath, isDir: true };
      yield* walkDir(publicDir, dir, rel);
    } else if (e.name.toLowerCase().endsWith(".pdf")) {
      yield { rel, full: fullPath, isDir: false };
    }
  }
}

function subjectKey(rel) {
  const i = rel.lastIndexOf("/");
  return i >= 0 ? rel.slice(0, i) : "";
}

function subjectDisplayName(rel) {
  const i = rel.lastIndexOf("/");
  return i >= 0 ? rel.slice(i + 1) : rel;
}

const manifest = { streams: {} };

for (const streamName of STREAMS) {
  const streamDir = path.join(PUBLIC, streamName);
  if (!fs.existsSync(streamDir) || !fs.statSync(streamDir).isDirectory()) continue;

  const bySubject = new Map();
  for (const { rel, isDir } of walkDir(PUBLIC, streamName)) {
    if (isDir) continue;
    const sub = subjectKey(rel);
    const name = subjectDisplayName(rel);
    const href = "/" + [streamName, ...rel.split("/")].map(encodeURIComponent).join("/");
    if (!bySubject.has(sub)) bySubject.set(sub, []);
    bySubject.get(sub).push({ name, href });
  }

  const subjects = [];
  const keys = Array.from(bySubject.keys()).sort();
  for (const sub of keys) {
    const papers = bySubject.get(sub);
    papers.sort((a, b) => a.name.localeCompare(b.name));
    subjects.push({
      name: sub ? sub.split("/").pop() : streamName,
      path: sub,
      papers,
    });
  }
  manifest.streams[streamName] = { name: streamName, subjects };
}

const outPath = path.join(process.cwd(), "lib", "papers-manifest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote", outPath);

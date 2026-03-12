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

function beautifyPaperName(name) {
  let newName = name.replace(/\.pdf$/i, '');
  newName = newName.replace(/\{/g, '(');
  newName = newName.replace(/^[A-Z]{3,5}[\s-]\d{4}[\s-]*/i, '');
  newName = newName.replace(/^[A-Z]{3}-/i, '');
  newName = newName.replace(/^00[\s-]/, '');
  const ymdMatch = newName.match(/^(\d{4})-(\d{2})-(\d{2})(.*)/);
  if (ymdMatch) {
    const [, y, m, d, rest] = ymdMatch;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mInt = parseInt(m, 10);
    const monthStr = (mInt >= 1 && mInt <= 12) ? months[mInt - 1] : m;
    const dayStr = (d === '00' ? '' : d);
    newName = `${dayStr ? dayStr + ' ' : ''}${monthStr} ${y}${rest}`;
  } else {
    newName = newName.replace(/-/g, ' ');
  }
  newName = newName.replace(/\s*\(/g, ' (');
  newName = newName.replace(/\s{2,}/g, ' ');
  return newName.trim();
}

const manifest = { streams: {} };

for (const streamName of STREAMS) {
  const streamDir = path.join(PUBLIC, streamName);
  if (!fs.existsSync(streamDir) || !fs.statSync(streamDir).isDirectory()) continue;

  const bySubject = new Map();
  for (const { rel, isDir } of walkDir(PUBLIC, streamName)) {
    if (isDir) continue;
    const sub = subjectKey(rel);
    const origName = subjectDisplayName(rel);
    const name = beautifyPaperName(origName);
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

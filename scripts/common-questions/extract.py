#!/usr/bin/env python3
"""Find every question in each Sem 1 / Sem 3 subject's recent papers.

For each question it records where it sits on the page (one rect per page it
spans, in PDF points from the top-left), its marks and its raw text, and
renders a PNG of the question so it can be transcribed with proper maths.

Usage: python3 -I scripts/common-questions/extract.py [subject-key ...] [--crops DIR]
Writes scripts/common-questions/out/<key>.json. Needs PyMuPDF.
"""
import hashlib
import json
import re
import sys
import urllib.parse
import subprocess
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scripts" / "common-questions" / "out"
MAX_PAPERS = 5
ANCHOR = re.compile(r"^\s*(?:Q\.?\s*)?(\d{1,2})\s*([A-Z])?\s*[).]\s*", re.I)
FOOTER = re.compile(r"(Page\s*#\s*\d+|^\d+\s+of\s+\d+|about:srcdoc|-{3,}\s*End\s*-{3,})", re.I)
SUB_ANCHOR = re.compile(r"^\s*([A-E])\s*\)\s*")
CO_LINE = re.compile(r"Course Outcome:.*$", re.I | re.M)


def subjects():
    """Year 1 subjects plus the current Sem 3 subjects of every branch."""
    index = json.loads((ROOT / "lib" / "simple-index.json").read_text())
    out = {}
    for s in index["year1"]:
        if s["slug"] == "object-oriented-programming":
            continue  # only midsem papers exist, and midsems are hidden
        out[f"y1-{s['slug']}"] = {"title": s["title"], "papers": s["papers"]}
    by_code = {s["code"]: s for s in index["year2"]["Semester 3"]}
    for branch in index["year2Views"]["Semester 3"]["branches"].values():
        for cur in branch["current"]:
            key = cur["code"].lower().replace(" ", "-")
            if key in out:
                continue
            codes = [cur["code"], *cur["older"]]
            papers = [p for c in codes for p in by_code.get(c, {}).get("papers", [])]
            out[key] = {"title": by_code[cur["code"]]["title"], "code": cur["code"], "papers": papers}
    return out


CACHE = ROOT / "scripts" / "common-questions" / ".pdf-cache"


def local(href):
    """The PDF on disk, downloading it from the live site when it isn't here."""
    path = ROOT / "public" / urllib.parse.unquote(href).lstrip("/")
    if path.exists():
        return path
    cached = CACHE / hashlib.sha1(href.encode()).hexdigest()[:16]
    if not cached.exists():
        done = subprocess.run(["curl", "-sfL", "--max-time", "90", "https://paper.shrit.in" + href],
                              capture_output=True)
        data = done.stdout if done.returncode == 0 else b""
        if not data.startswith(b"%PDF"):
            return path
        CACHE.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(data)
    return cached


def pick_papers(papers):
    """Most recent readable question papers, one per sitting and file."""
    seen, chosen = set(), []
    pool = [p for p in papers
            if p["exam"] in ("ENDSEM", "MAKEUP")
            and p["kind"] in ("Question paper", "Paper + solutions")
            and not p.get("scan") and p["href"].startswith("/authoritative/")
            and local(p["href"]).exists()]
    for p in sorted(pool, key=lambda p: p.get("date") or "", reverse=True):
        digest = hashlib.sha256(local(p["href"]).read_bytes()).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        chosen.append(p)
    return chosen


def lines(page):
    """Text lines with their boxes, skipping running headers and footers."""
    out = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            text = "".join(s["text"] for s in line["spans"]).strip()
            if text:
                out.append((fitz.Rect(line["bbox"]), text))
    return out


def content_box(page):
    """Vertical extent of the real content (text and images), minus header/footer."""
    top, bottom = page.rect.height, 0
    for block in page.get_text("dict")["blocks"]:
        r = fitz.Rect(block["bbox"])
        if r.y1 < 14 or r.y0 > page.rect.height - 14:
            continue
        if block["type"] == 0:
            text = " ".join("".join(s["text"] for s in l["spans"]) for l in block["lines"])
            if FOOTER.search(text):
                continue
        top, bottom = min(top, r.y0), max(bottom, r.y1)
    return top, bottom


def extract(path):
    doc = fitz.open(path)
    anchors = []  # (page, y0, qno)
    number = None  # papers that print "1)" then "A)", "B)" on separate lines
    raw = []
    for pno, page in enumerate(doc):
        for rect, text in lines(page):
            if rect.x0 > 80:
                continue
            m = ANCHOR.match(text)
            if m and int(m.group(1)) <= 12:
                raw.append((pno, rect.y0, "num", m.group(1), (m.group(2) or "").upper()))
                continue
            sub = SUB_ANCHOR.match(text)
            if sub:
                raw.append((pno, rect.y0, "sub", None, sub.group(1).upper()))
    raw.sort(key=lambda a: (a[0], a[1]))
    head = None  # where a "1)" line sits; its first part's text starts on that line
    for i, (pno, y0, kind, num, letter) in enumerate(raw):
        if kind == "num":
            number = num
            has_subs = not letter and i + 1 < len(raw) and raw[i + 1][2] == "sub"
            head = (pno, y0) if has_subs else None
            if not has_subs:
                anchors.append((pno, y0, num + letter))
        elif number:
            if head:
                pno, y0 = min(head, (pno, y0))
                head = None
            anchors.append((pno, y0, number + letter))
    # Drop repeats (a qno must not reappear) and keep reading order.
    clean, seen = [], set()
    for a in anchors:
        if a[2] in seen:
            continue
        seen.add(a[2])
        clean.append(a)
    if len(clean) < 3:
        return None
    boxes = [content_box(p) for p in doc]
    questions = []
    for i, (pno, y0, qno) in enumerate(clean):
        end = clean[i + 1] if i + 1 < len(clean) else (doc.page_count - 1, None, None)
        regions = []
        for p in range(pno, end[0] + 1):
            page = doc[p]
            top = y0 - 3 if p == pno else boxes[p][0] - 2
            bottom = (end[1] - 3) if (p == end[0] and end[1] is not None) else boxes[p][1] + 3
            if bottom - top < 6:
                continue
            regions.append({"page": p + 1, "rect": [24, round(top, 1), round(page.rect.width - 24, 1), round(bottom, 1)]})
        if not regions:
            continue
        text = "\n".join(
            doc[r["page"] - 1].get_text("text", clip=fitz.Rect(*r["rect"])) for r in regions)
        text = CO_LINE.sub("", text)
        marks = re.findall(r"\((\d{1,2})\)", text)
        text = re.sub(r"\(\d{1,2}\)\s*$", "", text.strip(), flags=re.M)
        text = ANCHOR.sub("", text, count=1)
        text = re.sub(r"[ \t]+", " ", re.sub(r"\n{2,}", "\n", text)).strip()
        images = sum(len(doc[r["page"] - 1].get_image_info()) and 1 for r in regions)
        questions.append({
            "qno": qno,
            "marks": int(marks[-1]) if marks else None,
            "regions": regions,
            "rawText": text,
            "hasMathImages": any(
                fitz.Rect(img["bbox"]).intersects(fitz.Rect(*r["rect"]))
                for r in regions for img in doc[r["page"] - 1].get_image_info()),
        })
    return {"pageSize": [round(doc[0].rect.width, 1), round(doc[0].rect.height, 1)], "questions": questions}


def render(path, q, dest):
    """Stack each region of a question into one PNG for transcription."""
    doc = fitz.open(path)
    shots = [doc[r["page"] - 1].get_pixmap(clip=fitz.Rect(*r["rect"]), dpi=170) for r in q["regions"]]
    width, height = max(s.width for s in shots), sum(s.height for s in shots)
    canvas = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, width, height), False)
    canvas.set_rect(canvas.irect, (255, 255, 255))
    y = 0
    for s in shots:
        s = fitz.Pixmap(fitz.csRGB, s) if s.n != 3 or s.alpha else s
        s.set_origin(0, y)
        canvas.copy(s, s.irect)
        y += s.height
    canvas.save(dest)


def main():
    args = sys.argv[1:]
    crops = None
    if "--crops" in args:
        i = args.index("--crops")
        crops = Path(args[i + 1])
        del args[i:i + 2]
    all_subjects = subjects()
    keys = args or list(all_subjects)
    OUT.mkdir(parents=True, exist_ok=True)
    for key in keys:
        spec = all_subjects[key]
        papers = []
        for p in pick_papers(spec["papers"]):
            parsed = extract(local(p["href"]))
            if not parsed:
                print(f"  {key}: no questions found in {p['name']}")
                continue
            pid = f"p{len(papers) + 1}"
            for q in parsed["questions"]:
                q["id"] = f"{pid}-{q['qno']}"
                if crops:
                    (crops / key).mkdir(parents=True, exist_ok=True)
                    render(local(p["href"]), q, crops / key / f"{q['id']}.png")
            papers.append({"id": pid, "name": p["name"], "href": p["href"], "code": p.get("code") or spec.get("code"),
                           "date": p.get("date"), "exam": p["exam"], "cycle": p.get("cycle"), **parsed})
            if len(papers) >= MAX_PAPERS:
                break
        out = {"key": key, "title": spec["title"], "code": spec.get("code"), "papers": papers}
        (OUT / f"{key}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
        n = sum(len(p["questions"]) for p in papers)
        print(f"{key}: {len(papers)} papers, {n} questions")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build lib/simple-index.json: a subject-first view of Year 1 and Year 2 papers.

Reads every Year 1 / Year 2 paper in lib/papers-manifest.json, takes the
printed header (OCR JSON, or the PDF text layer, or tesseract as a last resort)
and records what the paper itself says: subject, semester, cycle
(-CHM / -PHY course codes, "Chemistry cycle", "Physics group"), exam type and
whether the file is a question paper or an answer scheme.

The manifest is never modified. Papers whose header places them in another
year (for example a fifth-semester elective filed under Year 1) are left out
of this view but stay reachable through the original folders.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.parse
from collections import defaultdict
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "lib", "papers-manifest.json")
OUT = os.path.join(ROOT, "lib", "simple-index.json")
CACHE = os.path.join(ROOT, "scripts", ".simple-index-text-cache.json")

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

# ── Text extraction ────────────────────────────────────────────────────────

cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


def local_pdf(href: str) -> str | None:
    path = os.path.join(ROOT, "public", urllib.parse.unquote(href).lstrip("/"))
    for form in (path, unicodedata.normalize("NFD", path), unicodedata.normalize("NFC", path)):
        if os.path.exists(form):
            return form
    if not href.startswith("/YEAR1/"):
        return None
    # A few student-scan links point at the wrong folder; find the file by name.
    name = os.path.basename(path)
    for base, _dirs, files in os.walk(os.path.join(ROOT, "public", "YEAR1")):
        if name in files:
            return os.path.join(base, name)
    return None


def first_page_text(paper: dict) -> str:
    href = paper["href"]
    if href in cache:
        return cache[href]
    text = ""
    eid = paper.get("editableId")
    ocr = os.path.join(ROOT, "public", "ocr", "papers", f"{eid}.json") if eid else None
    if ocr and os.path.exists(ocr):
        pages = json.load(open(ocr)).get("pages", [])
        text = " ".join(p.get("source", "") for p in pages[:1])
    pdf = local_pdf(href)
    if len(text.strip()) < 60 and pdf:
        text = subprocess.run(["pdftotext", "-l", "1", pdf, "-"],
                              capture_output=True, text=True).stdout
        if len(text.strip()) < 60:
            with tempfile.TemporaryDirectory() as tmp:
                subprocess.run(["pdftoppm", "-r", "150", "-f", "1", "-l", "1", "-png",
                                pdf, os.path.join(tmp, "p")], capture_output=True)
                pngs = sorted(f for f in os.listdir(tmp) if f.endswith(".png"))
                if pngs:
                    text = subprocess.run(["tesseract", os.path.join(tmp, pngs[0]), "-"],
                                          capture_output=True, text=True).stdout
    text = re.sub(r"\s+", " ", text).strip()
    cache[href] = text
    return text


# ── Header parsing ─────────────────────────────────────────────────────────

ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
WORDS = {"FIRST": 1, "SECOND": 2, "THIRD": 3, "FOURTH": 4, "FIFTH": 5, "SIXTH": 6,
         "SEVENTH": 7, "EIGHTH": 8, "1ST": 1, "IST": 1, "2ND": 2, "3RD": 3, "4TH": 4, "5TH": 5}
SEM_TOKEN = r"(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|1ST|IST|2ND|3RD|4TH|5TH|VIII|VII|VI|IV|V|III|II|I)"


def header_semester(head: str) -> int | None:
    u = head.upper()
    for pat in (SEM_TOKEN + r"\s*SEM(?:ESTER)?\b", r"\bSEMESTER\s*:?\s*" + SEM_TOKEN + r"\b",
                r"\b" + SEM_TOKEN + r"\s+YEAR\b"):
        m = re.search(r"(?<![A-Z])" + pat, u)
        if m:
            tok = m.group(1)
            if "YEAR" in pat:
                return None
            return WORDS.get(tok) or ROMAN.get(tok)
    return None


def header_cycle(head: str) -> str | None:
    u = head.upper()
    if re.search(r"PHYSICS AND CHEMISTRY GROUP", u):
        return None
    m = re.search(r"\b[A-Z]{3}[ _-]?\d{4}[ _-]?(CHM|PHY)\b", u)
    if m:
        return "Chemistry" if m.group(1) == "CHM" else "Physics"
    m = re.search(r"\b(CHEMISTRY|PHYSICS) (CYCLE|GROUP)\b", u)
    if m:
        return m.group(1).title()
    m = re.search(r"\((CHM|PHY)\)", paper_name_hint)
    return None


paper_name_hint = ""


def parse_date(text: str) -> str | None:
    # Ignore "Report 14-Oct-2024 19:31:58" print stamps from the exam portal.
    text = re.sub(r"\d{1,2}-[A-Za-z]{3}-20\d{2}\s+\d{1,2}:\d{2}(:\d{2})?", " ", text)
    text = re.sub(r"(per|ort|Report)\s*-?\s*\d{1,2}-[A-Za-z]{3}-20\d{2}", " ", text)
    m = re.search(r"(\d{1,2})[- ]([A-Za-z]{3})[A-Za-z]*[- ,]+(20\d{2})", text)
    if m and m.group(2).lower()[:3] in MONTHS:
        mo = MONTHS[m.group(2).lower()[:3]]
        return f"{m.group(3)}-{mo:02d}" if m.group(1) == "00" else f"{m.group(3)}-{mo:02d}-{int(m.group(1)):02d}"
    m = re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b", text)
    if m and 1 <= int(m.group(2)) <= 12 and 1 <= int(m.group(1)) <= 31:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    m = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", text)
    if m:
        return m.group(0)
    m = re.search(r"\b(20\d{2})-(\d{2})\b(?!-)", text)
    if m and 1 <= int(m.group(2)) <= 12:
        return f"{m.group(1)}-{m.group(2)}"
    m = re.search(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ ,]+(20\d{2})", text, re.I)
    if m:
        return f"{m.group(2)}-{MONTHS[m.group(1).lower()[:3]]:02d}"
    return None


def kind_of(name: str, head: str) -> str:
    n, u = name.lower(), head.upper()
    if "paper + solutions" in n:
        return "Paper + solutions"
    if "solutions" in n:
        return "Solutions"
    if "question paper" in n or "(qp)" in n:
        return "Question paper"
    if re.search(r"SCHEME OF (EVALUATION|VALUATION)|ANSWER (KEY|SCHEME)|MARKS ARE AWARDED STRICTLY|"
                 r"END SEM EXAM SCHEME|SCHEME MID TERM|\(MS\)|\(AK\)|^SCHEME", u) or "(ms)" in n or "(ak)" in n:
        return "Answer scheme"
    if re.search(r"TYPE: MCQ Q1\..{0,400}\*\*|\bQ\.?\s?1\..{0,300}\*\*", head, re.I):
        return "Answer scheme"   # correct MCQ options are marked with **
    if re.search(r"\bSCHEME\b|SCHEW|ANSWER KEY|KEY ANSWERS", u[:400]):
        return "Answer scheme"
    return "Question paper"


def exam_of(manifest_exam: str, head: str, name: str) -> str:
    u = (head[:500] + " " + name).upper()
    named = re.match(r"^\d{4}-\d{2}\s+(Regular|Makeup)\b", name, re.I)
    if named:
        return "ENDSEM" if named.group(1).lower() == "regular" else "MAKEUP"
    if manifest_exam == "MIDSEM" or re.search(
            r"MID[- ]?(SEM|TERM)|MIDTERM|SESSIONAL|IN ?- ?SEMESTER|MID SEMESTER TEST", u):
        return "MIDSEM"
    if manifest_exam == "MAKEUP" or re.search(r"MAKE[- ]?UP", u):
        return "MAKEUP"
    return "ENDSEM"


DEPTS = {"BIO", "CHM", "CIE", "CIV", "CSE", "CSS", "ECE", "ELE", "HUM", "MAT", "MIE", "MME", "PHY", "ICT", "IT",
         "ECM", "DSE", "BPA", "CCE", "EEE", "AIM", "MTE", "BME", "CHE", "AAE"}


def name_code(name: str) -> str:
    m = re.search(r"\b([A-Z]{2,4})[ _-]*(\d{4})\b", name.upper())
    return f"{m.group(1)} {m.group(2)}" if m and m.group(1) in DEPTS else ""


def header_code(head: str) -> str | None:
    u = head[:600].upper()
    multi = re.search(r"\[\s*([A-Z]{2,4})[ _-]?(\d{4})\s*/\s*([A-Z]{2,4})[ _-]?(\d{4})\s*\]", u)
    if multi and multi.group(1) == multi.group(3) and multi.group(1) in DEPTS:
        return f"{multi.group(1)} {max(multi.group(2), multi.group(4))}"
    for pat in (r"\[\s*([A-Z]{2,4})[ _-]?(\d{4})", r"SUBJECT\s*:?\s*([A-Z]{2,4})[ _-]?(\d{4})",
                r"COURSE CODE\s*:?\s*\[?\s*([A-Z]{2,4})[ _-]?(\d{4})", r"\b([A-Z]{2,4})[ _-]?(\d{4})\b"):
        m = re.search(pat, u)
        if m and m.group(1) in DEPTS:
            return f"{m.group(1)} {m.group(2)}"
    return None


# ── Year 1 subjects ────────────────────────────────────────────────────────
# Cycle per subject comes from the official course codes printed on the
# papers: CHM 1071-CHM, BIO 1071-CHM, CIE 1072-CHM, CSE 1071-CHM,
# ELE 1071-CHM, CIE 1073-CHM / PHY 1071-PHY, CIE 1071-PHY, ECE 1071-PHY,
# ECE 1072-PHY, HUM 1071-PHY, MIE 1071-PHY, MIE 1072-PHY.

Y1_SUBJECTS = [
    # slug, title, cycle, keywords tested against the header + name (in order)
    ("mathematics-1", "Mathematics I", "Both", []),
    ("mathematics-2", "Mathematics II", "Both", []),
    ("physics", "Physics", "Physics", ["PHYSICS FOR ENGINEERS", "ENGINEERING PHYSICS", "PHYSICS [", "PHYSICS (PHY"]),
    ("chemistry", "Chemistry", "Chemistry", ["CHEMISTRY FOR ENGINEERS", "ENGINEERING CHEMISTRY", "ENGG. CHEMISTRY", "CHEMISTRY [", "CHEMISTRY (CHM"]),
    ("engineering-mechanics", "Engineering Mechanics and Smart Buildings", "Chemistry", ["SMART BUILDING"]),
    ("environmental-studies", "Environmental Studies", "Chemistry", ["ENVIRONMENTAL"]),
    ("mechanics-of-solids", "Mechanics of Solids", "Physics", ["MECHANICS OF SOLID"]),
    ("biology", "Biology for Engineers", "Chemistry", ["BIOLOGY"]),
    ("electronics", "Electronics", "Physics", ["ELECTRONICS"]),
    ("electrical", "Electrical Engineering", "Chemistry", ["ELECTRICAL"]),
    ("mechanical", "Mechanical Engineering", "Physics", ["MECHANICAL ENGINEERING", "MECHANICAL ENGG"]),
    ("english", "Communication Skills in English", "Physics", ["ENGLISH", "COMMUNICAITON SKILLS", "COMMUNICATION SKILLS"]),
    ("object-oriented-programming", "Intro to Object Oriented Programming", None, ["OBJECT ORIENTED"]),
    ("programming", "Programming (PSUC / Problem Solving)", "Chemistry",
     ["PROBLEM SOLVING", "PROGRAMMING FOR", "INTRODUCTION TO COMPUTERS"]),
]
Y1_ORDER = [s[0] for s in Y1_SUBJECTS]
# Fallback when a header is unreadable: course-code prefix, then the folder name.
Y1_CODE = [(r"^MAT 1[12]", None), (r"^IMA ", None), (r"^(CHM|ICH)", "chemistry"), (r"^BIO", "biology"),
           (r"^(CIE 10[05]2|CIE 1002|CIV 1004)", "environmental-studies"), (r"^(CIE 1073|CIV 1003)", "engineering-mechanics"),
           (r"^(CIE 1051|CIE 1071|ICE )", "mechanics-of-solids"), (r"^(CSE 1|CSS 1|PSUC|ICS )", "programming"),
           (r"^ELE", "electrical"), (r"^ECE 1", "electronics"), (r"^HUM", "english"), (r"^(MIE|MME|IME)", "mechanical"),
           (r"^PHY 10", "physics"), (r"^ICT 1271", "object-oriented-programming")]
FOLDER = {"ACE": "chemistry", "EC": "chemistry", "APE": "physics", "Physics": "physics", "EVS": "environmental-studies",
          "EMSB": "engineering-mechanics", "MOS": "mechanics-of-solids", "PPS": "programming", "PSUC": "programming",
          "FEE": "electrical", "BET": "electrical", "FE": "electronics", "BE": "electronics", "Eng": "english",
          "FME": "mechanical", "BME": "mechanical", "Bio": "biology", "OOPS": "object-oriented-programming"}


def y1_subject(head: str, name: str, code: str, folder: str, sem: int | None) -> str | None:
    probe = (head[:450] + " " + name).upper()
    if "MATHEMATIC" in probe or code.startswith(("MAT ", "IMA ")) or folder.startswith(("CM", "EM -")):
        return "mathematics-2" if sem == 2 else "mathematics-1"
    for slug, _t, _c, keys in Y1_SUBJECTS:
        if any(k in probe for k in keys):
            return slug
    for pat, slug in Y1_CODE:
        if slug and re.search(pat, code):
            return slug
    return FOLDER.get(folder)


# ── Year 2 branches ────────────────────────────────────────────────────────

def y2_branch(code: str) -> str:
    if re.match(r"^(CSE|CSS|IT|ICT|DSE|CCE)\b", code):
        return "CSE"
    if code.startswith("ECM"):
        return "EnC"
    if code.startswith("ECE"):
        return "ECE"
    if code.startswith("MAT"):
        return "Maths"
    return "Other"


def clean_title(name: str, code: str) -> str:
    t = re.sub(r"^\d{4}-\d{2}\s+(Regular|Makeup|Midsem|Endsem)\s*-\s*", "", name, flags=re.I)
    t = re.sub(r"\s+\d{4}(-\d{2}){0,2}\s+(Midsem|Second sessional).*$", "", t, flags=re.I)
    t = re.sub(r"\s+undated\s+Midsem.*$", "", t, flags=re.I)
    t = re.sub(r"\.pdf$", "", t, flags=re.I).replace("_", " ")
    t = re.sub(r"\s*\((?:[A-Z]{2,4}[ _]?\d{4}|\d+|Makeup)\)|\bRCS\b", "", t, flags=re.I)
    t = re.sub(r"Programing", "Programming", t)
    t = re.sub(r"^(?:(?:[A-Z]{1,4})[ _-]*\d{3,4}[ _-]*)+", "", t).strip(" -&")
    t = re.sub(r"\s+", " ", t).strip()
    letters = [ch for ch in t if ch.isalpha()]
    if letters and sum(ch.isupper() for ch in letters) / len(letters) > 0.6:
        t = t.title()
    t = re.sub(r"\b(And|Of|For|In|To)\b", lambda m: m.group(1).lower(), t)
    t = re.sub(r"\b(i{1,3}|iv|vi{0,3})\b", lambda m: m.group(1).upper(), t, flags=re.I)
    t = re.sub(r"\bVlsi\b", "VLSI", t)
    return t


# ── Year 2: current syllabus per branch ────────────────────────────────────
# Taken from the 2025-26 Semester 3 headers, which print who each course is for:
#   CSS 2101-2104 and MAT 2101: "SPL: COMPUTER SCIENCE AND ENGINEERING / ARTIFICIAL
#   INTELLIGENCE / CYBER SECURITY / DATA SCIENCE / INFORMATION TECHNOLOGY".
#   ECE 2121-2126 and MAT 2122: "SPL: ELECTRONICS AND COMMUNICATION ENGINEERING".
#   ECE 2127: "SPL: ELECTRONICS ENGINEERING (VLSI DESIGN AND TECHNOLOGY)", so not ECE.
#   ECM 2121-2125: MIT Bengaluru EnC papers, November 2025.
# CSE students do not take OOP, COA or DSD in the CSS syllabus, so those older
# courses live under "Older syllabus" instead of the main list.
# Semester 4 has no 2025-26 papers yet, so its list is the latest available (2024-25).
CURRENT = {
    "Semester 3": {
        "CSE": ["CSS 2101", "CSS 2102", "CSS 2103", "CSS 2104", "MAT 2101"],
        "EnC": ["ECM 2121", "ECM 2122", "ECM 2123", "ECM 2124", "ECM 2125"],
        "ECE": ["ECE 2121", "ECE 2122", "ECE 2123", "ECE 2124", "ECE 2125", "MAT 2122"],
    },
    "Semester 4": {
        "CSE": ["CSE 2221", "CSE 2222", "CSE 2223", "CSE 2224", "MAT 2226"],
        "EnC": ["ECM 2221", "ECM 2222", "ECM 2223", "ECM 2224", "ECM 2225"],
        "ECE": ["ECE 2221", "ECE 2222", "ECE 2223", "ECE 2224", "ECE 2225", "MAT 2227"],
    },
}
SEM_NOTE = {
    "Semester 4": "Semester 4 papers for the new syllabus are not out yet, so these are the most recent ones in the archive.",
}
# Older courses with the same content, shown inside the current subject.
# Checked against the printed questions, not just the titles.
SAME_SUBJECT = {
    "CSS 2101": ["CSE 2122", "CSE 2152", "ICT 2121", "ICT 2153", "IT 2121", "DSE 2122"],
    "CSS 2102": ["IT 2124", "ICT 2124", "ICT 2156"],
    "CSS 2104": ["IT 2123", "ICT 2123", "ICT 2154"],
    "MAT 2101": ["MAT 2126", "MAT 2155"],
    "MAT 2122": ["MAT 2152"],
    # ECE 2126 Analog Circuits: same slot (27 Nov 2025), same SPL and same MOSFET
    # topics as ECE 2121, so both show as one Analog Electronic Circuits subject.
    "ECE 2121": ["ECE 2126", "ECE 2151"],
    "ECE 2122": ["ECE 2154"],
    "ECE 2123": ["ECE 2155"],
    "ECE 2124": ["ECE 2153"],
    "CSE 2221": ["CSE 2254"],
    "CSE 2222": ["CSE 2252", "ICT 2222", "ICT 2257", "IT 2257"],
    "CSE 2223": ["CSE 2253", "ICT 2223"],
    "CSE 2224": ["CSE 2251", "ICT 2221"],
    "MAT 2226": ["MAT 2256"],   # headers: COMPUTER SCIENCE / INFORMATION TECHNOLOGY
    "MAT 2227": ["MAT 2257"],   # headers: ELECTRONICS AND COMMUNICATION ENGINEERING
    "ECE 2221": ["ECE 2254"],
    "ECE 2222": ["ECE 2255"],
    "ECE 2223": ["ECE 2253"],
    "ECM 2222": ["ECE 2252"],
}
BRANCH_PREFIX = {"CSE": ("CSE", "CSS", "IT", "ICT", "DSE"), "EnC": ("ECM",), "ECE": ("ECE",)}
BRANCH_MATHS = {"CSE": ("MAT 2101", "MAT 2126", "MAT 2155", "MAT 2226", "MAT 2256"),
                "ECE": ("MAT 2122", "MAT 2152", "MAT 2227", "MAT 2257"), "EnC": ()}


def build_year2_views(out_y2: dict) -> dict:
    views = {}
    for sem, subjects in out_y2.items():
        by_code = {s["code"]: s for s in subjects}
        views[sem] = {"note": SEM_NOTE.get(sem), "branches": {}}
        for branch, current in CURRENT[sem].items():
            used = set()
            main = []
            for code in current:
                if code not in by_code:
                    continue
                older = [c for c in SAME_SUBJECT.get(code, []) if c in by_code]
                used.update([code, *older])
                main.append({"code": code, "older": older})
            rest = [s["code"] for s in subjects if s["code"] not in used and (
                s["code"].startswith(BRANCH_PREFIX[branch]) or s["code"] in BRANCH_MATHS[branch])]
            shared = [s["code"] for s in subjects if s["code"] not in used and s["code"] not in rest
                      and s["branch"] in ("Maths", "Other")]
            views[sem]["branches"][branch] = {"current": main, "older": rest, "shared": shared}
    return views


# ── Best three papers per subject ──────────────────────────────────────────
MAX_PAPERS = 3


def academic_year(d: str | None) -> int:
    if not d:
        return 0
    y, m = int(d[:4]), int(d[5:7]) if len(d) >= 7 else 1
    return y if m >= 7 else y - 1


def content_key(e: dict) -> str:
    """The paper's own text, so a copy filed under another name counts once."""
    t = cache.get(e["href"], "")
    t = re.sub(r"\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}\s*[AP]M", "", t)
    t = re.sub(r"[^a-z]", "", t.lower())
    i = t.find("manipalacademy")
    return t[i if i >= 0 else 0:][:700]


def pick_best(papers: list[dict], include_midsem: bool = False) -> list[dict]:
    """Up to three recent, readable, distinct question papers.

    Order of preference: latest academic year, every current course code
    represented, regular end-sem before makeup, archive copy before student
    scan, readable text before poor scans. Matching answer schemes from the
    same sitting are attached to the paper instead of taking a slot.
    """
    pool = [e for e in papers if include_midsem or e["exam"] != "MIDSEM"]
    questions = [e for e in pool if e["kind"] in ("Question paper", "Paper + solutions")]
    answers = [e for e in pool if e["kind"] in ("Answer scheme", "Solutions")]

    def quality(e):
        text = len(cache.get(e["href"], ""))
        named_right = name_code(e["name"]) in ("", e["code"])
        return (academic_year(e.get("date")), e["exam"] == "ENDSEM", not e.get("scan"),
                named_right, min(text, 1500), e.get("date") or "")

    seen_text, seen_sitting, distinct = set(), set(), []
    for e in sorted(questions, key=quality, reverse=True):
        key = content_key(e)
        sitting = (e["code"], e["exam"], e.get("date"))
        if (key and key in seen_text) or sitting in seen_sitting:
            continue
        seen_text.add(key)
        seen_sitting.add(sitting)
        distinct.append(e)

    if not distinct:
        return []
    latest_year = academic_year(distinct[0].get("date"))
    current_codes = []
    for e in distinct:
        if academic_year(e.get("date")) == latest_year and e["code"] and e["code"] not in current_codes:
            current_codes.append(e["code"])

    chosen = []
    # 1. The best paper of each current course.
    for code in current_codes:
        first = next((e for e in distinct if e["code"] == code), None)
        if first and len(chosen) < MAX_PAPERS:
            chosen.append(first)
    # 2. Fill with the next best, preferring an exam type not yet shown for that course.
    for want_new_exam in (True, False):
        for e in distinct:
            if len(chosen) >= MAX_PAPERS:
                break
            if e in chosen:
                continue
            if want_new_exam and any(c["code"] == e["code"] and c["exam"] == e["exam"] for c in chosen):
                continue
            chosen.append(e)

    out = []
    for e in sorted(chosen, key=lambda e: (e.get("date") or "", e["exam"] == "ENDSEM"), reverse=True):
        e = dict(e)
        match = next((a for a in answers if a.get("date") == e.get("date") and a["exam"] == e["exam"]
                      and (not a["code"] or not e["code"] or a["code"] == e["code"])), None)
        if match:
            e["answers"] = match["href"]
        out.append(e)
    return out


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    global paper_name_hint
    m = json.load(open(MANIFEST))
    seen: set[str] = set()
    y1: dict[str, list] = defaultdict(list)
    y2: dict[tuple[int, str], dict] = {}
    dropped = []

    for year in ("Year 1", "Year 2"):
        for sem_label, sem_data in m["years"][year]["sems"].items():
            scan = sem_label.startswith("Student scans")
            for branch, bdata in sem_data["branches"].items():
                for exam, edata in bdata.items():
                    for subject, sdata in edata["subjects"].items():
                        for p in sdata["papers"]:
                            pdf = local_pdf(p["href"])
                            real = "/" + os.path.relpath(pdf, os.path.join(ROOT, "public")) if pdf else None
                            href = urllib.parse.quote(real) if real and not os.path.exists(
                                os.path.join(ROOT, "public", urllib.parse.unquote(p["href"]).lstrip("/"))) else p["href"]
                            key_file = real if real and p["href"].startswith("/YEAR1/") else p["href"]
                            if key_file in seen:
                                continue
                            seen.add(key_file)
                            paper_name_hint = p["name"]
                            text = first_page_text(p)
                            head = text[:700]
                            sem = header_semester(head)
                            if sem is None and not scan:
                                sem = int(sem_label.split()[-1])
                            ex = exam_of(exam, head, p["name"])
                            d = parse_date(p["name"]) if re.search(r"\d{1,2}[- ][A-Za-z]{3,4}[a-z]*[- ]20\d{2}", p["name"]) else None
                            exam_date = re.search(r"(Exam Date[^:]*:|Date of Exam:|Date:)\s*(.{0,40})", head)
                            d = d or (parse_date(exam_date.group(2)) if exam_date else None) or parse_date(head) or parse_date(p["name"])
                            if sem is None and d and len(d) >= 7:
                                month = int(d[5:7])
                                odd = month >= 8 or (month <= 1 and ex != "MIDSEM")
                                base = 1 if year == "Year 1" else 3
                                sem = base if odd else base + 1
                            if year == "Year 1" and d and len(d) >= 7:
                                month = int(d[5:7])
                                if 5 <= month <= 8 or (ex == "MIDSEM" and 2 <= month <= 4):
                                    sem = 2
                                elif month >= 9 or month == 1:
                                    sem = 1 if sem in (None, 1, 2) else sem
                            parts = urllib.parse.unquote(p["href"]).split("/")
                            folder = re.sub(r"\s+(Midsem|Endsem)$", "", parts[-2]) if p["href"].startswith("/YEAR1/") else subject
                            code = header_code(head) or name_code(p["name"]) or (subject if re.match(r"^[A-Z]{2,4} \d{4}", subject) else "")
                            reviewed = re.match(r"^([A-Z]{2,4}) (\d{4}) .+ (Midsem|Second sessional) - ", p["name"])
                            if reviewed:
                                code = f"{reviewed.group(1)} {reviewed.group(2)}"
                            code = {"ECM2 221": "ECM 2221", "T 2257": "IT 2257"}.get(code, code)
                            if (cm := re.match(r"^[A-Z]{2,4} 2([12])\d\d$", code)):
                                sem = 3 if cm.group(1) == "1" else 4
                            if code == "CIE 1072" and "SMART BUILDING" in (head + p["name"]).upper():
                                code = "CIE 1073"
                            entry = {
                                "name": p["name"], "href": href,
                                **({"editableId": p["editableId"]} if p.get("editableId") else {}),
                                "exam": ex, "kind": kind_of(p["name"], head),
                                "semester": sem, "date": d,
                                **({"cycle": c} if (c := header_cycle(head + " " + p["name"])) else {}),
                                **({"scan": True} if scan or p.get("community") else {}),
                                "code": code,
                            }
                            nc = name_code(p["name"])
                            if nc and code and nc != code and re.match(r"^[A-Z]{2,4} \d{4}$", code) and code[:3] == nc[:3] \
                                    and not re.search(re.escape(code.split()[1]), p["name"]) \
                                    and not re.search(nc.split()[1], head[max(0, head.upper().find("MANIPAL ACADEMY")):]) \
                                    and not (lambda nt: nt and nt in re.sub(r"[^a-z]", "", head.lower()))(
                                        re.sub(r"[^a-z]", "", clean_title(p["name"], nc).lower())):
                                entry["note"] = f"File is named {nc}; the paper inside is {code}"
                            if "INTERNATIONAL CENTRE FOR APPLIED SCIENCES" in head.upper():
                                entry["note"] = "ICAS B.Sc. (Engg)"
                            if sem in (1, 2):
                                slug = y1_subject(head, p["name"], code, folder, sem) or y1_subject("", "", subject, folder, sem)
                                if slug:
                                    y1[slug].append(entry)
                                    continue
                            if sem in (3, 4):
                                key = (sem, re.sub(r"\s+[A-Z]$", "", code))
                                if not re.match(r"^[A-Z]{2,4} \d{4}$", key[1]):
                                    dropped.append((year, sem_label, subject, p["name"], sem, "no course code"))
                                    continue
                                g = y2.setdefault(key, {"code": key[1], "titles": [], "papers": []})
                                g["papers"].append(entry)
                                if not scan and name_code(p["name"]) == key[1]:
                                    g["titles"].append((d or "", clean_title(p["name"], key[1])))
                                continue
                            dropped.append((year, sem_label, subject, p["name"], sem, "other year"))

    def sort_key(e):
        return (e.get("date") or "0000", e["name"])

    for papers in y1.values():
        by_day = {(e["exam"], e.get("date")): e["code"] for e in papers if e["code"]}
        for e in papers:
            if not e["code"] and (e["exam"], e.get("date")) in by_day:
                e["code"] = by_day[(e["exam"], e.get("date"))]

    exam_rank = {"MIDSEM": 0, "ENDSEM": 1, "MAKEUP": 2}
    out_y1 = []
    for slug, title, cycle, _k in Y1_SUBJECTS:
        papers = sorted(y1.get(slug, []), key=sort_key, reverse=True)
        if papers:
            out_y1.append({"slug": slug, "title": title, "cycle": cycle,
                           "papers": sorted(papers, key=lambda e: exam_rank[e["exam"]])})

    out_y2 = {}
    for (sem, code), g in y2.items():
        titles = sorted((t for t in g["titles"] if t[1]), reverse=True)
        title = titles[0][1] if titles else ""
        if not title:
            title = clean_title(g["papers"][0]["name"], code)
        papers = sorted(g["papers"], key=sort_key, reverse=True)
        out_y2.setdefault(f"Semester {sem}", []).append({
            "code": code, "title": title, "branch": y2_branch(code),
            "latest": papers[0].get("date") or "",
            "papers": sorted(papers, key=lambda e: exam_rank[e["exam"]]),
        })
    for sem in out_y2:
        out_y2[sem].sort(key=lambda s: (s["latest"][:4], s["code"]), reverse=True)

    for subj in out_y1:
        subj["top"] = pick_best(subj["papers"])
    for subjects in out_y2.values():
        for subj in subjects:
            subj["top"] = pick_best(subj["papers"])
    views = build_year2_views(out_y2)
    for sem, v in views.items():
        by_code = {x["code"]: x for x in out_y2[sem]}
        for branch in v["branches"].values():
            for cur in branch["current"]:
                merged = [p for c in [cur["code"], *cur["older"]] for p in by_code[c]["papers"]] if cur["code"] in by_code else []
                cur["top"] = pick_best(merged)
    json.dump({"generated": date.today().isoformat(), "year1": out_y1, "year2": out_y2, "year2Views": views},
              open(OUT, "w"), indent=1, ensure_ascii=False)
    json.dump(cache, open(CACHE, "w"))

    total = sum(len(s["papers"]) for s in out_y1) + sum(len(s["papers"]) for v in out_y2.values() for s in v)
    print(f"Year 1: {sum(len(s['papers']) for s in out_y1)} papers in {len(out_y1)} subjects")
    for sem, subs in sorted(out_y2.items()):
        print(f"Year 2 {sem}: {sum(len(s['papers']) for s in subs)} papers in {len(subs)} subjects")
    print(f"Total {total}, left out of this view {len(dropped)}:")
    for d in dropped:
        print("  ", d)
    if "--year2" in sys.argv:
        for sem, subs in sorted(out_y2.items()):
            for s in subs:
                print(f"\n## {sem} {s['branch']:6} {s['code']} {s['title']}")
                for e in s["papers"]:
                    print(f"   {e['exam']:7} S{e['semester']} {e['kind']:17} {e.get('date') or '?':10} {e['name'][:70]}")
    if "--verbose" in sys.argv:
        for s in out_y1:
            print(f"\n## {s['title']} ({s['cycle']})")
            for e in s["papers"]:
                print(f"   {e['exam']:7} S{e['semester']} {e.get('cycle','-'):9} {e['kind']:17} {e.get('date') or '?':10} {e['code']:10} {e['name'][:60]}")


if __name__ == "__main__":
    main()

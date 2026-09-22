#!/usr/bin/env python3
"""Build a source-backed question library. Run prepare, then vision, then validate.

Python dependencies: PyMuPDF, Pillow, openai. System OCR: tesseract.
The offline pass never guesses LaTeX. Every extraction keeps a rendered source.
Vision checkpoints are reusable and credentials are never written to public data.
"""
from __future__ import annotations

import argparse
import base64
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import quote, unquote

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUT = PUBLIC / "repeat-v2"
CACHE = ROOT / "generated" / "repeat-v2"
VERSION = 3
DPI = 170
Q_START = re.compile(r"^\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,2}\s*[A-Fa-f]?)\s*[).:]\s*(.*)$")
Q_SPLIT = re.compile(r"^\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,2})\s*\(?([a-fA-F])\)\s*(.*)$")
SUBJECTS = {
    "CM-I": "Computational Mathematics I", "CM-II": "Computational Mathematics II",
    "EM - I": "Engineering Mathematics I", "EM-II": "Engineering Mathematics II",
    "EM-III": "Engineering Mathematics III", "EM-IV": "Engineering Mathematics IV",
    "EM": "Engineering Mathematics III", "EC": "Engineering Chemistry",
    "ACE": "Applied Chemistry for Engineers", "APE": "Applied Physics for Engineers",
    "Physics": "Engineering Physics", "EVS": "Environmental Studies",
    "Bio": "Biology for Engineers", "BET": "Basic Electrical Technology",
    "BE": "Basic Electronics", "FEE": "Fundamentals of Electrical Engineering",
    "FE": "Fundamentals of Electronics", "FME": "Fundamentals of Mechanical Engineering",
    "BME": "Basic Mechanical Engineering", "MOS": "Mechanics of Solids",
    "PPS": "Programming for Problem Solving", "PSUC": "Problem Solving Using Computers",
    "OOPS": "Object Oriented Programming", "OOP": "Object Oriented Programming",
    "Eng": "Communication Skills in English", "EMSB": "Engineering Mechanics and Smart Buildings",
    "DataStructures": "Data Structures", "DigitalSystem": "Digital Systems",
    "DigitalSystems": "Digital Systems", "DigitalDesignSystems": "Digital System Design",
    "ComputerOrganization": "Computer Organization", "ComputerNetworks": "Computer Networks",
    "AnalogElectronic": "Analog Electronic Circuits", "NetworkAnalysis": "Network Analysis",
    "SignalsSystems": "Signals and Systems", "EMWaves": "Electromagnetic Waves",
    "LinearIntegratedCircuits": "Linear Integrated Circuits", "VLSIDesign": "VLSI Design",
    "EmbeddedSystems": "Embedded Systems", "FormalLanguages": "Formal Languages and Automata Theory",
    "DatabaseSystems": "Database Systems", "OperatingSystems": "Operating Systems",
    "DSP": "Digital Signal Processing", "PrincipalDataCommunication": "Principles of Data Communication",
    "Circuits&Systems": "Circuits and Systems",
}

SUBJECT_ALIASES = [
    (r"applied chemistry(?: for engineers)?", "Applied Chemistry for Engineers"),
    (r"(?:engineering|engg\.?)\s*chemistry", "Engineering Chemistry"),
    (r"applied physics(?: for engineers)?", "Applied Physics for Engineers"),
    (r"engineering physics", "Engineering Physics"),
    (r"biology for engineers", "Biology for Engineers"),
    (r"environmental studies", "Environmental Studies"),
    (r"mechanics of solids?\b", "Mechanics of Solids"),
    (r"engineering mechanics (?:and|&) smart buildings", "Engineering Mechanics and Smart Buildings"),
    (r"basic electrical technology", "Basic Electrical Technology"),
    (r"fundamentals of electrical engineering", "Fundamentals of Electrical Engineering"),
    (r"fundamentals of electronics", "Fundamentals of Electronics"),
    (r"basic electronics", "Basic Electronics"),
    (r"fundamentals of mechanical engineering", "Fundamentals of Mechanical Engineering"),
    (r"basic mechanical engineering science", "Basic Mechanical Engineering Science"),
    (r"basic mechanical engineering(?! science)", "Basic Mechanical Engineering"),
    (r"communic(?:ation|aiton) skills in english (?:and|&) human values", "Communication Skills in English and Human Values"),
    (r"communic(?:ation|aiton) skills in english(?! (?:and|&) human values)", "Communication Skills in English"),
    (r"programming for problem solving", "Programming for Problem Solving"),
    (r"problem solving using computers", "Problem Solving Using Computers"),
    (r"introduction to object[- ]oriented programming", "Introduction to Object Oriented Programming"),
    (r"object[- ]oriented programming", "Object Oriented Programming"),
    (r"computer organization (?:and|&) microprocessor systems", "Computer Organization and Microprocessor Systems"),
    (r"computer organization (?:and|&) architecture", "Computer Organization and Architecture"),
    (r"digital systems? (?:and |& )?computer organization", "Digital Systems and Computer Organization"),
    (r"digital system design", "Digital System Design"),
    (r"data communication (?:and |& )?computer networks", "Data Communication and Computer Networks"),
    (r"data structures (?:and|&) applications", "Data Structures and Applications"),
    (r"data structures(?! (?:and|&) applications)", "Data Structures"),
    (r"data analytics", "Data Analytics"),
    (r"discrete mathematical structures", "Discrete Mathematical Structures"),
    (r"principles? of data communication", "Principles of Data Communication"),
    (r"analog electronic circuits", "Analog Electronic Circuits"),
    (r"analog integrated circuits", "Analog Integrated Circuits"),
    (r"linear integrated circuits", "Linear Integrated Circuits"),
    (r"analog circuits", "Analog Circuits"),
    (r"digital circuits", "Digital Circuits"),
    (r"signals (?:and|&) systems", "Signals and Systems"),
    (r"circuits (?:and|&) systems", "Circuits and Systems"),
    (r"network analysis", "Network Analysis"),
    (r"electromagnetic waves", "Electromagnetic Waves"),
    (r"digital signal processing", "Digital Signal Processing"),
    (r"embedded systems", "Embedded Systems"),
    (r"formal languages (?:and|&) automata theory", "Formal Languages and Automata Theory"),
    (r"database systems", "Database Systems"),
    (r"design (?:and|&) analysis of algorithms", "Design and Analysis of Algorithms"),
    (r"operating systems", "Operating Systems"),
    (r"computer network protocols", "Computer Network Protocols"),
    (r"computer networks", "Computer Networks"),
    (r"python programming", "Python Programming"),
    (r"linux programming", "Linux Programming"),
    (r"vlsi design", "VLSI Design"),
    (r"microprocessors", "Microprocessors"),
    (r"microwave engineering", "Microwave Engineering"),
    (r"modern control theory", "Modern Control Theory"),
    (r"soft computing", "Soft Computing"),
    (r"technology (?:and |& )?public policy", "Technology and Public Policy"),
    (r"machine learning in vlsi", "Machine Learning in VLSI"),
]


def canonical_subject(header, fallback, code):
    text = re.sub(r"\s+", " ", header.replace("\u00ad", " ").replace("_", " ")).lower()
    matches = []
    for pattern, title in SUBJECT_ALIASES:
        match = re.search(pattern, text)
        if match:
            matches.append((match.start(), -len(match[0]), title))
    for pattern, name in ((r"computational mathematics\s*[-:]?\s*(iii|ii|iv|i|1|2|3|4)\b", "Computational Mathematics"),
                          (r"(?:engineering mathematics|engg\.?\s*maths?)\s*[-:]?\s*(iii|ii|iv|il|i|1|2|3|4)\b", "Engineering Mathematics"),
                          (r"mathematical foundations for data science\s*[-:]?\s*(ii|i|1|2)\b", "Mathematical Foundations for Data Science")):
        match = re.search(pattern, text)
        if match:
            number = {"1": "I", "2": "II", "3": "III", "4": "IV", "il": "II"}.get(match[1], match[1].upper())
            matches.append((match.start(), -len(match[0]), f"{name} {number}"))
    if matches:
        return sorted(matches)[0][2]
    title = re.sub(r"\s*\[[^\]]*\]|\s*\([A-Z]{2,4}[-_ ]*\d{3,4}[^)]*\)|\s*\(DTQ\)", "", fallback, flags=re.I).strip()
    title = re.sub(r"\s+", " ", title).title()
    title = re.sub(r"\b(Of|For|And|In|To)\b", lambda m: m[0].lower(), title)
    return re.sub(r"\b(Iii|Ii|Iv|Vlsi|Dsp|Ml)\b", lambda m: m[0].upper(), title)


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(path)


def unique_dicts(items):
    return list({json.dumps(x, sort_keys=True): x for x in items}.values())


def href(path):
    return "/" + quote(str(path.relative_to(PUBLIC)), safe="/()")


def discover():
    manifest = json.loads((ROOT / "lib/papers-manifest.json").read_text())
    paths = defaultdict(list)
    for year, yd in manifest.get("years", {}).items():
        if year not in ("Year 1", "Year 2"):
            continue
        for sem, sd in yd["sems"].items():
            for branch, bd in sd["branches"].items():
                for exam, ed in bd.items():
                    for subject, subd in ed["subjects"].items():
                        for paper in subd["papers"]:
                            file = PUBLIC / unquote(paper["href"].lstrip("/"))
                            paths[file].append({"academicYear": int(year[-1]), "semester": sem,
                                "branch": branch, "examType": exam, "subject": subject,
                                "href": paper["href"], "name": paper["name"],
                                "editableId": paper.get("editableId")})
    for year in (1, 2):
        for file in sorted((PUBLIC / f"YEAR{year}").rglob("*")):
            if file.suffix.lower() != ".pdf":
                continue
            parts = file.relative_to(PUBLIC / f"YEAR{year}").parts
            raw = re.sub(r"\s+(?:Endsem|Endsm|Midsem)$", "", parts[1], flags=re.I)
            subject = SUBJECTS.get(raw, re.sub(r"(?<=[a-z])(?=[A-Z])", " ", raw))
            paths[file].append({"academicYear": year, "semester": "Unspecified",
                "branch": parts[0], "examType": "MIDSEM" if "midsem" in parts[1].lower() else "ENDSEM",
                "subject": subject, "href": href(file), "name": file.stem})
    recovered = []
    # Folder and manifest classifications contain mistakes. Audit every other MIT
    # authoritative PDF header so Year 1/2 papers filed under Semester 5/7 survive.
    for file in sorted((PUBLIC / "authoritative").rglob("*.pdf")):
        if file in paths:
            continue
        try:
            with fitz.open(file) as document:
                printed = document[0].get_text()
            year, sem, title, code, exam_year = header_metadata(printed, {})
        except Exception:
            continue
        if year not in (1, 2) or re.search(r"M\.?\s*TECH", printed[:1500], re.I):
            continue
        paths[file].append({"academicYear": year, "semester": f"Semester {sem}", "branch": "All Programs",
            "examType": "MAKEUP" if "makeup" in str(file).lower() else "REGULAR",
            "subject": title or re.sub(r"^[A-Z]{2,4}[-_ ]*\d{4}[-_ ]*", "", file.stem), "href": href(file), "name": file.stem})
        recovered.append(str(file.relative_to(PUBLIC)))
    grouped = {}
    missing = []
    for path, sources in paths.items():
        if not path.exists():
            missing.append(str(path.relative_to(PUBLIC)))
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        group = grouped.setdefault(digest, {"id": digest[:20], "sha256": digest, "path": str(path), "sources": []})
        group["sources"].extend(sources)
    return list(grouped.values()), {"discoveredSourceFiles": len(paths), "uniqueSourceFiles": len(grouped), "missing": missing, "recoveredMisfiledSources": recovered}


def clean(text):
    return text.replace("\x00", "").replace("\ufffd", "[unreadable]").replace("\u2014", "-").strip()


def normalize_markdown(text):
    """Normalize delimiters without changing the transcribed mathematics."""
    parts = re.split(r"(```[\s\S]*?```)", clean(text))
    for i, part in enumerate(parts):
        if part.startswith("```"):
            continue
        part = part.replace(r"\n\n", "\n\n")
        part = re.sub(r"\\\[(.*?)\\\]", lambda m: "$$" + m[1] + "$$", part, flags=re.S)
        part = re.sub(r"\\\((.*?)\\\)", lambda m: "$" + m[1] + "$", part, flags=re.S)
        # remark-math requires multiline display delimiters on their own lines.
        part = re.sub(r"\$\$(.*?)\$\$", lambda m: "\n\n$$\n" + m[1].strip() + "\n$$\n\n", part, flags=re.S)
        parts[i] = re.sub(r"\n{3,}", "\n\n", part)
    return "".join(parts).strip()


def header_metadata(text, group):
    header = text[:3500]
    ordinal = {"FIRST": 1, "SECOND": 2, "THIRD": 3, "FOURTH": 4, "FIFTH": 5, "SIXTH": 6, "SEVENTH": 7, "EIGHTH": 8,
               "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8}
    match = re.search(r"\b(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|VIII|VII|VI|IV|III|II|V|I|[1-8](?:ST|ND|RD|TH)?)\s+SEMESTER\b", header, re.I)
    semester = ordinal.get(match[1].upper(), int(re.sub(r"\D", "", match[1])) if re.search(r"\d", match[1]) else None) if match else None
    academic_year = (semester + 1) // 2 if semester else None
    code_match = re.search(r"\b(BIO|BI0|CHM|CIE|CIV|CSE|CSS|DSE|DS|ECE|ECM|ELE|HUM|ICT|IT|MAT|MIE|MME|PHY|MA|ICE)[-_ ]*(\d{3,4})\b", header)
    subject_code = f"{code_match[1]} {code_match[2]}" if code_match else None
    subject_match = re.search(r"(?:^|\n)\s*SUBJECT\s*:\s*(.+?)(?:\n|$)", header, re.I)
    title = None
    if subject_match:
        title = re.sub(r"^(?:[A-Z]{2,4}\s*[-_ ]*\d{4}(?:[-_ ]*(?:CHM|PHY|B)\b)?\s*[/, -]*)+", "", subject_match[1]).strip(" -:_")
        title = re.sub(r"\s+", " ", title)
        if len(title) < 5 or re.fullmatch(r"[A-Z]+[-_ ]?\d+", title):
            title = None
    if not title:
        title_match = re.search(r"(?:^|\n)([A-Z][A-Z &()/.\-]{6,90})\s*\[[A-Z]{2,4}\s*[-_ ]*\d{4}", header)
        if title_match:
            title = title_match[1].strip()
    if title:
        title = re.sub(r"\s*\[[A-Z0-9 _/-]+\]\s*$", "", title)
        title = re.sub(r"\s*-\s*([IVX]+)\b", r" \1", title.title(), flags=re.I)
        title = re.sub(r"\b(Ii|Iii|Iv|Vi|Vii|Viii)\b", lambda m: m[0].upper(), title)
    # Match complete visible subject names across wrapped header lines.
    title = canonical_subject(header[:1800], title or "", subject_code) or title
    dates = re.search(r"Exam Date.*?(\d{2})[- /]([A-Za-z]+|\d{2})[- /](20\d{2})", header, re.I)
    year = int(dates[3]) if dates else None
    if not year:
        candidates = re.findall(r"\b20(?:1\d|2\d)\b", header[:1600])
        year = int(candidates[0]) if candidates else None
    return academic_year, semester, title, subject_code, year


def text_lines(page):
    result = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            text = clean("".join(span["text"] for span in line["spans"]))
            if text:
                result.append({"text": text, "bbox": list(line["bbox"])})
    return sorted(result, key=lambda x: (round(x["bbox"][1], 1), x["bbox"][0]))


def ocr_lines(image_path, width, height, page_width, page_height):
    result = subprocess.run(["tesseract", str(image_path), "stdout", "-l", "eng", "--psm", "3", "tsv"],
                            capture_output=True, text=True, timeout=120, check=True)
    lines = defaultdict(list)
    for row in result.stdout.splitlines()[1:]:
        values = row.split("\t", 11)
        if len(values) != 12 or values[0] != "5" or not values[11].strip():
            continue
        try:
            x, y, w, h = (int(v) for v in values[6:10])
        except ValueError:
            continue
        lines[tuple(values[1:5])].append((x, y, w, h, values[11]))
    extracted = []
    for words in lines.values():
        x0 = min(w[0] for w in words); y0 = min(w[1] for w in words)
        x1 = max(w[0] + w[2] for w in words); y1 = max(w[1] + w[3] for w in words)
        extracted.append({"text": clean(" ".join(w[4] for w in words)), "bbox": [x0 / width * page_width,
            y0 / height * page_height, x1 / width * page_width, y1 / height * page_height]})
    return sorted(extracted, key=lambda x: (round(x["bbox"][1], 1), x["bbox"][0]))


def question_marker(text):
    match = Q_SPLIT.match(text)
    if match:
        return match[1] + match[2].upper(), match[3]
    match = Q_START.match(text)
    if match:
        return re.sub(r"\s", "", match[1]).upper(), match[2]
    # Printed question labels sometimes have no closing punctuation.
    match = re.match(r"^\s*(\d{1,2}[A-Fa-f])\s*$", text)
    return (match[1].upper(), "") if match else None


def crop_asset(image, paper_id, name, page_num, bounds):
    left, top, right, bottom = bounds
    left, top = max(0, int(left)), max(0, int(top))
    right, bottom = min(image.width, int(right + 1)), min(image.height, int(bottom + 1))
    if right <= left or bottom <= top:
        return None
    destination = OUT / "assets" / paper_id / f"{name}.jpg"
    image.crop((left, top, right, bottom)).save(destination, quality=94, optimize=True)
    return {"src": "/" + str(destination.relative_to(PUBLIC)), "pageNumber": page_num,
            "bbox": [left, top, right - left, bottom - top]}


def prepare_paper(group, force=False):
    paper_id = group["id"]
    output = OUT / "papers" / f"{paper_id}.json"
    checkpoint = CACHE / "prepared" / f"{paper_id}.json"
    if not force and output.exists() and checkpoint.exists():
        cached = json.loads(checkpoint.read_text())
        if cached.get("version") == VERSION:
            return {"id": paper_id, "cached": True}
    doc = fitz.open(group["path"])
    first_text = doc[0].get_text()
    year, sem, title, subject_code, exam_year = header_metadata(first_text, group)
    if year and year > 2:
        return {"id": paper_id, "excluded": True, "reason": f"Printed header identifies Semester {sem}", "sources": group["sources"]}
    original_sources = unique_dicts(group["sources"])
    sources = [{k: v for k, v in x.items() if k != "editableId"} for x in original_sources]
    memberships = []
    for source in sources:
        membership = {k: source[k] for k in ("academicYear", "semester", "branch", "examType", "subject")}
        if year:
            membership["academicYear"] = year
            membership["semester"] = f"Semester {sem}"
        if title:
            membership["subject"] = title
        memberships.append(membership)
    memberships = unique_dicts(memberships)
    # Human subject labels from local folders are preferable to bare course codes.
    primary = next((x for x in memberships if not re.fullmatch(r"[A-Z]{2,5}[ 0-9A-Z_-]*", x["subject"])), memberships[0])
    paper = {"id": paper_id, "name": sources[0]["name"], **primary,
             "subjectCode": subject_code, "examYear": exam_year, "href": sources[0]["href"],
             "sourceFiles": sources, "memberships": memberships, "pageCount": len(doc),
             "questionCount": 0, "status": "partial", "pages": [], "questions": [],
             "warnings": ["Automatic text extraction has not been fully visually verified. Original page images preserve equations, tables, and diagrams."]}
    raw_pages = []
    assets = OUT / "assets" / paper_id
    assets.mkdir(parents=True, exist_ok=True)
    previous = None
    for page_index, page in enumerate(doc):
        page_num = page_index + 1
        image_path = assets / f"page-{page_num}.jpg"
        pix = page.get_pixmap(matrix=fitz.Matrix(DPI / 72, DPI / 72), alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        image.save(image_path, quality=91, optimize=True)
        lines = text_lines(page)
        native_text = "\n".join(x["text"] for x in lines)
        method = "pdf-text"
        # Image-only or almost empty native layers require real OCR, with position data.
        if len(re.sub(r"\s", "", native_text)) < 200:
            try:
                lines = ocr_lines(image_path, image.width, image.height, page.rect.width, page.rect.height)
                method = "tesseract"
            except Exception as exc:
                paper["warnings"].append(f"Page {page_num}: local OCR failed ({type(exc).__name__}). Source image is available.")
                method = "source-image"
        if page_index == 0 and len(native_text) < 200:
            inferred_year, inferred_sem, inferred_title, inferred_code, inferred_exam_year = header_metadata("\n".join(x["text"] for x in lines), group)
            if inferred_year and inferred_year > 2:
                return {"id": paper_id, "excluded": True, "reason": f"OCR header identifies Semester {inferred_sem}", "sources": group["sources"]}
            if inferred_year:
                paper["academicYear"] = inferred_year
                paper["semester"] = f"Semester {inferred_sem}"
                for member in memberships:
                    member["academicYear"] = inferred_year; member["semester"] = f"Semester {inferred_sem}"
            if inferred_title:
                paper["subject"] = inferred_title
                for member in memberships: member["subject"] = inferred_title
            paper["subjectCode"] = paper["subjectCode"] or inferred_code
            paper["examYear"] = paper["examYear"] or inferred_exam_year
        page_record = {"number": page_num, "image": "/" + str(image_path.relative_to(PUBLIC)),
            "width": image.width, "height": image.height, "method": method, "status": "partial"}
        paper["pages"].append(page_record)
        raw_pages.append({**page_record, "text": "\n".join(x["text"] for x in lines), "lines": lines})
        starts = []
        for index, line in enumerate(lines):
            marker = question_marker(line["text"])
            # Native prose list items are not new exam questions unless in the left label column.
            if marker and line["bbox"][0] < page.rect.width * 0.24 and 0 < int(re.match(r"\d+", marker[0])[0]) <= 40:
                starts.append((index, line["bbox"][1], marker))
        sx, sy = image.width / page.rect.width, image.height / page.rect.height
        if page_index > 0 and previous:
            leading_end = starts[0][1] if starts else page.rect.height * 0.94
            leading_lines = [x["text"] for x in lines if page.rect.height * .04 < x["bbox"][1] < leading_end - 3]
            meaningful = [t for t in leading_lines if not re.search(r"about:srcdoc|^\d+ of \d+|^Page\s*\d|^\d{2}[-/]\d{2}[-/]20", t)]
            if any(len(t) > 15 for t in meaningful):
                previous["markdown"] += "\n\n" + "\n".join(meaningful)
                previous["pageNumbers"].append(page_num)
                region = crop_asset(image, paper_id, f"q-{len(paper['questions'])}-p-{page_num}-continuation", page_num,
                                    (0, page.rect.height * .04 * sy, image.width, max(leading_end - 2, page.rect.height * .08) * sy))
                if region: previous["sourceImages"].append(region)
                previous["reviewNotes"].append("Possible continuation from the following page. Verify against the source.")
        if not starts and not previous:
            q = {"id": f"{paper_id}-page-{page_num}", "number": f"Page {page_num}",
                 "markdown": clean("\n".join(x["text"] for x in lines)) or "This page needs visual transcription. Read the original image below.",
                 "marks": None, "pageNumbers": [page_num], "diagrams": [],
                 "sourceImages": [{"src": page_record["image"], "pageNumber": page_num, "bbox": [0, 0, image.width, image.height]}],
                 "confidence": "low", "reviewNotes": ["Question boundaries could not be established. This is a complete source page, not a verified individual question."]}
            paper["questions"].append(q)
            continue
        for pos, (line_index, y, marker) in enumerate(starts):
            next_y = starts[pos + 1][1] - 2 if pos + 1 < len(starts) else page.rect.height * .945
            fragment = [line["text"] for line in lines[line_index:] if line["bbox"][1] < next_y]
            if fragment:
                fragment[0] = marker[1]
            fragment = [t for t in fragment if not re.search(r"about:srcdoc|^\d+ of \d+|^Page\s*\d|^\d{2}[-/]\d{2}[-/]20", t)]
            text = clean("\n".join(fragment))
            marks_match = re.search(r"(?:\n|^)[([](\d{1,2})[)\]]\s*$", text)
            marks = int(marks_match[1]) if marks_match else None
            if marks_match: text = text[:marks_match.start()].strip()
            region = crop_asset(image, paper_id, f"q-{len(paper['questions']) + 1}-p-{page_num}", page_num,
                                (0, (y - 5) * sy, image.width, next_y * sy))
            q = {"id": f"{paper_id}-q-{len(paper['questions']) + 1}", "number": marker[0],
                 "markdown": text or "Read this question in the original image below. The text layer does not include its equation or figure.",
                 "marks": marks, "pageNumbers": [page_num], "diagrams": [],
                 "sourceImages": [region] if region else [], "confidence": "low",
                 "reviewNotes": ["Automatic extraction. Mathematical notation and question boundaries require visual verification."]}
            paper["questions"].append(q)
            previous = q
    paper["questionCount"] = len(paper["questions"])
    write_json(output, paper)
    write_json(checkpoint, {"version": VERSION, "sourceHash": group["sha256"], "path": group["path"], "pages": raw_pages, "questions": paper["questions"]})
    return {"id": paper_id, "pages": len(doc), "questions": len(paper["questions"])}


def build_index(audit=None):
    papers = []
    supplemental_path = OUT / "supplemental-index.json"
    supplemental_ids = set()
    if supplemental_path.exists():
        supplemental_ids = {paper["id"] for paper in json.loads(supplemental_path.read_text()).get("papers", [])}
    stats = Counter({"sourceFiles": 0, "uniquePapers": 0, "completePapers": 0, "partialPapers": 0,
                     "pendingPapers": 0, "failedPapers": 0, "pages": 0, "questions": 0, "diagrams": 0})
    for file in sorted((OUT / "papers").glob("*.json")):
        data = json.loads(file.read_text())
        if data["id"] in supplemental_ids:
            continue
        # Second year now contains midsems only. Preserve archived source files.
        if data["academicYear"] == 2 and (data["examType"] != "MIDSEM" or data["id"].endswith("-ensemble")):
            continue
        papers.append({k: v for k, v in data.items() if k not in ("questions", "pages", "warnings")})
        stats["uniquePapers"] += 1
        stats["sourceFiles"] += len(set(x["href"] for x in data["sourceFiles"]))
        stats[data["status"] + "Papers"] += 1
        stats["pages"] += data["pageCount"]
        stats["questions"] += data["questionCount"]
        stats["diagrams"] += sum(len(q["diagrams"]) for q in data["questions"])
    papers.sort(key=lambda p: (p["academicYear"], p["subject"], -(p.get("examYear") or 0), p["name"]))
    warnings = ["Question extraction is automatic. Consult the linked original image for uncertain mathematics or diagram labels."]
    if stats["partialPapers"]:
        warnings.append(f"{stats['partialPapers']} papers contain transcription or source-association uncertainty. Original images are available for review.")
    catalog = {"version": 2, "generatedAt": now(), "papers": papers, "stats": dict(stats), "warnings": warnings}
    write_json(OUT / "index.json", catalog)
    if audit:
        write_json(CACHE / "audit.json", {**audit, "generatedAt": now(), "stats": dict(stats)})
    return catalog


VISION_PROMPT = r"""You are a meticulous examination-paper transcription specialist. Read ALL the supplied page images in order and return a JSON object matching the schema. This is transcription, not solving. The PDF text is an unreliable hint: equations and entire question portions may be absent from it. Inspect the images directly.

Transcribe every actual question and subquestion completely, including all options, data, units, tables and printed mathematical symbols. Keep separately numbered subquestions (1A, 1B, etc.) separate. Keep their roman-numeral subparts together. Include shared instructions or givens in every dependent question. Merge continuations across pages into the originating question. Do not turn header/footer text or diagram labels into new questions. Preserve alternatives and OR choices. Never silently omit a question because its math is an image.

Use Markdown and genuine LaTeX, with $...$ for inline math and $$...$$ on separate lines for display math. Transcribe fractions, roots, exponents, integrals with limits, matrices, derivatives and piecewise functions correctly. Preserve exact numbers/signs. Use fenced code blocks for program code and Markdown tables where appropriate. Do not solve, simplify, reword or add information. If any source is illegible, write [illegible in source] at that place and add a review note rather than inventing it. Use no em dash characters.

For EVERY question return sourceRegions covering the complete printed question, including attached figures and all continuations, as normalized page coordinates [left,top,right,bottom] in 0..1000. Bounding boxes must include all relevant text, figure labels and marks, with comfortable margins. A full-width horizontal band is preferable to a clipped box. Provide page numbers starting at 1.

For diagrams, graphs, circuits, illustrations and printed data tables physically present in the source, return individual diagram regions with page number, accurate bounding box and a short factual caption. Include only figures needed for that specific question. Match figures elsewhere on the paper by their printed reference label. Do not add a diagram merely because the question asks the student to draw one. Never redraw diagrams and never write Markdown image links or invent image filenames: images are handled separately through the diagrams array. When a figure boundary or association is uncertain, use a full-page region and say so in reviewNotes. Mathematical equations alone are not diagrams. Mark confidence low if any wording or symbol is unreadable, medium if some association is uncertain, high only if clear. OCR output is not independently verified even when confidence is high.

Return documentWarnings for missing pages, unreadable print, uncertain metadata or genuinely unresolvable figure associations. The schema fields must be present. No explanations outside the JSON."""


def obj(properties):
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


REGION = obj({"pageNumber": {"type": "integer"}, "bbox": {"type": "array", "items": {"type": "number"}, "minItems": 4, "maxItems": 4}})
DIAGRAM = obj({**REGION["properties"], "caption": {"type": "string"}})
SCHEMA = obj({"questions": {"type": "array", "items": obj({
    "number": {"type": "string"}, "markdown": {"type": "string"}, "marks": {"type": ["number", "null"]},
    "sourceRegions": {"type": "array", "items": REGION}, "diagrams": {"type": "array", "items": DIAGRAM},
    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    "reviewNotes": {"type": "array", "items": {"type": "string"}}})},
    "documentWarnings": {"type": "array", "items": {"type": "string"}}})


def load_key():
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    path = ROOT / ".env.local"
    if path.exists():
        for line in path.read_text().splitlines():
            match = re.match(r"\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*(.*)\s*$", line)
            if match:
                return match[1].strip().strip("\"'")
    return None


def materialize_manual(paper):
    bank_path = ROOT / "scripts/repeat-v2-biology-manual.json"
    if not bank_path.exists(): return False
    bank = json.loads(bank_path.read_text())
    mapping = bank["papers"].get(paper["id"])
    if not mapping: return False
    prepared = json.loads((CACHE / "prepared" / f"{paper['id']}.json").read_text())
    document = fitz.open(prepared["path"])
    questions = []
    for qi, raw in enumerate(bank["questions"]):
        question = {**raw, "id": f"{paper['id']}-q-{qi+1}", "pageNumbers": mapping["pages"][qi], "sourceImages": [], "diagrams": [],
            "confidence": "high", "reviewNotes": ["Direct transcription checked against the rendered source. Original wording is retained."]}
        for page_number in question["pageNumbers"]:
            page = prepared["pages"][page_number-1]
            source = Image.open(PUBLIC / page["image"].lstrip("/"))
            scale = source.height / document[page_number-1].rect.height
            starts = [(re.match(r"^([1-5][A-C])\)", line["text"])[1], line["bbox"][1]*scale) for line in page["lines"] if re.match(r"^([1-5][A-C])\)", line["text"])]
            top = next((y-8 for number,y in starts if number == question["number"]), source.height*.035)
            bottom = min([y-5 for number,y in starts if y > top+10 and number != question["number"]] or [source.height*.95])
            region = crop_asset(source, paper["id"], f"manual-{question['number']}-p-{page_number}", page_number, (0,top,source.width,bottom))
            question["sourceImages"].append(region)
            if page_number in mapping["figurePages"][qi]:
                question["diagrams"].append({**region,"id":f"{question['id']}-figure-p-{page_number}","caption":f"Original figure context for Question {question['number']}, page {page_number}."})
        questions.append(question)
    paper["questions"] = questions
    paper["questionCount"] = len(questions)
    paper["status"] = "complete"
    paper["warnings"] = [bank["note"], "The whole-document API transcription was interrupted by a provider content filter. These ordinary examination questions were transcribed directly from the local page images."]
    for page in paper["pages"]:
        page["method"] = bank["method"]
        page["status"] = "complete"
    write_json(OUT / "papers" / f"{paper['id']}.json", paper)
    return True


def materialize_vision(paper, result, model):
    images = {p["number"]: Image.open(PUBLIC / p["image"].lstrip("/")) for p in paper["pages"]}
    checkpoint_path = CACHE / "prepared" / f"{paper['id']}.json"
    prepared = json.loads(checkpoint_path.read_text())
    offline_questions = prepared.get("questions")
    if offline_questions is None and not any(p["method"].startswith("openai-vision") for p in paper["pages"]):
        offline_questions = paper["questions"]
        prepared["questions"] = offline_questions
        write_json(checkpoint_path, prepared)
    offline_by_number = defaultdict(list)
    for original in offline_questions or []:
        offline_by_number[re.sub(r"[^A-Z0-9]", "", original["number"].upper())].append(original)
    questions = []
    for qi, raw in enumerate(result["questions"], 1):
        originals = offline_by_number.get(re.sub(r"[^A-Z0-9]", "", raw["number"].upper()), [])
        original = originals[0] if len(originals) == 1 else None
        fallback_pages = original["pageNumbers"] if original else list(images)
        regions = [region for region in raw["sourceRegions"] if region["pageNumber"] in images]
        uncertain_regions = len(regions) != len(raw["sourceRegions"]) or not regions
        if not regions:
            regions = [{"pageNumber": page, "bbox": [0, 0, 1000, 1000]} for page in fallback_pages]
        markdown = normalize_markdown(re.sub(r"!\[[^\]]*\]\([^)]*\)", "", clean(raw["markdown"])))
        q = {"id": f"{paper['id']}-q-{qi}", "number": clean(raw["number"]), "markdown": markdown,
             "marks": raw["marks"], "pageNumbers": sorted(set(r["pageNumber"] for r in regions)),
             "diagrams": [], "sourceImages": [], "confidence": raw["confidence"], "reviewNotes": raw["reviewNotes"]}
        q["reviewNotes"] = list(q["reviewNotes"])
        if uncertain_regions:
            q["confidence"] = "low"
            q["reviewNotes"].append("The model did not provide reliable page regions. Original question geometry or complete source pages are included for checking the association.")
        # Vision models can read math well while estimating coordinates incorrectly.
        # Use PDF/OCR label geometry, never unverified model boxes, to crop sources.
        native_regions = original["sourceImages"] if original else []
        def source_for_page(page):
            if page not in images: raise ValueError(f"Invalid source page {page}")
            found = [r for r in native_regions if r["pageNumber"] == page and (PUBLIC / r["src"].lstrip("/")).exists()]
            if found: return found
            image = images[page]
            page_record = next(p for p in paper["pages"] if p["number"] == page)
            return [{"src": page_record["image"], "pageNumber": page, "bbox": [0, 0, image.width, image.height]}]
        all_source_pages = sorted(set(q["pageNumbers"] + (original["pageNumbers"] if original else [])))
        for page in all_source_pages:
            q["sourceImages"].extend(source_for_page(page))
        if original and set(original["pageNumbers"]) - set(q["pageNumbers"]):
            q["reviewNotes"].append("The source contains a possible continuation on another page. Its original image is included; check transcription completeness.")
            q["confidence"] = "low"
        q["pageNumbers"] = all_source_pages
        diagram_keys = set()
        diagram_regions = []
        for diagram in raw["diagrams"]:
            if diagram["pageNumber"] in images:
                diagram_regions.append(diagram)
            else:
                q["confidence"] = "low"
                q["reviewNotes"].append("A diagram page number could not be validated. Complete source context is provided instead.")
                diagram_regions.extend({**diagram, "pageNumber": page} for page in fallback_pages)
        for ri, diagram in enumerate(diagram_regions, 1):
            page = diagram["pageNumber"]
            for source in source_for_page(page):
                if source["src"] in diagram_keys: continue
                diagram_keys.add(source["src"])
                full_page = source["src"] == next(p["image"] for p in paper["pages"] if p["number"] == page)
                uncertain_association = any(re.search(r"(?:figure|diagram|circuit).*(?:appears|uncertain|unclear|placement)|(?:appears|uncertain|unclear).*(?:figure|diagram|circuit)", note, re.I) for note in q["reviewNotes"])
                caption = f"Original page {page}, with surrounding questions and figures. Check the figure reference in context." if full_page else (
                    "Original question context. The figure association needs review." if uncertain_association else clean(diagram["caption"]) + " (original source region)")
                q["diagrams"].append({**source, "id": f"{q['id']}-diagram-{ri}", "caption": caption})
                if uncertain_association: q["confidence"] = "low"
            if page not in q["pageNumbers"]: q["pageNumbers"].append(page)
        if any(re.search(r"matri(?:x|ces)", d["caption"], re.I) for d in raw["diagrams"]) and not re.search(r"\\begin\{(?:[bpvBV]?matrix|array)", q["markdown"]):
            q["confidence"] = "low"
            q["reviewNotes"].append("A matrix is preserved in the source image, but its full mathematical transcription needs review.")
        if not q["markdown"]:
            q["markdown"] = "[Question text could not be transcribed reliably. Read the original source image.]"
            q["confidence"] = "low"
            q["reviewNotes"].append("Vision transcription did not recover this question. The original source remains available.")
        if any(re.search(r"unclear|unreadable|illegible|cannot (?:read|determine)|not legible", note, re.I) for note in q["reviewNotes"]) or "[illegible" in q["markdown"].lower():
            q["confidence"] = "low"
        questions.append(q)
    if not questions:
        raise ValueError("Vision returned no questions")
    paper["questions"] = questions
    paper["questionCount"] = len(questions)
    paper["warnings"] = result["documentWarnings"] + [f"Transcribed from original page images with {model}. Automatic transcription is not independent human verification."]
    document_uncertain = any(re.search(r"unclear|unreadable|illegible|missing|omitted|incomplete", note, re.I) for note in result["documentWarnings"])
    paper["status"] = "complete" if all(q["confidence"] != "low" for q in questions) and not document_uncertain else "partial"
    for page in paper["pages"]:
        page["method"] = f"openai-vision:{model}"
        page["status"] = paper["status"]
    write_json(OUT / "papers" / f"{paper['id']}.json", paper)
    return {"id": paper["id"], "questions": len(questions), "diagrams": sum(len(q["diagrams"]) for q in questions)}


def vision_paper(summary, key, model, force=False):
    from openai import OpenAI
    paper = json.loads((OUT / "papers" / f"{summary['id']}.json").read_text())
    if materialize_manual(paper):
        return {"id": paper["id"], "questions": paper["questionCount"], "method": "direct-visual-transcription"}
    checkpoint = CACHE / "vision" / f"{summary['id']}.json"
    if checkpoint.exists() and not force:
        cached = json.loads(checkpoint.read_text())
        return materialize_vision(paper, cached["result"], cached["model"])
    prepared = json.loads((CACHE / "prepared" / f"{summary['id']}.json").read_text())
    content = [{"type": "input_text", "text": f"Paper: {paper['name']}. Subject: {paper['subject']}. Total pages: {len(paper['pages'])}. Read each image fully."}]
    for page in prepared["pages"]:
        content.append({"type": "input_text", "text": f"PAGE {page['number']}\nUnreliable native/OCR hint:\n{page['text'][:14000]}"})
        encoded = base64.b64encode((PUBLIC / page["image"].lstrip("/")).read_bytes()).decode()
        content.append({"type": "input_image", "image_url": "data:image/jpeg;base64," + encoded, "detail": "high"})
    client = OpenAI(api_key=key, timeout=240, max_retries=2)
    response = client.responses.create(model=model, instructions=VISION_PROMPT, input=[{"role": "user", "content": content}],
        text={"format": {"type": "json_schema", "name": "exam_transcription", "strict": True, "schema": SCHEMA}},
        max_output_tokens=48000 if len(paper["pages"]) >= 5 and model != "gpt-4.1-mini" else 24000, store=False)
    if response.status != "completed":
        detail = response.incomplete_details.model_dump() if response.incomplete_details else None
        write_json(CACHE / "failed-attempts" / f"{paper['id']}-{int(time.time())}.json", {"model": model, "status": response.status, "detail": detail, "usage": response.usage.model_dump() if response.usage else {}})
        raise ValueError(f"Incomplete API output: {response.status}, details={detail}")
    result = json.loads(response.output_text)
    previous_attempts = []
    if checkpoint.exists():
        previous = json.loads(checkpoint.read_text())
        previous_attempts = previous.get("previousAttempts", []) + [{"model": previous["model"], "createdAt": previous.get("createdAt"), "usage": previous.get("usage", {})}]
    write_json(checkpoint, {"model": model, "createdAt": now(), "usage": response.usage.model_dump() if response.usage else {}, "previousAttempts": previous_attempts, "result": result})
    return materialize_vision(paper, result, model)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "vision", "index", "validate"))
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--paper", default="")
    parser.add_argument("--model", default=os.environ.get("OPENAI_OCR_MODEL", "gpt-5.4-mini"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    started = time.time()
    if args.mode == "prepare":
        groups, audit = discover()
        # Mathematics first: it immediately exercises source images and missing native equations.
        groups.sort(key=lambda g: (not any(re.search(r"math|MAT[-_ ]|/EM|/CM", s["name"] + s["href"], re.I) for s in g["sources"]), g["id"]))
        if args.paper: groups = [g for g in groups if g["id"] == args.paper]
        if args.limit: groups = groups[:args.limit]
        audit.update({"excluded": [], "failures": []})
        print(json.dumps({"phase": "prepare", "files": audit["discoveredSourceFiles"], "uniquePapers": len(groups)}), flush=True)
        with ProcessPoolExecutor(max_workers=max(1, min(8, args.concurrency))) as pool:
            jobs = {pool.submit(prepare_paper, group, args.force): group for group in groups}
            for count, job in enumerate(as_completed(jobs), 1):
                group = jobs[job]
                try:
                    result = job.result()
                    if result.get("excluded"):
                        audit["excluded"].append(result)
                        existing = OUT / "papers" / f"{group['id']}.json"
                        if existing.exists(): existing.unlink()
                except Exception as exc:
                    result = {"id": group["id"], "error": type(exc).__name__ + ": " + str(exc)[:200]}
                    audit["failures"].append(result)
                if count % 10 == 0 or count == len(groups):
                    catalog = build_index(audit)
                    print(json.dumps({"done": count, "total": len(groups), "seconds": round(time.time() - started), "stats": catalog["stats"], "failures": len(audit["failures"])}), flush=True)
        build_index(audit)
    elif args.mode == "vision":
        key = load_key()
        if not key:
            print("OPENAI_API_KEY is missing. Add it to .env.local and rerun vision. Existing source-backed extraction remains available.", file=sys.stderr)
            return 2
        papers = build_index()["papers"]
        papers.sort(key=lambda p: (not re.search(r"math|MAT", p["subject"] + (p.get("subjectCode") or ""), re.I), p["id"]))
        if args.paper: papers = [p for p in papers if p["id"] == args.paper]
        if args.limit: papers = papers[:args.limit]
        failures = []
        print(json.dumps({"phase": "vision", "papers": len(papers), "model": args.model}), flush=True)
        with ThreadPoolExecutor(max_workers=max(1, min(24, args.concurrency))) as pool:
            jobs = {pool.submit(vision_paper, paper, key, args.model, args.force): paper for paper in papers}
            for count, job in enumerate(as_completed(jobs), 1):
                try:
                    result = job.result()
                except Exception as exc:
                    # Never print API response bodies or request payloads.
                    result = {"id": jobs[job]["id"], "error": type(exc).__name__, "status": getattr(exc, "status_code", None)}
                    failures.append(result)
                print(json.dumps({"done": count, "total": len(papers), "seconds": round(time.time() - started), **result}), flush=True)
                if count % 5 == 0: build_index()
        build_index()
        write_json(CACHE / "vision-report.json", {"generatedAt": now(), "seconds": round(time.time() - started), "requested": len(papers), "failures": failures})
        return 1 if failures else 0
    elif args.mode == "index":
        print(json.dumps(build_index()["stats"]))
    else:
        catalog = build_index()
        errors = []
        for summary in catalog["papers"]:
            paper = json.loads((OUT / "papers" / f"{summary['id']}.json").read_text())
            if paper["academicYear"] not in (1, 2): errors.append(f"{paper['id']}: invalid year")
            if len(paper["questions"]) != paper["questionCount"]: errors.append(f"{paper['id']}: count mismatch")
            for page in paper["pages"]:
                if not (PUBLIC / page["image"].lstrip("/")).exists(): errors.append(f"{paper['id']}: missing page image")
            for q in paper["questions"]:
                if not q["sourceImages"]: errors.append(f"{q['id']}: no source image")
                for image in q["sourceImages"] + q["diagrams"]:
                    path = PUBLIC / image["src"].lstrip("/")
                    if not path.exists(): errors.append(f"{q['id']}: missing source asset")
                    if image["pageNumber"] not in range(1, paper["pageCount"] + 1): errors.append(f"{q['id']}: invalid page")
        report = {"generatedAt": now(), "stats": catalog["stats"], "errors": errors}
        write_json(CACHE / "validation.json", report)
        print(json.dumps(report))
        return 1 if errors else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())

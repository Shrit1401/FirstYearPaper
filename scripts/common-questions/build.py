#!/usr/bin/env python3
"""Merge extracted question positions with their transcriptions.

Usage: python3 -I scripts/common-questions/build.py <key> <transcription.json> [...]
Reads scripts/common-questions/out/<key>.json and one or more JSON arrays of
{id, md, topic, skill, hasFigure}. Writes public/common-questions/<key>.json
(loaded when the sidebar opens) and updates lib/common-questions-index.json
(the small summary each subject page reads to show its card).
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


def label(paper):
    exam = {"ENDSEM": "End-sem", "MAKEUP": "Makeup"}.get(paper["exam"], paper["exam"].title())
    date = paper.get("date") or ""
    when = f"{MONTHS[int(date[5:7]) - 1]} {date[:4]}" if len(date) >= 7 else date[:4]
    return f"{exam} · {when}"


def main():
    key, parts = sys.argv[1], sys.argv[2:]
    extracted = json.loads((ROOT / "scripts/common-questions/out" / f"{key}.json").read_text())
    notes = {}
    for part in parts:
        for item in json.loads(Path(part).read_text()):
            notes[item["id"]] = item
    papers, questions, missing = [], [], []
    for p in extracted["papers"]:
        papers.append({"id": p["id"], "label": label(p), "code": p["code"], "date": p["date"],
                       "exam": p["exam"], "cycle": p.get("cycle"), "href": p["href"]})
        for q in p["questions"]:
            note = notes.get(q["id"])
            if not note:
                missing.append(q["id"])
                continue
            questions.append({"id": q["id"], "paper": p["id"], "qno": q["qno"], "marks": q["marks"],
                              "topic": note["topic"], "skill": note.get("skill", ""),
                              "md": note["md"].strip(), "figure": bool(note.get("hasFigure")),
                              "regions": [[r["page"], *r["rect"]] for r in q["regions"]]})
    if missing:
        sys.exit(f"{key}: no transcription for {', '.join(missing)}")
    # A topic is "common" when it shows up in many different papers.
    in_papers, count = defaultdict(set), defaultdict(int)
    for q in questions:
        in_papers[q["topic"]].add(q["paper"])
        count[q["topic"]] += 1
    topics = sorted(in_papers, key=lambda t: (-len(in_papers[t]), -count[t], t))
    data = {"key": key, "title": extracted["title"], "papers": papers, "questions": questions,
            "topics": [{"name": t, "papers": len(in_papers[t]), "questions": count[t]} for t in topics]}
    out = ROOT / "public/common-questions" / f"{key}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    index_path = ROOT / "lib/common-questions-index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {}
    index[key] = {"questions": len(questions), "papers": len(papers),
                  "topTopics": [t["name"] for t in data["topics"][:3]],
                  "years": sorted({p["date"][:4] for p in papers if p.get("date")}, reverse=True)}
    index_path.write_text(json.dumps(dict(sorted(index.items())), indent=1, ensure_ascii=False) + "\n")
    print(f"{key}: {len(questions)} questions, {len(papers)} papers, {len(topics)} topics")


if __name__ == "__main__":
    main()

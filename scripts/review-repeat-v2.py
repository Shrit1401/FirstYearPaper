#!/usr/bin/env python3
"""Retry uncertain completed transcriptions with a stronger model, without rerunning clear papers."""
import argparse
import importlib.util
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
import time

spec = importlib.util.spec_from_file_location("repeat_ocr", Path(__file__).with_name("build-repeat-v2.py"))
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)
parser = argparse.ArgumentParser()
parser.add_argument("--concurrency", type=int, default=4)
parser.add_argument("--model", default="gpt-5.4")
parser.add_argument("--include-missing", action="store_true")
args = parser.parse_args()
answer_only = {"f6ba7dd720d08b7a9d4d", "f3cc39d4eb0fc272eb52", "6cf2f6d92dffa0817deb", "5bf6c9347da2ade7fbad"}
queue = []
math_report = ocr.CACHE / "math-validation.json"
math_failures = {item["paperId"] for item in json.loads(math_report.read_text())["failures"]} if math_report.exists() else set()
for file in (ocr.OUT / "papers").glob("*.json"):
    paper = json.loads(file.read_text())
    if paper["id"] in answer_only: continue
    prepared = json.loads((ocr.CACHE / "prepared" / file.name).read_text())
    if "INTERNATIONAL CENTRE FOR APPLIED SCIENCES" in prepared["pages"][0]["text"].upper(): continue
    path = ocr.CACHE / "vision" / file.name
    if not path.exists():
        if args.include_missing: queue.append(paper)
        continue
    cached = json.loads(path.read_text())
    if cached["model"] == args.model: continue
    questions = cached["result"]["questions"]
    uncertain = paper["id"] in math_failures or any(not q["markdown"] or q["confidence"] == "low" or any(re.search(r"unclear|illegible|unreadable|not visible|missing|omitted", note, re.I) for note in q["reviewNotes"]) or (any(re.search(r"matri(?:x|ces)", d["caption"], re.I) for d in q["diagrams"]) and not re.search(r"\\begin\{(?:[bpvBV]?matrix|array)", q["markdown"])) for q in questions)
    if uncertain: queue.append(paper)
started = time.time()
print(json.dumps({"reviewPapers": len(queue), "model": args.model}), flush=True)
failures = []
with ThreadPoolExecutor(max_workers=max(1, min(8, args.concurrency))) as pool:
    jobs = {pool.submit(ocr.vision_paper, paper, ocr.load_key(), args.model, True): paper for paper in queue}
    for count, job in enumerate(as_completed(jobs), 1):
        try: result = job.result()
        except Exception as exc:
            result = {"id": jobs[job]["id"], "error": type(exc).__name__, "status": getattr(exc, "status_code", None)}
            failures.append(result)
        print(json.dumps({"done": count, "total": len(queue), "seconds": round(time.time()-started), **result}), flush=True)
ocr.write_json(ocr.CACHE / "review-report.json", {"generatedAt": ocr.now(), "requested": len(queue), "model": args.model, "failures": failures})

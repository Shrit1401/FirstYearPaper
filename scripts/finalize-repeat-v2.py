#!/usr/bin/env python3
"""Apply cached vision results, canonicalize metadata, and write a coverage audit."""
import importlib.util
import json
from pathlib import Path
import re
from collections import Counter, defaultdict

spec = importlib.util.spec_from_file_location("repeat_ocr", Path(__file__).with_name("build-repeat-v2.py"))
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)

groups, audit = ocr.discover()
papers = []
excluded = []
supplemental = []
failures = []
tokens = Counter()
ANSWER_ONLY = {"f6ba7dd720d08b7a9d4d", "f3cc39d4eb0fc272eb52", "6cf2f6d92dffa0817deb", "5bf6c9347da2ade7fbad"}
for group in groups:
    paper_path = ocr.OUT / "papers" / f"{group['id']}.json"
    if not paper_path.exists():
        with ocr.fitz.open(group["path"]) as doc:
            year, semester, *_ = ocr.header_metadata(doc[0].get_text(), group)
        excluded.append({"id": group["id"], "sourceFiles": [s["href"] for s in group["sources"]],
                         "reason": f"Printed Semester {semester} is outside MIT first and second year."})
        continue
    paper = json.loads(paper_path.read_text())
    prepared = json.loads((ocr.CACHE / "prepared" / f"{paper['id']}.json").read_text())
    first_text = prepared["pages"][0]["text"]
    is_icas = bool(re.search(r"INTERNATIONAL CENTRE FOR APPLIED SCIENCES", first_text[:1800], re.I))
    answer_scheme = bool(re.search(r"ANSWER SCHEME|SCHEME OF EVALUATION", first_text[:1800], re.I))
    year, semester, title, code, exam_year = ocr.header_metadata(first_text, group)
    paper["subject"] = title or ocr.canonical_subject(first_text[:1800], paper["subject"], code)
    if paper["subject"] == "Engineering Mathematics and Scientific Basics":
        paper["subject"] = "Engineering Mechanics and Smart Buildings"
    paper["subjectCode"] = code
    paper["examYear"] = exam_year
    if year in (1, 2):
        paper["academicYear"] = year
        paper["semester"] = f"Semester {semester}"
    paper["sourceFiles"] = ocr.unique_dicts([{k: v for k, v in source.items() if k != "editableId"} for source in group["sources"]])
    memberships = []
    for source in paper["sourceFiles"]:
        member = {k: source[k] for k in ("academicYear", "semester", "branch", "examType", "subject")}
        member["academicYear"] = paper["academicYear"]
        member["semester"] = paper["semester"]
        member["subject"] = paper["subject"]
        memberships.append(member)
    paper["memberships"] = ocr.unique_dicts(memberships)
    vision_path = ocr.CACHE / "vision" / f"{paper['id']}.json"
    if ocr.materialize_manual(paper):
        pass
    elif vision_path.exists():
        vision = json.loads(vision_path.read_text())
        tokens.update({k: vision.get("usage", {}).get(k, 0) for k in ("input_tokens", "output_tokens", "total_tokens")})
        for attempt in vision.get("previousAttempts", []):
            tokens.update({k: attempt.get("usage", {}).get(k, 0) for k in ("input_tokens", "output_tokens", "total_tokens")})
        try:
            ocr.materialize_vision(paper, vision["result"], vision["model"])
        except Exception as exc:
            failures.append({"id": paper["id"], "error": str(exc)[:200]})
    else:
        failures.append({"id": paper["id"], "error": "Vision transcription checkpoint missing"})
    if answer_scheme:
        paper["name"] = re.sub(r" \(answer scheme\)$", "", paper["name"]) + " (answer scheme)"
        paper["warnings"].append("This source is an answer scheme. Only question wording actually printed in the source can be recovered; answers may also be visible in original regions.")
    if is_icas or paper["id"] in ANSWER_ONLY:
        reason = "ICAS B.Sc. Applied Sciences paper, not an MIT B.Tech paper." if is_icas else "Answer-only scheme: complete original question wording is not present."
        paper["warnings"].append(reason)
        supplemental.append({"id": paper["id"], "name": paper["name"], "href": paper["href"],
            "dataHref": f"/repeat-v2/papers/{paper['id']}.json", "pageCount": paper["pageCount"],
            "sourceFiles": paper["sourceFiles"], "reason": reason})
    papers.append(paper)

# Only use clear titles from the same printed course code to resolve bare codes.
code_names = defaultdict(Counter)
for paper in papers:
    if paper.get("subjectCode") and not re.fullmatch(r"[A-Za-z]+[ _-]*\d+(?: [A-Za-z]+)?", paper["subject"]):
        code_names[paper["subjectCode"]][paper["subject"]] += 1
for paper in papers:
    if re.fullmatch(r"[A-Za-z]+[ _-]*\d+(?: [A-Za-z]+)?", paper["subject"]) and code_names[paper.get("subjectCode")]:
        paper["subject"] = code_names[paper["subjectCode"]].most_common(1)[0][0]
        for member in paper["memberships"]: member["subject"] = paper["subject"]
    ocr.write_json(ocr.OUT / "papers" / f"{paper['id']}.json", paper)

corrections_path = Path(__file__).with_name("repeat-v2-corrections.json")
corrections = json.loads(corrections_path.read_text()) if corrections_path.exists() else []
for correction in corrections:
    path = ocr.OUT / "papers" / f"{correction['paperId']}.json"
    if not path.exists(): continue
    paper = json.loads(path.read_text())
    for question in paper["questions"]:
        if correction["number"] != "*" and question["number"] != correction["number"]: continue
        if "markdown" in correction:
            question["markdown"] = ocr.normalize_markdown(correction["markdown"])
        if "confidence" in correction: question["confidence"] = correction["confidence"]
        if "reviewNotes" in correction: question["reviewNotes"] = correction["reviewNotes"]
        for original, replacement in correction.get("captionReplacements", {}).items():
            for diagram in question["diagrams"]: diagram["caption"] = diagram["caption"].replace(original, replacement)
        if correction.get("removeDiagrams"):
            question["diagrams"] = []
        if correction.get("diagramCaption"):
            for diagram in question["diagrams"]: diagram["caption"] = correction["diagramCaption"]
        for page_number in correction.get("includePages", []):
            if page_number not in question["pageNumbers"]: question["pageNumbers"].append(page_number)
            if not any(image["pageNumber"] == page_number for image in question["sourceImages"]):
                page = next(page for page in paper["pages"] if page["number"] == page_number)
                question["sourceImages"].append({"src": page["image"], "pageNumber": page_number, "bbox": [0, 0, page["width"], page["height"]]})
        for crop in correction.get("sourceCrops", []):
            page_number = crop["pageNumber"]
            page = next(page for page in paper["pages"] if page["number"] == page_number)
            source_image = ocr.Image.open(ocr.PUBLIC / page["image"].lstrip("/"))
            x, y, width, height = crop["bbox"]
            region = ocr.crop_asset(source_image, paper["id"], f"reviewed-{question['number']}-p-{page_number}", page_number, (x, y, x+width, y+height))
            question["sourceImages"] = [image for image in question["sourceImages"] if image["pageNumber"] != page_number] + [region]
            if crop["asDiagram"]:
                question["diagrams"] = [image for image in question["diagrams"] if image["pageNumber"] != page_number]
                question["diagrams"].append({**region, "id": f"{question['id']}-reviewed-diagram", "caption": correction.get("diagramCaption", "Original diagram, visually checked")})
    paper["status"] = "partial" if any(q["confidence"] == "low" for q in paper["questions"]) else "complete"
    for page in paper["pages"]: page["status"] = paper["status"]
    ocr.write_json(path, paper)

ocr.write_json(ocr.OUT / "supplemental-index.json", {"version": 2, "generatedAt": ocr.now(), "papers": supplemental,
    "description": "Preserved source exports excluded from the MIT question selector because of institution or answer-only content."})
catalog = ocr.build_index()
report = {**audit, "generatedAt": ocr.now(), "excluded": excluded, "failures": failures,
          "stats": catalog["stats"], "visionUsage": dict(tokens), "visualCorrections": len(corrections)}
ocr.write_json(ocr.CACHE / "audit.json", report)
main_ids = {paper["id"] for paper in catalog["papers"]}
main_papers = [json.loads((ocr.OUT / "papers" / f"{paper_id}.json").read_text()) for paper_id in main_ids]
confidence = Counter(q["confidence"] for paper in main_papers for q in paper["questions"])
processed = sum(all(page["method"].startswith("openai-vision:") for page in paper["pages"]) for paper in main_papers)
manual_processed = sum(all(page["method"] == "direct-visual-transcription" for page in paper["pages"]) for paper in main_papers)
coverage = {"version": 2, "generatedAt": ocr.now(), "scope": "MIT B.Tech first and second year",
    "discoveredSourceFiles": audit["discoveredSourceFiles"], "uniqueSourceFiles": audit["uniqueSourceFiles"],
    "mainCatalog": catalog["stats"], "visionProcessedPapers": processed,
    "manuallyTranscribedPapers": manual_processed, "processedPapers": processed + manual_processed,
    "visualReview": {"initialSpotCheckPapers": 6, "sourceCorrectionRecords": len(corrections), "correctedPaperIds": sorted({record["paperId"] for record in corrections}), "completeDirectTranscriptions": manual_processed,
        "performedBy": "Codex visual comparison against original page renders", "independentHumanReview": False},
    "questionConfidence": dict(confidence), "supplementalPapers": supplemental,
    "excludedOtherYears": excluded, "recoveredMisfiledSources": ["/" + ocr.quote(p, safe="/()") for p in audit["recoveredMisfiledSources"]],
    "failures": [failure for failure in failures if failure["id"] in main_ids], "visionUsage": dict(tokens),
    "limitations": ["Automatic vision transcription is not independent human verification.",
        "Low-confidence text is marked for review and retains original source images.",
        "Diagram regions use original PDF/OCR question geometry; uncertain boundaries fall back to complete source pages.",
        "Exact-file duplicates are merged by SHA-256; differently encoded copies may remain as distinct papers.",
        "Source pages and question regions may include printed answers in papers supplied as answer schemes."]}
coverage["tokenAccounting"] = "Recorded saved API attempts. Earlier interrupted requests may also be billed by the provider."
ocr.write_json(ocr.OUT / "coverage.json", coverage)
referenced_assets = set()
for file in (ocr.OUT / "papers").glob("*.json"):
    data = json.loads(file.read_text())
    referenced_assets.update(page["image"] for page in data["pages"])
    for question in data["questions"]:
        referenced_assets.update(image["src"] for image in question["sourceImages"] + question["diagrams"])
removed_assets = 0
removed_bytes = 0
for asset in (ocr.OUT / "assets").rglob("*.jpg"):
    public_path = "/" + str(asset.relative_to(ocr.PUBLIC))
    if public_path not in referenced_assets:
        removed_bytes += asset.stat().st_size
        removed_assets += 1
        asset.unlink()
coverage["assetCleanup"] = {"removedUnreferencedFiles": removed_assets, "removedBytes": removed_bytes}
coverage["generatedAssetBytes"] = sum(path.stat().st_size for path in (ocr.OUT / "assets").rglob("*.jpg"))
ocr.write_json(ocr.OUT / "coverage.json", coverage)
print(json.dumps({"stats": catalog["stats"], "excluded": len(excluded), "failures": failures, "visionUsage": dict(tokens)}))

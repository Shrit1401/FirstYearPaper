#!/usr/bin/env python3
"""Losslessly optimize Repeat JPEGs; dry-run unless --apply is supplied.

jpegtran preserves the existing DCT coefficients. Every candidate must also
match the source dimensions and SHA-256 of its decoded RGB pixels. Applying
keeps original bytes in content-hashed backups under ignored generated/.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
import time

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/repeat-v2/assets"
GENERATED = ROOT / "generated/repeat-v2"
BACKUPS = GENERATED / "storage-backups"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def decoded_signature(data: bytes) -> tuple[tuple[int, int], str]:
    with Image.open(io.BytesIO(data)) as image:
        return image.size, sha256(image.convert("RGB").tobytes())


def preserve_backup(source: Path, original: bytes, digest: str) -> Path:
    relative = source.relative_to(ASSETS)
    backup = BACKUPS / relative.parent / f"{relative.stem}.{digest}.jpg"
    backup.parent.mkdir(parents=True, exist_ok=True)
    if backup.exists():
        if sha256(backup.read_bytes()) != digest:
            raise RuntimeError("Existing backup does not match its content hash")
        return backup
    fd, temporary = tempfile.mkstemp(prefix=".backup-", dir=backup.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(original)
            handle.flush()
            os.fsync(handle.fileno())
        if sha256(Path(temporary).read_bytes()) != digest:
            raise RuntimeError("Backup byte verification failed")
        os.replace(temporary, backup)
    finally:
        Path(temporary).unlink(missing_ok=True)
    return backup


def update_coverage_asset_bytes() -> dict:
    """Update only the existing byte-count token, retaining every other byte."""
    coverage = ROOT / "public/repeat-v2/coverage.json"
    total = sum(path.stat().st_size for path in ASSETS.rglob("*.jpg"))
    if not coverage.exists():
        return {"status": "not_present", "assetBytes": total}
    original = coverage.read_bytes()
    decoded = original.decode("utf-8")
    previous = json.loads(decoded)
    pattern = r'("generatedAssetBytes"\s*:\s*)\d+'
    if len(re.findall(pattern, decoded)) != 1:
        raise RuntimeError("Coverage must have exactly one numeric generatedAssetBytes field")
    updated = re.sub(pattern, lambda match: match.group(1) + str(total), decoded).encode("utf-8")
    expected = previous | {"generatedAssetBytes": total}
    if json.loads(updated) != expected:
        raise RuntimeError("Coverage change would modify another field")
    if updated != original:
        fd, temporary = tempfile.mkstemp(prefix=".coverage-storage-", suffix=".tmp", dir=coverage.parent)
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(updated)
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(temporary, stat.S_IMODE(coverage.stat().st_mode))
            if coverage.read_bytes() != original:
                raise RuntimeError("Coverage changed concurrently; retained current file")
            os.replace(temporary, coverage)
        finally:
            Path(temporary).unlink(missing_ok=True)
    return {"status": "updated" if updated != original else "unchanged", "beforeBytes": previous["generatedAssetBytes"], "assetBytes": total}


def optimize(source: Path, jpegtran: str, work: Path, apply: bool) -> dict:
    result = {"asset": str(source.relative_to(ROOT)), "verified": False}
    candidate: Path | None = None
    try:
        original_stat = source.stat()
        original = source.read_bytes()
        original_hash = sha256(original)
        result.update(beforeBytes=len(original), originalSha256=original_hash)
        fd, temporary = tempfile.mkstemp(suffix=".jpg", dir=work)
        os.close(fd)
        candidate = Path(temporary)
        subprocess.run(
            [jpegtran, "-copy", "all", "-optimize", "-progressive",
             "-outfile", str(candidate), str(source)],
            check=True, capture_output=True, timeout=120,
        )
        optimized = candidate.read_bytes()
        original_signature = decoded_signature(original)
        optimized_signature = decoded_signature(optimized)
        result.update(
            candidateBytes=len(optimized),
            dimensions=list(original_signature[0]),
            decodedRgbSha256=original_signature[1],
            candidateSha256=sha256(optimized),
        )
        if original_signature != optimized_signature:
            result.update(status="pixel_mismatch", afterBytes=len(original))
            return result
        result["verified"] = True
        if len(optimized) >= len(original):
            result.update(status="not_smaller", afterBytes=len(original))
            return result
        if not apply:
            result.update(status="would_optimize", afterBytes=len(original))
            return result

        # Do not overwrite a concurrent edit, and do not risk a cross-device move.
        if sha256(source.read_bytes()) != original_hash:
            raise RuntimeError("Source changed during optimization; retained current file")
        if source.stat().st_dev != candidate.stat().st_dev:
            raise RuntimeError("Candidate and source must share a filesystem for atomic replacement")
        backup = preserve_backup(source, original, original_hash)
        result["backup"] = str(backup.relative_to(ROOT))
        os.chmod(candidate, stat.S_IMODE(original_stat.st_mode))
        with candidate.open("rb") as handle:
            os.fsync(handle.fileno())
        # The verified backup is durable before the asset changes.
        os.replace(candidate, source)
        result.update(status="optimized", afterBytes=len(optimized))
        return result
    except Exception as error:
        result.update(status="error", error=f"{type(error).__name__}: {error}")
        if source.exists():
            result["afterBytes"] = source.stat().st_size
        return result
    finally:
        if candidate is not None:
            candidate.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Replace smaller verified JPEGs and preserve originals")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent jpegtran workers, from 1 to 6 (default: 4)")
    parser.add_argument("--limit", type=int, help="Only inspect the first N assets; useful for a small dry-run")
    args = parser.parse_args()
    if not 1 <= args.workers <= 6:
        parser.error("--workers must be from 1 to 6")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    jpegtran = shutil.which("jpegtran")
    if jpegtran is None:
        parser.error("jpegtran is required; install libjpeg-turbo (for example, brew install jpeg-turbo)")
    if not ASSETS.is_dir():
        parser.error(f"Assets directory does not exist: {ASSETS}")

    GENERATED.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    report_path = GENERATED / f"storage-report-{run_id}.json"
    journal_path = GENERATED / f"storage-journal-{run_id}.jsonl"
    files = sorted(ASSETS.rglob("*.jpg"))
    selected = files[:args.limit] if args.limit is not None else files
    before_bytes = sum(path.stat().st_size for path in selected)
    version = subprocess.run([jpegtran, "-version"], capture_output=True, text=True, check=True)
    tool_version = (version.stdout or version.stderr).strip()
    started = time.monotonic()
    rows = []
    print(json.dumps({"mode": "apply" if args.apply else "dry-run", "files": len(selected), "beforeBytes": before_bytes, "workers": args.workers, "jpegtran": tool_version, "journal": str(journal_path.relative_to(ROOT))}), flush=True)
    with tempfile.TemporaryDirectory(prefix="storage-work-", dir=GENERATED) as temporary:
        with journal_path.open("w") as journal, ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(optimize, source, jpegtran, Path(temporary), args.apply) for source in selected]
            for future in as_completed(futures):
                result = future.result()
                rows.append(result)
                journal.write(json.dumps(result) + "\n")
                journal.flush()
                if len(rows) % 250 == 0 or len(rows) == len(selected):
                    print(json.dumps({"processed": len(rows), "total": len(selected), "verified": sum(row["verified"] for row in rows), "optimized": sum(row["status"] == "optimized" for row in rows), "elapsedSeconds": round(time.monotonic() - started, 1)}), flush=True)

    after_bytes = sum(path.stat().st_size for path in selected)
    coverage_update = {"status": "dry_run"}
    if args.apply:
        try:
            coverage_update = update_coverage_asset_bytes()
        except Exception as error:
            coverage_update = {"status": "error", "error": f"{type(error).__name__}: {error}"}
    statuses = {status: sum(row["status"] == status for row in rows) for status in ("optimized", "would_optimize", "not_smaller", "pixel_mismatch", "error")}
    potential_savings = sum(max(0, row.get("beforeBytes", 0) - row.get("candidateBytes", row.get("beforeBytes", 0))) for row in rows if row["verified"])
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": "apply" if args.apply else "dry-run",
        "jpegtran": tool_version,
        "command": "jpegtran -copy all -optimize -progressive -outfile CANDIDATE.jpg SOURCE.jpg",
        "assetFiles": len(files), "selectedFiles": len(selected),
        "verifiedFiles": sum(row["verified"] for row in rows),
        "statuses": statuses,
        "beforeBytes": before_bytes, "afterBytes": after_bytes,
        "savedBytes": before_bytes - after_bytes,
        "potentialSavedBytes": potential_savings,
        "coverage": coverage_update,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "backupDirectory": str(BACKUPS.relative_to(ROOT)),
        "journal": str(journal_path.relative_to(ROOT)),
        "files": sorted(rows, key=lambda row: row["asset"]),
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: value for key, value in report.items() if key != "files"} | {"report": str(report_path.relative_to(ROOT))}), flush=True)
    return 1 if statuses["error"] or statuses["pixel_mismatch"] or coverage_update["status"] == "error" else 0


if __name__ == "__main__":
    raise SystemExit(main())

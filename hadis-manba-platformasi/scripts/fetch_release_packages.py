"""Nashr paytida (GitHub Actions) katalogdagi paketlarni GitHub Release'dan olib, SHA-256 ni tekshirib,
sayt papkasiga qo'yadi. Paketlar git tarixiga kirmaydi; brauzer esa ularni saytning o'zidan (CORS'siz) oladi.

    GH_TOKEN=... python scripts/fetch_release_packages.py --web _site/hadis-manba-platformasi/web
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--web", type=Path, required=True)
    a = ap.parse_args()
    entries, release = [], None
    for fn in ("catalog.json", "catalog-shartli.json"):
        f = a.web / fn
        if f.exists():
            cat = json.loads(f.read_text("utf-8"))
            release = release or cat.get("release")
            entries += cat.get("packages", [])
    if not release:
        print("katalogda release yo'q — paket olinmaydi")
        return
    # kitob yonidagi boblar va roviylar qatlami (overlay) o'z Release'ida bo'lishi mumkin (release_tag)
    by_tag = {}
    for p in entries + [p["overlay"] for p in entries if p.get("overlay")]:
        by_tag.setdefault(p.get("release_tag") or release["tag"], []).append(p)
    with tempfile.TemporaryDirectory() as td:
        for tag, items in by_tag.items():
            d = Path(td) / tag
            subprocess.run(["gh", "release", "download", tag, "--repo", release["repo"],
                            "--pattern", "*.hmz", "--dir", str(d)], check=True)
            for p in items:
                src = d / Path(p["file"]).name
                got = hashlib.sha256(src.read_bytes()).hexdigest()
                if got != p["package_sha256"]:
                    raise SystemExit(f"SHA-256 mos emas: {src.name}")
                dst = a.web / p["file"]
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(src, dst)
    print(", ".join(f"{tag}: {len(items)} paket" for tag, items in by_tag.items()) + " — Release'dan olindi va tekshirildi")


if __name__ == "__main__":
    main()

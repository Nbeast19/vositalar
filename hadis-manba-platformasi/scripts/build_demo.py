"""Sinov namunasi paketlarini yasaydi va PWA uchun ommaviy katalog quradi.

    python scripts/build_demo.py            -> build/namuna-manba, dist/*.hmz,
                                               build/demo/hadis-manba-platformasi/web/ (ilova + sinov katalogi)
`web/` (git) — ishlab chiqarish sayti: haqiqiy katalog (scripts/publish_release.py). Sinov namunasi
unga yozilmaydi; E2E sinovlari build/demo ichidagi nusxada, GitHub project path ko'rinishida ishlaydi.
Bir xil kirishdan har safar baytma-bayt bir xil paket chiqadi (deterministik ZIP).
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# GitHub Pages manzili (repo: Nbeast19/vositalar, Pages main'dan). Boshqa hostingda --base-url bilan o'zgartiring.
SITE_BASE_URL = "https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/"
sys.path[:0] = [str(ROOT / "src"), str(ROOT / "examples")]

import namuna_manba  # noqa: E402
from hadis_manba.pkgformat import build_package, build_selection  # noqa: E402
from hadis_manba.publish import build_public  # noqa: E402


def main():
    src_root = ROOT / "build" / "namuna-manba"
    dist = ROOT / "dist"
    shutil.rmtree(src_root, ignore_errors=True)
    shutil.rmtree(dist, ignore_errors=True)
    pkgs = [build_package(p, dist) for p in namuna_manba.make_all(src_root)]
    sides = [json.loads((dist / p.name.replace(".hmz", ".manifest.json")).read_text("utf-8")) for p in pkgs]
    by_id = {s["package_id"]: (s, p) for s, p in zip(sides, pkgs)}
    chosen = ["namuna-asos-a", "namuna-sharh-1", "namuna-sharh-2"]
    sel = build_selection([by_id[i][0] for i in chosen], "namuna-kitob-va-sharhlar",
                          {"uz": "Namuna kitobi + 2 sharh (sinov yig'masi)"}, "1.0.0", dist,
                          package_files=[by_id[i][1] for i in chosen])
    web = ROOT / "build" / "demo" / ROOT.name / "web"
    shutil.rmtree(web, ignore_errors=True)
    shutil.copytree(ROOT / "web", web, ignore=shutil.ignore_patterns(
        "en", "ar", "paketlar*", "catalog*.json", "sitemap.xml", "robots.txt", "PUBLIC-BUILD-REPORT.json"))
    rep = build_public(pkgs, web)
    print(json.dumps({k: [x.get("package_id", x) for x in v] for k, v in rep.items()}, ensure_ascii=False))
    print("selection:", sel.name)
    from hadis_manba.site import build_site
    print("site:", build_site([web / "catalog.json"], web, SITE_BASE_URL))
    # E2E sinovi uchun 1.1.0 yangilanish (ommaviy katalogga kirmaydi)
    v2 = ROOT / "build" / "namuna-asos-a-v110"
    shutil.rmtree(v2, ignore_errors=True)
    shutil.copytree(src_root / "namuna-asos-a", v2)
    m = json.loads((v2 / "package.json").read_text("utf-8"))
    m["package_version"] = "1.1.0"
    (v2 / "package.json").write_text(json.dumps(m, ensure_ascii=False), "utf-8")
    rows = [json.loads(l) for l in (v2 / "data" / "units.jsonl").read_text("utf-8").splitlines()]
    rows[2]["text_ar"] += " (تَصْحِيحٌ تَجْرِيبِيٌّ)"
    (v2 / "data" / "units.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), "utf-8")
    print("test:", build_package(v2, ROOT / "build" / "test-paketlar").name)
    # E2E uchun sun'iy mahalliy qatlam (Kitob → Bob, sanad yo'llari, roviy indeksi) — ommaviy katalogga kirmaydi
    import namuna_overlay
    blob, _ = namuna_overlay.build(by_id["namuna-asos-a"][1])
    (ROOT / "build" / "test-paketlar" / "namuna-overlay-a-1.0.0.hmz").write_bytes(blob)
    print("test: namuna-overlay-a-1.0.0.hmz")


if __name__ == "__main__":
    main()

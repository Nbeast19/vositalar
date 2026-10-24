"""Haqiqiy paketlarni GitHub Releases orqali nashr qilish (foydalanuvchi ruxsati: QARORLAR.md #26).

Bosqichlar:

  1) stage   — allowlist (public + conditional) paketlarini Release uchun alohida papkaga yig'adi:
               paketlar/*.hmz, SHA256SUMS, RIGHTS-PAKETLAR.md, RELEASE-NOTES.md
     python scripts/publish_release.py stage <paket.hmz ...> --out <papka> --tag <tag> --repo <owner/repo>

  2) catalog — Release yaratilgach web/catalog.json, web/catalog-shartli.json va /en/, /ar/ statik
               sahifalarini yozadi. Paketlar gitga kirmaydi: .github/workflows/hadis-manba-pages.yml
               nashrda ularni Release'dan olib web/paketlar/ ga qo'yadi (scripts/fetch_release_packages.py)
     python scripts/publish_release.py catalog --stage <papka> --assets <assets.json> --web web --base-url <URL>

  3) layers  — boblar va roviylar qatlamlarini (alohida Release) catalog.json dagi kitoblarga ulaydi (QARORLAR.md #53)
     python scripts/publish_release.py layers <qatlam.hmz ...> --assets <assets.json> --repo <owner/repo> --tag <tag>

assets.json: [{"name": "...hmz", "id": 123}, ...] (GitHub release assets ro'yxati).
Huquqi noma'lum (unknown/restricted) paketlar hech qachon tanlanmaydi — classify() qaroriga tayanadi.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from hadis_manba.publish import build_public  # noqa: E402
from hadis_manba.site import build_site  # noqa: E402


def _name(p: dict, lang: str) -> str:
    return (p.get("title") or {}).get(lang) or p["package_id"]


def _authors(p: dict) -> str:
    return "; ".join(a.get("name_ar") or a.get("name_en") or a["person_id"] for a in p.get("authors") or []) or "—"


def _licence(p: dict) -> str:
    body = next((r for r in p["rights"] if r["applies_to"] == "classical_body"), p["rights"][0])
    if body.get("license_id"):
        return body["license_id"]
    return "permission (" + (body.get("required_attribution") or "?") + ")"


def _attribution(p: dict) -> str:
    seen = []
    for r in p["rights"]:
        a = r.get("required_attribution")
        if a and a not in seen:
            seen.append(a)
    return "; ".join(seen) or "—"


def stage(pkgs: list[Path], out: Path, tag: str, repo: str) -> dict:
    if out.exists():
        shutil.rmtree(out)
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        rep = build_public(pkgs, tmp)
        cats = {"public": json.loads((tmp / "catalog.json").read_text("utf-8"))}
        shartli = tmp / "catalog-shartli.json"
        cats["conditional"] = json.loads(shartli.read_text("utf-8")) if shartli.exists() else {"packages": []}
        (out / "paketlar").mkdir(parents=True)
        for ch, cat in cats.items():
            for p in cat["packages"]:
                shutil.copy(tmp / p["file"], out / "paketlar" / Path(p["file"]).name)
        (out / "catalog.json").write_text(json.dumps(cats["public"], ensure_ascii=False, indent=1) + "\n", "utf-8")
        (out / "catalog-shartli.json").write_text(json.dumps(cats["conditional"], ensure_ascii=False, indent=1) + "\n", "utf-8")
    allp = [p for c in cats.values() for p in c["packages"]]
    sums = "".join(f"{p['package_sha256']}  {Path(p['file']).name}\n" for p in sorted(allp, key=lambda x: x["file"]))
    (out / "paketlar" / "SHA256SUMS").write_text(sums, "utf-8")

    url = f"https://github.com/{repo}/releases/download/{tag}/"
    lines = ["# Hadis Manba — package rights and attribution", "",
             "Each package (`.hmz`) also contains its own `LICENSE` and `ATTRIBUTION` files.",
             "Packages whose rights are unknown are **not** published here; they stay local only.", ""]
    for title, ch in (("Main books (open to share — Sunnah.com permission)", "public"),
                      ("Commentaries (conditional — CC BY-NC-SA 4.0, non-commercial, share-alike)", "conditional")):
        lines += [f"## {title}", "", "| Package | Arabic title | English title | Author | Edition | Licence | Attribution | SHA-256 |",
                  "|---|---|---|---|---|---|---|---|"]
        for p in sorted(cats[ch]["packages"], key=lambda x: x["package_id"]):
            f = Path(p["file"]).name
            lines.append(f"| [{f}]({url}{f}) | {_name(p, 'ar')} | {_name(p, 'en')} | {_authors(p)} | `{p['edition_id']}` | "
                         f"{_licence(p)} | {_attribution(p)} | `{p['package_sha256'][:16]}…` |")
        lines.append("")
    (out / "paketlar" / "RIGHTS-PAKETLAR.md").write_text("\n".join(lines), "utf-8")

    n_pub, n_con = len(cats["public"]["packages"]), len(cats["conditional"]["packages"])
    notes = f"""Hadis Manba offline packages — {n_pub} main books + {n_con} commentaries, each a separate download.

* Install them from the app (Library → book → *Install book only* or *Install book + selected commentaries*), or download a `.hmz` file here and use **My books → Import file**.
* A commentary links to its hadiths only when its matching main-book edition is also installed.
* Main books: Sunnah.com (hadith-json 1.2.0), shared with permission. Commentaries: OpenITI corpus, **CC BY-NC-SA 4.0** (non-commercial, share-alike, attribution required).
* Rights, authors, editions and attribution for every package: `RIGHTS-PAKETLAR.md`. Checksums: `SHA256SUMS`.
* Scholarly coverage is **incomplete** (most status fields are “not reviewed”). No new translation of hadith or commentary text is included.

حزم Hadis Manba للعمل بلا إنترنت — {n_pub} كتابًا أصليًا و{n_con} شرحًا، كلٌّ منها تنزيل مستقل. الشروح من مدونة OpenITI بترخيص CC BY-NC-SA 4.0 (غير تجاري، مع النسبة والمشاركة بالمثل). التغطية العلمية غير مكتملة.
"""
    (out / "RELEASE-NOTES.md").write_text(notes, "utf-8")
    return {"public": n_pub, "conditional": n_con, "local_only": len(rep.get("local_only", []))}


def catalog(stage_dir: Path, assets: Path, web: Path, base_url: str, repo: str, tag: str) -> dict:
    ids = {a["name"]: a["id"] for a in json.loads(assets.read_text("utf-8"))}
    out = {}
    for fn in ("catalog.json", "catalog-shartli.json"):
        cat = json.loads((stage_dir / fn).read_text("utf-8"))
        for p in cat["packages"]:
            f = Path(p["file"]).name
            if f not in ids:
                raise SystemExit(f"Release'da asset yo'q: {f}")
            # Brauzer Release fayllarini CORS sababli ololmaydi (sinalgan): Pages workflow paketni Release'dan
            # olib, xeshini tekshirib, saytning o'zi bilan bir manzilga (paketlar/) qo'yadi. Gitga kirmaydi.
            p["file"] = f"paketlar/{f}"
            p["release_asset_id"] = ids[f]
            p["download_url"] = f"https://github.com/{repo}/releases/download/{tag}/{f}"
        cat["release"] = {"repo": repo, "tag": tag, "url": f"https://github.com/{repo}/releases/tag/{tag}"}
        (web / fn).write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", "utf-8")
        out[fn] = len(cat["packages"])
    for d in ("paketlar", "paketlar-shartli"):
        shutil.rmtree(web / d, ignore_errors=True)
    out["site"] = build_site([web / "catalog.json", web / "catalog-shartli.json"], web, base_url)
    return out


def layers(packages: list[Path], assets: Path, web: Path, repo: str, tag: str) -> dict:
    """Boblar va roviylar qatlamlarini (kind=overlay) web/catalog.json dagi asosiy kitobga `overlay` sifatida ulaydi:
    ilova kitob bilan birga qatlamni ham o'rnatadi. Fayllar alohida Release'da; Pages nashrida paketlar/ ga olinadi
    (scripts/fetch_release_packages.py). Manba egasining ruxsati bilan (QARORLAR.md #53)."""
    ids = {a["name"]: a["id"] for a in json.loads(assets.read_text("utf-8"))}
    f = web / "catalog.json"
    cat = json.loads(f.read_text("utf-8"))
    by_sha = {p["package_sha256"]: p for p in cat["packages"] if p["kind"] == "base_book"}
    n = 0
    for pk in packages:
        data = pk.read_bytes()
        m = json.loads(zipfile.ZipFile(io.BytesIO(data)).read("package.json"))
        if m.get("kind") != "overlay":
            raise SystemExit(f"{pk.name}: qatlam paketi emas")
        base = by_sha.get(m["target"]["package_sha256"])
        if not base:
            raise SystemExit(f"{pk.name}: asosiy kitob katalogda yo'q (target.package_sha256 mos emas)")
        if pk.name not in ids:
            raise SystemExit(f"Release'da asset yo'q: {pk.name}")
        base["overlay"] = {"package_id": m["package_id"], "kind": "overlay", "package_version": m["package_version"], "title": m.get("title"),
                           "file": f"paketlar/{pk.name}", "package_sha256": hashlib.sha256(data).hexdigest(), "compressed_bytes": len(data),
                           "release_tag": tag, "release_asset_id": ids[pk.name],
                           "download_url": f"https://github.com/{repo}/releases/download/{tag}/{pk.name}"}
        n += 1
    f.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", "utf-8")
    return {"layers": n}


def _en(p: dict) -> str:
    t = p.get("title") or {}
    return t.get("en") or t.get("uz") or p["package_id"]


def asset_label(p: dict, base_titles: dict) -> str:
    """GitHub asset ko'rinadigan nomi (fayl nomi va yuklab olish URL'i o'zgarmaydi)."""
    if p["kind"] == "base_book":
        return f"{_en(p)} — Main text (v{p['package_version']}).hmz"
    tw = (p.get("requires_for_linked_reading") or [{}])[0].get("target_work_id")
    return f"{base_titles.get(tw, tw)} — {_en(p)} — Commentary (v{p['package_version']}).hmz"


def meta(web: Path, out: Path, repo: str, tag: str, app_url: str) -> dict:
    """Release tavsifi (guruhlangan jadval, insoniy nomlar) va asset label xaritasi."""
    pub = json.loads((web / "catalog.json").read_text("utf-8"))["packages"]
    shp = web / "catalog-shartli.json"
    con = json.loads(shp.read_text("utf-8"))["packages"] if shp.exists() else []
    base_titles = {p["work_id"]: _en(p) for p in pub if p["kind"] == "base_book"}
    labels = {Path(p["file"]).name: asset_label(p, base_titles) for p in pub + con}
    labels["SHA256SUMS"] = "Checksums (SHA-256) for all packages"
    labels["RIGHTS-PAKETLAR.md"] = "Rights, authors, editions and attribution (per package)"
    url = f"https://github.com/{repo}/releases/download/{tag}/"
    def mb(n):
        return f"{n / 1048576:.1f} MB" if n and n >= 1048576 else f"{(n or 0) / 1024:.0f} KB"
    def auth(p):
        a = (p.get("authors") or [{}])[0]
        return a.get("name_ar") or a.get("name_en") or "—"
    lines = [
        "# Hadith Library | مكتبة الحديث — book and commentary downloads", "",
        f"**[Open the app / افتح التطبيق]({app_url})** — the easiest way: choose a book in the app and press *Install*. It works offline afterwards.", "",
        "**Downloading a file here instead?** A `.hmz` file is a library package, not a document to open. "
        f"Open the app → *My library* → *Install from a file* and choose the `.hmz` file. "
        "ملف ‎.hmz حزمة مكتبة: افتح التطبيق ← مكتبتي ← التثبيت من ملف.", "",
        "| Book | الكتاب | Author | Main text | Commentaries (separate downloads) |", "|---|---|---|---|---|"]
    order = ["w-bukhari", "w-muslim", "w-abudawud", "w-tirmidhi", "w-nasai", "w-ibnmajah", "w-malik", "w-ahmed", "w-darimi",
             "w-mishkat-almasabih", "w-riyad-assalihin", "w-bulugh-almaram", "w-aladab-almufrad", "w-shamail-muhammadiyah"]
    rank = lambda p: (order.index(p["work_id"]) if p["work_id"] in order else len(order), _en(p))
    for b in sorted([p for p in pub if p["kind"] == "base_book"], key=rank):
        f = Path(b["file"]).name
        cs = [c for c in con + pub if c["kind"] == "commentary" and (c.get("requires_for_linked_reading") or [{}])[0].get("target_work_id") == b["work_id"]]
        comm = "<br>".join(f"[{(c.get('title') or {}).get('ar', '')} — {_en(c)}]({url}{Path(c['file']).name}) · {mb(c.get('compressed_bytes'))} · "
                           f"{next((r.get('license_id') for r in c.get('rights', []) if r.get('applies_to') == 'classical_body'), None) or 'permission'}"
                           for c in cs) or "—"
        lines.append(f"| **{_en(b)}** | {(b.get('title') or {}).get('ar', '')} | {auth(b)} | [Download · {mb(b.get('compressed_bytes'))}]({url}{f}) (v{b['package_version']}) | {comm} |")
    lines += ["", "Main texts: Sunnah.com (hadith-json 1.2.0), shared with permission. Commentaries: OpenITI corpus, **CC BY-NC-SA 4.0** "
              "(non-commercial, share-alike, attribution). Scholarly coverage is incomplete; see the app’s *Source and verification* box on each hadith.", "",
              "## Verification and licences", "",
              f"- [`SHA256SUMS`]({url}SHA256SUMS) — checksums of every package (unchanged since publication).",
              f"- [`RIGHTS-PAKETLAR.md`]({url}RIGHTS-PAKETLAR.md) — licence, author, edition and attribution for each package.",
              "- File names are stable internal IDs (e.g. `hm-bukhari-hj120-1.0.1.hmz`); the readable names above are display labels only.",
              "- Packages whose rights are unknown are not published here."]
    out.mkdir(parents=True, exist_ok=True)
    (out / "RELEASE-NOTES.md").write_text("\n".join(lines) + "\n", "utf-8")
    (out / "asset-labels.json").write_text(json.dumps({"tag": tag, "labels": labels}, ensure_ascii=False, indent=1) + "\n", "utf-8")
    return {"assets": len(labels)}


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("stage")
    s.add_argument("packages", type=Path, nargs="+")
    s.add_argument("--out", type=Path, required=True)
    s.add_argument("--tag", required=True)
    s.add_argument("--repo", required=True)
    c = sub.add_parser("catalog")
    c.add_argument("--stage", type=Path, required=True)
    c.add_argument("--assets", type=Path, required=True)
    c.add_argument("--web", type=Path, default=ROOT / "web")
    c.add_argument("--base-url", required=True)
    c.add_argument("--repo", required=True)
    c.add_argument("--tag", required=True)
    q = sub.add_parser("layers")
    q.add_argument("packages", type=Path, nargs="+")
    q.add_argument("--assets", type=Path, required=True)
    q.add_argument("--web", type=Path, default=ROOT / "web")
    q.add_argument("--repo", required=True)
    q.add_argument("--tag", required=True)
    m = sub.add_parser("meta")
    m.add_argument("--web", type=Path, default=ROOT / "web")
    m.add_argument("--out", type=Path, default=ROOT / "release")
    m.add_argument("--repo", required=True)
    m.add_argument("--tag", required=True)
    m.add_argument("--app-url", required=True)
    a = ap.parse_args()
    if a.cmd == "meta":
        print(json.dumps(meta(a.web, a.out, a.repo, a.tag, a.app_url)))
        return
    if a.cmd == "layers":
        print(json.dumps(layers(sorted(a.packages), a.assets, a.web, a.repo, a.tag)))
        return
    if a.cmd == "stage":
        print(json.dumps(stage(sorted(a.packages), a.out, a.tag, a.repo)))
    else:
        print(json.dumps(catalog(a.stage, a.assets, a.web, a.base_url, a.repo, a.tag), ensure_ascii=False))


if __name__ == "__main__":
    main()

"""Sinov uchun sun'iy mahalliy qatlam (kind=overlay) — faqat namuna-asos-a paketiga, E2E sinovlari uchun.

Hammasi SUN'IY: bob nomlari, "roviylar" va o'zbekcha matn sinov uchun yozilgan; haqiqiy hadis/roviy ma'lumoti emas.
Roviy oraliqlari namuna matnidagi so'zlarga qo'yilgan (UI mexanikasini sinash uchun): sahifalash (>20 natija),
ikki yo'l (A/B), yo'l a'zosi bo'lib matnda belgilanmagan holat, bobi aniqlanmagan yozuv, mos/mos bo'lmagan asos xeshi.
"""
from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_overlay import pack_overlay  # noqa: E402

WORD = "تَجْرِيبِيٌّ"
WORD2 = "نَصٌّ"


def build(base_hmz: Path) -> tuple[bytes, dict]:
    data = base_hmz.read_bytes()
    z = zipfile.ZipFile(base_hmz)
    m = json.loads(z.read("package.json"))
    units = sorted((json.loads(x) for x in z.read("data/units.jsonl").decode("utf-8").splitlines() if x.strip()), key=lambda u: u["seq"])
    ids = [u["unit_id"] for u in units]
    title = units[0].get("chapter_ar") or ""
    babs = [
        {"id": "b1", "order": 1, "title_ar": "بَابٌ تَجْرِيبِيٌّ أَوَّلُ فِي طَلَبِ العِلْمِ", "title_tagged": None, "toc": 1, "evidence": "toc_tag",
         "source": {"page": 1, "line": 0}, "intro": [{"text_ar": "كَلَامٌ تَجْرِيبِيٌّ فِي أَوَّلِ البَابِ.", "page": 1, "line": 1}],
         "shamela_kitab": None, "unit_ids": ids[0:6], "kitab_id": "k1", "kitab_basis": "own_hadiths"},
        {"id": "b2", "order": 2, "title_ar": "بَابٌ تَجْرِيبِيٌّ ثَانٍ", "title_tagged": None, "toc": None, "evidence": "line_pattern_unverified",
         "source": {"page": 2, "line": 0}, "intro": [], "shamela_kitab": None, "unit_ids": ids[6:11], "kitab_id": "k1", "kitab_basis": "own_hadiths"},
    ]
    unit_bab = {u: "b1" for u in ids[0:6]} | {u: "b2" for u in ids[6:11]}   # oxirgisi — bobi aniqlanmagan
    kitabs = [{"id": "k1", "order": 1, "title_ar": title, "unit_ids": ids, "source": "test", "bab_ids": ["b1", "b2"],
               "unit_count": len(ids), "units_with_bab": 11, "units_opening": 0}]
    isnad = []
    for u in units:
        cps = list(u["text_ar"])
        text = u["text_ar"]
        mentions = []
        for pid, w in ((902, WORD2), (901, WORD)):
            i = text.find(w)
            if i >= 0:
                s = len(text[:i])
                mentions.append({"mid": f"{u['unit_id']}#m{len(mentions) + 1}", "person": pid, "as_written": w, "span": [s, s + len(w)]})
        assert len(cps) == len(text)
        nodes_a = [{"pos": k + 1, "person": mm["person"], "mid": mm["mid"]} for k, mm in enumerate(mentions)]
        if u["seq"] == units[0]["seq"]:   # birinchi yozuvda yo'l oxiri matnda: "faqat ismlar" kesishini sinash uchun
            nodes_a = [{"pos": 1, "person": 903, "mid": None}] + [dict(x, pos=x["pos"] + 1) for x in nodes_a]
        else:
            nodes_a.append({"pos": len(nodes_a) + 1, "person": 903, "mid": None})
        routes = [{"route_id": f"{u['unit_id']}#r1", "label": "A", "page_isnads_id": 0, "of": len(nodes_a), "nodes": nodes_a},
                  {"route_id": f"{u['unit_id']}#r2", "label": "B", "page_isnads_id": 0, "of": 2,
                   "nodes": [{"pos": 1, "person": 904, "mid": None}, {"pos": 2, "person": 901, "mid": None}]}]
        isnad.append({"unit_id": u["unit_id"], "seq": u["seq"], "text_sha256": u["current_text_sha256"],
                      "evidence": {"shamela_page_id": 0, "printed_number": (u.get("numbers") or [{}])[0].get("number_text"), "hadeeth_key": None},
                      "mentions": mentions, "routes": routes, "branched": True, "reasons": ["tahwil_branch_in_page"],
                      "status": "branched", "intermediaries": None})
    persons = [{"person": 901, "short_name": "رَاوٍ تَجْرِيبِيٌّ أ", "long_name": "رَاوٍ تَجْرِيبِيٌّ أ (سِينُوف)", "summary": [["الكنية", "أَبُو التَّجْرِبَةِ"]],
                "opinions": [["عَالِمٌ تَجْرِيبِيٌّ", [["قَوْلٌ تَجْرِيبِيٌّ", "كِتَابٌ تَجْرِيبِيٌّ (1/ 1)", 1]]]], "status": "source_excerpt_unreviewed"},
               {"person": 902, "short_name": "رَاوٍ تَجْرِيبِيٌّ ب", "long_name": "", "summary": [], "opinions": [], "status": "source_excerpt_unreviewed"},
               {"person": 903, "short_name": "رَاوٍ تَجْرِيبِيٌّ ج", "long_name": "", "summary": [], "opinions": [], "status": "source_excerpt_unreviewed"},
               {"person": 904, "short_name": "رَاوٍ تَجْرِيبِيٌّ د", "long_name": "", "summary": [], "opinions": [], "status": "source_excerpt_unreviewed"}]
    translations = [
        {"target": "b1", "target_kind": "bab", "title": "Birinchi sinov bobi (sun’iy).", "intro": ["Sinov kirish matni (sun’iy)."]},
        {"target": ids[0], "target_kind": "unit", "sanad": "Sinov sanadi (sun’iy).", "matn": ["Sinov matni tarjimasi (sun’iy)."]},
    ]
    for t in translations:
        t.update({"language": "uz", "status": "editorial-draft-awaiting-scholarly-review", "origin": "test fixture", "translator": None, "published_source": None})
    ov = {"base": {"package_id": m["package_id"], "package_version": m["package_version"], "package_sha256": hashlib.sha256(data).hexdigest(),
                   "edition_id": m["edition_id"], "work_id": m["work_id"]},
          "kitabs": kitabs, "babs": babs, "unit_bab": unit_bab, "kitab_opening": [], "isnad": isnad, "persons": persons,
          "translations": translations, "stats": {"units": len(units), "isnad": {"status:branched": len(units)}, "test_fixture": True}}
    blob = pack_overlay(ov, {"test_fixture": True}, package_id="namuna-overlay-a", version="1.0.0",
                        license_text="CC0-1.0 (sinov namunasi)\n", attribution="Sun'iy sinov ma'lumoti — haqiqiy manba emas.\n",
                        rights=[{"holder": "test", "terms": "CC0-1.0", "redistribution": True, "status": "test_fixture"}],
                        title={"uz": "Namuna qatlami (sinov)", "en": "Sample layer (test)", "ar": "طبقة تجريبية"})
    return blob, ov

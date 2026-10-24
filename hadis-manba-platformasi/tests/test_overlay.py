"""Mahalliy qatlam quruvchisi (scripts/build_overlay.py) — Kitob/Bob tuzilmasi, sanad oraliqlari, roviylar.

Fixture Shamela/page_isnads tuzilmasini qisqartirib takrorlaydi (ID va qisqa matnlar); butun Buxoriy emas.
"""
import hashlib
import importlib.util
import json
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("build_overlay", ROOT / "scripts" / "build_overlay.py")
bo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bo)


def a(i, t):
    return f'<a href="inr://man-{i}">{t}</a>'


T = "<span data-type='title' id=toc-{n}>{t}</span>"
PAGES = {
    1: '<span data-type="title">(هذا نص التقرير) </span>\rنَصُّ تَقْدِيمٍ تَجْرِيبِيٍّ لِلطَّبْعَةِ',   # nashr old qismi (part المقدمة)
    5: '<span data-type="title">مقدمة </span>\r﷽\rمُقَدِّمَةٌ تَجْرِيبِيَّةٌ لِلنَّاشِرِ',                     # toc'siz sarlavha — nashr muqaddimasi
    9: "﷽\rقَالَ الشَّيْخُ: كَيْفَ كَانَ بَدْءُ الْوَحْيِ.",
    10: "١ - حَدَّثَنَا " + a(10, "الْحُمَيْدِيُّ") + " عَنْ " + a(11, "عُمَرَ") + ": <hadeeth-1>«الْأَعْمَالُ بِالنِّيَّاتِ»",
    11: "⦗٧⦘\rقَالَتْ عَائِشَةُ: وَلَقَدْ رَأَيْتُهُ",                                                  # hadis davomi — ochilish matni emas
    17: "﷽\r" + T.format(n=5, t="كِتَابُ الْإِيمَانِ") + "\rبَابُ الْإِيمَانِ وَقَوْلِ النَّبِيِّ ﷺ\rوَهُوَ قَوْلٌ وَفِعْلٌ",   # toc-6 belgisiz
    18: T.format(n=7, t="بَابٌ: دُعَاؤُكُمْ إِيمَانُكُمْ"),
    19: "٨ - حَدَّثَنَا " + a(4210, "عُبَيْدُ اللهِ بْنُ مُوسَى") + " قَالَ: أَخْبَرَنَا " + a(1681, "حَنْظَلَةُ") + " عَنْ " + a(4454, "عِكْرِمَةَ بْنِ خَالِدٍ")
        + " عَنِ " + a(3807, "ابْنِ عُمَرَ") + " قَالَ: <hadeeth-8>«بُنِيَ الْإِسْلَامُ عَلَى خَمْسٍ»",
    20: T.format(n=8, t="بَابُ الْمَسَاجِدِ الَّتِي عَلَى\r\r⦗١٠٤⦘\rطُرُقِ الْمَدِينَةِ"),   # ko'p satrli sarlavha
    21: "٦٠١ - حَدَّثَنَا " + a(1588, "أَبُو الْيَمَانِ") + " عَنِ " + a(5917, "الزُّهْرِيِّ") + " حَدَّثَنِي " + a(2249, "سَالِمُ بْنُ عَبْدِ اللهِ بْنِ عُمَرَ،")
        + " " + a(223, "وَأَبُو بَكْرِ بْنُ أَبِي حَثْمَةَ") + ": أَنَّ " + a(3807, "عَبْدَ اللهِ بْنَ عُمَرَ") + " قَالَ: <hadeeth-99>«صَلَّى النَّبِيُّ ﷺ»",
    22: "٦ - حَدَّثَنَا " + a(3784, "عَبْدَانُ") + " أَخْبَرَنَا " + a(3875, "عَبْدُ اللهِ") + " (ح). وَحَدَّثَنَا " + a(941, "بِشْرُ بْنُ مُحَمَّدٍ")
        + " أَخْبَرَنَا " + a(3875, "عَبْدُ اللهِ") + " عَنْ " + a(3732, "ابْنِ عَبَّاسٍ") + ": <hadeeth-6>«كَانَ أَجْوَدَ»",
}
UNITS = [   # (raqam, sahifa, chapter_ar, matn)
    (1, 10, "كتاب بدء الوحى", "حَدَّثَنَا الْحُمَيْدِيُّ عَنْ عُمَرَ: الْأَعْمَالُ بِالنِّيَّاتِ"),
    (8, 19, "كتاب الإيمان", "حَدَّثَنَا عُبَيْدُ اللَّهِ بْنُ مُوسَى قَالَ أَخْبَرَنَا حَنْظَلَةُ عَنْ عِكْرِمَةَ بْنِ خَالِدٍ عَنِ ابْنِ عُمَرَ قَالَ بُنِيَ الإِسْلاَمُ"),
    (601, 21, "كتاب الإيمان", "حَدَّثَنَا أَبُو الْيَمَانِ عَنِ الزُّهْرِيِّ حَدَّثَنِي سَالِمُ بْنُ عَبْدِ اللَّهِ بْنِ عُمَرَ، وَأَبُو بَكْرِ بْنُ أَبِي حَثْمَةَ أَنَّ عَبْدَ اللَّهِ بْنَ عُمَرَ قَالَ صَلَّى"),
    (6, 22, "كتاب الإيمان", "حَدَّثَنَا عَبْدَانُ أَخْبَرَنَا عَبْدُ اللَّهِ وَحَدَّثَنَا بِشْرُ بْنُ مُحَمَّدٍ أَخْبَرَنَا عَبْدُ اللَّهِ عَنِ ابْنِ عَبَّاسٍ كَانَ أَجْوَدَ"),
    (9999, 999, "كتاب الإيمان", "نَصٌّ بِلَا دَلِيلٍ"),          # Shamela paragrafi yo'q — bobi aniqlanmagan
]


def fixture(tmp_path):
    raw = tmp_path / "raw"
    (raw / "shamela-bukhari").mkdir(parents=True)
    (raw / "task2").mkdir()
    rows = [{"book_id": 1458, "shamela_page_id": k, "part": "المقدمة" if k == 1 else "1", "page_num": k, "body": v} for k, v in PAGES.items()]
    (raw / "shamela-bukhari" / "pages.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in reversed(rows)), "utf-8")
    isn = [{"id": 1, "book_id": 1458, "shamela_page_id": 10, "hadeeth_key": 1, "narrator_ids": [11, 10, 5495]},
           {"id": 2, "book_id": 1458, "shamela_page_id": 19, "hadeeth_key": 8, "narrator_ids": [3807, 4454, 1681, 4210, 5495]},
           {"id": 3, "book_id": 1458, "shamela_page_id": 21, "hadeeth_key": 99, "narrator_ids": [3807, 2249, 5917, 1588, 5495]},
           {"id": 4, "book_id": 1458, "shamela_page_id": 22, "hadeeth_key": 6, "narrator_ids": [3732, 3875, 941, 5495]}]
    (raw / "task2" / "page_isnads.json").write_text(json.dumps(isn), "utf-8")
    people = {10: "الحميدي", 11: "عمر", 4210: "عبيد الله بن موسى", 1681: "حنظلة", 4454: "عكرمة بن خالد بن سعيد", 10547: "عكرمة بن خالد بن سلمة",
              3807: "عبد الله بن عمر", 1588: "أبو اليمان", 5917: "الزهري", 2249: "سالم بن عبد الله", 223: "أبو بكر بن أبي حثمة",
              3784: "عبدان", 3875: "عبد الله بن المبارك", 941: "بشر بن محمد", 3732: "ابن عباس"}
    (raw / "task2" / "narrators.json").write_text(json.dumps([{"id": k, "short_name": v, "long_name": v, "biography_text": json.dumps({"summary": [["الرتبة", "ثقة"]]}),
                                                               "criticism_text": None} for k, v in people.items()], ensure_ascii=False), "utf-8")
    units, ev = [], []
    for seq, (num, page, ch, text) in enumerate(UNITS, 1):
        uid = f"ed-bukhari-hj120:{seq}"
        units.append({"unit_id": uid, "seq": seq, "chapter_ar": ch, "text_ar": text, "attribution_kind": "marfu",
                      "current_text_sha256": hashlib.sha256(text.encode()).hexdigest(), "numbers": [{"number_text": str(num), "evidence_id": uid + "#ev"}]})
        ev.append({"evidence_id": uid + "#ev", "candidates": [{"source": "shamela-edition", "number": str(num), "url": f"https://shamela.ws/book/1681/{page}"}]})
    pkg = tmp_path / "hm-bukhari-hj120-test.hmz"
    with zipfile.ZipFile(pkg, "w") as z:
        z.writestr("package.json", json.dumps({"package_id": "hm-bukhari-hj120", "package_version": "1.0.1", "edition_id": "ed-bukhari-hj120", "work_id": "w-bukhari"}))
        z.writestr("data/units.jsonl", "".join(json.dumps(u, ensure_ascii=False) + "\n" for u in units))
        z.writestr("data/evidence.jsonl", "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in ev))
    return raw, pkg, bo.build(raw, pkg)


def by_num(ov, num):
    uid = f"ed-bukhari-hj120:{[u[0] for u in UNITS].index(num) + 1}"
    return uid, next(r for r in ov["isnad"] if r["unit_id"] == uid)


def test_headings_from_source_only_and_untagged_needs_toc_gap(tmp_path):
    _, _, ov = fixture(tmp_path)
    titles = {b["title_ar"]: b for b in ov["babs"]}
    b0 = titles["بَابُ الْإِيمَانِ وَقَوْلِ النَّبِيِّ ﷺ"]
    assert b0["evidence"] == "toc_gap" and b0["toc"] is None           # toc-5 va toc-7 orasidagi bitta yetishmagan raqam
    assert b0["intro"][0]["text_ar"] == "وَهُوَ قَوْلٌ وَفِعْلٌ"           # bob matni hadisga qo'shilib ketmaydi
    multi = next(b for b in ov["babs"] if b["toc"] == 8)
    assert multi["title_ar"].startswith("بَابُ الْمَسَاجِدِ الَّتِي عَلَى") and multi["title_ar"].endswith("طُرُقِ الْمَدِينَةِ")
    assert [b["order"] for b in ov["babs"]] == list(range(1, len(ov["babs"]) + 1))   # faqat manba tartibi; bosma raqam yo'q
    assert all("number" not in b for b in ov["babs"])


def test_units_attach_to_chapters_only_by_page_and_number(tmp_path):
    _, _, ov = fixture(tmp_path)
    uid8, _ = by_num(ov, 8)
    b = next(b for b in ov["babs"] if b["id"] == ov["unit_bab"][uid8])
    assert b["title_ar"] == "بَابٌ: دُعَاؤُكُمْ إِيمَانُكُمْ"
    assert "ed-bukhari-hj120:1" in ov["kitab_opening"]                 # Vahiy boshi: bob sarlavhasi yo'q, yangi bob yaratilmaydi
    assert "ed-bukhari-hj120:5" not in ov["unit_bab"] and "ed-bukhari-hj120:5" not in ov["kitab_opening"]   # dalilsiz — aniqlanmagan
    assert ov["stats"].get("unit_no_shamela_evidence", 0) + ov["stats"].get("unit_paragraph_not_found", 0) == 1


def test_t01_nasab_is_not_a_separate_narrator(tmp_path):
    _, _, ov = fixture(tmp_path)
    uid, r = by_num(ov, 601)
    text = UNITS[2][3]
    spans = {m["person"]: text[m["span"][0]:m["span"][1]] for m in r["mentions"]}
    assert spans[2249] == "سَالِمُ بْنُ عَبْدِ اللَّهِ بْنِ عُمَرَ"
    ibn_umar = next(m for m in r["mentions"] if m["person"] == 3807)
    assert text[ibn_umar["span"][0]:ibn_umar["span"][1]] == "عَبْدَ اللَّهِ بْنَ عُمَرَ"
    assert ibn_umar["span"][0] > text.index("أَنَّ")                    # nasab ichidagi "عبد الله بن عمر" emas
    route = r["routes"][0]
    assert [n["pos"] for n in route["nodes"]] == [1, 2, 3, 4] and route["nodes"][-1]["mid"] == ibn_umar["mid"]
    abu_bakr = next(m for m in r["mentions"] if text[m["span"][0]:m["span"][1]] == "أَبُو بَكْرِ بْنُ أَبِي حَثْمَةَ")
    assert route["nodes"][2].get("also") == [abu_bakr["mid"]]          # parallel shayx: Solim bilan bir o'rinda (3), «و»siz


def test_bukhari8_ordinals_and_repeated_person_follow_route_order(tmp_path):
    _, _, ov = fixture(tmp_path)
    _, r8 = by_num(ov, 8)
    assert r8["status"] == "established_single_route" and r8["intermediaries"] == 4
    assert [n["person"] for n in r8["routes"][0]["nodes"]] == [4210, 1681, 4454, 3807]
    _, r6 = by_num(ov, 6)
    assert r6["status"] == "branched" and r6["intermediaries"] is None
    mid_of = {n["person"]: n["mid"] for n in r6["routes"][0]["nodes"]}
    m = {x["mid"]: i for i, x in enumerate(r6["mentions"])}
    assert m[mid_of[3875]] > m[mid_of[941]]                            # Bishrdan keyingi "عبد الله", birinchi tarmoqdagisi emas


def test_persons_by_exact_id_and_output_outside_repo(tmp_path):
    raw, _, ov = fixture(tmp_path)
    ids = {p["person"] for p in ov["persons"]}
    assert 4454 in ids and 10547 not in ids                           # ism o'xshashligi bilan boshqa Ikrima qo'shilmaydi
    with pytest.raises(SystemExit):
        bo.write_overlay(ov, ROOT / "build" / "x", raw)
    p = bo.write_overlay(ov, tmp_path / "out", raw)
    z = zipfile.ZipFile(p)
    m = json.loads(z.read("package.json"))
    assert m["kind"] == "overlay" and m["channel"] == "local_only" and m["rights"][0]["redistribution"] is False
    sums = dict(reversed(line.split("  ")) for line in z.read("SHA256SUMS").decode().splitlines())
    assert all(hashlib.sha256(z.read(n)).hexdigest() == h for n, h in sums.items())


def test_kitab_names_only_from_sample_with_provenance(tmp_path):
    raw, pkg, ov = fixture(tmp_path)
    assert all("names" not in k for k in ov["kitabs"])                 # qoralamasiz — nom yo'q, o'ylab topilmaydi
    draft = tmp_path / "draft.json"
    draft.write_text(json.dumps({"kitabs": [{"title_ar": "كِتَابُ الْإِيمَانِ", "name_key": "iman", "babs": []},
                                            {"title_ar": "كِتَابُ الْعِلْمِ", "name_key": "ilm", "babs": []}],
                                 "translations_v4": {}}, ensure_ascii=False), "utf-8")
    ov2 = bo.build(raw, pkg, draft)
    k = next(k for k in ov2["kitabs"] if k["title_ar"] == "كتاب الإيمان")
    assert k["names"]["uz"] == "Imon kitobi" and k["names"]["status"] == "user-provided-sample-name" and k["names"]["origin"]
    assert all("names" not in x for x in ov2["kitabs"] if x is not k)  # paketda Ilm kitobi yo'q — boshqa Kitobga yopishmaydi


def test_source_opening_split_from_edition_front_matter_and_bismillah_to_kitab(tmp_path):
    _, _, ov = fixture(tmp_path)
    k1, k2 = ov["kitabs"][0], ov["kitabs"][1]
    heads = k1["shamela_headings"]
    assert [(h["evidence"], h["title_ar"]) for h in heads] == [("edition_front_matter", "(هذا نص التقرير)"), ("edition_front_matter", "مقدمة"),
                                                               ("source_opening_before_first_hadith", None)]
    assert [x["text_ar"] for x in heads[2]["intro"]] == ["﷽", "قَالَ الشَّيْخُ: كَيْفَ كَانَ بَدْءُ الْوَحْيِ."]
    text = json.dumps(k1, ensure_ascii=False)
    assert "وَلَقَدْ رَأَيْتُهُ" not in text                             # hadis davomi satri ochilishga qo'shilmaydi
    assert text.count("﷽") == 2                                          # muqaddima va Vahiy boshi; Imon ﷽ i bu yerda emas
    kh = k2["shamela_headings"][0]
    assert kh["intro"][0]["text_ar"] == "﷽" and kh["intro"][0]["placement"] == "bismillah_before_kitab_heading"


def test_paragraph_number_forms_and_numbered_headings():
    pages = [{"shamela_page_id": 1, "part": "1", "page_num": 1, "body": "\r".join([
        "<span data-type='title' id=toc-1>(١) كِتَابُ الْإِيمَانِ</span>",
        "<span data-type='title' id=toc-2>(٤٦) بَاب بَيَانِ غِلَظِ تَحْرِيمِ</span>",
        "١٧١ - (١٠٦) حَدَّثَنَا أَبُو بَكْرٍ",       # Muslim: umumiy raqam va (Abdulboqiy raqami)
        "٢١٠ -[١٣] (صَحِيح)",                      # Mishkot
        "٣/٨٨٠- وَعَنْ أَبِي مُوسَى",              # Riyozus-solihin
        "١٤٢- بَابُ اسْتِحْبَابِ تَشْمِيتِ الْعَاطِسِ",   # raqamli bob satri — paragraf emas
    ])}]
    ev = bo.scan(pages, alt=True)
    paras = [e["numbers"] for e in ev if e["t"] == "para"]
    assert paras == [[171, 106], [210, 13], [880, 3]]
    heads = [e for e in ev if e["t"] == "head"]
    assert [bo.KITAB_WORD.match(bo.bare_head(h["text"])) is not None for h in heads] == [True, False, False]
    assert heads[-1]["text"].startswith("١٤٢- بَابُ")          # sarlavha matni manbadagidek (raqami bilan) qoladi
    assert [e["numbers"] for e in bo.scan(pages[:1] and [{**pages[0], "body": "٥٤ - حَدَّثَنَا"}]) if e["t"] == "para"] == [[54]]


def test_other_edition_isnad_join_needs_number_and_text_or_names():
    assert bo.text_overlap("حَدَّثَنَا قُتَيْبَةُ عَنْ مَالِكٍ عَنْ نَافِعٍ", "حدثنا قتيبة عن مالك عن نافع عن ابن عمر") >= 0.6
    assert bo.text_overlap("حَدَّثَنَا قُتَيْبَةُ عَنْ مَالِكٍ", "كلام آخر تماما لا صلة له") < 0.4
    assert all(cfg["overlay_id"].startswith("hm-overlay-") for cfg in bo.BOOKS.values())
    assert bo.BOOKS["bukhari"]["overlay_id"] == "hm-overlay-bukhari-structure-isnad"      # eski o'rnatishlar bilan mos
    assert bo.BOOKS["tirmidhi"]["isnad"]["join"] == "number_text" and bo.BOOKS["ibnmajah"]["isnad"]["join"] == "text"


def _structure(text):
    """Matndan sanad tuzilishi (manba havolasiz): shaxs = ism yozilishi (sun'iy namuna)."""
    toks = bo.tokens(text)
    vocab = {"زيد", "عمرو", "خالد", "بكر", "بن", "ابو", "ابي", "سعيد", "عبد", "الله", "يحيي", "هشام", "عروه", "ابيه", "حماد"}
    K = {"vocab": vocab, "firsts": frozenset({"زيد", "عمرو", "خالد", "بكر", "ابو", "ابي", "سعيد", "عبد", "يحيي", "هشام", "حماد"}),
         "full_names": {}, "edges": set()}
    u = {"unit_id": "u:1", "seq": 1, "text_ar": text, "current_text_sha256": "x"}
    rec = bo.structure_record(u, toks, [], None, K, lambda w, sp, prev=None, nxt=None, final=True: " ".join(w), lambda p: [], {"join": "text_parse"}, set())
    ms = {m["mid"]: m["as_written"] for m in rec["mentions"]}
    return [[(n["pos"], ms[n["mid"]], [ms[x] for x in n.get("also", [])]) for n in r["nodes"]] for r in rec["routes"]]


def test_structure_notes_nisba_my_father_and_joint_routes():
    """«قال يحيى أخبرنا وقال الآخران حدثنا» — izoh; nisba ism ichida; «حدثني أبي» — roviy; «كلاهما عن» — yo'llar qo'shiladi."""
    r = _structure("حَدَّثَنَا يَحْيَى بْنُ زَيْدٍ، وَعَمْرُو بْنُ خَالِدٍ الْبَصْرِيُّ، قَالَ يَحْيَى أَخْبَرَنَا وَقَالَ الآخَرَانِ، حَدَّثَنَا حَمَّادٌ، "
                   "حَدَّثَنِي أَبِي، عَنْ سَعِيدٍ، عَنِ النَّبِيِّ صلى الله عليه وسلم")
    assert r == [[(1, "يَحْيَى بْنُ زَيْدٍ", ["عَمْرُو بْنُ خَالِدٍ الْبَصْرِيُّ"]), (2, "حَمَّادٌ", []), (3, "أَبِي", []), (4, "سَعِيدٍ", [])]]
    r = _structure("حَدَّثَنَا زَيْدٌ، حَدَّثَنَا بَكْرٌ، ح وَحَدَّثَنَا عَمْرٌو، حَدَّثَنَا خَالِدٌ، كِلاَهُمَا عَنْ هِشَامِ بْنِ عُرْوَةَ، عَنْ أَبِيهِ، "
                   "عَنِ النَّبِيِّ صلى الله عليه وسلم")
    words = [[w for _, w, _ in route] for route in r]
    assert ["زَيْدٌ", "بَكْرٌ", "هِشَامِ بْنِ عُرْوَةَ", "أَبِيهِ"] in words and ["عَمْرٌو", "خَالِدٌ", "هِشَامِ بْنِ عُرْوَةَ", "أَبِيهِ"] in words


def test_tahwil_joins_where_the_first_route_s_last_narrator_heard_from():
    """«حدثنا زيد حدثنا بكر ح وحدثنا عمرو عن خالد عن هشام»: umumiy roviy birinchi yo'lda nomlanmagan — roviylar bazasida
    «بكر — هشام dan» juftligi bo'lsa, birinchi yo'l هشام dan davom etadi; «وغير واحد» roviy emas."""
    ids = {"زيد": 1, "بكر": 2, "عمرو": 3, "خالد": 4, "هشام": 5}
    text = "حَدَّثَنَا زَيْدٌ، وَغَيْرُ وَاحِدٍ، قَالَا حَدَّثَنَا بَكْرٌ، ح وَحَدَّثَنَا عَمْرٌو، عَنْ خَالِدٍ، عَنْ هِشَامٍ، عَنِ النَّبِيِّ صلى الله عليه وسلم"
    toks = bo.tokens(text)
    K = {"vocab": set(ids) | {"غير", "واحد"}, "firsts": frozenset(ids), "full_names": {}, "edges": {(5, 2)}}
    u = {"unit_id": "u:1", "seq": 1, "text_ar": text, "current_text_sha256": "x"}
    rec = bo.structure_record(u, toks, [], None, K, lambda w, sp, prev=None, nxt=None, final=True: ids.get(w[0]), lambda p: [],
                              {"join": "text_parse"}, set())
    routes = sorted([[n["person"] for n in r["nodes"]] for r in rec["routes"]])
    assert routes == [[1, 2, 5], [3, 4, 5]]
    assert all(m["as_written"] != "غير واحد" and "غير" not in m["as_written"] for m in rec["mentions"])

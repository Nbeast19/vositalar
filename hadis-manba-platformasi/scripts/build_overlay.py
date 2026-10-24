"""Hadis kitoblari (hj120) uchun MAHALLIY qatlam paketlari: Kitob → Bob tuzilmasi, bob kirishlari, sanad yo'llari va roviylar.

Kitoblar ro'yxati — BOOKS. Boblar Shamela nusxasi bor har kitob uchun; sanad/roviylar faqat roviy havolali
Shamela sahifalari va page_isnads mavjud kitoblar uchun (hozir: Buxoriy, Termiziy — Bashshor nashri orqali).

Faqat foydalanuvchi qurilmasida o'rnatiladi (QARORLAR.md #37, #38). Manba — AuthenticIlm Shamela 4 nusxasi
("Terms of use: Research and personal use"), shuning uchun natija repo, Release yoki saytga qo'shilmaydi.

Kirish (read-only):
  raw/shamela-bukhari/pages.jsonl   Shamela 1681 (ط السلطانية) sahifalari
  raw/task2/page_isnads.json        (book_id, shamela_page_id, hadeeth_key) -> roviylar yo'li
  raw/task2/narrators.json          roviy ID -> ism, tarjimai hol, olimlar so'zlari
  hm-bukhari-hj120-*.hmz            asosiy paket (birliklar, dalil: Shamela sahifa + bosma raqam)
  [ixtiyoriy] --uz-draft            dizayn namunasidagi O'zbek tahririy qoralama (tekshirilmagan)

Qoidalar:
- Sarlavha faqat manbadagi satr: `<span data-type=title id=toc-N>` yoki toc raqami tushib qolgan oraliqda
  `باب/كتاب` bilan boshlangan satr (oraliqdagi yetishmagan toc soni topilgan satrlar soniga teng bo'lsa — dalilli).
  Teng bo'lmasa satr "tekshirilmagan sarlavha" deb belgilanadi. Hech qanday sarlavha, raqam yoki mansublik yaratilmaydi.
- Bob raqami berilmaydi: faqat manbadagi tartib (`order`).
- Hadis bobga faqat dalil orqali biriktiriladi: paketdagi Shamela sahifasi + shu sahifadagi bosma raqamli paragraf.
  Topilmasa — "bobi aniqlanmagan".
- Roviy oralig'i: paragrafdagi BARCHA sanad havolalari tartibida ketma-ket qidiriladi (oldingi ism tugagan joydan),
  shuning uchun to'liq nasab ichidagi ism keyingi roviy deb belgilanmaydi (T01, 601-hadis).

    python scripts/build_overlay.py --raw <.../hadis-raqamlar/raw> --package <hm-bukhari-hj120-1.0.1.hmz> --out <papka> [--uz-draft <json>]
    python scripts/build_overlay.py --raw <…/raw> --packages <paketlar papkasi> --out <papka> --all
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
from hadis_manba.arabic import NORMALIZATION_VERSION, normalize  # noqa: E402
from build_isnad_index import A_RE, BOOK_ID, paragraphs  # noqa: E402
from isnad_text import (CHAIN_CONT, CHAIN_NEW, GENERIC, HEARD, NEW_CHAIN_IN_ISNAD, NON_NAME_WORDS, QUAL, SALAWAT, STOP,  # noqa: E402
                        Resolver, _is_formula, align_names, build_forms, fill_route_gaps, find_name, isnad_end, name_tokens,
                        seg_clean, segments_in, span_tok, tokens)

OVERLAY_ID = "hm-overlay-bukhari-structure-isnad"
OVERLAY_VERSION = "0.2.0"

# Kitob -> Shamela manbasi. `para_alt`: paragraf boshida qo'shimcha raqam ko'rinishlari bor ("١٧١ - (١٠٦)", "٢١٠ -[١٣]",
# "٣/٨٨٠-"). `kitab_numbers`: paket raqamlaridan "Kitob:raqam" (Abdulboqiy) ko'rinishidagi ikkinchi qism ham olinadi.
# `isnad`: sanad manbasi — `evidence` (paketdagi Shamela sahifasi bilan bir nashr) yoki `number_text` (boshqa nashr:
# bosma raqam + matn o'xshashligi bilan tekshiriladi). None — mahalliy manbada roviy havolalari/page_isnads yo'q.
BOOKS = {
    "bukhari": {"package": "hm-bukhari-hj120", "shamela": "shamela-bukhari", "shamela_id": 1681, "overlay_id": OVERLAY_ID,
                "isnad": {"book_id": 1458, "compiler": 5495, "pages": "shamela-bukhari", "join": "evidence"},
                "title": {"uz": "Buxoriy", "en": "Bukhari", "ar": "البخاري"}},
    "muslim": {"package": "hm-muslim-hj120", "shamela": "shamela-muslim", "shamela_id": 1727, "para_alt": True,
               "isnad": {"book_id": 683, "compiler": 6116, "join": "sequence"},
               "title": {"uz": "Muslim", "en": "Muslim", "ar": "مسلم"}},
    "abudawud": {"package": "hm-abudawud-hj120", "shamela": "shamela-abudawud", "shamela_id": 1726,
                 "isnad": {"book_id": 630, "compiler": 2577, "join": "sequence"},
                 "title": {"uz": "Abu Dovud", "en": "Abu Dawud", "ar": "أبو داود"}},
    "tirmidhi": {"package": "hm-tirmidhi-hj120", "shamela": "shamela-tirmidhi", "shamela_id": 1435,
                 "isnad": {"book_id": 2859, "compiler": 10859, "pages": "shamela-tirmidhi-bashar", "join": "number_text"},
                 "title": {"uz": "Termiziy", "en": "Tirmidhi", "ar": "الترمذي"}},
    "ibnmajah": {"package": "hm-ibnmajah-hj120", "shamela": "shamela-ibnmajah", "shamela_id": 1198, "isnad": {"join": "text"},
                 "title": {"uz": "Ibn Moja", "en": "Ibn Majah", "ar": "ابن ماجه"}},
    "nasai": {"package": "hm-nasai-hj120", "shamela": "shamela-nasai", "shamela_id": 829,
              "isnad": {"book_id": 797, "compiler": 9712, "pages": "shamela-nasai", "join": "evidence"},
              "title": {"uz": "Nasoiy", "en": "Nasa'i", "ar": "النسائي"}},
    "malik": {"package": "hm-malik-hj120", "shamela": "shamela-malik", "shamela_id": 1699, "kitab_numbers": True,
              "isnad": {"book_id": 6494, "compiler": 5361, "join": "sequence", "compiler_in_text": True},   # «وحدثني عن مالك»
              "title": {"uz": "Muvatto", "en": "Muwatta", "ar": "الموطأ"}},
    "darimi": {"package": "hm-darimi-hj120", "shamela": "shamela-darimi", "shamela_id": 21795, "isnad": {"join": "text", "compiler": 3741},
               "title": {"uz": "Doromiy", "en": "Darimi", "ar": "الدارمي"}},
    "ahmed": {"package": "hm-ahmed-hj120", "shamela": "shamela-musnad-ahmad", "shamela_id": 25794, "isnad": {"join": "text", "compiler": 484},
              "title": {"uz": "Musnad Ahmad", "en": "Musnad Ahmad", "ar": "مسند أحمد"}},
    "mishkat": {"package": "hm-mishkat-almasabih-hj120", "shamela": "shamela-mishkat_almasabih", "shamela_id": 8360, "para_alt": True,
                "isnad": {"join": "text"}, "title": {"uz": "Mishkotul-masobih", "en": "Mishkat al-Masabih", "ar": "مشكاة المصابيح"}},
    "riyad": {"package": "hm-riyad-assalihin-hj120", "shamela": "shamela-riyad_assalihin", "shamela_id": 12014, "para_alt": True,
              "isnad": {"join": "text"}, "title": {"uz": "Riyozus-solihin", "en": "Riyad as-Salihin", "ar": "رياض الصالحين"}},
    "bulugh": {"package": "hm-bulugh-almaram-hj120", "shamela": "shamela-bulugh_almaram", "shamela_id": 9111, "isnad": {"join": "text"},
               "title": {"uz": "Bulug‘ul-marom", "en": "Bulugh al-Maram", "ar": "بلوغ المرام"}},
    "adab": {"package": "hm-aladab-almufrad-hj120", "shamela": "shamela-aladab_almufrad", "shamela_id": 12991, "isnad": {"join": "text", "compiler": 5495},
             "title": {"uz": "al-Adab al-mufrad", "en": "Al-Adab Al-Mufrad", "ar": "الأدب المفرد"}},
    # Shamela bob nusxasi yo'q kitoblar: faqat Kitob (paketdagi) va matndan sanad
    "shamail": {"package": "hm-shamail-muhammadiyah-hj120", "shamela": None, "shamela_id": None, "isnad": {"join": "text", "compiler": 10859},
                "title": {"uz": "Shamoili Muhammadiya", "en": "Shamail Muhammadiyah", "ar": "الشمائل المحمدية"}},
    "nawawi40": {"package": "hm-nawawi40-hj120", "shamela": None, "shamela_id": None, "isnad": {"join": "text"},
                 "title": {"uz": "Imom Navaviy 40 hadisi", "en": "Nawawi's Forty", "ar": "الأربعون النووية"}},
    "qudsi40": {"package": "hm-qudsi40-hj120", "shamela": None, "shamela_id": None, "isnad": {"join": "text"},
                "title": {"uz": "40 qudsiy hadis", "en": "Forty Hadith Qudsi", "ar": "الأربعون القدسية"}},
    "shahwaliullah40": {"package": "hm-shahwaliullah40-hj120", "shamela": None, "shamela_id": None, "isnad": {"join": "text"},
                        "title": {"uz": "Shoh Valiyulloh 40 hadisi", "en": "Shah Waliullah's Forty", "ar": "أربعون شاه ولي الله"}},
}
for _k, _b in BOOKS.items():
    # paket ID'lari barqaror (avval o'rnatilgan qatlam yangilanadi, ikkinchi nusxa paydo bo'lmaydi)
    _b.setdefault("overlay_id", f"hm-overlay-{_k}-" + ("structure" + ("-isnad" if _k == "tirmidhi" else "") if _b.get("shamela") else "isnad"))
SCHEMA = "1.0"
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
TITLE_RE = re.compile(r"<span data-type=['\"]title['\"] id=['\"]?toc-(\d+)['\"]?>(.*?)</span>", re.S)
TAG_RE = re.compile(r"<[^>]+>")
MARKS = re.compile("[ً-ٰٟـ]")
HEAD_WORD = re.compile(r"^(?:باب|كتاب|أبواب|ابواب)(?:\s|:|$)")
PARA_RE = re.compile(r"^\s*([٠-٩]+)\s*-\s")
# para_alt kitoblar: "٣/٨٨٠-", "١٧١ - (١٠٦)", "٢١٠ -[١٣]" — barcha raqamlar olinadi (asosiysi — "-" oldidagi)
PARA_X = re.compile(r"^\s*(?:([٠-٩]+)\s*/\s*)?([٠-٩]+)\s*-(?=[\s\[(])\s*(?:\[([٠-٩]+)\]\s*)?(?:\(([٠-٩]+)\))?")
# sarlavha boshidagi manba raqamlash ("(٤٦) بَاب", "١٤٢- باب") — faqat Kitob/Bob so'zini aniqlash uchun olib tashlanadi
HEAD_NUM = re.compile(r"^\s*[(\[]?[٠-٩]+[)\]]?\s*[-–.]?\s*")
KITAB_WORD = re.compile(r"^(?:كتاب|أبواب|ابواب)(?:\s|$)")
# toc raqamisiz sarlavha span'i — Shamela'da nashrning old qismi bo'limlari ("(هذا نص التقرير)", "مقدمة"); bob emas
FRONT_TITLE_RE = re.compile(r"<span data-type=['\"]title['\"]\s*>(.*?)</span>", re.S)
BISM = {"﷽", "بسم الله الرحمن الرحيم"}


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def plain(s: str) -> str:
    return TAG_RE.sub("", s).replace(" ", " ").strip()


def load_pages(raw: Path, folder: str = "shamela-bukhari") -> list[dict]:
    rows = [json.loads(x) for x in (raw / folder / "pages.jsonl").read_text("utf-8").splitlines() if x.strip()]
    rows.sort(key=lambda p: p["shamela_page_id"])
    return rows


def bare_head(text: str) -> str:
    return HEAD_NUM.sub("", MARKS.sub("", text), count=1)


def scan(pages: list[dict], alt: bool = False) -> list[dict]:
    """Sahifalarni satrlarga bo'lib, hujjat tartibidagi hodisalar: heading / para / text."""
    ev = []
    for pi, p in enumerate(pages):
        body = p.get("body") or ""
        # sarlavha span'i bir necha satrga bo'lingan bo'lishi mumkin (ichida bosma sahifa belgisi ⦗…⦘) — bitta satr qilinadi
        flat = TITLE_RE.sub(lambda m: re.sub(r"\s*\r+\s*", " ", m.group(0)), body)
        for li, line in enumerate(flat.split("\r")):
            pos = {"pi": pi, "li": li, "page": p["shamela_page_id"], "part": p.get("part"), "page_num": p.get("page_num"),
                   "body_sha256": sha(body.encode("utf-8"))}   # xesh — o'zgartirilmagan asl body
            m = TITLE_RE.search(line)
            text = plain(line)
            if m:
                tagged = plain(m.group(2))
                ev.append({"t": "head", "toc": int(m.group(1)), "tagged": tagged, "text": text, "evidence": "toc_tag", **pos})
                continue
            if not text:
                continue
            pm = (PARA_X if alt else PARA_RE).match(text)
            if pm and not (alt and HEAD_WORD.match(bare_head(text))):
                nums = [int(g.translate(AR_DIGITS)) for g in ((pm.group(2), pm.group(1), pm.group(3), pm.group(4)) if alt else (pm.group(1),)) if g]
                ev.append({"t": "para", "number": nums[0], "numbers": nums, "text": text, **pos})
                continue
            bare = bare_head(text)
            if HEAD_WORD.match(bare):
                ev.append({"t": "head", "toc": None, "tagged": None, "text": text, "evidence": "line_pattern", **pos})
                continue
            ev.append({"t": "text", "text": text, "front_title": bool(FRONT_TITLE_RE.search(line)), **pos})
    return ev


def is_bism(text: str) -> bool:
    return MARKS.sub("", text).strip() in BISM


def opening_blocks(preface: list[dict]) -> list[dict]:
    """Birinchi raqamli hadisdan oldingi manba matnini manbadagi belgilar bo'yicha bo'laklash.

    Yangi bo'lak: toc'siz sarlavha span'i, Shamela `part` o'zgarishi yoki sahifa boshidagi alohida ﷽ satri.
    `part == "المقدمة"` yoki toc'siz sarlavha bilan boshlangan bo'lak — nashrning old qismi (muallif matni emas).
    """
    blocks = []
    for blk in preface:
        front_title = blk.pop("front_title", False)
        if (not blocks or front_title or blk["part"] != blocks[-1]["source"]["part"]
                or (blk["line"] == 0 and is_bism(blk["text_ar"]))):
            front = blk["part"] == "المقدمة" or front_title
            blocks.append({"title_ar": blk["text_ar"] if front_title else None,
                           "evidence": "edition_front_matter" if front else "source_opening_before_first_hadith",
                           "front_matter": front, "source": {"page": blk["page"], "part": blk["part"], "line": blk["line"]}, "intro": []})
            if front_title:
                continue    # sarlavha satri title_ar'da (manba joyi source'da)
        blocks[-1]["intro"].append(blk)
    return blocks


def verify_untagged(ev: list[dict]) -> Counter:
    """Toc raqami tushib qolgan oraliqdagi belgisiz sarlavhalarni dalil bilan tasdiqlash."""
    st = Counter()
    heads = [e for e in ev if e["t"] == "head"]
    prev, between = None, []
    for e in heads:
        if e["toc"] is None:
            between.append(e)
            continue
        if prev is not None:
            missing = e["toc"] - prev["toc"] - 1
            if missing >= 0 and missing == len(between):
                for b in between:
                    b["evidence"] = "toc_gap"
                st["gaps_matched"] += 1
                st["untagged_verified"] += len(between)
            else:
                for b in between:
                    b["evidence"] = "line_pattern_unverified"
                st["gaps_unmatched"] += 1
                st["toc_ids_without_text"] += max(missing - len(between), 0)
                st["untagged_unverified"] += len(between)
        else:
            for b in between:
                b["evidence"] = "line_pattern_unverified"
            st["untagged_unverified"] += len(between)
        prev, between = e, []
    for b in between:
        b["evidence"] = "line_pattern_unverified"
        st["untagged_unverified"] += len(between)
    return st


def load_package(path: Path):
    z = zipfile.ZipFile(path)
    data = path.read_bytes()
    units = [json.loads(x) for x in z.read("data/units.jsonl").decode("utf-8").splitlines() if x.strip()]
    ev = {e["evidence_id"]: e for e in (json.loads(x) for x in z.read("data/evidence.jsonl").decode("utf-8").splitlines() if x.strip())}
    manifest = json.loads(z.read("package.json"))
    units.sort(key=lambda u: u["seq"])
    return units, ev, manifest, sha(data)


def shamela_ref(u: dict, ev: dict, kitab_numbers: bool = False):
    n0 = next((n for n in u.get("numbers") or [] if n.get("number_text")), None)
    e = ev.get((n0 or {}).get("evidence_id")) or {}
    cand = next((c for c in e.get("candidates", []) if c.get("source") == "shamela-edition" and c.get("url")), None)
    if not n0 or not cand:
        return None
    nums = [int(x) for x in str(n0["number_text"]).split(";") if x.strip().isdigit()]
    if kitab_numbers:   # Abdulboqiy "Kitob:raqam" — Shamela paragrafi Kitob ichidagi raqam bilan boshlanadi
        for n in u.get("numbers") or []:
            for x in str(n.get("number_text") or "").split(";"):
                if ":" in x and x.split(":")[-1].strip().isdigit():
                    nums.append(int(x.split(":")[-1]))
    return {"page": int(cand["url"].rstrip("/").rsplit("/", 1)[1]), "numbers": nums, "url": cand["url"]}


def align_mentions(text: str, anchors: list[tuple[int, str]]):
    """Sanad havolalarini bizning matnda ketma-ket topish (isnad_text.align_names: so'zma-so'z, tinish belgilarisiz)."""
    sp = align_names(text, [n for _, n in anchors])
    return [{"person": pid, "as_written": name.strip(" ،,:"), "span": list(x) if x else None} for (pid, name), x in zip(anchors, sp)]


SAMPLE_KITAB_NAMES = {"iman": {"uz": "Imon kitobi", "en": "Book of Belief"}, "ilm": {"uz": "Ilm kitobi", "en": "Book of Knowledge"}}


def text_overlap(a: str, b: str) -> float:
    """Ikki matnning (normallashtirilgan) so'z ustma-ustligi: |A∩B| / min(|A|,|B|), A — birinchi 40 so'z."""
    ta = set(normalize(a).split()[:40])
    tb = set(normalize(b).split())
    return len(ta & tb) / max(1, min(len(ta), len(tb)))


def para_plain(body: str) -> dict:
    """Sahifadagi "N - " paragraflarining toza matni (raqam -> matn)."""
    from build_isnad_index import NUM_RE
    out, marks = {}, list(NUM_RE.finditer(body or ""))
    for i, m in enumerate(marks):
        seg = body[m.start(): marks[i + 1].start() if i + 1 < len(marks) else len(body)]
        out.setdefault(int(m.group(1).translate(AR_DIGITS)), plain(seg))
    return out


# ------------------------------------------------------------------ roviylar bilimi (barcha kitoblar uchun umumiy)
LINKED_PAGES = ("shamela-bukhari", "shamela-nasai", "shamela-tirmidhi-bashar")   # roviy havolalari (inr://man-ID) bor sahifalar
_KNOW: dict = {}


def knowledge(raw: Path) -> dict:
    """roviylar bazasi (ism, tarjimai hol), page_isnads yo'llari, Shamela havolalaridagi ism shakllari, ustoz–shogird juftlari."""
    key = str(raw)
    if key in _KNOW:
        return _KNOW[key]
    narr = {n["id"]: n for n in json.loads((raw / "task2" / "narrators.json").read_text("utf-8"))}
    rows = json.loads((raw / "task2" / "page_isnads.json").read_text("utf-8"))
    edges = set()
    for r in rows:
        ids = r["narrator_ids"]
        edges.update(zip(ids, ids[1:]))
    link_pairs = []
    for folder in LINKED_PAGES:
        if (raw / folder / "pages.jsonl").exists():
            for p in load_pages(raw, folder):
                link_pairs += [(int(a), TAG_RE.sub("", t)) for a, t in A_RE.findall(p.get("body") or "")]
    name_pairs, extra = [], defaultdict(list)
    for pid, n in narr.items():
        for f in ("short_name", "long_name"):
            for part in re.split("[،,]", (n.get(f) or "").replace("‌", "")):
                if part.strip():
                    name_pairs.append((pid, part.strip()))
        # tarjimai holdagi kunya, shuhrat, laqab, nisba — ism shakllari (masalan «أبو الطاهر» = أحمد بن عمرو بن السرح)
        try:
            summ = (json.loads(n.get("biography_text") or "{}") or {}).get("summary") or []
        except ValueError:
            summ = []
        for kv in summ:
            if len(kv) >= 2 and kv[0] in ("الكنية", "الشهرة", "اللقب"):
                for part in re.split("[،,]|وقيل", str(kv[1])):
                    part = part.strip(" :.")
                    if 1 <= len(part.split()) <= 4:
                        name_pairs.append((pid, part))
                        extra[pid].append(part)
            if len(kv) >= 2 and kv[0] == "النسب":
                extra[pid].append(str(kv[1]))
    alias = defaultdict(set)
    # manba havolalaridagi tasodifiy xato belgi (masalan «سفيان» bir marta «شقيق بن سلمة»ga) ism shakli bo'lmasin:
    # shakl shu shaxsga kamida 5% (yoki 3 marta) tegishli bo'lishi kerak; bazaning o'z ismlari doim olinadi
    fcount = defaultdict(Counter)
    for pid, w in link_pairs:
        fcount[tuple(_c(x) for x in name_tokens(w))][pid] += 1
    def keep_link(pid, t):
        c = fcount.get(tuple(_c(x) for x in t)) or Counter()
        return c[pid] >= 3 or c[pid] / max(1, sum(c.values())) >= 0.05
    name_pairs = [(pid, w) for pid, w in name_pairs if _alias_tokens(w)]
    for src, pairs in (("link", link_pairs), ("name", name_pairs)):
        for pid, w in pairs:
            t = _alias_tokens(w)
            # yaroqli shakl: kamida bitta umumiy bo'lmagan (≥3 harf) so'z; rivoyat so'zi bilan boshlanmaydi
            if t and any(x not in GENERIC and len(x) >= 3 for x in t) and t[0] not in STOP and (src == "name" or keep_link(pid, t)):
                alias[pid].add(t)
    # ism lug'ati — faqat sanadlarda haqiqatan uchragan yozilishlar (Shamela havolalari) va bazadagi qisqa ismlar
    short_pairs = [(pid, (n.get("short_name") or "").replace("‌", "")) for pid, n in narr.items()]
    vocab = Counter()
    for _, w in link_pairs + short_pairs:
        for t in name_tokens(w):
            vocab[_c(t)] += 1
    vocab = {w for w, c in vocab.items() if w not in NON_NAME_WORDS and len(w) >= 2} | {"بن", "ابو", "ابي", "ابا", "ام", "بنت", "عبد", "ابيه", "امه",
                                                                      "جده", "عمه", "اخيه", "خاله", "مولاه"}
    firsts = {_c(name_tokens(w)[0]) for _, w in link_pairs if name_tokens(w)} - NON_NAME_WORDS - GENERIC
    firsts |= {"ابو", "ابي", "ابا", "ام", "بنت", "عبد", "ابن"}
    link_pairs = [(pid, w) for pid, w in link_pairs if keep_link(pid, tuple(name_tokens(w)))]
    _KNOW[key] = {"narr": narr, "rows": rows, "edges": edges, "alias": {k: sorted(v, key=len, reverse=True) for k, v in alias.items()},
                  "vocab": vocab, "firsts": frozenset(firsts),
                  "base_pairs": link_pairs + name_pairs, "learned": [],
                  "teachers_of": _teachers(edges),
                  "full_names": {pid: " ".join([n.get("short_name") or "", n.get("long_name") or ""] + extra.get(pid, []))
                                 for pid, n in narr.items()}}
    refresh_resolver(_KNOW[key])
    return _KNOW[key]


# unvonlar (ism emas): «الحافظ», «شيخ الإسلام» — ism shakli sifatida olinmaydi
TITLES = {"الحافظ", "الامام", "شيخ", "الشيخ", "الاسلام", "الفقيه", "القاضي", "المحدث", "الحجه", "الثقه", "امير", "المومنين"}


def _alias_tokens(w: str) -> tuple:
    """Ism shakli so'zlari: boshidagi «وقيل/ويقال» tashlanadi; faqat unvon/umumiy so'zdan iborat bo'lsa — bo'sh."""
    t = tuple(name_tokens(w))
    while t and t[0] in ("وقيل", "قيل", "ويقال", "يقال"):
        t = t[1:]
    return () if all(x in TITLES or x in GENERIC for x in t) else t


def _teachers(edges) -> dict:
    out = defaultdict(set)
    for t, st in edges:
        out[st].add(t)
    return out


def refresh_resolver(K: dict) -> None:
    """Ism shakllari: manba havolalari + bazadagi ismlar + kitoblarda sanad bazasi orqali aniq bog'langan matn yozilishlari."""
    K["resolver"] = Resolver(build_forms(K["base_pairs"] + K["learned"]), K["edges"], K["full_names"])


TRUSTED_BASIS = {None, "route_name_in_text", "text_segment_route_name", "text_name_identified_by_route_position",
                 "route_name_after_isnad", "source_link_name_in_gap"}


def _clean_written(text: str, span) -> str:
    return text[span[0]:span[1]].strip(" ،,:؛.")


def choose_chains(text: str, toks, mentions: list[dict], routes: list[list[int]]) -> tuple[list[list[int]], str]:
    """Yo'l(lar)ni tanlash. Matndagi (sanad qismidagi) Shamela belgilangan roviylar — P (tartibda). page_isnads yo'li R:
    P ning hammasi R da va tartibi bir xil bo'lsa — R (bosh qismi matnda bo'lmasligi mumkin: «قال ابن شهاب» davomi).
    Aks holda R shu sahifadagi BOSHQA rivoyatniki: o'rinlar matnning o'zidan (P, «ح» bo'yicha bo'lingan), R esa matnda
    topilsa — ikkinchi yo'l."""
    end_i = isnad_end(toks)
    end_c = toks[end_i][1] if end_i < len(toks) else len(text)
    main = sorted((m for m in mentions if m["span"] and m["span"][0] < end_c), key=lambda m: m["span"][0])
    hs = [t[1] for t in toks[:end_i] if t[0] == "ح"]                    # tahvil belgilari (asl o'rni)
    P = []
    for m in main:
        if not P or P[-1] != m["person"]:
            P.append(m["person"])
    R = routes[0] if routes else None
    if R:
        idx = [R.index(p) for p in P if p in R]
        extra = [p for p in P if p not in R]
        if P and not extra and idx == sorted(idx):
            return [R], "page_isnads"
        if not P:
            return [R], "page_isnads_no_text_links"
    if not main:
        return ([R] if R else []), "none"
    # matndagi tartib, «ح» dan keyin yangi yo'l
    out, cur, k = [], [], 0
    for m in main:
        while k < len(hs) and hs[k] < m["span"][0]:
            if cur:
                out.append(cur)
            cur, k = [], k + 1
        if not cur or cur[-1] != m["person"]:
            cur.append(m["person"])
    if cur:
        out.append(cur)
    if R and any(p not in P for p in R):
        late = {m["person"] for m in mentions if m["span"] and m["span"][0] >= end_c}
        if all(p in late or p in P for p in R):
            out.append(R)                                             # matndagi ilova rivoyat («وعن …»)
    return out, "text_links"


def _finish_record(u: dict, toks, mentions: list[dict], chains: list[list[int]], aliases, evidence: dict, branched: bool,
                   reasons: list[str], persons_used: set, gap_fill: bool = True, name_person=None) -> dict:
    """mentions: [{"person", "span", "source_name"?}] (matn tartibida bo'lmasligi mumkin); chains: muallifning ustozidan
    boshlab shaxslar. Yo'l tugunlari ayni zikrga bog'lanadi; matnda belgilanmagan tugun qo'shni tugunlar orasidan qidiriladi."""
    text = u["text_ar"]
    routes = []
    for ri, chain in enumerate(chains):
        nodes, last = [], -1
        for pos, pid in enumerate(chain, 1):
            mi = next((j for j, m in enumerate(mentions) if j > last and m["person"] == pid and m["span"]), None)
            if mi is None:
                mi = next((j for j, m in enumerate(mentions) if j > last and m["person"] == pid), None)
            if mi is not None:
                last = mi
            nodes.append({"pos": pos, "person": pid, "m": mi})
            persons_used.add(pid)
        spans = {i: mentions[n["m"]]["span"] for i, n in enumerate(nodes) if n["m"] is not None and mentions[n["m"]]["span"]}
        taken = [m["span"] for m in mentions if m["span"]]
        for i, sp in (fill_route_gaps(text, toks, nodes, spans, aliases, taken) if gap_fill and ri == 0 else {}).items():
            n = nodes[i]
            if n["m"] is not None:
                mentions[n["m"]]["span"], mentions[n["m"]]["basis"] = list(sp), "source_link_name_in_gap"
            else:
                mentions.append({"person": n["person"], "span": list(sp), "basis": "route_name_in_gap"})
                n["m"] = len(mentions) - 1
        if ri == 0 and name_person:
            nodes = _text_middle(text, toks, nodes, mentions, name_person, evidence)
        routes.append(nodes)
    # zikrlar matn tartibida; mid — tartib raqami
    order = sorted(range(len(mentions)), key=lambda j: (mentions[j]["span"] is None, (mentions[j]["span"] or [10 ** 9])[0], j))
    newi = {j: k for k, j in enumerate(order)}
    rec_mentions = []
    for k, j in enumerate(order):
        m = mentions[j]
        rec_mentions.append({"mid": f"{u['unit_id']}#m{k + 1}", "person": m["person"],
                             "as_written": _clean_written(text, m["span"]) if m["span"] else m.get("source_name") or "",
                             "span": list(m["span"]) if m["span"] else None, **({"basis": m["basis"]} if m.get("basis") else {}),
                             **({"source_name": m["source_name"]} if m.get("source_name") else {})})
        persons_used.add(m["person"])
    rec_routes = []
    for ri, nodes in enumerate(routes):
        rec_routes.append({"route_id": f"{u['unit_id']}#r{ri + 1}", "label": chr(65 + ri), "of": len(nodes),
                           "nodes": [{"pos": n["pos"], "person": n["person"],
                                      "mid": rec_mentions[newi[n["m"]]]["mid"] if n["m"] is not None else None} for n in nodes]})
    reasons = list(reasons)
    if chains:
        in_route = {n["mid"] for r in rec_routes for n in r["nodes"] if n["mid"]}
        if any(m["mid"] not in in_route for m in rec_mentions):
            reasons.append("page_links_outside_route")
        if any(n["mid"] is None for r in rec_routes for n in r["nodes"]):
            reasons.append("route_node_without_page_link")
    else:
        reasons.append("no_page_isnads_row")
    if any(m["span"] is None for m in rec_mentions):
        reasons.append("mention_span_not_found")
    if branched:
        reasons.append("tahwil_branch_in_page")
    status = ("established_single_route" if len(chains) == 1 and not reasons else
              "branched" if branched else ("no_route" if not chains else "partial"))
    return {"unit_id": u["unit_id"], "seq": u["seq"], "text_sha256": u["current_text_sha256"], "evidence": evidence,
            "mentions": rec_mentions, "routes": rec_routes, "branched": branched, "reasons": reasons, "status": status,
            "intermediaries": rec_routes[0]["of"] if status == "established_single_route" else None}


def _text_middle(text: str, toks, nodes: list[dict], mentions: list[dict], name_person, evidence: dict) -> list[dict]:
    """A-yo'lning matnda belgilangan birinchi va oxirgi tugunlari orasida topilmagan tugun qolsa — bu matn sanad manbasi
    nashridan farq qiladi. O'rinlar o'qilayotgan matn bo'yicha: oraliqda ism bo'lagi bo'lsa — o'sha ism (shaxs ism shakli va
    qo'shnilar bilan aniqlanadi, aniqlanmasa faqat yozilishi), bo'lmasa tugun olib tashlanadi. Raqamlar uzluksiz qoladi."""
    has = lambda n: n["m"] is not None and mentions[n["m"]]["span"]  # noqa: E731
    idx = [i for i, n in enumerate(nodes) if has(n)]
    if not idx:
        return nodes
    taken = [m["span"] for m in mentions if m["span"]]
    tok_of = lambda c: next((j for j, t in enumerate(toks) if t[1] >= c), len(toks))  # noqa: E731
    # bosh qism: birinchi belgilangan tugundan oldin matnda ism bo'laklari bo'lsa — o'sha ismlar (yo'lning yetishmagan boshi
    # boshqa rivoyatniki); bo'lmasa (masalan «قال ابن شهاب …» davomi) — yetishmagan bosh tugunlar oldingi sanaddan, qoladi
    head = nodes[: idx[0]]
    first_sp = mentions[nodes[idx[0]]["m"]]["span"]
    segs = [sg for sg in segments_in(toks, 0, tok_of(first_sp[0])) if not any(a <= toks[sg[0]][1] < b for a, b in taken)]
    if segs:
        keep = head[: max(0, len(head) - len(segs))]
        new_head, nxt = [], nodes[idx[0]]["person"]
        for a, b in reversed(segs):
            words = [toks[x][0] for x in range(a, b)]
            span = [toks[a][1], toks[b - 1][2]]
            pid = name_person(words, span, None, nxt)
            mentions.append({"person": pid, "span": span, "basis": "text_name_where_route_differs"})
            new_head.insert(0, {"pos": 0, "person": pid, "m": len(mentions) - 1})
            nxt = pid
        for nd in head[len(keep):]:
            evidence.setdefault("route_nodes_not_in_text", []).append(nd["person"])
        nodes = keep + new_head + nodes[idx[0]:]
        idx = [i for i, n in enumerate(nodes) if has(n)]
    if all(has(n) for n in nodes[idx[0]: idx[-1] + 1]):
        for k, n in enumerate(nodes, 1):
            n["pos"] = k
        return nodes
    out, i = [], 0
    while i < len(nodes):
        n = nodes[i]
        if idx[0] < i < idx[-1] and not has(n):
            j = i
            while not has(nodes[j]):
                j += 1
            missing = nodes[i:j]
            prev_sp, next_sp = mentions[out[-1]["m"]]["span"], mentions[nodes[j]["m"]]["span"]
            lo, hi = tok_of(prev_sp[1]), tok_of(next_sp[0])
            segs = [sg for sg in segments_in(toks, lo, hi)
                    if not any(a <= toks[sg[0]][1] < b for a, b in taken)]
            for k, nd in enumerate(missing):
                if k < len(segs):
                    a, b = segs[k]
                    words = [toks[x][0] for x in range(a, b)]
                    span = [toks[a][1], toks[b - 1][2]]
                    pid = name_person(words, span, out[-1]["person"], nodes[j]["person"])
                    mentions.append({"person": pid, "span": span, "basis": "text_name_where_route_differs"})
                    evidence.setdefault("route_replaced", []).append({"route_person": nd["person"], "text_person": pid})
                    out.append({"pos": 0, "person": pid, "m": len(mentions) - 1})
                else:
                    evidence.setdefault("route_nodes_not_in_text", []).append(nd["person"])
            i = j
            continue
        out.append(n)
        i += 1
    for k, n in enumerate(out, 1):
        n["pos"] = k
    return out


# sanadni davom ettiradigan rivoyat so'zlari (ism bo'lagidan keyin kelsa — bo'lak ism)
CHAIN_FORMULA = {"حدثنا", "حدثني", "اخبرنا", "اخبرني", "انبانا", "انباني", "ثنا", "سمعت", "ح"} | NEW_CHAIN_IN_ISNAD


def _nisba(w: str) -> bool:
    """«الزهراني», «الليثي», «الأنصاري» kabi nisba so'zi."""
    return len(w) >= 5 and w.startswith("ال") and w.endswith("ي") and w not in NON_NAME_WORDS


# manba sahifasidagi havolalar har bir roviyni belgilagan bog'lanishlar (Shamela): havolasiz ism — hikoyadagi shaxs
LINKED_JOINS = ("evidence", "number_and_text", "number_and_names")


# daraja oralig'ida e'tiborga olinmaydigan so'zlar («رضي الله عنه», «يعني», «واللفظ له»); «كان» — e'tiborga olinadi
# («قال نافع كان ابن عمر يقول» — Ibn Umar keyingi o'rin)
IGNORABLE = {"رضي", "رحمه", "عليه", "رضوان", "صلي", "يعني", "وهو", "هو", "وهي", "هي", "واللفظ", "اللفظ", "لفظ", "لفظه", "ولفظه",
             "عنه", "عنها", "عنهما", "عنهم", "الله", "تعالي", "السلام", "المعني", "غير", "وغير", "واحد"}
SAME_PERSON = {"يعني", "وهو", "هو", "وهي", "هي"}
DIRECT = {"عن", "وعن", "حدثنا", "حدثني", "اخبرنا", "اخبرني", "انبانا", "انباني", "سمعت", "ثنا", "حدثه", "اخبره"}
BLESSING = {"رضي", "رحمه", "عليه", "رضوان", "الله", "عنه", "عنها", "عنهما", "عنهم", "تعالي", "السلام", "صلي", "وسلم"}


def _sub(part: list, whole: list) -> bool:
    """part — whole ning ketma-ket bo'lagi (umumiy bo'lmagan so'z bilan): «ابن خشرم» ⊂ «علي بن خشرم», «يحيى» ⊂ «يحيى بن يحيى»."""
    n = len(part)
    return bool(n) and any(w not in GENERIC for w in part) and any(whole[i:i + n] == part for i in range(len(whole) - n + 1))


def _ignorable(w: str) -> bool:
    return w in IGNORABLE


# «otasi / bobosi …» — sanaddagi qarindosh roviy (ismi yo'q): yo'ldagi o'sha o'rindagi shaxs
KIN_WORDS = (["ابيه"], ["جده"], ["عمه"], ["اخيه"], ["امه"], ["خاله"], ["ابي"], ["جدي"], ["عمي"], ["اخي"], ["امي"], ["خالي"])
# bir nechta yo'lning umumiy roviyga qo'shilishi («كلاهما عن …», «قالا جميعا حدثنا …»)
JOINT = {"كلاهما", "وكلاهما", "جميعا", "كلهم", "قالا", "وقالا", "قالوا", "ثلاثتهم", "اربعتهم", "الاخران", "الاخرون", "الاخرين"}


def structure_record(u: dict, toks, mentions: list[dict], R: list | None, K: dict, name_person, alias_of, evidence: dict,
                     persons_used: set, reasons: list | None = None, compiler=None, keep_compiler: bool = False) -> dict:
    """O'rinlar matnning o'z tuzilishidan: ikki ism orasida rivoyat so'zi — keyingi o'rin; faqat «و» — bir xil o'rin
    (bir nechta ustoz); «ح» — yangi yo'l (raqam 1 dan). Sanad hududi — Nabiy ﷺ zikri yoki birinchi «hikoya» bo'lagigacha.
    mentions: manbadan ma'lum zikrlar (Shamela havolasi, sanad bazasi ismlari); qolgan ism bo'laklari matndan qo'shiladi.
    R (page_isnads yo'li) matn darajalari bilan aynan mos kelsa — bosh qismi matnda bo'lmagan (davom) hadislar uchun o'rin
    siljishi va matnda zikr qilinmagan roviylar (yashirin tugunlar) shundan olinadi."""
    text = u["text_ar"]
    reasons = list(reasons or [])
    vocab, firsts = K["vocab"], K["firsts"]

    def name_prefix(a, b):
        """Bo'lak boshidagi ism so'zlari soni (lug'atda bor so'zlar, nisbalar); qolgani hikoya. Bo'lakdan keyin darhol
        rivoyat so'zi kelsa («أبو الربيع الزهراني، حدثنا …») va qolgan 1–3 so'z fe'l/yuklama bo'lmasa — hammasi ism."""
        k = a
        while k < b and (_c(toks[k][0]) in vocab or (toks[k][0][:1] in "وف" and len(toks[k][0]) > 2 and _c(toks[k][0][1:]) in vocab)
                         or _nisba(toks[k][0])):
            k += 1
        rest = [toks[x][0] for x in range(k, b)]
        if rest and len(rest) <= 2 and b < len(toks) and all(w.startswith("ال") and len(w) >= 4 and w not in NON_NAME_WORDS
                                                              for w in rest):   # laqab: «زياد الجصاص», «سعد الأغطش»
            nx = toks[b][0]
            if nx in CHAIN_FORMULA or nx in ("وهو", "هو", "يعني") or (k > a and nx in ("عن", "وعن")):
                return b - a
        return k - a

    def narrative(a, b):
        return name_prefix(a, b) == 0

    def in_route(a, b):
        """[a, b) so'zlari sanad yo'lidagi (R) biror roviyning ism shakli bilan boshlanadimi."""
        return any((h := find_name(toks, al, a, a + 1, partial=True)) and (h[1] == b - a or h[1] >= 2)
                   for rp in (R or []) for al in alias_of(rp))

    # sanad hududlari: boshidan Nabiy ﷺ zikrigacha (yoki hikoya boshlanguncha); undan keyin «ح / وحدثنا / وعن …» bilan
    # yangi sanad kelsa — keyingi hudud (ikkinchi rivoyat)
    regions, segs, start = [], [], 0
    src_ranges = [r for r in (span_tok(toks, m["span"]) for m in mentions if m.get("span")) if r]   # manbadagi ismlar (so'z oralig'i)
    while start < len(toks):
        end_i = isnad_end(toks, start)
        rs_ = segments_in(toks, start, end_i, firsts)
        reg_end, keep_, skipped = end_i, [], 0
        for a, b in rs_:
            if a > 0 and toks[a - 1][0] in ("قال", "وقال") and b < len(toks) and toks[b][0] in CHAIN_FORMULA | HEARD | {"وهو", "هو", "يعني"} and \
                    b - a <= 3 and any(_sub([_c(toks[x][0]).removeprefix("و") for x in range(a, b)],
                                            [_c(toks[x][0]).removeprefix("و") for x in range(a0, b0)])
                                       for a0, b0 in segs + keep_ + src_ranges if b0 <= a):
                continue                          # «قال يحيى أخبرنا وقال الآخران حدثنا» — lafz izohi, yangi roviy emas
            k = name_prefix(a, b)
            if k == 0 and not keep_ and not segs and b - a <= 3 and skipped < 2:
                skipped += 1                      # «ولمسلم:», «وفي رواية» — sanad hali boshlanmagan
                continue
            if k == 0:
                if b - a <= 4 and any(r0 >= b for r0, _ in src_ranges if r0 < end_i):
                    continue                      # manbali roviylar orasidagi qisqa izoh — sanad davom etadi
                reg_end = a                       # hikoya boshlandi — sanad shu yerda tugaydi
                break
            if R and a > 0 and toks[a - 1][0].removeprefix("و") in ("ان", "انه", "انها") and not in_route(a, a + k):
                # sanad yo'li (R) bor va bu ism yo'lda yo'q: «أن X» dan keyin hikoya — X hikoyadagi shaxs
                x = b
                while x < end_i and toks[x][0] in BLESSING:
                    x += 1
                if b - (a + k) >= 2 or (a + k == b and x < end_i and not _is_formula(toks, x) and toks[x][0] not in QUAL
                                        and toks[x][0].removeprefix("و") not in QUAL       # «أن أبا يونس مولى …» — ism
                                        and not (toks[x][0][:1] == "و" and toks[x][0][1:] in firsts)):  # «… وأبا هريرة»
                    reg_end = a                   # «أن عبيد الله بن زياد عاد معقل …», «أن أبا بكر رضي الله عنه أقبل …» —
                    break                         # hikoyadagi shaxs, roviy emas
            keep_.append((a, a + k))
            if a + k < b:                         # ism, keyin hikoya («عن أبيه ذكر …»)
                reg_end = a + k
                break
        segs += keep_
        kind = "first" if not regions else ("cont" if toks[start][0] in CHAIN_CONT else "new")
        # manbadagi zikrlar (Shamela havolasi / sanad bazasi) Nabiy ﷺ zikrigacha hisobga olinadi (izohdan keyin ham)
        regions.append((toks[start][1] if start < len(toks) else len(text), toks[end_i][1] if end_i < len(toks) else len(text), kind))
        if reg_end < end_i:
            # «… عن عبد الله بن مسعود في خطبة الحاجة ح وحدثنا …»: qisqa izohdan keyin «ح» bilan sanad davom etadi
            h = next((x for x in range(reg_end, min(end_i, reg_end + 15)) if toks[x][0] == "ح"), None)
            if h is not None:
                start = h
                continue
            break
        if end_i >= len(toks):
            break
        j = end_i + 1
        while j < len(toks) and j <= end_i + 7 and toks[j][0] in SALAWAT:
            j += 1
        if j < len(toks) and toks[j][0] in CHAIN_NEW | CHAIN_CONT and j + 1 < len(toks) and not narrative(j + 1, j + 2):
            start = j
            continue
        # «… ساجد ح قال وحدثني …»: Nabiy ﷺ zikridan keyin qisqa so'zlardan so'ng «ح»
        h = next((x for x in range(end_i + 1, min(len(toks), end_i + 11)) if toks[x][0] == "ح"), None)
        if h is not None and h + 1 < len(toks):
            start = h
            continue
        break
    # matnning keyingi qismidagi manbali sanad («وقال ابن أبي مريم أخبرنا يحيى … حدثني حميد …»): hududdan tashqaridagi
    # manba zikrlari rivoyat so'zlari bilan ketma-ket kelsa (kamida 2 ta) — alohida yo'l
    tok_at0 = lambda c: next((j for j, t in enumerate(toks) if t[1] >= c), len(toks))  # noqa: E731
    in_reg = lambda c: any(a <= c < b for a, b, _ in regions)  # noqa: E731
    outside = sorted((m for m in mentions if m["span"] and not in_reg(m["span"][0])), key=lambda m: m["span"][0])
    run = []
    for m in outside + [None]:
        if m is not None and run:
            lo, hi = tok_at0(run[-1]["span"][1]), tok_at0(m["span"][0])
            if hi - lo <= 6 and any(_is_formula(toks, x) for x in range(lo, hi)):
                run.append(m)
                continue
        if len(run) >= 2:
            regions.append((run[0]["span"][0], run[-1]["span"][1], "new"))
        run = [m] if m is not None else []
    region_of = lambda c: next((k for k, (a, b, _) in enumerate(regions) if a <= c < b), None)  # noqa: E731

    def overl(sp, a, b):
        return sp and sp[0] < toks[b - 1][2] and toks[a][1] < sp[1]
    for m in mentions:
        if m.get("span"):
            a0 = next((j for j, t in enumerate(toks) if t[1] == m["span"][0]), None)
            if a0 is not None:
                m["span"][0] = seg_clean(text, toks, a0, a0 + 1, firsts)[1][0]
    known = {m["person"] for m in mentions}
    src = [m for m in mentions if m["span"]]
    unplaced = [m for m in mentions if not m["span"]]
    for a, b in segs:
        if any(overl(m["span"], a, b) for m in mentions):
            continue
        words, span0 = seg_clean(text, toks, a, b, firsts)
        pid = None
        for rp in (R or []):
            if rp in known and not any(toks[x][0] == "ح" for x in range(
                    tok_at0(max((m["span"][1] for m in mentions if m["person"] == rp and m.get("span")), default=10 ** 9)), a)):
                continue                          # bir yo'lda bir marta; «ح» dan keyin (boshqa yo'lda) yana bo'lishi mumkin
            if any((h := find_name(toks, al, a, a + 1, partial=True)) and (h[1] == len(words) or h[1] >= 2)
                   for al in alias_of(rp)):        # «عمرو بن سواد» — yolg'iz «عمرو» shakli bilan boshqa «عمرو» emas
                pid = rp
                break
        # manbali kitoblarda: oxirgi manba zikridan keyingi noma'lum bo'lak — hikoyadagi shaxs (roviy emas)
        rk = region_of(toks[a][1])
        last_src = max((m["span"][1] for m in src if region_of(m["span"][0]) == rk), default=None)
        if pid is None and src and last_src is not None and toks[a][1] >= last_src and evidence.get("join") in LINKED_JOINS \
                and not unplaced:                 # manba zikri matnda topilmagan bo'lsa (nashr farqi) — bu bo'lak o'sha bo'lishi mumkin
            continue
        mentions.append({"person": pid, "span": span0, "words": words,
                         "basis": "text_segment" + ("_route_name" if pid is not None else "")})
        if pid is not None:
            known.add(pid)
    def _name_word(w):
        return _c(w) in vocab or _c(w.removeprefix("و")) in vocab or _nisba(w)

    # darajalar va yo'llar (matn tartibida)
    reg = sorted((m for m in mentions if m["span"] and region_of(m["span"][0]) is not None), key=lambda m: m["span"][0])
    tok_at = lambda c: next((j for j, t in enumerate(toks) if t[1] >= c), len(toks))  # noqa: E731
    branches, bkind = [], []
    for m in reg:
        rk = region_of(m["span"][0])
        if not branches or rk != region_of(branches[-1][-1][-1]["span"][0]):
            branches.append([[m]])
            bkind.append(regions[rk][2] if branches[:-1] else "first")
            continue
        lo = tok_at(branches[-1][-1][-1]["span"][1])
        hi = next((j for j, t in enumerate(toks) if t[2] > m["span"][0]), len(toks))   # zikr boshlangan so'z (oldidagi «و» bilan)
        # «قال أبو عبيدة حدثنا وقال إسحاق أخبرنا»: izohda shu yo'ldagi roviy yana zikr qilinsa — o'sha o'rin (yangi daraja emas)
        if hi > 0 and toks[hi - 1][0] in ("قال", "وقال") and isinstance(m["person"], int):
            lv0 = next((lv for lv in branches[-1] if any(x["person"] == m["person"] for x in lv)), None)
            if lv0 is not None:
                lv0.append(m)
                continue
        gap = [x for x in range(lo, hi) if toks[x][0] != "و" and not _ignorable(toks[x][0])]
        # «… عبد الملك بن شعيب، وحدثني أبي، عن جدي»: «otam» yangi yo'l boshlay olmaydi — oldingi roviyning davomi
        my_kin = m.get("words") in (["ابي"], ["اخي"]) and not any(toks[x][0] == "ح" for x in gap)
        # «عن ابن جريج، وأخبرني محمد بن عباد»: sanad yo'lida (R) ketma-ket roviylar — davom, yangi yo'l emas
        pv = branches[-1][-1][-1]["person"]
        r_next = bool(R) and pv in R and m["person"] in R and R.index(m["person"]) == R.index(pv) + 1 and \
            not any(toks[x][0] == "ح" for x in gap)
        if any(toks[x][0] in NEW_CHAIN_IN_ISNAD for x in gap) and not my_kin and not r_next:
            branches.append([[m]])
            bkind.append("new")
        elif any(_is_formula(toks, x) or toks[x][0] in NON_NAME_WORDS for x in gap) or (
                (odd := [x for x in gap if not _name_word(toks[x][0])])
                and not (len(odd) == 1 and (any(toks[x][0] == "و" for x in range(lo, hi)) or m["span"][0] > toks[hi][1]))):
            # oraliqda rivoyat so'zi yoki ism bo'lmagan so'z — keyingi o'rin («… زياد عاد معقل …» — hikoya). Faqat
            # ism so'zlari (nisba) yoki bitta noma'lum so'z + «و» («X الجصاص، وY») — bir xil o'rin
            branches[-1].append([m])
        else:
            branches[-1][-1].append(m)              # faqat «و» / vergul — bir xil o'rin (bir nechta ustoz)
    # aniqlanmagan matn ismlari: qo'shni darajalar (barcha parallel ustozlari bilan); ikki o'tish — avval aniq bo'lganlari,
    # keyin qolganlari ikkala qo'shnisi ma'lum holda
    comp_forms = {tuple(_c(x) for x in al) for al in alias_of(compiler)} if compiler is not None else set()
    for br in branches:
        for lv in br:
            for m in lv:
                if m["person"] is None and tuple(_c(w) for w in m.get("words") or ()) in comp_forms:
                    m["person"] = compiler        # «قال أبو عيسى» — muallifning izohi
    for final in (False, True):
        for br in branches:
            for li, lv in enumerate(br):
                for m in lv:
                    if m["person"] is None:
                        prev = [x["person"] for x in br[li - 1]] if li else compiler     # birinchi daraja — muallifning ustozi
                        nxt = [x["person"] for x in br[li + 1]] if li + 1 < len(br) else None
                        m["person"] = name_person(m["words"], m["span"], prev, nxt, final=final)
    # faqat muallifning o'zidan iborat tarmoq («قال أبو عيسى …» — Termiziyning izohi) — sanad yo'li emas
    if compiler is not None and not keep_compiler:
        keep_b = [bi for bi, br in enumerate(branches) if not all(m["person"] == compiler for lv in br for m in lv)]
        branches, bkind = [branches[bi] for bi in keep_b], [bkind[bi] for bi in keep_b]
        inb = {id(x) for br in branches for lv in br for x in lv}
        mentions[:] = [m for m in mentions if not (m["person"] == compiler and id(m) not in inb)]
    # bir darajada «ابن عم نبيكم يعني ابن عباس» — ikkinchi ism birinchisini tushuntiradi: bir shaxs
    for br in branches:
        for lv in br:
            for x, y in zip(lv, lv[1:]):
                g = range(tok_at(x["span"][1]), next((j for j, t in enumerate(toks) if t[2] > y["span"][0]), len(toks)))
                if any(toks[j][0] in SAME_PERSON for j in g) and isinstance(y["person"], int) and not isinstance(x["person"], int):
                    x["person"], x["basis"] = y["person"], "explained_by_next_name"
    # «… جميعا عن الثقفي، واللفظ لابن المثنى، حدثنا عبد الوهاب»: yolg'iz nisba keyingi darajadagi shaxsning nisbasi bo'lsa
    # (yoki ikki ketma-ket daraja bir shaxs) — bitta o'rin (o'sha roviyning ikkinchi zikri)
    for br in branches:
        li = 0
        while li + 1 < len(br):
            a_, b_ = br[li], br[li + 1]
            p2 = b_[0]["person"]
            g_ = [toks[x][0] for x in range(tok_at(a_[0]["span"][1]), tok_at(b_[0]["span"][0]))]
            direct = any(w in DIRECT for w in g_) and not any(w in ("قال", "وقال", "فقال") for w in g_)   # izohda takror emas
            same = len(a_) == 1 and isinstance(p2, int) and (
                (a_[0]["person"] == p2 and not direct)     # «خالد عن خالد» — ustoz va shogird, bir shaxs emas
                or (not isinstance(a_[0]["person"], int) and len(a_[0].get("words") or []) == 1
                                          and _nisba(a_[0]["words"][0])
                                          and _c(a_[0]["words"][0]) in {_c(w) for w in name_tokens(K["full_names"].get(p2, ""))}))
            if same:
                was_same = a_[0]["person"] == p2
                a_[0]["person"], a_[0]["basis"] = p2, a_[0].get("basis") or "same_person_nisba"
                br[li:li + 2] = [a_ + b_ if was_same else b_ + a_]   # asosiysi: birinchi (to'liq) zikr; nisba holida — ism
                continue
            li += 1
    # page_isnads yo'li bilan moslik: asosiy (eng ko'p umumiy roviyli) yo'l
    main, offset, consistent = 0, 0, False
    def fits(br):
        """Yo'l (R) shu tarmoq darajalari bilan aynan mos keladimi: (mos, siljish, juftlar, bo'sh darajalar)."""
        pairs = [(li, next(R.index(m["person"]) for m in lv if m["person"] in R)) for li, lv in enumerate(br)
                 if any(m["person"] in R for m in lv)]
        free = [li for li, lv in enumerate(br) if not any(m["person"] in R for m in lv)]
        off0 = pairs[0][1] - pairs[0][0] if pairs else -1
        ok = bool(pairs) and off0 >= 0 and all(ri - li == off0 for li, ri in pairs) and off0 + len(br) <= len(R) and \
            all(all(isinstance(m["person"], str) for m in br[li]) for li in free)
        return ok, off0, free

    if R and compiler is not None and branches and branches[0][0][0]["person"] == compiler and compiler not in R:
        R = [compiler] + list(R)                  # Muvatto: «وحدثني عن مالك» — matnda muallifning o'zi 1-o'rinda
    if R and branches:
        # asosiy tarmoq: R bilan mos kelganlar ichida eng ko'p umumiy roviylisi (tahvilda R faqat bitta tarmoqniki)
        by_common = sorted(range(len(branches)), key=lambda bi: -sum(1 for lv in branches[bi] if any(m["person"] in R for m in lv)))
        main = next((bi for bi in by_common if fits(branches[bi])[0]), by_common[0])
        br = branches[main]
        ok_, off0, free = fits(br)
        if ok_:
            consistent, offset = True, off0
            for li in free:                       # «عن أبيه» kabi ismlar: yo'ldagi o'sha o'rindagi shaxs
                rp = R[off0 + li]
                rn = {_c(w) for w in name_tokens(K["full_names"].get(rp, ""))}
                ok = [m for m in br[li] if any(_c(w) in rn for w in m["words"] if w not in GENERIC)
                      or (len(br[li]) == 1 and [_c(w) for w in m["words"]] in KIN_WORDS)]
                if len(ok) == 1:                  # ism shu shaxsning nasabiga mos (yoki yagona «أبيه») — boshqa ustozga berilmaydi
                    ok[0]["person"], ok[0]["basis"] = rp, "text_name_identified_by_route_position"
        else:
            reasons.append("route_differs_from_text")
    routes = []
    for bi, br in enumerate(branches):
        nodes = []
        off = offset if (consistent and bi == main) else 0
        if off:
            nodes += [{"pos": k + 1, "person": R[k], "m": None} for k in range(off)]
        for li, lv in enumerate(br):
            nodes.append({"pos": off + li + 1, "person": lv[0]["person"], "m": lv[0], "also": lv[1:]})
        if consistent and bi == main:
            for k in range(off + len(br), len(R)):
                nodes.append({"pos": k + 1, "person": R[k], "m": None})
        routes.append(nodes)
    # matnda zikr qilinmagan oxirgi tugunlar: sanaddan keyingi matnda to'liq ismi bo'lsa (masalan «… وعائشة …»)
    if consistent:
        nodes = routes[main]
        spans = {i: n["m"]["span"] for i, n in enumerate(nodes) if n["m"]}
        taken = [m["span"] for m in mentions if m["span"]]
        found = fill_route_gaps(text, toks, [{"pos": n["pos"], "person": n["person"]} for n in nodes], spans, alias_of, taken)
        i = max(spans, default=-1) + 1
        while i in found:                          # faqat ketma-ket (oraliq qoldirmasdan)
            m = {"person": nodes[i]["person"], "span": list(found[i]), "basis": "route_name_after_isnad"}
            mentions.append(m)
            nodes[i]["m"] = m
            i += 1
    # «وعن X» (davom): X oldingi yo'ldagi kimning ustozi bo'lsa — o'sha darajadan keyin; topilmasa umumiy roviy bo'yicha
    for bi in range(1, len(routes)):
        if bkind[bi] != "cont" or not routes[bi]:
            continue
        prev, cur = routes[bi - 1], routes[bi]
        x = cur[0]["person"]
        at = None
        common = next(((k, j) for j, n in enumerate(cur) for k, p in enumerate(prev) if p["person"] == n["person"]), None)
        if common and common[0] - common[1] >= 0:
            at = common[0] - common[1] - 1         # umumiy roviy bir xil o'rinda turadi
        if at is None:
            at = next((k for k in range(len(prev) - 1, -1, -1) if (x, prev[k]["person"]) in K["edges"]), None)
        if at is not None and at >= 0:
            routes[bi] = [dict(n) for n in prev[: at + 1]] + [{**n, "pos": prev[at]["pos"] + k + 1} for k, n in enumerate(cur)]
        elif at == -1:
            pass
        else:
            reasons.append("appended_chain_unattached")
    # tahvil: oldingi yo'l keyingisiga qo'shilgan roviydan davom etadi
    joined = set()
    for bi in range(len(routes) - 1):
        if bi + 1 < len(bkind) and bkind[bi + 1] == "cont":
            continue
        cur = routes[bi]
        li = max((k for k, n in enumerate(cur) if n["m"]), default=None)      # matndagi oxirgi tugun
        if li is None:
            continue
        nxt = routes[bi + 1]
        j = next((k for k, n in enumerate(nxt) if n["person"] == cur[li]["person"]
                  or any(x["person"] == cur[li]["person"] for x in n.get("also") or [])), None)   # parallel ustozlardan biri
        if j is not None and j + 1 < len(nxt):
            base = cur[li]["pos"]
            routes[bi] = cur[: li + 1] + [{**n, "pos": base + k + 1} for k, n in enumerate(nxt[j + 1:])]
            joined.add(bi)
    # «… يونس، ح وحدثني … عقيل، كلاهما عن ابن شهاب» / «… قالا جميعا حدثنا هشام»: oldingi yo'l(lar) ham shu roviydan davom
    # etadi (umumiy roviy oldingi yo'lda nomi bilan kelmagan)
    for bj in range(1, len(routes)):
        if bkind[bj] == "cont":
            continue
        ins = [k for k, n in enumerate(routes[bj]) if n["m"] and n["m"].get("span")]
        jx = next((k2 for k1, k2 in zip(ins, ins[1:])
                   if any(toks[x][0] in JOINT for x in range(tok_at(routes[bj][k1]["m"]["span"][1]),
                                                             tok_at(routes[bj][k2]["m"]["span"][0])))), None)
        if jx is None:
            continue
        start_bj = routes[bj][ins[0]]["m"]["span"][0]
        for bi in range(bj):
            if bi in joined or bkind[bi] == "cont":
                continue
            cur = routes[bi]
            li = max((k for k, n in enumerate(cur) if n["m"] and n["m"].get("span")), default=None)
            if li is None or cur[li]["m"]["span"][0] >= start_bj:
                continue
            routes[bi] = cur[: li + 1] + [{**n, "pos": cur[li]["pos"] + k + 1} for k, n in enumerate(routes[bj][jx:])]
            joined.add(bi)
    # «حدثنا مسدد حدثنا يحيى ح وحدثنا عثمان عن ابن نمير عن عبيد الله …»: umumiy roviy oldingi yo'lda nomlanmagan va
    # birlashtiruvchi so'z yo'q — oldingi yo'lning oxirgi roviysi keyingi yo'ldagi kimdan rivoyat qilgani roviylar bazasida
    # (ustoz–shogird juftligi) bo'lsa, o'sha roviydan davom etadi
    for bi in range(len(routes) - 1):
        if bi in joined or (bi + 1 < len(bkind) and bkind[bi + 1] == "cont"):
            continue
        cur, nxt = routes[bi], routes[bi + 1]
        li = max((k for k, n in enumerate(cur) if n["m"]), default=None)
        if li is None or not isinstance(cur[li]["person"], int):
            continue
        js = [k for k, n in enumerate(nxt) if n["m"] and isinstance(n["person"], int)
              and (n["person"], cur[li]["person"]) in K["edges"]]
        if len(js) == 1:                          # faqat bitta nomzod bo'lsa (bir nechta bo'lsa — qayerdan qo'shilishi noaniq)
            j = js[0]
            routes[bi] = cur[: li + 1] + [{**n, "pos": cur[li]["pos"] + k + 1} for k, n in enumerate(nxt[j:])]
            joined.add(bi)
    # boshqa yo'lning to'liq ichida qolgan yo'l (davom sifatida qo'shilgan tarmoq) — alohida ko'rsatilmaydi
    mids_of = [{id(n["m"]) for n in r if n["m"]} for r in routes]
    routes = [r for i, r in enumerate(routes) if not (mids_of[i] and any(j != i and mids_of[i] < mids_of[j] for j in range(len(routes))))]
    # asosiy yo'l birinchi (A): sanadning oxirgi roviysi shu yo'lda — «faqat ismlar» shu yerdan kesadi
    order = sorted(range(len(routes)), key=lambda bi: (-(routes[bi][-1]["m"]["span"][0] if routes[bi] and routes[bi][-1]["m"] else -1), -bi))
    routes = [routes[bi] for bi in order]
    # zikrlar: matn tartibida mid
    allm = sorted((m for m in mentions if m.get("person") is not None),
                  key=lambda m: (m["span"] is None, (m["span"] or [10 ** 9])[0]))
    for k, m in enumerate(allm, 1):
        m["mid"] = f"{u['unit_id']}#m{k}"
    rec_mentions = []
    for m in allm:
        persons_used.add(m["person"])
        rec_mentions.append({"mid": m["mid"], "person": m["person"],
                             "as_written": _clean_written(text, m["span"]) if m["span"] else m.get("source_name") or "",
                             "span": list(m["span"]) if m["span"] else None,
                             **({"basis": m["basis"]} if m.get("basis") else {}),
                             **({"source_name": m["source_name"]} if m.get("source_name") else {})})
    rec_routes = []
    for ri, nodes in enumerate(routes):
        out = []
        for n in nodes:
            persons_used.add(n["person"])
            nd = {"pos": n["pos"], "person": n["person"], "mid": n["m"]["mid"] if n["m"] else None}
            if n.get("also"):
                nd["also"] = [x["mid"] for x in n["also"]]
            out.append(nd)
        rec_routes.append({"route_id": f"{u['unit_id']}#r{ri + 1}", "label": chr(65 + ri), "of": len(out), "nodes": out})
    if any(n["mid"] is None for r in rec_routes for n in r["nodes"]):
        reasons.append("names_not_in_this_text")
    if any(isinstance(m["person"], str) for m in rec_mentions):
        reasons.append("text_names_unresolved")
    if any(m["span"] is None for m in rec_mentions):
        reasons.append("mention_span_not_found")
    if not rec_routes:
        reasons.append("no_chain_in_text")
    if len(rec_routes) > 1:
        reasons.append("tahwil_branch_in_text")
    status = ("established_single_route" if len(rec_routes) == 1 and not reasons else
              "branched" if len(rec_routes) > 1 else ("no_route" if not rec_routes else "partial"))
    return {"unit_id": u["unit_id"], "seq": u["seq"], "text_sha256": u["current_text_sha256"], "evidence": evidence,
            "mentions": rec_mentions, "routes": rec_routes, "branched": len(rec_routes) > 1, "reasons": reasons, "status": status,
            "intermediaries": rec_routes[0]["of"] if status == "established_single_route" else None}


def _presence_keys(alias_list) -> list[tuple[str, ...]]:
    """Ism borligini tez tekshirish uchun: har shakldan 1–2 ta ajratuvchi so'z."""
    out = set()
    for t in alias_list[:12]:
        t = [w for w in t]
        if not t:
            continue
        if t[0] in GENERIC and len(t) >= 2:
            out.add((t[0], t[1]) if t[1] not in GENERIC or len(t) < 3 else (t[0], t[1], t[2]))
        elif t[0] not in GENERIC:
            out.add((t[0],))
    return list(out)


def build_isnad(raw: Path, cfg: dict, units: list[dict], evidence: dict, pages: list[dict]):
    """Ikki o'tish: 1) manba/sanad bazasi bilan aniq bog'langan ismlarning matndagi yozilishlari o'rganiladi (masalan Muslimda
    «أبو بكر بن أبي شيبة» = bazadagi «عبد الله بن محمد بن أبي شيبة»); 2) shu bilim bilan qayta quriladi. Sanad bazasi yo'q
    kitoblarda (text) faqat oldingi kitoblardan o'rganilganlar ishlatiladi (o'zidan o'rganmaydi)."""
    icfg = cfg.get("isnad")
    if not icfg:
        return [], [], Counter()
    K = knowledge(raw)
    if icfg["join"] != "text":
        isnad, _, _ = _isnad_pass(raw, cfg, units, evidence, pages)
        K["learned"] += [(m["person"], m["as_written"]) for r in isnad for m in r["mentions"]
                         if isinstance(m["person"], int) and m["span"] and m.get("basis") in TRUSTED_BASIS]
        refresh_resolver(K)
    return _isnad_pass(raw, cfg, units, evidence, pages)


def _isnad_pass(raw: Path, cfg: dict, units: list[dict], evidence: dict, pages: list[dict]):
    """Kitob turi bo'yicha: evidence (shu nashr sahifalari), number_text (boshqa nashr, raqam+matn), sequence (boshqa nashr,
    tartib + roviy ismlari matnda), text (sanad bazasi yo'q: matndagi rivoyat so'zlari orasidagi ismlar)."""
    icfg = cfg.get("isnad")
    ist = Counter()
    if not icfg:
        return [], [], ist
    K = knowledge(raw)
    alias_of = lambda pid: K["alias"].get(pid, [])  # noqa: E731
    persons_used, text_persons, isnad = set(), {}, []
    join = icfg["join"]

    def name_person(words, span_or_text, prev=None, nxt=None, text=None, final=True):
        """Matndagi ism -> shaxs: ism shakli + qo'shni roviylar bilan aniqlanadi; aniqlanmasa — yozilishi bo'yicha guruh
        (final=False: aniqlanmasa None — keyingi o'tishda qo'shnilar bilan qayta urinish)."""
        prev1 = next((x for x in (prev if isinstance(prev, list) else [prev]) if isinstance(x, int)), None)
        if [_c(w) for w in words] in (["ابيه"], ["عن", "ابيه"], ["ابي"]) and isinstance(prev1, int) and prev1 in K["narr"]:
            prev = prev1
            nm = name_tokens(K["narr"][prev].get("short_name") or "")
            fa = nm[nm.index("بن") + 1:] if "بن" in nm else []
            cand = [t for t in K["teachers_of"].get(prev, ()) if fa and t in K["narr"]
                    and name_tokens(K["narr"][t].get("short_name") or "")[:1] == fa[:1]]
            if len(cand) == 1:
                ist["name:father_of_previous"] += 1
                return cand[0]
        if [_c(w) for w in words] in KIN_WORDS or [_c(w) for w in words][-1:] in (["ابيه"],):
            pid, why = None, "kin_word_not_by_form"     # «أبيه» — har hadisda boshqa shaxs: faqat nasab/yo'l o'rni bilan
        else:
            pid, why = K["resolver"].resolve_between(words, prev, nxt)
        if pid is not None:
            ist["name:" + why] += 1
            return pid
        if not final:
            return None
        ist["name:" + why] += 1
        key = " ".join(_c(x) for x in words)
        return text_persons.setdefault(key, {"person": "t" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:10],
                                             "short_name": " ".join(words), "long_name": "", "summary": [], "opinions": [],
                                             "status": "text_name_unresolved"})["person"]

    compiler = icfg.get("compiler")
    keep_compiler = bool(icfg.get("compiler_in_text"))
    def fallback(u, toks):
        """Manba bilan bog'lanmagan birlik: sanad matnning o'zidan (rivoyat so'zlari orasidagi ismlar)."""
        rec = structure_record(u, toks, [], None, K, name_person, alias_of, {"join": "text_parse_fallback"}, persons_used, compiler=compiler, keep_compiler=keep_compiler)
        if rec["routes"]:
            ist["join:text_parse_fallback"] += 1
            isnad.append(rec)

    chains_at = defaultdict(list)
    if icfg.get("book_id"):
        for r in K["rows"]:
            if r["book_id"] == icfg["book_id"]:
                ch = list(reversed(r["narrator_ids"]))
                if ch and ch[0] == compiler:
                    ch = ch[1:]
                chains_at[(r["shamela_page_id"], r["hadeeth_key"])].append((r["id"], ch))

    if join in ("evidence", "number_text"):
        page_body = {p["shamela_page_id"]: p.get("body") or "" for p in pages}
        by_number = {}
        if join == "number_text":
            for p in load_pages(raw, icfg["pages"]):
                body = p.get("body") or ""
                texts = para_plain(body)
                for para in paragraphs(body):
                    by_number.setdefault(para["number"], (p["shamela_page_id"], para, texts.get(para["number"], "")))
        for u in units:
            text = u["text_ar"]
            toks = tokens(text)
            if join == "evidence":
                ref = shamela_ref(u, evidence)
                paras = [p for p in paragraphs(page_body.get(ref["page"], "")) if p["number"] in ref["numbers"]] if ref else []
                if not paras:
                    ist["join:no_paragraph"] += 1
                    fallback(u, toks)
                    continue
                para, isnad_page, how = paras[0], ref["page"], "evidence"
            else:
                n0 = next((n for n in u.get("numbers") or [] if n.get("number_text")), None)
                nums = [int(x) for x in str((n0 or {}).get("number_text") or "").split(";") if x.strip().isdigit()]
                hit = next((by_number[n] for n in nums if n in by_number), None)
                if not hit:
                    ist["join:number_not_in_other_edition"] += 1
                    fallback(u, toks)
                    continue
                ov_ = text_overlap(text, hit[2])
                how = "number_and_text" if ov_ >= 0.6 else None
                if not how and ov_ >= 0.4:
                    anchors = [nm for pid, nm in hit[1]["mentions"] if pid != compiler]
                    sp = align_names(text, anchors, toks)
                    if anchors and sum(1 for x in sp if x) / len(anchors) >= 0.7:
                        how = "number_and_names"
                if not how:
                    ist["join:text_mismatch"] += 1
                    fallback(u, toks)
                    continue
                isnad_page, para = hit[0], hit[1]
            ist["join:" + how] += 1
            # «وغير واحد» (Shamela man-0) — «va boshqalar», roviy emas
            anchors = [(pid, nm) for pid, nm in para["mentions"] if pid != compiler
                       and not (not pid and any(w.removeprefix("و").startswith("غير") for w in name_tokens(nm)))]
            sp = align_names(text, [nm for _, nm in anchors], toks)
            mentions = [{"person": pid, "span": list(s) if s else None, "source_name": nm.strip(" ،,:")} for (pid, nm), s in zip(anchors, sp)]
            rs = chains_at.get((isnad_page, para["key"])) if para["key"] is not None else None
            ev_ = {"shamela_page_id": isnad_page, "printed_number": para["number"], "hadeeth_key": para["key"],
                   "shamela_book": icfg["pages"], "join": how, "page_isnads_ids": [r[0] for r in rs or []]}
            isnad.append(structure_record(u, toks, mentions, rs[0][1] if rs else None, K, name_person, alias_of, ev_, persons_used,
                                          [] if rs else ["no_page_isnads_row"], compiler=compiler, keep_compiler=keep_compiler))

    elif join == "sequence":
        # boshqa nashr, sahifalari yo'q. Har birlik: sanad qismida topilgan roviylar (ism shakllari bilan) -> shu roviylar
        # qatnashgan page_isnads yo'llari; eng ko'p roviysi matnda topilgan yo'l (teng bo'lsa — kitob tartibida oldingi
        # tanlovga yaqini). Yo'ldagi roviylarning ≥60% i (kamida 2 tasi) matnda bo'lishi shart.
        keys = sorted(chains_at)
        groups = [chains_at[k][0] for k in keys]
        groups_of = defaultdict(list)
        for gi, (_, ch) in enumerate(groups):
            for pid in set(ch):
                groups_of[pid].append(gi)
        first_tok = defaultdict(set)              # ism shaklining birinchi so'zi -> shaxslar
        owners = defaultdict(set)                 # ism shakli (yoki uning boshi) -> shu shaklga ega shaxslar
        for pid in groups_of:
            for al in alias_of(pid):
                if al:
                    first_tok[_c(al[0])].add(pid)
                    for k in range(1, len(al) + 1):
                        owners[tuple(_c(w) for w in al[:k])].add(pid)
        prev_g = -1
        for ui, u in enumerate(units):
            text = u["text_ar"]
            toks = tokens(text)
            end = min(len(toks), isnad_end(toks) + 1)
            located, weight = {}, {}
            for j in range(end):
                w0 = _c(toks[j][0])
                for pid in first_tok.get(w0, set()) | (first_tok.get(w0[1:], set()) if w0[:1] == "و" and len(w0) > 2 else set()):
                    for al in alias_of(pid):
                        if all(_c(x) in GENERIC for x in al):
                            continue                  # «عبد» kabi faqat umumiy so'zdan iborat shakl — ism emas
                        hit = find_name(toks, al, j, j + 1, partial=True)
                        if hit and (hit[1] == len(al) or any(w not in GENERIC for w in al[:hit[1]])):
                            # noyoblik: shu yozilish shakli nechta shaxsga tegishli (1 — aniq, 100 — «محمد» kabi)
                            w = 1 / max(1, len(owners.get(tuple(_c(x) for x in al[:hit[1]]), ())))
                            old_ = located.get(pid)
                            if w > weight.get(pid, 0) or (w == weight.get(pid) and old_ and old_[0] == hit[0] and hit[1] > old_[1]):
                                located[pid], weight[pid] = hit, w   # bir xil joyda — uzunroq shakl («جرير بن عبد الله البجلي»)
            cnt = defaultdict(float)
            for pid in located:
                for gi in groups_of[pid]:
                    cnt[gi] += weight[pid]
            best, bkey = None, None
            expect = prev_g + 1 if prev_g >= 0 else round(ui * len(groups) / max(1, len(units)))
            for gi, c in cnt.items():
                ch = groups[gi][1]
                strong = sum(1 for p in ch if weight.get(p, 0) >= 0.34)
                if strong < min(2, len(ch)):
                    continue
                sc = c / len(ch)
                pos = [located[p][0] for p in ch if p in located]
                key = (round(sc, 3), pos == sorted(pos), -abs(gi - expect))
                if bkey is None or key > bkey:
                    best, bkey = gi, key
            if best is None or bkey[0] < 0.5:
                ist["join:no_match"] += 1
                fallback(u, toks)
                continue
            prev_g = best
            rid, ch = groups[best]
            spans = {i: (toks[located[p][0]][1], toks[located[p][0] + located[p][1] - 1][2]) for i, p in enumerate(ch)
                     if p in located and weight[p] >= 0.2}
            # tartibga zid topilganlarni tashlash (eng uzun o'suvchi ketma-ketlik)
            order = sorted(spans)
            keep, last = {}, -1
            for i in order:
                if spans[i][0] > last:
                    keep[i] = spans[i]
                    last = spans[i][1]
            more = fill_route_gaps(text, toks, [{"pos": i + 1, "person": pid} for i, pid in enumerate(ch)], keep, alias_of,
                                   list(keep.values()))
            keep.update(more)
            ist["join:sequence_and_names"] += 1
            mentions = [{"person": ch[i], "span": list(sp), "basis": "route_name_in_text"} for i, sp in sorted(keep.items(), key=lambda x: x[1][0])]
            ev_ = {"page_isnads_book": icfg["book_id"], "shamela_page_id": keys[best][0], "hadeeth_key": keys[best][1],
                   "join": "names_in_text", "match": bkey[0], "page_isnads_ids": [rid]}
            isnad.append(structure_record(u, toks, mentions, ch, K, name_person, alias_of, ev_, persons_used, compiler=compiler, keep_compiler=keep_compiler))

    elif join == "text":
        for u in units:
            toks = tokens(u["text_ar"])
            rec = structure_record(u, toks, [], None, K, name_person, alias_of, {"join": "text_parse"}, persons_used, compiler=compiler, keep_compiler=keep_compiler)
            if not rec["routes"]:
                ist["text:no_chain"] += 1
                continue
            ist["join:text_parse"] += 1
            isnad.append(rec)

    for r in isnad:
        ist["status:" + r["status"]] += 1
        for x in r["reasons"]:
            ist["reason:" + x] += 1
        ist["mentions"] += len(r["mentions"])
        ist["mentions_with_span"] += sum(1 for m in r["mentions"] if m["span"])
    persons = []
    for pid in sorted((x for x in persons_used if isinstance(x, int))):
        n = K["narr"].get(pid)
        if not n:
            continue
        bio = _jload(n.get("biography_text")) or {}
        crit = _jload(n.get("criticism_text")) or {}
        persons.append({"person": pid, "short_name": (n.get("short_name") or "").strip("‌ "), "long_name": (n.get("long_name") or "").strip("‌ "),
                        "summary": bio.get("summary") or [], "opinions": crit.get("garh") or [], "status": "source_excerpt_unreviewed"})
    persons += sorted(text_persons.values(), key=lambda x: x["person"])
    return isnad, persons, ist


def _c(w: str) -> str:
    return "بن" if w == "ابن" else w


def _jload(s):
    try:
        return json.loads(s) if s else None
    except ValueError:
        return None


def build(raw: Path, package: Path, uz_draft: Path | None = None, book: str = "bukhari", kitab_names: dict | None = None) -> dict:
    cfg = BOOKS[book]
    pages = load_pages(raw, cfg["shamela"]) if cfg.get("shamela") else []
    ev = scan(pages, alt=bool(cfg.get("para_alt")))
    head_stats = verify_untagged(ev)
    units, evidence, base_manifest, base_sha = load_package(package)

    # Kitob: paketdagi chapter_ar guruhlari (manba: sunnah.com/hadith-json), paket tartibida.
    kitabs, kidx = [], {}
    for u in units:
        ch = u.get("chapter_ar") or ""
        if not kitabs or kitabs[-1]["title_ar"] != ch:
            kitabs.append({"id": f"k{len(kitabs) + 1}", "order": len(kitabs) + 1, "title_ar": ch, "unit_ids": [],
                           "source": "package chapter_ar (hadith-json 1.2.0 / sunnah.com)"})
        kitabs[-1]["unit_ids"].append(u["unit_id"])
        kidx[u["unit_id"]] = kitabs[-1]["id"]
    # Kitob nomlarining o'zbekcha tarjimasi (tashqi fayl, tahririy qoralama — tekshirilmagan deb belgilanadi)
    if kitab_names:
        for k in kitabs:
            uz = (kitab_names.get("names") or {}).get(k["title_ar"])
            if uz:
                k["names"] = {"uz": uz, "origin": kitab_names.get("origin"), "status": kitab_names.get("status")}

    # Paragraf (sahifa, raqam) -> hodisa indeksi
    para_at = {}
    for i, e in enumerate(ev):
        if e["t"] == "para":
            for n in e.get("numbers") or [e["number"]]:
                para_at.setdefault((e["page"], n), i)
    unit_pos, st = {}, Counter()
    for u in units:
        ref = shamela_ref(u, evidence, bool(cfg.get("kitab_numbers")))
        if not ref:
            st["unit_no_shamela_evidence"] += 1
            continue
        i = next((para_at[(ref["page"], n)] for n in ref["numbers"] if (ref["page"], n) in para_at), None)
        if i is None:
            st["unit_paragraph_not_found"] += 1
            continue
        unit_pos[u["unit_id"]] = i

    # Sarlavhalar -> boblar (Kitob sarlavhalari alohida), kirish matni — keyingi sarlavha yoki paragrafgacha.
    babs, shamela_kitabs = [], []
    cur_bab, cur_kit, intro_open = None, None, None
    preface = []    # birinchi raqamli hadisdan oldingi manba matni (nashr old qismi + Vahiy boshi); hadis davomi satrlari emas
    preface_open = True
    carry = []      # Kitob sarlavhasidan bevosita oldingi ﷽ — o'sha Kitobga tegishli (manbadagi qo'shnilik)
    for i, e in enumerate(ev):
        if e["t"] == "head":
            src = {k: e[k] for k in ("page", "part", "page_num", "body_sha256")} | {"line": e["li"]}
            if KITAB_WORD.match(bare_head(e["text"])):
                cur_kit = {"id": f"sk{len(shamela_kitabs) + 1}", "title_ar": e["text"], "toc": e["toc"], "evidence": e["evidence"],
                           "source": src, "ev_index": i, "intro": carry}
                carry = []
                shamela_kitabs.append(cur_kit)
                intro_open = cur_kit
                cur_bab = None
                continue
            cur_bab = {"id": f"b{len(babs) + 1}", "order": len(babs) + 1, "title_ar": e["text"], "title_tagged": e["tagged"],
                       "toc": e["toc"], "evidence": e["evidence"], "source": src, "ev_index": i, "intro": [],
                       "shamela_kitab": cur_kit["id"] if cur_kit else None, "unit_ids": []}
            babs.append(cur_bab)
            intro_open = cur_bab
        elif e["t"] == "para":
            intro_open = None
            preface_open = False
        elif e["t"] == "text":
            blk = {"text_ar": e["text"], "page": e["page"], "part": e["part"], "page_num": e["page_num"], "line": e["li"]}
            nxt = ev[i + 1] if i + 1 < len(ev) else None
            if is_bism(e["text"]) and nxt and nxt["t"] == "head" and KITAB_WORD.match(bare_head(nxt["text"])):
                carry.append({**blk, "placement": "bismillah_before_kitab_heading"})
            elif intro_open is not None:
                intro_open["intro"].append(blk)
            elif cur_bab is None and cur_kit is None and preface_open:
                preface.append({**blk, "front_title": e.get("front_title", False)})

    # Hadis -> bob (hujjat pozitsiyasi bo'yicha oxirgi sarlavha)
    bab_starts = [b["ev_index"] for b in babs]
    import bisect
    unit_bab, kitab_opening = {}, []
    for uid, i in unit_pos.items():
        j = bisect.bisect_right(bab_starts, i) - 1
        if j < 0:
            st["unit_kitab_opening_no_bab"] += 1     # birinchi sarlavhadan oldin (Vahiy boshi)
            kitab_opening.append(uid)
            continue
        # bob va hadis o'rtasida Kitob sarlavhasi bo'lsa — hadis yangi Kitob boshida, bob sarlavhasisiz
        b = babs[j]
        if any(k["ev_index"] > b["ev_index"] and k["ev_index"] < i for k in shamela_kitabs):
            st["unit_kitab_opening_no_bab"] += 1
            kitab_opening.append(uid)
            continue
        unit_bab[uid] = b["id"]
        b["unit_ids"].append(uid)

    # Bob -> paketdagi Kitob: o'z hadislari bo'yicha; hadissiz bob — Shamela Kitob bo'limi orqali.
    sk_votes = defaultdict(Counter)
    for b in babs:
        for uid in b["unit_ids"]:
            if b["shamela_kitab"]:
                sk_votes[b["shamela_kitab"]][kidx[uid]] += 1
    for b in babs:
        votes = Counter(kidx[u] for u in b["unit_ids"])
        if votes:
            k, n = votes.most_common(1)[0]
            b["kitab_id"] = k
            b["kitab_basis"] = "own_hadiths" if n == sum(votes.values()) else "own_hadiths_mixed"
            if n != sum(votes.values()):
                st["bab_hadiths_in_two_kitabs"] += 1
        else:
            b["kitab_id"] = None
            b["kitab_basis"] = None
    # hadissiz boblar: oldingi va keyingi hadisli bob bir Kitobda bo'lsa — shu Kitob; aks holda Shamela Kitob bo'limi.
    for j, b in enumerate(babs):
        if b["kitab_id"]:
            continue
        prev = next((x for x in reversed(babs[:j]) if x["kitab_id"] and x["shamela_kitab"] == b["shamela_kitab"]), None)
        nxt = next((x for x in babs[j + 1:] if x["kitab_id"] and x["shamela_kitab"] == b["shamela_kitab"]), None)
        if prev and nxt and prev["kitab_id"] == nxt["kitab_id"]:
            b["kitab_id"], b["kitab_basis"] = prev["kitab_id"], "between_same_kitab"
        elif nxt and (not prev or prev["kitab_id"] != nxt["kitab_id"]) and b["shamela_kitab"] and sk_votes[b["shamela_kitab"]]:
            k = sk_votes[b["shamela_kitab"]].most_common(1)[0][0]
            if k == nxt["kitab_id"]:
                b["kitab_id"], b["kitab_basis"] = k, "shamela_kitab_section"
        if not b["kitab_id"]:
            st["bab_kitab_unresolved"] += 1
            b["kitab_basis"] = "unresolved"

    # Kitob kirishi: Shamela Kitob sarlavhasi va undan keyingi matn -> paketdagi Kitob (bo'lim hadislari ko'pchiligi).
    kit_by_id = {k["id"]: k for k in kitabs}
    for sk in shamela_kitabs:
        if sk_votes[sk["id"]]:
            k = sk_votes[sk["id"]].most_common(1)[0][0]
            kit_by_id[k].setdefault("shamela_headings", []).append(
                {"title_ar": sk["title_ar"], "evidence": sk["evidence"], "source": sk["source"], "intro": sk["intro"]})
    if preface and kitabs:
        kitabs[0].setdefault("shamela_headings", [])[:0] = opening_blocks(preface)
    for k in kitabs:
        k["bab_ids"] = [b["id"] for b in babs if b["kitab_id"] == k["id"]]
        k["unit_count"] = len(k["unit_ids"])
        k["units_with_bab"] = sum(1 for u in k["unit_ids"] if u in unit_bab)
        k["units_opening"] = sum(1 for u in k["unit_ids"] if u in set(kitab_opening))

    # ------------------------------------------------------------------ sanad va roviylar
    icfg = cfg.get("isnad")
    isnad, persons, ist = build_isnad(raw, cfg, units, evidence, pages)

    # ------------------------------------------------------------------ O'zbek qoralama (ixtiyoriy)
    translations = []
    if uz_draft:
        d = json.loads(Path(uz_draft).read_text("utf-8"))
        tv = d.get("translations_v4") or {}
        fx = {b["id"]: b for k in d.get("kitabs", []) for b in k.get("babs", [])}
        for fid, t in (tv.get("babs") or {}).items():
            b0 = fx.get(fid)
            if not b0:
                continue
            tgt = next((b for b in babs if b["source"]["page"] == b0["source"]["shamela_page_id"]
                        and normalize(b["title_ar"]).startswith(normalize(b0["title_ar"])[:40])), None)
            if not tgt:
                continue
            translations.append({"target": tgt["id"], "target_kind": "bab", "title": t.get("title"), "intro": t.get("intro") or []})
        # Kitob nomlari: foydalanuvchining dizayn namunasidagi UI nomlari (DIZAYN-PROTOTIP.html, kalitlar iman/ilm).
        # Tarjima emas — namunada berilgan ko'rsatma nomlar; faqat qoralama bilan birga va provenance bilan.
        for k0 in d.get("kitabs", []):
            names = SAMPLE_KITAB_NAMES.get(k0.get("name_key"))
            tgt = next((k for k in kitabs if normalize(k["title_ar"]) == normalize(k0.get("title_ar") or "")), None)
            if names and tgt:
                tgt["names"] = {**names, "origin": "Hadith Library design sample V6 UI names (HADITH-LIBRARY-AUDIT-20261024)",
                                "status": "user-provided-sample-name"}
        for num, t in (tv.get("hadiths") or {}).items():
            u = next((u for u in units if any(str(n.get("number_text")) == num for n in u.get("numbers") or [])), None)
            if u:
                translations.append({"target": u["unit_id"], "target_kind": "unit", "sanad": t.get("sanad"), "matn": t.get("matn") or []})
        for t in translations:
            t.update({"language": "uz", "status": tv.get("status", "editorial-draft-awaiting-scholarly-review"),
                      "origin": "Hadith Library design sample V4 (HADITH-LIBRARY-AUDIT-20261024), prepared from Shamela 1681 Arabic",
                      "translator": None, "published_source": None})

    for b in babs:
        b.pop("ev_index", None)
    stats = {"book": book, "pages": len(pages), "headings": {**head_stats}, "kitabs": len(kitabs), "babs": len(babs),
             "shamela_kitab_headings": len(shamela_kitabs),
             "bab_evidence": dict(Counter(b["evidence"] for b in babs)),
             "babs_with_hadith": sum(1 for b in babs if b["unit_ids"]),
             "babs_without_hadith": sum(1 for b in babs if not b["unit_ids"]),
             "bab_kitab_basis": dict(Counter(b["kitab_basis"] for b in babs)),
             "units": len(units), "units_with_bab": len(unit_bab), **dict(st),
             "isnad": dict(ist), "isnad_source": icfg and {k: icfg[k] for k in ("book_id", "pages", "join") if k in icfg},
             "isnad_note": cfg.get("isnad_note"), "persons": len(persons), "translations_uz_draft": len(translations)}
    return {"base": {"package_id": base_manifest["package_id"], "package_version": base_manifest["package_version"],
                     "package_sha256": base_sha, "edition_id": base_manifest["edition_id"], "work_id": base_manifest["work_id"]},
            "kitabs": kitabs, "babs": babs, "unit_bab": unit_bab, "kitab_opening": kitab_opening, "isnad": isnad, "persons": persons,
            "translations": translations, "stats": stats}


def write_overlay(ov: dict, out_dir: Path, raw: Path, book: str = "bukhari") -> Path:
    cfg = BOOKS[book]
    out_dir = Path(out_dir)
    if out_dir.resolve().is_relative_to(ROOT.parent.resolve()):
        raise SystemExit("--out repo ichida bo'lmasin: qatlam faqat mahalliy (QARORLAR.md #37/#38)")
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = {"shamela_book": cfg["shamela_id"], "pages_sha256": sha((raw / cfg["shamela"] / "pages.jsonl").read_bytes())} if cfg.get("shamela") else {}
    if book == "bukhari":
        meta["book_id"] = BOOK_ID
    ic = cfg.get("isnad")
    if ic:
        meta["isnad"] = {k: ic[k] for k in ("book_id", "pages", "join") if k in ic}
        if ic.get("pages"):
            meta["isnad"]["pages_sha256"] = sha((raw / ic["pages"] / "pages.jsonl").read_bytes())
    t = cfg["title"]
    has_bab = bool(cfg.get("shamela"))
    part_uz = ", ".join(x for x in ("boblar" if has_bab else "", "sanad va roviylar" if ic else "") if x)
    part_en = ", ".join(x for x in ("chapters" if has_bab else "", "isnads and narrators" if ic else "") if x)
    part_ar = " و".join(x for x in ("الأبواب" if has_bab else "", "الأسانيد والرواة" if ic else "") if x)
    title = None if book == "bukhari" else {"uz": f"{t['uz']}: {part_uz} (mahalliy qatlam)", "en": f"{t['en']}: {part_en} (local layer)",
                                           "ar": f"{t['ar']}: {part_ar} (طبقة محلية)"}
    src_isnad = {"evidence": f" Sanad yo'llari va roviylar: AuthenticIlm task2 (page_isnads, narrators), Shamela {ic and ic.get('pages')} roviy havolalari.",
                 "number_text": f" Sanad yo'llari va roviylar: AuthenticIlm task2 (page_isnads {ic and ic.get('book_id')}, narrators); boshqa nashr — raqam va matn mosligi bilan.",
                 "sequence": f" Sanad yo'llari va roviylar: AuthenticIlm task2 (page_isnads {ic and ic.get('book_id')}, narrators); boshqa nashr — kitob tartibi va roviy ismlarining matnda topilishi bilan.",
                 "text": " Sanad: hadis matnidagi rivoyat so'zlari orasidagi ismlar (avtomatik); roviy roviylar bazasidagi ism shakllari va ustoz–shogird juftlari bilan aniqlangan, aniqlanmagani faqat yozilishi bo'yicha."}
    attribution = None if book == "bukhari" else (
        (f"Kitob/Bob sarlavhalari va bob kirishlari: Shamela kitobi {cfg['shamela_id']} (AuthenticIlm Shamela 4 nusxasi)." if has_bab else
         "Kitoblar: asos paketdagi bo'limlar.")
        + (src_isnad[ic["join"]] if ic else "")
        + " Hech qanday sarlavha, raqam yoki mansublik yaratilmagan.\n")
    data = pack_overlay(ov, meta, package_id=cfg["overlay_id"], title=title, attribution=attribution)
    path = out_dir / f"{cfg['overlay_id']}-{OVERLAY_VERSION}.hmz"
    path.write_bytes(data)
    (out_dir / ("overlay-stats.json" if book == "bukhari" else f"overlay-stats-{book}.json")).write_text(
        json.dumps(ov["stats"], ensure_ascii=False, indent=1) + "\n", "utf-8")
    return path


def pack_overlay(ov: dict, source_metadata: dict, *, package_id: str = OVERLAY_ID, version: str = OVERLAY_VERSION,
                 license_text: str | None = None, attribution: str | None = None, rights: list | None = None, title: dict | None = None) -> bytes:
    """Qatlam paketini (deterministik ZIP) baytlarda qaytaradi. PWA pkg.js `kind=overlay` qoidalari bilan mos."""
    jl = lambda rows: ("".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows)).encode("utf-8")  # noqa: E731
    files = {
        "data/overlay/structure.json": json.dumps({"kitabs": ov["kitabs"], "babs": ov["babs"], "unit_bab": ov["unit_bab"], "kitab_opening": ov["kitab_opening"]},
                                                  ensure_ascii=False, sort_keys=True).encode("utf-8"),
        "data/overlay/isnad.jsonl": jl(ov["isnad"]),
        "data/overlay/persons.jsonl": jl(ov["persons"]),
        "data/overlay/translations.jsonl": jl(ov["translations"]),
        "LICENSE": (license_text or ("Mahalliy foydalanish uchun. Manba: AuthenticIlm \"Shamela 4 — Full Islamic Library Corpus\" "
                    "(al-Maktaba al-Shamela), Terms of use: Research and personal use. Ommaviy qayta tarqatish tasdiqlanmagan.\n")).encode("utf-8"),
        "ATTRIBUTION": (attribution or ("Kitob/Bob sarlavhalari, bob kirishlari, sanad yo'llari va roviy ma'lumotlari: Shamela kitobi 1681 "
                        "(صحيح البخاري - ط السلطانية) va AuthenticIlm task2 (page_isnads, narrators). Roviy tarjimai holi va olimlar "
                        "so'zlari manba ko'chirmasi, mustaqil tekshirilmagan. O'zbekcha matn — tahririy qoralama, ilmiy tekshiruv kutilmoqda.\n")).encode("utf-8"),
        "COVERAGE.json": json.dumps(ov["stats"], ensure_ascii=False, sort_keys=True, indent=1).encode("utf-8"),
    }
    manifest = {
        "package_id": package_id, "kind": "overlay", "package_version": version, "schema_version": SCHEMA,
        "normalization_version": NORMALIZATION_VERSION, "channel": "local_only",
        "title": title or {"uz": "Buxoriy: boblar, sanad va roviylar (mahalliy qatlam)", "en": "Bukhari: chapters, isnads and narrators (local layer)",
                           "ar": "البخاري: الأبواب والأسانيد والرواة (طبقة محلية)"},
        "work_id": ov["base"]["work_id"], "edition_id": ov["base"]["edition_id"],
        "target": ov["base"],
        "source_metadata": source_metadata,
        "rights": rights or [{"holder": "AuthenticIlm / al-Maktaba al-Shamela", "terms": "Research and personal use",
                              "redistribution": False, "status": "local_only"}],
        "file_hashes": {n: sha(b) for n, b in files.items()},
    }
    files["package.json"] = json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=1).encode("utf-8")
    files["SHA256SUMS"] = "".join(f"{sha(b)}  {n}\n" for n, b in sorted(files.items())).encode("utf-8")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for n in sorted(files):
            zi = zipfile.ZipInfo(n, date_time=(2026, 10, 24, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, files[n])
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, required=True)
    ap.add_argument("--package", type=Path, help="bitta asos paket (.hmz) — --book bilan")
    ap.add_argument("--packages", type=Path, help="paketlar papkasi — --all bilan")
    ap.add_argument("--book", default="bukhari", choices=sorted(BOOKS))
    ap.add_argument("--all", action="store_true", help="BOOKS dagi barcha kitoblar (paketi topilganlari)")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--uz-draft", type=Path)
    ap.add_argument("--kitab-names", type=Path, help="Kitob nomlari tarjimasi (JSON: names{arabcha: o'zbekcha}) — repodan tashqarida")
    a = ap.parse_args()
    if a.out.resolve().is_relative_to(ROOT.parent.resolve()):
        sys.exit("--out repo ichida bo'lmasin: qatlam faqat mahalliy (QARORLAR.md #37/#38)")
    jobs = []
    if a.all:
        for key, cfg in BOOKS.items():
            found = sorted((a.packages or Path(".")).glob(cfg["package"] + "-*.hmz"))
            if found:
                jobs.append((key, found[-1]))
    else:
        if not a.package:
            sys.exit("--package yoki --all kerak")
        jobs.append((a.book, a.package))
    order = {"evidence": 0, "number_text": 1, "sequence": 2, "text": 3}
    jobs.sort(key=lambda j: order.get((BOOKS[j[0]].get("isnad") or {}).get("join"), 4))
    for key, pkg in jobs:
        names = json.loads(a.kitab_names.read_text("utf-8")) if a.kitab_names else None
        ov = build(a.raw, pkg, a.uz_draft if key == "bukhari" else None, book=key, kitab_names=names)
        p = write_overlay(ov, a.out, a.raw, key)
        st = ov["stats"]
        print(p.name, "babs", st["babs"], "units_with_bab", st["units_with_bab"], "/", st["units"],
              "isnad", {k: v for k, v in st["isnad"].items() if k.startswith(("status", "join"))})


if __name__ == "__main__":
    main()

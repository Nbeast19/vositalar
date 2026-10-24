"""Qidiruv tizimlari uchun oldindan yaratilgan ikki tilli statik sahifalar (26-bo'lim).

    hadis-manba build-site --catalog web/catalog.json --out web --base-url https://<user>.github.io/<repo>/hadis-manba-platformasi/web/

Natija: <out>/en/…, <out>/ar/…, <out>/sitemap.xml, <out>/robots.txt.
- har sahifa: o'z tilida title/description/H1, self-canonical, o'zaro hreflang en/ar + x-default (= /en/);
- oddiy <a href> havolalar, JavaScript talab qilinmaydi; manba matni (hadis/sharh) sahifaga qo'yilmaydi —
  faqat katalog metadata (nom, muallif, nashr, hajm, sanoq, holat, huquq);
- shaxsiy ma'lumot yo'q: faqat ommaviy katalog (allowlist) kiradi.
Rasmiy tayanch: developers.google.com/search/docs/specialty/international/localized-versions
"""
from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

LANGS = ("en", "ar")
T = {
    "en": {
        "site": "Hadith Library", "tagline": "Hadith collections and their commentaries — offline, with sources",
        "home_title": "Hadith Library | مكتبة الحديث — read hadith collections and commentaries offline",
        "home_desc": "Install hadith books and their commentaries one by one, read and search them without internet, "
                     "and copy citations with their source. Coverage and limitations are shown openly.",
        "home_h1": "Read the hadith collections, with their commentaries.",
        "home_intro": "Choose a book, install only the book or the book with the commentaries you need, then read, "
                      "search and copy a citation with its source. No account, no AI and no internet are needed after installation.",
        "open_app": "Open the app", "suffix": "Hadith Library", "browse": "Browse books", "start": "Start reading", "entries": "entries", "comm_count": "commentaries", "books": "Books", "commentaries": "Commentaries", "authors": "Authors",
        "help": "Help", "install": "Install on your device", "lang_other": "العربية",
        "books_title": "Books — Hadith Library", "books_desc": "Hadith collections available as separate offline packages, with editions, sizes, coverage and rights.",
        "book_desc": "{title}: separate offline package. Edition, size, records, status counts and the commentaries linked to it.",
        "comm_desc": "{title}: commentary package with the hadiths it is linked to, edition, status counts and licence.",
        "author_desc": "Works by {name} available in Hadith Library.",
        "main_text": "Main text", "edition": "Edition", "size": "Download size", "installed_size": "Size after installation",
        "records": "Records", "printed_numbers": "Distinct printed numbers", "statuses": "Status counts",
        "links_to": "Linked to", "occurrences": "Commentary passages", "links": "Links to hadiths",
        "rights": "Rights", "public": "Open to share", "conditional": "Conditional licence", "version": "Version",
        "install_in_app": "Install in the app", "download_file": "Download file (.hmz)", "attribution": "Attribution", "by": "by", "linked_comms": "Commentaries for this book",
        "none": "None in the public catalogue yet.", "fixture": "Sample package (synthetic test text, not a real source).",
        "not_records": "Records are entries of the source database, not a count of unique hadiths.",
        "coverage_note": "Scholarly coverage is incomplete. A match in search is not a verified identification.",
        "help_title": "Help — Hadith Library", "help_desc": "How to install a book, read offline, open its commentary and copy a citation.",
        "help_steps": ["Open the app and the Library.", "Choose a book.",
                       "Install the book only, or tick commentaries and install them together.",
                       "Search, or open the book's contents.",
                       "On a hadith, open an installed commentary; “Back to the hadith” returns.",
                       "Copy the citation with its source."],
        "help_status": "Status words: verified, limited, conflict, not found, not reviewed. “Limited” or “not reviewed” is not firm evidence.",
        "help_offline": "After installation books work without internet. Only installed packages are available offline. "
                        "Browsers can delete stored data — keep the package files and export your notes.",
        "help_ai": "AI connection is optional and only on a computer (MCP server). The app works fully without it.",
        "install_title": "Install Hadith Library on Windows, Mac, iPhone and Android",
        "install_desc": "Step-by-step: add the app to your device, install books and use them offline.",
        "platforms": [
            ("iphone", "iPhone / iPad", "Open the app in Safari (iOS 16.4 or newer) → Share → Add to Home Screen → Add. Open it from the Home Screen, then install books in the Library."),
            ("android", "Android", "Open the app in Chrome → ⋮ menu → Install app (or Add to Home screen). Then install books in the Library."),
            ("windows", "Windows", "Open the app in Chrome or Edge → click the install icon in the address bar. Then install books in the Library."),
            ("mac", "Mac", "Safari 17+: File → Add to Dock. Chrome/Edge: install icon in the address bar. Then install books in the Library."),
            ("linux", "Linux", "Chrome/Chromium → install icon in the address bar. Advanced users can also use the command-line tool.")],
        "tested_note": "These steps were tested in an automated Chromium browser only; they have not yet been tested on real iPhone, Android, Windows or Mac devices.",
    },
    "ar": {
        "site": "مكتبة الحديث", "tagline": "كتب الحديث وشروحها — بلا إنترنت، مع المصادر",
        "home_title": "مكتبة الحديث | Hadith Library — اقرأ كتب الحديث وشروحها بلا إنترنت",
        "home_desc": "ثبّت كتب الحديث وشروحها كتابًا كتابًا، واقرأ وابحث فيها بلا إنترنت، وانسخ الاقتباس مع مصدره. "
                     "التغطية والقيود معروضة بوضوح.",
        "home_h1": "اقرأ كتب الحديث مع شروحها.",
        "home_intro": "اختر كتابًا، وثبّت الكتاب وحده أو مع الشروح التي تحتاجها، ثم اقرأ وابحث وانسخ الاقتباس مع مصدره. "
                      "لا حاجة إلى حساب ولا ذكاء اصطناعي ولا إنترنت بعد التثبيت.",
        "open_app": "افتح التطبيق", "suffix": "مكتبة الحديث", "browse": "تصفّح الكتب", "start": "ابدأ القراءة", "entries": "سجلًا", "comm_count": "شروح", "books": "الكتب", "commentaries": "الشروح", "authors": "المؤلفون",
        "help": "المساعدة", "install": "التثبيت على جهازك", "lang_other": "English",
        "books_title": "الكتب — مكتبة الحديث", "books_desc": "مجاميع الحديث المتاحة حزمًا مستقلة للعمل بلا إنترنت، مع الطبعات والأحجام والتغطية والحقوق.",
        "book_desc": "{title}: حزمة مستقلة للعمل بلا إنترنت. الطبعة والحجم وعدد السجلات وإحصاءات الحالة والشروح المرتبطة به.",
        "comm_desc": "{title}: حزمة شرح مع الأحاديث المرتبطة بها والطبعة وإحصاءات الحالة والترخيص.",
        "author_desc": "مؤلفات {name} المتاحة في مكتبة الحديث.",
        "main_text": "النص الأصلي", "edition": "الطبعة", "size": "حجم التنزيل", "installed_size": "الحجم بعد التثبيت",
        "records": "السجلات", "printed_numbers": "الأرقام المطبوعة المختلفة", "statuses": "إحصاءات الحالة",
        "links_to": "مرتبط بـ", "occurrences": "مواضع الشرح", "links": "روابط بالأحاديث",
        "rights": "الحقوق", "public": "مسموح بمشاركته", "conditional": "ترخيص مشروط", "version": "الإصدار",
        "install_in_app": "التثبيت في التطبيق", "download_file": "تنزيل الملف (.hmz)", "attribution": "النسبة", "by": "تأليف", "linked_comms": "شروح هذا الكتاب",
        "none": "لا يوجد في الفهرس العام بعد.", "fixture": "حزمة تجريبية (نص اصطناعي للاختبار، ليس مصدرًا حقيقيًا).",
        "not_records": "السجلات مداخل في قاعدة بيانات المصدر، وليست عددًا للأحاديث الفريدة.",
        "coverage_note": "التغطية العلمية غير مكتملة. التطابق في البحث ليس تحقيقًا مؤكدًا لهوية الحديث.",
        "help_title": "المساعدة — مكتبة الحديث", "help_desc": "كيف تثبّت كتابًا، وتقرأ بلا إنترنت، وتفتح شرحه، وتنسخ الاقتباس.",
        "help_steps": ["افتح التطبيق ثم المكتبة.", "اختر كتابًا.", "ثبّت الكتاب وحده، أو اختر شروحًا وثبّتها معه.",
                       "ابحث أو افتح فهرس الكتاب.", "في صفحة الحديث افتح شرحًا مثبتًا؛ و«العودة إلى الحديث» ترجعك.",
                       "انسخ الاقتباس مع مصدره."],
        "help_status": "كلمات الحالة: متحقَّق، مقيَّد، متعارض، غير موجود، لم يُراجع. «مقيَّد» أو «لم يُراجع» ليس دليلًا قاطعًا.",
        "help_offline": "بعد التثبيت تعمل الكتب بلا إنترنت، ولا يتوفر بلا إنترنت إلا ما ثبّتّه. "
                        "قد يحذف المتصفح البيانات المخزنة — احتفظ بملفات الحزم وصدّر ملاحظاتك.",
        "help_ai": "الربط بالذكاء الاصطناعي اختياري وعلى الحاسوب فقط (خادم MCP). يعمل التطبيق كاملًا بدونه.",
        "install_title": "تثبيت مكتبة الحديث على ويندوز وماك وآيفون وأندرويد",
        "install_desc": "خطوة بخطوة: أضف التطبيق إلى جهازك، وثبّت الكتب، واستعملها بلا إنترنت.",
        "platforms": [
            ("iphone", "آيفون / آيباد", "افتح التطبيق في سفاري (iOS 16.4 أو أحدث) ← مشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة. افتحه من الشاشة الرئيسية ثم ثبّت الكتب من المكتبة."),
            ("android", "أندرويد", "افتح التطبيق في كروم ← القائمة ⋮ ← تثبيت التطبيق (أو الإضافة إلى الشاشة الرئيسية). ثم ثبّت الكتب من المكتبة."),
            ("windows", "ويندوز", "افتح التطبيق في كروم أو إيدج ← اضغط أيقونة التثبيت في شريط العنوان. ثم ثبّت الكتب من المكتبة."),
            ("mac", "ماك", "سفاري 17 أو أحدث: ملف ← إضافة إلى Dock. كروم/إيدج: أيقونة التثبيت في شريط العنوان. ثم ثبّت الكتب من المكتبة."),
            ("linux", "لينكس", "كروم/كروميوم ← أيقونة التثبيت في شريط العنوان. ويمكن للمستخدم المتقدم استعمال أداة سطر الأوامر.")],
        "tested_note": "اختُبرت هذه الخطوات في متصفح كروميوم آلي فقط، ولم تُختبر بعد على أجهزة آيفون وأندرويد وويندوز وماك حقيقية.",
    },
}
STATUS = {"en": {"verified": "verified", "limited": "limited", "conflict": "conflict", "not_found": "not found",
                 "unreviewed": "not reviewed", "not_applicable": "not applicable"},
          "ar": {"verified": "متحقَّق", "limited": "مقيَّد", "conflict": "متعارض", "not_found": "غير موجود",
                 "unreviewed": "لم يُراجع", "not_applicable": "لا ينطبق"}}
SEP = {"en": ", ", "ar": "، "}
SKEY = {"en": {"number_status": "number", "narrator_identity_status": "narrator", "text_preservation_status": "text"},
        "ar": {"number_status": "الرقم", "narrator_identity_status": "الراوي", "text_preservation_status": "النص"}}


def _e(s) -> str:
    return html.escape("" if s is None else str(s), quote=True)


def _slug(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-").lower()


def _fmt_bytes(n) -> str:
    if not n:
        return "—"
    for unit, k in (("GB", 1 << 30), ("MB", 1 << 20), ("KB", 1 << 10)):
        if n >= k:
            return f"{n / k:.1f} {unit}"
    return f"{n} B"


def _bdi(s) -> str:
    return f"<bdi>{_e(s)}</bdi>"


def _arb(s) -> str:
    return f'<bdi lang="ar" dir="rtl">{_e(s)}</bdi>' if s else ""


class Site:
    def __init__(self, catalog: dict, base_url: str, out: Path):
        self.base = base_url.rstrip("/") + "/"
        self.out = Path(out)
        self.pkgs = catalog.get("packages", [])
        self.pages: list[str] = []  # nisbiy yo'l, til siz: "", "books/", ...
        self.works: dict[str, dict] = {}
        for p in self.pkgs:
            key = p["work_id"]
            w = self.works.setdefault(key, {"work_id": key, "kind": p["kind"], "pkgs": [], "comms": []})
            w["pkgs"].append(p)
        for p in self.pkgs:
            if p["kind"] == "commentary":
                for r in p.get("requires_for_linked_reading", []):
                    tw = self.works.setdefault(r["target_work_id"], {"work_id": r["target_work_id"], "kind": "base_book",
                                                                     "pkgs": [], "comms": []})
                    if p["work_id"] not in tw["comms"]:
                        tw["comms"].append(p["work_id"])
        self.authors: dict[str, dict] = {}
        for p in self.pkgs:
            for a in p.get("authors", []):
                au = self.authors.setdefault(a["person_id"], {**a, "works": []})
                if p["work_id"] not in au["works"]:
                    au["works"].append(p["work_id"])

    # ---------------------------------------------------------------- yordamchi
    def url(self, lang: str, rel: str) -> str:
        return f"{self.base}{lang}/{rel}"

    def title_of(self, work_id: str, lang: str) -> tuple[str, str]:
        w = self.works.get(work_id, {})
        p = (w.get("pkgs") or [{}])[0]
        t = p.get("title") or {}
        return t.get("ar") or "", t.get("en") or t.get("uz") or work_id

    def page(self, lang: str, rel: str, title: str, desc: str, h1: str, body: str, hero: str = ""):
        s = T[lang]
        depth = rel.count("/")
        up = "../" * (depth + 1)            # web/ ildiziga
        here = "../" * depth                # /<lang>/ ga
        other = "ar" if lang == "en" else "en"
        alt = "".join(f'<link rel="alternate" hreflang="{l}" href="{_e(self.url(l, rel))}">' for l in LANGS)
        alt += f'<link rel="alternate" hreflang="x-default" href="{_e(self.url("en", rel))}">'
        cur = rel.split("/")[0]
        def nav_a(href, label, sec):
            mark = ' aria-current="page"' if sec == cur else ""
            return f'<a href="{href}"{mark}>{_e(label)}</a>'
        brand_sub = "Hadith Library" if lang == "ar" else "مكتبة الحديث"
        header = (f'<header class="appbar"><div class="appbar-in">'
                  f'<a class="brand" href="{here}"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 1 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg></span>'
                  f'<span class="brand-text"><b>{_e(s["site"])}</b><small lang="{"en" if lang == "ar" else "ar"}" dir="{"ltr" if lang == "ar" else "rtl"}">{_e(brand_sub)}</small></span></a>'
                  f'<nav class="topnav" aria-label="{_e(s["site"])}">{nav_a(here + "books/", s["books"], "books")}{nav_a(here + "authors/", s["authors"], "authors")}'
                  f'{nav_a(here + "help/", s["help"], "help")}{nav_a(here + "install/", s["install"], "install")}</nav>'
                  f'<div class="appbar-tools"><a class="btn sm ghost" href="{up}{other}/{rel}" hreflang="{other}" lang="{other}">{_e(s["lang_other"])}</a>'
                  f'<a class="btn sm primary" href="{up}index.html">{_e(s["open_app"])}</a></div></div></header>')
        doc = f"""<!doctype html>
<html lang="{lang}" dir="{'rtl' if lang == 'ar' else 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(title)}</title>
<meta name="description" content="{_e(desc)}">
<link rel="canonical" href="{_e(self.url(lang, rel))}">
{alt}
<meta property="og:title" content="{_e(title)}">
<meta property="og:description" content="{_e(desc)}">
<meta property="og:url" content="{_e(self.url(lang, rel))}">
<meta property="og:site_name" content="Hadith Library | مكتبة الحديث">
<meta property="og:locale" content="{'ar_AR' if lang == 'ar' else 'en_US'}">
<meta property="og:type" content="website">
<meta property="og:image" content="{_e(self.base)}og-banner.png">
<meta property="og:image:width" content="1600">
<meta property="og:image:height" content="840">
<meta property="og:image:alt" content="Hadith Library | مكتبة الحديث — hadith collections with commentaries, chapters and narrator chains">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="{up}style.css">
<link rel="icon" href="{up}ikonkalar/ikonka-192.png">
</head>
<body class="site">
{header}
<main id="asosiy">
{hero or f'<h1>{h1}</h1>'}
{body}
</main>
<footer class="foot"><p>{_e(s['tagline'])}</p><p>{_e(s['coverage_note'])}</p></footer>
</body>
</html>
"""
        path = self.out / lang / rel / "index.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(doc, "utf-8")
        if lang == LANGS[0]:
            self.pages.append(rel)

    def rights_label(self, p: dict, lang: str) -> str:
        return T[lang]["conditional"] if p.get("channel") == "conditional" else T[lang]["public"]

    def rights_cell(self, p: dict, lang: str) -> str:
        # Litsenziya ID (CC0-1.0, CC-BY-NC-SA-4.0 ...) bo'lsa ko'rsatiladi; xom holat kaliti UIga chiqmaydi.
        lic = sorted({r["license_id"] for r in p.get("rights", []) if r.get("license_id")})
        return _e(self.rights_label(p, lang)) + ("".join(f" — {_bdi(x)}" for x in lic) if lic else "")

    def pkg_block(self, p: dict, lang: str, up: str) -> str:
        s = T[lang]
        cov = p.get("coverage") or {}
        rows = [(s["version"], _bdi(p.get("package_version"))), (s["edition"], _bdi(p.get("edition_id"))),
                (s["size"], _bdi(_fmt_bytes(p.get("compressed_bytes")))),
                (s["installed_size"], _bdi("~" + _fmt_bytes(p.get("installed_bytes")))),
                (s["rights"], self.rights_cell(p, lang))]
        attr = [r["required_attribution"] for r in p.get("rights", []) if r.get("applies_to") == "classical_body" and r.get("required_attribution")]
        if attr:
            rows.append((s["attribution"], _bdi(attr[0])))
        if p["kind"] == "base_book":
            rows.insert(2, (s["records"], _bdi(cov.get("source_records"))))
            rows.insert(3, (s["printed_numbers"], _bdi(cov.get("distinct_printed_numbers"))))
            sc = cov.get("status_counts") or {}
            parts = []
            for k in ("number_status", "narrator_identity_status", "text_preservation_status"):
                if k in sc:
                    parts.append(_e(SKEY[lang][k]) + ": " + SEP[lang].join(f"{_e(STATUS[lang].get(v, v))} {_bdi(n)}" for v, n in sorted(sc[k].items())))
            if parts:
                rows.append((s["statuses"], "<br>".join(parts)))
        else:
            rows.insert(2, (s["occurrences"], _bdi(cov.get("occurrences"))))
            rows.insert(3, (s["links"], _bdi(cov.get("links"))))
            ls = cov.get("link_status_counts") or {}
            if ls:
                rows.append((s["statuses"], SEP[lang].join(f"{_e(STATUS[lang].get(v, v))} {_bdi(n)}" for v, n in sorted(ls.items()))))
        dl = "".join(f"<dt>{_e(a)}</dt><dd>{b}</dd>" for a, b in rows)
        note = f'<p class="note warn">{_e(s["fixture"])}</p>' if p.get("is_test_fixture") else ""
        target = p["work_id"] if p["kind"] == "base_book" else (p.get("requires_for_linked_reading") or [{}])[0].get("target_work_id", p["work_id"])
        return (f'<section class="card">{note}<dl class="meta">{dl}</dl>'
                f'<p class="btns section"><a class="btn primary" href="{up}index.html#/w/{_e(target)}">{_e(s["install_in_app"])}</a>'
                + (f' <a class="btn ghost" href="{_e(p["download_url"])}" rel="noopener">{_e(s["download_file"])}</a>' if p.get("download_url") else "")
                + '</p></section>')

    # ---------------------------------------------------------------- sahifalar
    def build(self):
        for lang in LANGS:
            s = T[lang]
            bases = [w for w in self.works.values() if w["kind"] == "base_book" and w["pkgs"]]
            comms = [w for w in self.works.values() if w["kind"] == "commentary" and w["pkgs"]]
            items = "".join(self.card(w, lang, "books/") for w in sorted(bases, key=lambda w: w["work_id"])) or f"<p>{_e(s['none'])}</p>"
            hero = (f'<section class="hero-main"><div class="hero-ar" lang="ar" dir="rtl">مكتبة الحديث</div>'
                    f'<h1>{_e(s["home_h1"])}</h1><p class="lead">{_e(s["home_intro"])}</p>'
                    f'<p class="btns"><a class="btn primary lg" href="../index.html">{_e(s["open_app"])}</a>'
                    f'<a class="btn ghost lg" href="books/">{_e(s["browse"])}</a></p></section>')
            self.page(lang, "", s["home_title"], s["home_desc"], _e(s["home_h1"]),
                      f'<section class="section"><div class="section-head"><h2>{_e(s["books"])}</h2><a href="books/">{_e(s["browse"])}</a></div>'
                      f'<div class="grid">{items}</div></section>', hero=hero)
            listing = "".join(self.card(w, lang, "") for w in sorted(bases, key=lambda w: w["work_id"])) or f"<p>{_e(s['none'])}</p>"
            clist = "".join(self.card(w, lang, "../commentaries/") for w in sorted(comms, key=lambda w: w["work_id"]))
            self.page(lang, "books/", s["books_title"], s["books_desc"], _e(s["books"]),
                      f'<p class="muted">{_e(s["books_desc"])}</p><p class="small faint">{_e(s["not_records"])}</p><div class="grid">{listing}</div>'
                      f'<section class="section"><h2>{_e(s["commentaries"])}</h2><div class="grid">{clist or _e(s["none"])}</div></section>')
            for w in bases:
                self.book_page(w, lang)
            for w in comms:
                self.comm_page(w, lang)
            self.authors_pages(lang)
            self.help_pages(lang)

    def card(self, w: dict, lang: str, prefix: str) -> str:
        s = T[lang]
        ar_t, other = self.title_of(w["work_id"], lang)
        p = w["pkgs"][0]
        au = (p.get("authors") or [{}])[0]
        who = " · ".join(x for x in (_arb(au.get("name_ar")), _e(au.get("name_en") or "")) if x)
        pills = ""
        if p["kind"] == "base_book" and (p.get("coverage") or {}).get("source_records"):
            pills += f'<span class="pill">{_bdi(p["coverage"]["source_records"])} {_e(s["entries"])}</span>'
        if w.get("comms"):
            pills += f'<span class="pill accent">{_bdi(len(w["comms"]))} {_e(s["comm_count"])}</span>'
        if p.get("compressed_bytes"):
            pills += f'<span class="pill">{_bdi(_fmt_bytes(p["compressed_bytes"]))}</span>'
        return (f'<a class="book" href="{prefix}{_e(_slug(w["work_id"]))}/"><span class="spine" aria-hidden="true"></span>'
                f'{f"<div class=ttl-ar lang=ar dir=rtl>{_e(ar_t)}</div>" if ar_t else ""}'
                f'<div class="ttl-en">{_e(other)}</div>{f"<div class=auth>{who}</div>" if who else ""}'
                f'<div class="row">{pills}</div></a>')

    def hero_block(self, ar_t: str, other: str, authors: str, s: dict, cta: str) -> str:
        return (f'<section class="book-hero"><div class="cover" aria-hidden="true"><div class="c-ar" lang="ar" dir="rtl">{_e(ar_t)}</div>'
                f'<div class="c-orn"></div><div class="c-en">{_e(other)}</div></div><div>'
                + (f'<h1 class="ttl-ar" lang="ar" dir="rtl">{_e(ar_t)}</h1><div class="ttl-en">{_e(other)}</div>' if ar_t else f'<h1>{_e(other)}</h1>')
                + (f'<div class="auth">{_e(s["by"])} {authors}</div>' if authors else "") + f'<p class="btns">{cta}</p></div></section>')

    def book_page(self, w: dict, lang: str):
        s = T[lang]
        rel = f"books/{_slug(w['work_id'])}/"
        ar_t, other = self.title_of(w["work_id"], lang)
        name = f"{ar_t} — {other}" if ar_t and other else (ar_t or other)
        au = (w["pkgs"][0].get("authors") or [])
        authors = " · ".join(f'<a href="../../authors/{_e(_slug(a["person_id"]))}/">{_arb(a.get("name_ar")) or _e(a.get("name_en"))}</a>' for a in au)
        blocks = "".join(self.pkg_block(p, lang, "../../../") for p in w["pkgs"])
        cl = "".join(self.card(self.works[c], lang, "../../commentaries/") for c in w["comms"] if self.works.get(c, {}).get("pkgs"))
        cta = f'<a class="btn primary lg" href="../../../index.html#/w/{_e(w["work_id"])}">{_e(s["install_in_app"])}</a>'
        self.page(lang, rel, f"{name} — {s['suffix']}", s["book_desc"].replace("{title}", name), "",
                  f'<section class="section"><h2>{_e(s["main_text"])}</h2>{blocks}<p class="small faint">{_e(s["not_records"])}</p></section>'
                  f'<section class="section"><h2>{_e(s["linked_comms"])}</h2><div class="grid">{cl or _e(s["none"])}</div></section>',
                  hero=self.hero_block(ar_t, other, authors, s, cta))

    def comm_page(self, w: dict, lang: str):
        s = T[lang]
        rel = f"commentaries/{_slug(w['work_id'])}/"
        ar_t, other = self.title_of(w["work_id"], lang)
        name = f"{ar_t} — {other}" if ar_t else other
        p = w["pkgs"][0]
        au = p.get("authors") or []
        authors = " · ".join(f'<a href="../../authors/{_e(_slug(a["person_id"]))}/">{_arb(a.get("name_ar")) or _e(a.get("name_en"))}</a>' for a in au)
        targets = []
        for r in p.get("requires_for_linked_reading", []):
            tw = r["target_work_id"]
            ta, to = self.title_of(tw, lang)
            if self.works.get(tw, {}).get("pkgs"):
                targets.append(f'<a href="../../books/{_e(_slug(tw))}/">{_arb(ta) or _e(to)}</a> ({_bdi(r["target_edition_id"])})')
            else:
                targets.append(f'{_bdi(tw)} ({_bdi(r["target_edition_id"])})')
        tw0 = (p.get("requires_for_linked_reading") or [{}])[0].get("target_work_id", w["work_id"])
        cta = f'<a class="btn primary lg" href="../../../index.html#/w/{_e(tw0)}?tab=comms">{_e(s["install_in_app"])}</a>'
        self.page(lang, rel, f"{name} — {s['suffix']}", s["comm_desc"].replace("{title}", name), "",
                  f'<p class="section">{_e(s["links_to"])}: {" · ".join(targets) or "—"}</p>' +
                  "".join(self.pkg_block(x, lang, "../../../") for x in w["pkgs"]),
                  hero=self.hero_block(ar_t, other, authors, s, cta))

    def authors_pages(self, lang: str):
        s = T[lang]
        items = []
        for pid, a in sorted(self.authors.items()):
            nm = a.get("name_ar") or a.get("name_en") or pid
            items.append(f'<li class="card"><a href="{_e(_slug(pid))}/">{_arb(a.get("name_ar")) or _e(a.get("name_en"))}</a>'
                         f'{" · " + _e(a["name_en"]) if a.get("name_en") and a.get("name_ar") else ""}</li>')
            works = []
            for wid in a["works"]:
                w = self.works.get(wid, {})
                ar_t, other = self.title_of(wid, lang)
                sec = "books" if w.get("kind") == "base_book" else "commentaries"
                works.append(f'<li class="card"><a href="../../{sec}/{_e(_slug(wid))}/">{_arb(ar_t) or _e(other)}</a> — {_e(other)}</li>')
            label = f"{a.get('name_ar') or ''} {a.get('name_en') or ''}".strip() or nm
            h1 = (f'<span lang="ar" dir="rtl">{_e(a["name_ar"])}</span>' if a.get("name_ar") else _e(nm)) + \
                 (f'<br><span class="muted">{_e(a["name_en"])}</span>' if a.get("name_en") and a.get("name_ar") else "")
            self.page(lang, f"authors/{_slug(pid)}/", f"{label} — {s['suffix']}", s["author_desc"].replace("{name}", label),
                      h1, f'<ul class="help-grid" role="list">{"".join(works)}</ul>')
        self.page(lang, "authors/", f"{s['authors']} — {s['suffix']}", s["books_desc"], _e(s["authors"]),
                  f'<ul class="help-grid" role="list">{"".join(items) or _e(s["none"])}</ul>')

    def help_pages(self, lang: str):
        s = T[lang]
        steps = "".join(f"<li>{_e(x)}</li>" for x in s["help_steps"])
        self.page(lang, "help/", s["help_title"], s["help_desc"], _e(s["help"]),
                  f'<section class="card"><ol>{steps}</ol></section><div class="help-grid section"><p class="card">{_e(s["help_offline"])}</p>'
                  f'<p class="card">{_e(s["help_status"])}</p><p class="card">{_e(s["help_ai"])}</p></div>')
        plats = "".join(f'<section class="card" id="{k}"><h2>{_e(n)}</h2><p class="muted">{_e(txt)}</p></section>' for k, n, txt in s["platforms"])
        self.page(lang, "install/", s["install_title"], s["install_desc"], _e(s["install"]),
                  f'<div class="help-grid">{plats}</div><p class="note warn section">{_e(s["tested_note"])}</p>')

    def sitemap(self):
        out = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
        for rel in self.pages:
            for lang in LANGS:
                out.append(f"  <url><loc>{_e(self.url(lang, rel))}</loc>")
                for l in LANGS:
                    out.append(f'    <xhtml:link rel="alternate" hreflang="{l}" href="{_e(self.url(l, rel))}"/>')
                out.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{_e(self.url("en", rel))}"/>')
                out.append("  </url>")
        out.append("</urlset>")
        (self.out / "sitemap.xml").write_text("\n".join(out) + "\n", "utf-8")
        (self.out / "robots.txt").write_text(
            "# Eslatma: crawlerlar faqat host ildizidagi /robots.txt ni o'qiydi. GitHub Pages project sahifasida\n"
            "# bu fayl ma'lumot uchun; sitemap'ni Search Console orqali yuboring.\n"
            f"User-agent: *\nAllow: /\nSitemap: {self.base}sitemap.xml\n", "utf-8")


def build_site(catalog_paths: list[Path], out: Path, base_url: str) -> dict:
    cat = {"packages": []}
    for p in catalog_paths:
        if Path(p).exists():
            cat["packages"] += json.loads(Path(p).read_text("utf-8")).get("packages", [])
    out = Path(out)
    for lang in LANGS:
        shutil.rmtree(out / lang, ignore_errors=True)
    s = Site(cat, base_url, out)
    s.build()
    s.sitemap()
    return {"pages_per_language": len(s.pages), "languages": list(LANGS), "base_url": s.base}

"""Sanad ismlarini hadis matnida topish va sanadni matndan ajratish (mahalliy qatlam uchun yordamchi).

Asl matn o'zgarmaydi: hamma solishtirish qidiruv nusxasida (`normalize`) so'zma-so'z bajariladi, natija — asl matndagi
[boshi, oxiri) oralig'i. Tinish belgilari, sahifa belgilari (⦗٦١⦘), «و» bog'lovchisi va «ابن/بن» farqi solishtirishga ta'sir
qilmaydi.

1. `align_names` — manbadagi ismlar ro'yxatini (tartibi bilan) matnda topadi: avval to'liq ism, topilmasa qo'shni
   topilgan ismlar orasidagi oraliqda ismning boshi (ism yoki kunya) bilan.
2. `fill_route_gaps` — sanad yo'lidagi (page_isnads) matnda belgilanmagan roviyni qo'shni roviylar orasidagi oraliqda
   uning ma'lum ism shakllari bilan qidiradi.
3. `segments_in` / `seg_clean` — matndagi rivoyat so'zlari (حدثنا، أخبرنا، عن …) orasidagi ism bo'laklari (sanad tuzilishi
   `build_overlay.structure_record` da). Shaxs `Resolver` bilan roviylar bazasidagi ism shakllari va ustoz–shogird juftlari
   orqali aniqlanadi; aniqlanmasa ism faqat yozilishi bo'yicha qoladi (shaxs deb ko'rsatilmaydi).
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from hadis_manba.arabic import normalize, normalize_with_map

TOK_RE = re.compile(r"[^\s،,:؛.()\[\]«»\"'“”⦗⦘\-–—!?؟*/{}]+")
PAGE_MARK = re.compile(r"⦗[^⦘]*⦘|[\r\n]+")
_MARKS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
# bitta so'z bilan ism deb qabul qilinmaydigan umumiy so'zlar
GENERIC = {"ابن", "بن", "ابو", "ابي", "ابا", "ام", "بنت", "عبد", "عن", "الله", "مولي", "رجل", "امراه", "شيخ", "بعض", "غير",
           "واحد", "احد", "اخيه", "ابيه", "جده", "امه", "عمه", "خاله", "اخبره", "النبي", "رسول"}
NAME_EQ = {"ابن": "بن"}


def _canon(t: str) -> str:
    return NAME_EQ.get(t, t)


def tokens(text: str) -> list[tuple[str, int, int]]:
    """(qidiruv so'zi, asl boshi, asl oxiri) — oxiri so'zdan keyingi harakatlarni ham qamraydi."""
    norm, nmap = normalize_with_map(text)
    out = []
    for m in TOK_RE.finditer(norm):
        s, e = nmap[m.start()], nmap[m.end() - 1] + 1
        while e < len(text) and _MARKS.match(text[e]):
            e += 1
        out.append((m.group(), s, e))
    return out


def name_tokens(name: str) -> list[str]:
    return TOK_RE.findall(normalize(PAGE_MARK.sub(" ", name or "")))


def _eq(t: str, n: str) -> bool:
    t, n = _canon(t), _canon(n)
    return t == n or (t.startswith("و") and len(t) > 2 and t[1:] == n) or (n.startswith("و") and len(n) > 2 and n[1:] == t)


def _near(a: str, b: str) -> bool:
    """Bitta harf farqi (masalan حمزة/جمرة — nashrlardagi nuqta farqi), uzun so'zlarda."""
    if min(len(a), len(b)) < 4 or abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        return sum(x != y for x, y in zip(a, b)) <= 1
    if len(a) > len(b):
        a, b = b, a
    return any(b[:i] + b[i + 1:] == a for i in range(len(b)))


# oldingi so'z shu bo'lsa — bu yer boshqa ismning ichi («هشام بن عروة» dagi «عروة», «مولى أبي هريرة» dagi «أبي هريرة»,
# «بشر بن عمر» dagi «بن عمر»): alohida roviy ismi bu yerdan boshlanmaydi. «حدثني أبي أيمن» — «otam Ayman» (istisno).
BOUND_PREV = {"بن", "ابن", "بنت", "مولي", "ابو", "ابا", "ام", "ابي", "اخي"}
FIRST_PERSON = {"حدثني", "وحدثني", "اخبرني", "واخبرني", "سمعت", "وسمعت", "انباني", "حدثتني", "اخبرتني"}


def _inside_name(toks, i: int) -> bool:
    j = i - 1
    while j >= 0 and toks[j][0].isdigit():          # sahifa raqami (⦗٢٣⦘) hisobga olinmaydi
        j -= 1
    if j < 0:
        return False
    p = toks[j][0]
    if p[:1] == "و" and p[1:] in BOUND_PREV:
        p = p[1:]
    if toks[i][0] == "بن":                          # «بن» (alifsiz) ism boshida kelmaydi — oldingi ismning nasabi
        return p not in FORMULA
    if p in ("ابي", "اخي"):                         # «حدثني/حدثنا أبي فلان» — otam / akam («عن أبي فلان» — kunya)
        q = toks[j - 1][0] if j > 0 else ""
        return not (q in FIRST_PERSON or (q in FORMULA and q not in ("عن", "وعن")))
    return p in BOUND_PREV


def _match_at(toks, i: int, nt: list[str], fuzzy: bool = False) -> int:
    """i-so'zdan boshlab ismning nechta boshlang'ich so'zi mos keladi (fuzzy: bitta so'zda bitta harf farqi mumkin)."""
    if nt and _inside_name(toks, i) and not (toks[i][0][:1] == "و" and _canon(toks[i][0][1:]) == _canon(nt[0])):
        return 0                                    # («أبي وعمي» — «و» bog'lovchi: yangi ism)
    k, used = 0, False
    while k < len(nt) and i + k < len(toks):
        t = toks[i + k][0]
        if t in STOP:
            break
        if _eq(t, nt[k]) or (k == 0 and t[:1] == "ل" and len(t) > 3 and _eq(t[1:], nt[0]) and i > 0
                             and toks[i - 1][0] in SPEAK):   # «قلت لعبد الله …» (lekin «واللفظ لابن خشرم» — izoh)
            k += 1
        elif fuzzy and not used and k > 0 and _near(_canon(t), _canon(nt[k])):
            k, used = k + 1, True
        else:
            break
    return k


def _prefix_ok(nt: list[str], k: int) -> bool:
    """Ismning boshidan k so'z mos kelgani yetarlimi (yolg'iz umumiy so'z yoki kunya yarmi emas)."""
    if k == len(nt):
        return True
    if k <= 0:
        return False
    if nt[0][:1] == "و" and nt[0][1:] in GENERIC | {"ابن"}:      # «وعبد الرحمن …» (havola matnidagi «و») — «عبد»
        nt = [nt[0][1:]] + list(nt[1:])
    if k == 1:
        return len(nt[0]) >= 3 and nt[0] not in GENERIC
    if nt[k - 1] in ("بن", "ابن", "بنت", "ابو", "ابي", "ابا", "ام", "عبد"):   # "أبو" yoki "ابن" bilan tugagan yarim ism emas
        return False
    return any(w not in GENERIC for w in nt[:k])          # «عبد الله» kabi faqat umumiy so'zlardan iborat yarim ism emas


def find_name(toks, nt: list[str], lo: int, hi: int, partial: bool) -> tuple[int, int] | None:
    """[lo, hi) oraliqda ism: avval to'liq, keyin (partial bo'lsa) eng uzun boshlang'ich qism. (boshi, so'zlar soni)."""
    if not nt:
        return None
    best = None
    for i in range(lo, min(hi, len(toks))):
        k = _match_at(toks, i, nt)
        if k == len(nt):
            return i, k
        if partial:
            kf = _match_at(toks, i, nt, fuzzy=True)
            if kf > k and kf >= 2 and kf == len(nt):
                k = kf
            if _prefix_ok(nt, k) and (best is None or k > best[1]):
                best = (i, k)
    return best


def align_names(text: str, names: list[str], toks=None) -> list[tuple[int, int] | None]:
    """Ismlar tartibda: 1-o'tish — to'liq ism (oldingisidan keyin); 2-o'tish — topilmaganlar qo'shnilar orasida qisman."""
    toks = toks if toks is not None else tokens(text)
    nts = [name_tokens(n) for n in names]
    at: list[tuple[int, int] | None] = [None] * len(names)
    cur = 0
    for j, nt in enumerate(nts):
        hit = find_name(toks, nt, cur, len(toks), partial=False)
        if hit:
            at[j] = hit
            cur = hit[0] + hit[1]
    for j, nt in enumerate(nts):
        if at[j]:
            continue
        lo = next((at[x][0] + at[x][1] for x in range(j - 1, -1, -1) if at[x]), 0)
        hi = next((at[x][0] for x in range(j + 1, len(at)) if at[x]), min(len(toks), lo + 30))
        hit = find_name(toks, nt, lo, hi, partial=True)
        if hit:
            at[j] = hit
    return [(toks[a[0]][1], toks[a[0] + a[1] - 1][2]) if a else None for a in at]


def span_tok(toks, span) -> tuple[int, int] | None:
    """Asl oraliq -> (birinchi so'z indeksi, keyingi so'z indeksi)."""
    if not span:
        return None
    a = next((i for i, t in enumerate(toks) if t[1] >= span[0]), None)
    b = next((i for i, t in enumerate(toks) if t[2] >= span[1]), None)
    return (a, b + 1) if a is not None and b is not None else None


PROPHET = {"النبي", "رسول", "نبي"}
PROPHET_RE = re.compile(r"^[وفلبك]{0,2}(?:ال|ل)?(?:نبي|رسول)$")
# sanadda ism bo'la olmaydigan ko'p uchraydigan so'zlar (fe'llar, yuklamalar) — ism lug'atiga kirmaydi
NON_NAME_WORDS = set("""نهي نهى لي لما راي راى له لها لهم لنا لكم رجلا رجلان امراه قام ما لا لم لن لعن امر انما اشرف ذلك هذا
هذه توفي جعل هكذا لقد وقد قد سال اهل تزوج نعم اما مر كنا كنت دخلت دخل قدم حين ضحي ضحى طلق اتي اتى جاء جاءت خرج خرجنا صلي صلى
كان كانت يكون فقال فقالت قالت اذا اذ ان انه انها من في الي الى عند مع بين ثم حتى حتي او بل كل بعض شيء يوم يوما ليله
اخذ اعطي بعث ارسل كتب سمع راينا رايت قلت قلنا قال يقول فلما فاذا وانا انا نحن هو هي هم انت لقي لقيت شهد شهدت غزا غزونا
رجال ورجال نفر ناس قوم غير ليس غيره وغيره وغيرهما غيرهم اصحابه اصحابنا""".split())
# Nabiy ﷺ zikridan keyin yangi sanad boshlovchi so'zlar: «ح» — yangi yo'l; «وعن» — oldingi yo'lga qo'shiladigan davom
CHAIN_NEW = {"ح", "وحدثنا", "وحدثني", "واخبرنا", "واخبرني", "وحدثناه", "وحدثنيه", "واخبرناه", "وانبانا", "حدثنا", "اخبرنا", "حدثني"}
CHAIN_CONT = {"وعن", "عن"}
# sanad ichida yangi yo'l boshlovchi (tahvil «ح» siz ham): «… أخبرنا عبد الله وحدثنا بشر …»
NEW_CHAIN_IN_ISNAD = {"ح", "وحدثنا", "وحدثني", "واخبرنا", "واخبرني", "وانبانا", "وحدثناه", "وحدثنيه", "واخبرناه"}
SALAWAT = {"صلي", "الله", "عليه", "وسلم", "ﷺ", "تعالي", "عز", "وجل", "قال", "وقال", "بهذا", "بمثله", "نحوه", "مثله", "بنحوه",
           "بمعناه", "بذلك", "الحديث", "الاسناد", "بهذا"}


def _is_prophet(w: str) -> bool:
    return w in PROPHET or bool(PROPHET_RE.match(w))


def isnad_end(toks, start: int = 0) -> int:
    """Sanad oxiri taxmini: Nabiy ﷺ zikri (birinchisi, «لرسول/للنبي/بالنبي» shakllari bilan)."""
    for i in range(start, len(toks)):
        if _is_prophet(toks[i][0]):
            return i
    return len(toks)


def fill_route_gaps(text: str, toks, nodes: list[dict], spans: dict, aliases, taken=()) -> dict:
    """nodes: [{"pos", "person"}], spans: person-pozitsiya -> asl oraliq (topilganlari). Topilmagan tugun uchun qo'shni
    topilgan tugunlar orasidagi so'zlarda shu shaxsning ism shakllari qidiriladi. Qaytaradi: {node_index: span}."""
    found = {}
    tk = {i: span_tok(toks, spans.get(i)) for i in range(len(nodes))}
    end = isnad_end(toks)
    for i, n in enumerate(nodes):
        if tk.get(i):
            continue
        lo = next((tk[x][1] for x in range(i - 1, -1, -1) if tk.get(x)), 0)
        hi = next((tk[x][0] for x in range(i + 1, len(nodes)) if tk.get(x)), min(end + 1, lo + 30) if end + 1 > lo else lo + 30)
        tail = not any(tk.get(x) for x in range(i + 1, len(nodes)))
        if tail:
            hi = max(hi, lo + 40)
        hi = min(hi, len(toks))
        if hi <= lo:
            continue
        best = None
        busy = {j for j in range(lo, hi) if any(a <= toks[j][1] < b for a, b in taken)}   # boshqa roviy ismi ichida emas
        for al in aliases(n["person"]):
            if all(_canon(w) in GENERIC for w in al):
                continue                              # faqat umumiy so'z («عبد») — ism emas
            hit = find_name(toks, al, lo, hi, partial=True)
            if hit and any(j in busy for j in range(hit[0], hit[0] + hit[1])):
                hit = None
            if hit and tail and toks[hit[0]][1] >= (toks[end][1] if end < len(toks) else 10 ** 9) and hit[1] < len(al):
                hit = None                    # sanad oxiridan keyin — faqat to'liq ism
            if hit and (best is None or hit[1] > best[1]):
                best = hit
        if best:
            tk[i] = (best[0], best[0] + best[1])
            found[i] = (toks[best[0]][1], toks[best[0] + best[1] - 1][2])
    return found


# ------------------------------------------------------------------ sanadni matndan ajratish
_F = ["حدثنا", "حدثني", "اخبرنا", "اخبرني", "انبانا", "انباني", "نبانا", "ثنا", "نا", "انا", "حدثه", "حدثهم", "اخبره", "اخبرهم",
      "سمعت", "سمع", "سمعنا", "عن", "ان", "انه", "انها", "انهما", "قال", "قالت", "قالا", "يقول", "تقول", "يحدث", "حدث", "يخبر",
      "ح", "يذكر", "ذكر", "رواه", "يرفعه", "رفعه", "قراءه", "قرات", "قري", "علي", "عليه", "كتب", "الي", "اليه", "سال",
      "سالت", "سئل", "روي", "يروي", "بلغه", "بلغني", "عمن", "حدثناه", "اخبرناه", "حدثنيه", "حدثتني", "اخبرتني", "حدثته",
      "حدثت", "اخبرت", "قلت", "فقال", "فقالت", "يعني", "هو", "وهو", "زاد", "نحوه", "مثله", "بهذا", "بنحوه", "بمثله",
      "قالوا", "حدثاه", "حدثوه", "اخبراه", "حدثانا", "اخبرانا", "حدثونا", "سمعه", "سمعاه", "يحدثه", "انبانيه", "حدثكم", "اخبركم",
      "حديث", "بحديث", "الحديث", "باسناده", "بالاسناد", "الاسناد", "اسناده", "بمعناه", "معناه", "نحو", "مثل", "وذكر", "يقولون",
      "لي", "لنا", "له", "لهم", "ولكن", "لكن", "سمعته", "سمعتها", "سمعناه", "به",
      "اخبرته", "اخبرتها", "اخبرتهم", "اخبرتهما", "اخبرتنا", "حدثتنا", "حدثتهم", "حدثتها", "حدثتهما", "حدثها", "اخبرها",
      "حدثهما", "اخبرهما", "اخبروه", "انباه"]
FORMULA = set(_F) | {"و" + x for x in _F} | {"ف" + x for x in _F}
# ism ham bo'la oladigan so'zlar (علي — «عَلَى» va Ali ismi; سال/سأل …) ism ichida to'xtatmaydi
NAME_LIKE = {"علي", "وعلي", "فعلي", "عليه", "هو"}
STOP = FORMULA - NAME_LIKE
READ_ON = {"قرات", "قري", "قراه", "قرا", "وقرات", "قراءه"}
QUAL = {"رضي", "رحمه", "عليه", "رضوان", "صلي", "يعني", "وهو", "هو", "مولي", "صاحب", "قاضي", "امير", "خادم", "واللفظ", "اللفظ",
        "لفظ", "جميعا", "كلاهما", "كلهم", "وكان", "كان", "وكانت", "وهي", "هي", "زوج", "الاخران", "الاخرون", "الاخرين", "الاخر",
        "عنه", "عنها", "عنهما", "عنهم", "حديثه", "وحديثه", "اتم", "لفظه", "ولفظه", "المعني",
        "غير", "وغير",   # «وغير واحد» — «va boshqalar», roviy ismi emas
        "بمثل", "مثل", "بنحو", "نحو", "بمعني",   # «بمثل ذلك عن …» — izoh, sanad davom etadi
        "فيما", "وفيما"}                          # «- فيما قرئ عليه -» — o'qish izohi
NOT_NAME = {"الله", "تعالي", "عز", "وجل", "النبي", "رسول", "بن", "ابن", "ابو", "ابي", "ابا", "ام"}


# «ل» qo'shimchali ism («لعبد الله») faqat gapirish fe'lidan keyin roviy bo'ladi
SPEAK = {"قلت", "فقلت", "وقلت", "قلنا", "فقلنا", "قال", "فقال", "وقال", "قالت", "فقالت", "قيل", "فقيل", "ذكرت", "ذكرته", "فذكرت"}
HEARD = {"سمعت", "وسمعت", "سمعته", "وسمعته", "سمعتها", "سمعناه", "سمع", "سمعه", "سمعنا"}


def _is_formula(toks, i: int) -> bool:
    w = toks[i][0]
    if w == "ح" or (w == "من" and i > 0 and toks[i - 1][0] in HEARD):     # «سمعته من فلان»
        return True
    if w in NAME_LIKE:
        # «عَلَى» faqat «قرأت/قُرئ على» dan keyin rivoyat so'zi; yolg'iz علي — ism (Ali)
        return w in ("علي", "وعلي", "فعلي") and i > 0 and toks[i - 1][0] in READ_ON or w in ("عليه", "هو")
    return w in FORMULA


def seg_clean(text: str, toks, a: int, b: int, firsts=frozenset()) -> tuple[list[str], list[int]]:
    """Ism bo'lagining so'zlari va asl oralig'i; boshidagi «و» bog'lovchisi (keyingi qismi ma'lum ism boshi bo'lsa) olib tashlanadi."""
    words = [toks[x][0] for x in range(a, b)]
    s0 = toks[a][1]
    w0 = words[0]
    if w0.startswith("و") and len(w0) > 2 and (w0[1:] in firsts or w0[1:] in ("ابو", "ابي", "ابا", "ام", "ابن", "عبد")):
        words[0] = w0[1:]
        s0 += 1
        while s0 < toks[a][2] and _MARKS.match(text[s0]):
            s0 += 1
    return words, [s0, toks[b - 1][2]]


def segments_in(toks, lo: int, hi: int, firsts=frozenset()) -> list[tuple[int, int]]:
    """[lo, hi) so'zlar orasidagi ism bo'laklari (rivoyat so'zlari va qo'shimchalar orasida). «و» bilan boshlangan so'z
    ma'lum ism boshi bo'lsa (firsts) — yangi (parallel) ism."""
    out, name, stopped = [], [], False

    def close():
        if name:
            out.append((name[0], name[-1] + 1))
        name.clear()

    for i in range(lo, min(hi, len(toks))):
        w = toks[i][0]
        if w in QUAL or (w.startswith("و") and w[1:] in QUAL):
            close()
            stopped = True
            continue
        if _is_formula(toks, i):
            close()
            stopped = False
            continue
        if stopped:
            continue
        if name and w.startswith("و") and len(w) > 2 and w[1:] in firsts:
            close()
        name.append(i)
    close()
    # uzun bo'lak (ism + hikoya, masalan «عن أبيه لما سقط عليهم الحائط …») tashlanmaydi — boshidagi 12 so'zi qoladi (ism qismi
    # keyin ajratiladi)
    return [(a, min(b, a + 12)) for a, b in out if any(toks[x][0] not in NOT_NAME and len(toks[x][0]) >= 2 for x in range(a, b))
            or (b - a == 1 and toks[a][0] in ("ابي", "وابي"))]   # «حدثني أبي» — otam


class Resolver:
    """Ism shakli -> shaxs (roviylar bazasi ID). Ism shakllari: Shamela havolalaridagi yozilishlar va bazadagi qisqa ism;
    ustoz–shogird juftlari — page_isnads yo'llaridan. Yolg'iz ism shakli faqat bir shaxsga qat'iy tegishli bo'lsa, aks holda
    qo'shni roviy bilan juftligi bazada bo'lsagina aniqlangan hisoblanadi."""

    def __init__(self, forms: dict[str, Counter], edges: set[tuple[int, int]], names: dict | None = None):
        self.forms, self.edges = forms, edges
        # to'liq ism/nasab so'zlari -> shaxslar (qisqa shakl topilmasa: «عمرو الناقد» -> «عمرو بن محمد … الناقد»)
        self.tok_index = defaultdict(set)
        for pid, nm in (names or {}).items():
            for w in set(name_tokens(nm)):
                if w not in GENERIC:
                    self.tok_index[_canon(w)].add(pid)

    def loose_candidates(self, words: list[str]) -> set:
        ws = [_canon(w[1:] if w.startswith("و") and len(w) > 3 else w) for w in words]
        ws = [w for w in ws if w not in GENERIC and len(w) >= 3]
        if not ws:
            return set()
        sets = [self.tok_index.get(w, set()) for w in ws]
        out = set.intersection(*sets) if all(sets) else set()
        return out if len(out) <= 60 else set()

    def candidates(self, words: list[str]) -> Counter:
        c = Counter()
        for k in range(len(words), 0, -1):          # to'liq shakl, keyin qisqaroq boshlang'ich qism
            key = " ".join(_canon(w) for w in words[:k])
            if key in self.forms and (k == len(words) or k >= 2):
                c = self.forms[key]
                break
        if not c and words and words[0].startswith("و"):
            return self.candidates([words[0][1:]] + words[1:])
        return c

    def _support(self, cands, known) -> list:
        """Qo'shnilar bilan ustoz–shogird juftligi eng ko'p bo'lgan nomzodlar (ikkala qo'shni bilan — kuchliroq)."""
        best, out = 0, []
        for p in cands:
            k = sum(1 for q in known if (p, q) in self.edges or (q, p) in self.edges)
            if k > best:
                best, out = k, [p]
            elif k == best and k:
                out.append(p)
        return out if best else []

    def resolve_between(self, words: list[str], prev, nxt) -> tuple[int | None, str]:
        """Bitta ism: 1) ism shakli + qo'shni roviylar bilan ustoz–shogird juftligi; 2) shakl bitta shaxsga qat'iy tegishli;
        3) to'liq nasab/kunya so'zlari + qo'shni juftligi. Bittaga tushmasa — aniqlanmagan (o'ylab topilmaydi)."""
        c = self.candidates(words)
        known = [y for x in (prev, nxt) for y in (x if isinstance(x, (list, tuple)) else [x]) if isinstance(y, int)]
        if c:
            top = c.most_common(12)
            sup = self._support([p for p, _ in top], known)
            if len(sup) == 1:
                return sup[0], "form_and_neighbour"
            if len(sup) > 1:                      # bir nechta nomzod qo'shni bilan bog'liq: shu shakl deyarli faqat bittasiniki bo'lsa
                best = max(sup, key=lambda p: c[p])
                if c[best] >= 3 and c[best] >= 0.9 * sum(c[p] for p in sup):
                    return best, "form_and_neighbour_dominant"
            tot = sum(c.values())
            if top[0][1] / tot >= 0.9 and top[0][1] >= 3 and (not sup or top[0][0] in sup):
                return top[0][0], "dominant_form"
            full = self.forms.get(" ".join(_canon(w) for w in words))
            if full and len(full) == 1 and sum(1 for w in words if _canon(w) not in GENERIC) >= 3:
                return next(iter(full)), "unique_full_name"     # «يعقوب بن حميد بن كاسب» — bu to'liq ism faqat bitta shaxsniki
        loose = self.loose_candidates(words) | set(c)
        sup = self._support(loose, known)
        if len(sup) == 1:
            return sup[0], "name_words_and_neighbour"
        return None, ("ambiguous" if c or loose else "no_form")

    def resolve(self, chain: list[list[str]]) -> list[tuple[int | None, str]]:
        """chain: muallifning ustozidan boshlab ism so'zlari. Natija: (shaxs yoki None, asos)."""
        cands = [self.candidates(w) for w in chain]
        out: list[tuple[int | None, str]] = []
        for i, c in enumerate(cands):
            if not c:
                out.append((None, "no_form"))
                continue
            tot = sum(c.values())
            top = c.most_common(4)
            pick, why = None, None
            # qo'shni bilan juftlik (ustoz–shogird) — bir xil ism shakli ko'p shaxsga tegishli bo'lsa ham ajratadi
            nb = [x for x in (cands[i - 1] if i else Counter(), cands[i + 1] if i + 1 < len(cands) else Counter())]
            sup = []
            for p, _ in top:
                if any((p, q) in self.edges or (q, p) in self.edges for nbr in nb for q, _ in nbr.most_common(6)):
                    sup.append(p)
            if len(sup) == 1:
                pick, why = sup[0], "form_and_neighbour"
            elif top[0][1] / tot >= 0.9 and top[0][1] >= 3 and (len(sup) == 0 or top[0][0] in sup):
                pick, why = top[0][0], "dominant_form"
            out.append((pick, why or "ambiguous"))
        return out


def build_forms(pairs) -> dict[str, Counter]:
    """pairs: (shaxs, yozilishi) — har yozilish va uning boshlang'ich qismlari (≥2 so'z) uchun sanoq."""
    forms: dict[str, Counter] = defaultdict(Counter)
    for pid, written in pairs:
        w = [_canon(x) for x in name_tokens(written)]
        if w and w[0].startswith("و") and len(w[0]) > 3:
            w[0] = w[0][1:]
        if not w:
            continue
        forms[" ".join(w)][pid] += 1
    return forms

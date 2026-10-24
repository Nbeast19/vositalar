"""isnad_text: sanad ismlarini matnda topish va sanad tuzilishi (sun'iy namunalar — haqiqiy hadis matni emas)."""
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "src"), str(ROOT / "scripts")]

from isnad_text import (Resolver, align_names, build_forms, fill_route_gaps, isnad_end, seg_clean,  # noqa: E402
                        segments_in, tokens)

TEXT = "حَدَّثَنَا زَيْدُ بْنُ عَمْرٍو، حَدَّثَنَا خَالِدٌ، قَالَ حَدَّثَنِي سَالِمٌ، مَوْلَى ابْنِ فُلَانٍ أَنَّهُ سَمِعَ أَبَا الْقَاسِمِ"


def span_text(text, sp):
    return text[sp[0]:sp[1]] if sp else None


def test_name_with_comma_inside_is_found():
    """Manbada «سالم مولى ابن فلان», matnda «سَالِمٌ، مَوْلَى …» (vergul bilan) — topiladi (o'rni tushib qolmaydi)."""
    sp = align_names(TEXT, ["زيد بن عمرو", "خالد", "سالم مولى ابن فلان"])
    assert [span_text(TEXT, x) for x in sp] == ["زَيْدُ بْنُ عَمْرٍو", "خَالِدٌ", "سَالِمٌ، مَوْلَى ابْنِ فُلَانٍ"]


def test_name_is_not_matched_inside_a_longer_name():
    """«عبد الله بن عمر» alohida roviy deb «نافع مولى عبد الله بن عمر» ichidan olinmaydi."""
    t = "حَدَّثَنَا نَافِعٌ، مَوْلَى عَبْدِ اللَّهِ بْنِ عُمَرَ عَنْ عَبْدِ اللَّهِ بْنِ عُمَرَ، أَنَّ رَجُلًا"
    sp = align_names(t, ["نافع مولى عبد الله بن عمر", "عبد الله بن عمر"])
    assert sp[1][0] > sp[0][1]                       # ikkinchi ism birinchisidan keyin


def test_gap_fill_uses_neighbours_and_never_a_formula_word():
    toks = tokens(TEXT)
    nodes = [{"pos": 1, "person": 1}, {"pos": 2, "person": 2}, {"pos": 3, "person": 3}]
    aliases = {1: [("زيد", "بن", "عمرو")], 2: [("قال",)], 3: [("سالم", "ابو", "الغيث")]}
    spans = {0: align_names(TEXT, ["زيد بن عمرو"])[0]}
    got = fill_route_gaps(TEXT, toks, nodes, spans, lambda p: aliases[p])
    assert 1 not in got                              # «قال» hech qachon ism emas
    assert span_text(TEXT, got[2]) == "سَالِمٌ"


def test_segments_parallel_teachers_and_qualifiers():
    t = "حَدَّثَنَا زَيْدُ بْنُ عَمْرٍو، وَخَالِدُ بْنُ بَكْرٍ قَالَا حَدَّثَنَا يَحْيَى - وَهُوَ ابْنُ سَعِيدٍ - عَنْ عُبَيْدِ اللَّهِ"
    toks = tokens(t)
    firsts = frozenset({"زيد", "خالد", "يحيي", "عبيد"})
    segs = segments_in(toks, 0, isnad_end(toks), firsts)
    words = [" ".join(seg_clean(t, toks, a, b, firsts)[0]) for a, b in segs]
    assert t[seg_clean(t, toks, *segs[1], firsts)[1][0]:].startswith("خَالِدُ")   # «و» oraliqqa kirmaydi
    assert words == ["زيد بن عمرو", "خالد بن بكر", "يحيي", "عبيد الله"]   # «وهو ابن سعيد» izoh — alohida roviy emas


def test_isnad_ends_at_prophet_mention_in_any_form():
    for w in ("النَّبِيِّ", "لِرَسُولِ", "بِالنَّبِيِّ"):
        toks = tokens(f"عَنْ زَيْدٍ عَنْ {w} اللَّهِ قَالَ")
        assert isnad_end(toks) == 3


def test_resolver_needs_unique_form_or_teacher_pair():
    forms = build_forms([(1, "سفيان")] * 5 + [(2, "سفيان")] * 5 + [(3, "زيد بن عمرو")] * 4)
    r = Resolver(forms, {(1, 3)})
    assert r.resolve_between(["سفيان"], 3, None) == (1, "form_and_neighbour")   # ustoz–shogird juftligi ajratadi
    assert r.resolve_between(["سفيان"], None, None)[0] is None                 # aniq emas — o'ylab topilmaydi
    assert r.resolve_between(["زيد", "بن", "عمرو"], None, None) == (3, "dominant_form")
    assert isinstance(forms, dict) and isinstance(next(iter(forms.values())), Counter)


def test_name_does_not_start_inside_another_name():
    """«خالد بن عمر» ichidagi «بن عمر» va «زيد بن بكر» ichidagi «بكر» alohida roviy emas; «حدثني أبي سالم» — «otam Salim»."""
    t = "حَدَّثَنَا خَالِدُ بْنُ عُمَرَ، عَنْ زَيْدِ بْنِ بَكْرٍ، عَنِ ابْنِ عُمَرَ"
    toks = tokens(t)
    assert span_text(t, align_names(t, ["ابن عمر"], toks)[0]) == "ابْنِ عُمَرَ"        # oxirgisi, ism ichidagisi emas
    assert align_names(t, ["بكر"], toks) == [None]
    t2 = "حَدَّثَنِي أَبِي سَالِمٌ، عَنْ أَبِي سَلَمَةَ"
    assert span_text(t2, align_names(t2, ["سالم"])[0]) == "سَالِمٌ"
    assert align_names(t2, ["سلمة"]) == [None]                                        # «أبي سلمة» kunyasi ichida


def test_my_father_alone_is_a_segment():
    t = "حَدَّثَنَا زَيْدٌ، حَدَّثَنِي أَبِي، عَنْ جَدِّي"
    toks = tokens(t)
    segs = segments_in(toks, 0, isnad_end(toks))
    assert [" ".join(seg_clean(t, toks, a, b)[0]) for a, b in segs] == ["زيد", "ابي", "جدي"]


def test_long_name_and_story_segment_is_kept_for_its_name_part():
    """«عن أبيه، لما خرجنا …» — uzun bo'lak (ism + hikoya) tashlanmaydi: ism qismi keyin ajratiladi (sun'iy matn)."""
    t = "حَدَّثَنَا زَيْدٌ، عَنْ أَبِيهِ، لَمَّا خَرَجْنَا إِلَى السُّوقِ فِي يَوْمٍ حَارٍّ رَأَيْنَا رَجُلًا يَبِيعُ تَمْرًا كَثِيرًا جِدًّا عِنْدَ الْبَابِ"
    toks = tokens(t)
    segs = segments_in(toks, 0, len(toks))
    assert toks[segs[1][0]][0] == "ابيه" and segs[1][1] - segs[1][0] <= 12


def test_lam_prefixed_name_only_after_a_verb_of_speaking():
    """«قلت لعبد الله …» — roviy; «واللفظ لابن خالد» — izoh (lafz kimniki), roviy emas."""
    t = "عَنْ زَيْدٍ، قَالَ قُلْتُ لِعَبْدِ اللَّهِ بْنِ عَمْرٍو"
    assert span_text(t, align_names(t, ["عبد الله بن عمرو"])[0]) == "لِعَبْدِ اللَّهِ بْنِ عَمْرٍو"
    t2 = "عَنْ زَيْدٍ - وَاللَّفْظُ لاِبْنِ خَالِدٍ - عَنْ بَكْرٍ"
    assert align_names(t2, ["ابن خالد"]) == [None]

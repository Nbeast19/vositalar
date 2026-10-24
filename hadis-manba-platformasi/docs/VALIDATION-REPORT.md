# Sinov hisoboti

## V7 mahalliy preview (2026-10-24) — deploy qilinmagan

| Sinov | Natija | Dalil |
|---|---|---|
| pytest | **PASS — 76 o‘tdi, 10 skip** (skip = haqiqiy korpus) | `tests/*.py` (yangi: `tests/test_overlay.py`, 7 ta) |
| Haqiqiy korpus (`HADIS_MANBA_REAL_HOME=…/library-run04`) | **PASS — 10/10** kesh isigach; birinchi sovuq ishga tushirishda 2,6 GB SQLite ustida API timeout sabab 8/10 yiqildi (asosiy commitda ham shunday; `src/` o‘zgarmagan) | `tests/test_real_corpus.py` |
| Node | **PASS — 7/7** | `tests/web/core.node.test.js` |
| Playwright E2E (20 ssenariy × en/ar × 1280/390) | **PASS — 80/80** | `tests/web/e2e.pw.js` (13–16: qatlam, o‘rin raqamlari, roviy indeksi, karantin) |
| Haqiqiy ma’lumotli dalillar (Buxoriy + Fath + Umdat + mahalliy qatlam) | **PASS — 27/27 + 5/5**, sovuq offline PASS | `docs/V7-QABUL-A01-A64.md` |
| Haqiqiy qurilmalar | **NOT TESTED** | — |

Qabul jadvali: `docs/V7-QABUL-A01-A64.md`. Hisobot: `docs/V7-HISOBOT.md`.

## Oldingi bosqich (2026-10-23)

Sana: 2026-10-23. Buyruq: `sh scripts/verify.sh`. Faqat bajarilgan sinovlar "PASS" deb yozilgan.

## 1. Dastur ishlashi
| Sinov | Natija | Dalil |
|---|---|---|
| pytest (Python yadro, paket, import, qidiruv, sharh, huquq, audit, mahalliy xizmat, MCP) | **PASS — 69 o‘tdi, 10 skip** (sanad indeksi regressiyasi 17661/17713 bilan) (skip = haqiqiy korpus testlari, alohida ishga tushiriladi) | `tests/*.py` |
| Node: JS normalizatsiya va parcha Python bilan aynan bir xil, ZIP xavfsizligi, paket tekshiruvi | **PASS — 7/7** (+ en/ar/uz UI kalitlari to‘liqligi) | `tests/web/core.node.test.js`, `tests/arabic_vectors.json` |
| Playwright: (12 ssenariy + til almashtirish + kitob qidiruvi + manbali iqtibos + konsol) × {English, العربية} × {1280 px, 390 px} | **PASS — 64/64** | `tests/web/e2e.pw.js` → `build/e2e-natija.json` |
| Toza venv'da `pip install .` → `install`, `doctor`, `resolve` | **PASS** (MCP'siz: doctor ogohlantirish beradi, xato emas) | qo'lda bajarildi |
| Deterministik build (ikki marta → bir xil SHA-256) | **PASS** | `test_build_is_deterministic` + `sha256sum -c` |
| Haqiqiy korpus (run04 → 50 paket o‘rnatilgan): Muslim 1233→591, Muvatto ikki raqamlash, 125 hash qatlami, Shamoil Julaymiy/Sunnah, Tabaroniy jildlari, `row:N`, Fath ikki nashri, Buxoriy 1 ↔ Umdat, qidiruv, legacy | **PASS — 10/10** | `tests/test_real_corpus.py` (`HADIS_MANBA_REAL_HOME`) |
| SEO statik sahifalar: self-canonical, o‘zaro hreflang + x-default, sitemap ↔ sahifalar, havolalar butun, `<script>` yo‘q, shaxsiy yo‘l/manba matni yo‘q | **PASS** | `tests/test_site.py` |
| **Jonli sayt — yangi dizayn (27-bo‘lim)** (Hadith Library, `main` eead2b3, 2026-10-23 17:44 UTC): SEO sahifalari, 32 paket SHA-256, Release havolalari; en 1280 px: Buxoriy + Fath al-Bari o‘rnatish → hadis 1 → sharh → qaytish → oldingi/keyingi → roviy paneli → oflayn qidiruv; ar 390 px: Muvatto + at-Tamhid xuddi shunday; gorizontal siljish va konsol xatosi yo‘q | **PASS — 16/16** (headless Chromium, GitHub Actions; real qurilma emas) | [`hadis-manba-jonli` run](https://github.com/Nbeast19/vositalar/actions/runs/39997363878) |
| CI shriftlari bilan 390 px (birinchi PR urinishida `marfu’` belgisi sahifani 409 px ga kengaytirgan edi; tuzatildi, lokalda DejaVu Sans bilan ham tekshirildi) | **PASS — 64/64** | `tests/web/e2e.pw.js` |
| **Jonli sayt** (https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/, GitHub Pages, 2026-10-23 15:40 UTC): sitemap’dagi 136 sahifa 200 + self-canonical + o‘zaro hreflang + x-default + `<script>` yo‘q; PWA `noindex`; host ildizida robots.txt yo‘q (404 → hammasiga ruxsat); 32 paket saytdan SHA-256 mos; 32 Release havolasi 200; en 1280 px: Buxoriy + Fath al-Bari o‘rnatish → hadis 1 → sharh → qaytish → oflayn qidiruv; ar 390 px: Muvatto + at-Tamhid xuddi shunday; gorizontal siljish va konsol xatosi yo‘q | **PASS — 14/14** (headless Chromium, GitHub Actions) | [`hadis-manba-jonli` run](https://github.com/Nbeast19/vositalar/actions/runs/39980216816), `tests/live/live.pw.js` |

### 22.1 Manba va import
| Talab | Holat |
|---|---|
| Kirish fayllari pre/post xesh bo'yicha o'zgarmagan | **PASS** (sun'iy kirish bilan `test_audit_read_only`; haqiqiy MIRQAT ZIP'larda `input_unchanged: true`) |
| SHA va sxema tekshiruvi | **PASS** (buzilgan bayt, ro'yxatda yo'q fayl, kod fayli, `..`, mutlaq yo'l, symlink, zip-bomb, JSON xato) |
| Ikki marta import — yozuv ko'paymaydi | **PASS** |
| Kumulyativ paketlar ikki marta sanalmaydi | **PASS (texnik)**: versiya almashtirishda sanoq 12 da qoladi; MIRQAT 380/480 — 480 ning boshi 380 bilan baytma-bayt bir xil ekani tekshirildi. Haqiqiy oilalar importi — **bajarilmagan** |
| A'ning 14 431 qatori auditi | **bajarilmagan** — A ZIP bu sessiyaga kelmagan (audit kodi tayyor va sun'iy A TSV bilan sinalgan) |
| Import → eksport semantik tengligi | **qisman**: `export` JSON core javobining o'zi; alohida round-trip testi yo'q |
| Xato paket ishlaydigan bazaga zarar qilmaydi | **PASS** (IntegrityError → ROLLBACK; buzilgan fayl → rad + jurnal) |
| `rollback` | **PASS** (Python va PWA) |

### 22.2 Matn va ilmiy identifikatsiya (sun'iy namuna bilan)
PASS: hash qatlamlari (asl bo'sh ↔ joriy matn), `row:N` bosma raqam emas, guruhli raqam `7;8`, jild bo'yicha bir xil raqam ajraladi, umumiy sharh = 1 uchrashuv/3 link, takroriy uchrashuv, mursal/mavquf/muallif bayoni/bob sarlavhasi, zaxira roviy alohida, RAQAMSIZ/IMKONSIZ original saqlanadi, iqtibos faqat asl matn bo'laklaridan, preview_window, nashrlar aralashmaydi, manzil qulfi (fayl o'zgarsa `stale_hash`), muallif qidiruvida naql/hoshiya chiqariladi.
**Bajarilmagan (haqiqiy ma'lumot kerak):** Muslim mahalliy 1233 ↔ bosma 591 fixture, Muvatto uzluksiz ↔ kitob:hadis, Shamoil Julaymiy/Sunnah xaritasi, Tabaroniy jild+raqam+nashr, 125 Muvatto haqiqiy qatlami, Tibiy j01 mualliflik xaritasi, Fath Dar al-Ma'rifa ↔ Salafiyya.

### 22.3 Qidiruv, API, MCP
PASS: aniq/harakatsiz/raqam bir xil birlikka olib boradi; bir nechta nomzod avtomatik tanlanmaydi; `not_found` / `not_installed` / `invalid_parameter` / `timeout` farqlanadi; API (HTTP) va core bir xil natija; **haqiqiy MCP mijozi** (rasmiy SDK `Client`, STDIO, alohida jarayon) — tools ro'yxati, qidiruv, dalil; SQL-ga o'xshash so'rov oddiy matn; limit 50 bilan cheklangan; manba ichidagi ko'rsatma ta'sir qilmaydi; Host/Origin/yo'l tekshiruvi.
Sinalmagan: Claude Desktop/Code, Cursor va boshqa GUI mijozlar.

### 22.4–22.5 Tarqatma, UI, o'rnatish
PASS: allowlist (unknown/restricted/noaniq conditional chiqariladi, shaxsiy yo'l rad etiladi); Git'da xom manba, Qur'on korpusi, shaxsiy yo'l yo'q (kirishlar repo tashqarisida); har paketda LICENSE/ATTRIBUTION; oflayn ishlash (headless Chromium); 390 px'da gorizontal siljish yo'q; arabcha `dir=rtl`; konsolda xato yo'q; GitHub project path (`/<repo>/hadis-manba-platformasi/web/`) ostida nisbiy URL'lar ishlaydi.
English va العربية UI (RTL/LTR, til tanlovi saqlanishi, bidi izolyatsiya) — headless Chromium’da 4 kombinatsiya.
**Bajarildi:** GitHub Pages nashri va jonli URL/hreflang/canonical/sitemap tekshiruvi; Release asset’lari qayta yuklab olinib 32/32 SHA-256 mos.
**Bajarilmagan:** real iPhone/Android/Windows/Mac (`PLATFORM-TEST-MATRIX.md`); Search Console (foydalanuvchi hisobi kerak, `SEO.md`).

## 2. Ilmiy qamrov
**INCOMPLETE.** Fayl yetkazilishi to‘liq (R3 va R4 VERIFIED — `IMPORT-RUN04.md`), lekin ilmiy qamrov alohida masala: 33 asos paket (239 168 yozuv), 17 sharh paketi; 2 sharh (fath-al-mulhim, maarif-al-sunan) bog‘lama/matnsiz — o‘tkazildi; Mirqot 1 084 va Tibiy 655 bog‘lama asosda topilmadi — yaratilmadi; holat maydonlari asosan `unreviewed`. Batafsil: `COVERAGE.md`, `MISSING-CORPUS.tsv`.

## 3. Ommaviy tarqatish huquqi
Nashr qilingan (foydalanuvchi ruxsati, 2026-10-23): 17 asosiy kitob — Sunnah.com ruxsati (`public`); 15 sharh — OpenITI, CC BY-NC-SA 4.0 (`conditional`: notijoriy, manba ko‘rsatish, bir xil litsenziya). Har paketda `LICENSE`/`ATTRIBUTION`; Release’da `RIGHTS-PAKETLAR.md`. Huquqi noma’lum 18 paket (hadis-qoshimcha 12 kitob nashrlari, goldenshamela/islamarchive sharhlari va b.) **nashr qilinmagan** — faqat mahalliy. Bu huquqiy xulosa emas (`RIGHTS.md`).

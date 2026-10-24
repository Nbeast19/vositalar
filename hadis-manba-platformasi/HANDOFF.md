# HANDOFF — Hadis Manba (2026-10-24)

Bu fayl keyingi sessiya/agent uchun: nima qilingan, nima qolgan, qayerda nima turibdi. Foydalanuvchi bilan muloqot **o‘zbek tilida**.

## V7 — mahalliy preview (2026-10-24) — **DEPLOY QILINMAGAN**

Foydalanuvchining HADITH-LIBRARY-AUDIT-20261024 topshirig‘i (CLAUDE-YAGONA-TOPSHIRIQ §0–§24, DIZAYN-QARORI-V6, A01–A64). **Qat’iy shart:** foydalanuvchi natijani ko‘rib, nashrga aniq ruxsat bermaguncha deploy, push/merge, Release va paket e’loni yo‘q. Commitlar faqat lokal `claude/new-session-f9jsvi` branchida.

- Oqim: Kitoblar → to‘plam (Kitob gridi) → Kitob mundarijasi `#/c/<pkg>?k=&b=` → reader `#/r/<pkg>?k=&u=|b=` → roviy indeksi `#/n/<person>?e=&from=&p=&g=` → yagona hadis `#/h/<unit>?p=&list=` → bog‘lanish stoli `#/desk/<work>?n=`.
- Mahalliy qatlam: `scripts/build_overlay.py --raw <…/hadis-raqamlar/raw> --package <hm-bukhari-hj120-1.0.1.hmz> --out <repodan tashqari> --uz-draft <prototype-v6-source-data.json>`. U faqat mahalliy (QARORLAR 38–41) va katalogda yo‘q; Kutubxonam → «Fayldan o‘rnatish» orqali o‘rnatiladi.
- Qabul jadvali: `docs/V7-QABUL-A01-A64.md`. Hisobot: `docs/V7-HISOBOT.md`.
- Ochiq ishlar:
  - o‘zbekcha tarjima qamrovi;
  - harakatli sharh qatlami;
  - boshqa to‘plamlar uchun bob va sanad indeksi;
  - Nabiy ﷺ so‘zlari va dialog rollari;
  - bobga sharh bog‘lash;
  - statik sayt va Release registri (nashr ruxsatidan keyin);
  - haqiqiy qurilmalar.

## 0. 27-bo‘lim — ENG MUHIM (2026-10-23)

**Foydalanuvchi haqiqiy Buxoriyni o‘rnatib ko‘rib, BUTUN sayt dizayni va foydalanish tajribasini qat’iy rad etdi** (zamonaviy emas, noqulay). Rad etilgan “before” holat: yashil chiziqli maket, raqamlari bob sarlavhalari bilan siljigan mundarija (600 yozuvdan keyin uzilgan), chap chetdagi tor matn, 7 ta tushuntirilmagan belgi, bir xil sharh kartalari, oldingi/keyingi yo‘q. **Dizayn birinchi bosqichga ko‘tarildi**; sanad/huquq auditi uni kutib turmaydi.

Yangi ommaviy nom: **Hadith Library | مكتبة الحديث** (texnik ID, paket nomlari, xeshlar, IndexedDB nomi `hadis-manba` va eski havolalar o‘zgarmaydi).

Bajarildi (frontend qayta loyihalandi, offlayn yadro saqlandi):
- Yangi dizayn tizimi (`web/style.css`): iliq oq / qorong‘i mavzu (eslab qolinadi, `web/js/theme.js`), Noto Naskh Arabic (OFL, `web/fonts/`), yuqori panel + mobil pastki tablar.
- Ekranlar (`web/js/app.js`): Bosh sahifa (katta qidiruv, Start/Continue reading, kutubxonangiz, to‘plamlar), Kitoblar katalogi (filtrlar), kitob sahifasi (muqova, Start/Continue, Mundarija / Sharhlar / Nashr haqida tablari, nashrlar ro‘yxati), mundarija (bo‘limlar paneli/drawer, sahifalash — 600 cheklovi yo‘q, raqam bo‘yicha o‘tish), hadis o‘quvchi (markaziy ustun, yuqori va pastda Oldingi/Keyingi — `seq` tartibida, klaviatura ←/→, o‘qish sozlamalari: o‘lcham, oraliq, harakatlar, diqqat rejimi, mavzu), roviy paneli (hadis yopilmaydi; faqat `verified` terminal roviy; ism matndagi aynan oraliqdan), sharhlar asar+muallif+nashr bo‘yicha guruhlangan va panel ichida oldindan ko‘rish, “Manba va tekshiruv” bloki (har yozuv uchun sodda xulosa + “Bu nimani anglatadi?” jadvali), Kutubxonam, Qidiruv, Yordam.
- Statik en/ar sahifalar (`site.py`) va README’lar yangi nom va dizaynda; Release tavsifi/label’lari: `release/` + `.github/workflows/hadis-manba-release-meta.yml`.
- Skrinshotlar (real Buxoriy + Fath al-Bari, en/ar, light/dark, 1366/390): `docs/img/` va sessiya scratchpad’ida; README’da.

Ochiq (27-bo‘lim):
- **To‘liq sanad indeksi**: dalil topildi — `raw/shamela-bukhari/pages.jsonl` (Shamela 1681, `inr://man-<id>` roviy havolalari, `<hadeeth-N>` matn chegarasi), `page_isnads.json` (book_id 1458 = Buxoriy, 7 244 qator; tartib Nabiy ﷺ tomondan kompilyatorga, oxirgi element Buxoriy 5495; `hadeeth_key` — matn guruhi kaliti, bosma raqam EMAS: 17661 p10 va 17713 p104 ikkalasi key=1), `narrators.json` (18 989). Bog‘lash: sahifa + bosma raqam + sanad matni bilan (raqam tengligi bilan emas).
- **Huquq**: AuthenticIlm README “License: … Terms of use: Research and personal use” (`raw/shamela-README.md`, 316–320-qatorlar) → ommaviy qayta tarqatish tasdiqlanmagan. Foydalanuvchi qarori: alohida paket tayyorlansin; ruxsat aniqlanmasa — faqat mahalliy.
- **Mahalliy sanad indeksi yasaldi** (`scripts/build_isnad_index.py`, hujjat `docs/ISNAD-INDEX.md`, sinov `tests/test_isnad_index.py`): 7 277 dan 7 041 bog‘landi, 4 914 tasi bitta yo‘l bilan to‘liq tasdiqlangan (vositalar soni beriladi), 2 086 qisman, 41 ح tarmoqli. Natija repo/saytga kirmaydi. Keyingi qadam: ilovaga mahalliy import (yangi paket turi) va o‘quvchida to‘liq sanadni ko‘rsatish.
- **Muallaqot**: hadith-json Buxoriyda faqat 97 “kitob” sarlavhasi, bob tarjimalari/muallaqot yo‘q; manbada muallaq tasnifi maydoni yo‘q (raqamlar.sqlite’da `muallaq` 0 ta). UI’da “tasniflanmagan” deb ochiq ko‘rsatiladi; Abu Sa’id al-Mu’allo kabi ism tasnifga ishlatilmaydi.
- Paket ichidagi `persons` yozuvlarida `name_ar` yo‘q (faqat o‘zbekcha ism + normallashtirilgan taxallus); Buxoriyda roviy holati: verified 5 131, conflict 2 146.

## V9 (2026-10-24) — qisqacha

- Sanad qatlami **17 kitobga** (`scripts/build_overlay.py --all`): evidence (Buxoriy, Nasoiy), number_text (Termiziy), sequence (Muslim, Abu Dovud, Molik — page_isnads yo‘li ismlar bilan), text (qolganlari). Yangi modul `scripts/isnad_text.py` (ismlarni matnda topish, sanad bo‘laklari, identitet — `Resolver`).
- O‘rinlar matn tuzilishidan (qaror #47), ism ichidan ism olinmaydi (#48), identitet tartibi (#49). Aniqlanmagan ism — `t<sha1>` shaxs, UI’da «shaxsi aniqlanmagan».
- O‘zbekcha Kitob nomlari (`--kitab-names`, tahririy qoralama, mahalliy). README ko‘rgazmasi (banner + 4 surat, EN/AR), `og:image`.
- Tekshiruv skriptlari (scratchpad, repo tashqarisida): `audit2.py` (o‘rin uzluksizligi), `audit3.py` (ism ichidan olingan / yo‘lga kirmagan bo‘laklar), `fullcheck.js` (brauzerda har Kitob), `dbg_unit.py` (bitta yozuvni qayta qurish).
- Hisobot: `docs/V9-HISOBOT.md`; qarorlar #47–52. Foydalanuvchi ruxsati bilan `main`ga qo‘shildi (2026-10-24).
- **Qatlamlar ommaviy (QARORLAR #53, 2026-10-24):** foydalanuvchi AuthenticIlm’dan ham ruxsat olganini tasdiqladi. Artifact’dagi 17 `hm-overlay-*-0.2.0.hmz` o‘zgarmasdan [Release `hadis-manba-qatlamlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-qatlamlar-v1) ga (vaqtinchalik workflow commiti bilan yuklandi, commit branchdan olib tashlandi). `catalog.json` → `overlay`; `fetch_release_packages.py` bir nechta Release; ilova: avval o‘rnatilgan kitobga qatlam o‘zi qo‘shiladi, yangi versiya o‘zi faollashadi (sw v7).

## V8 (2026-10-24) — qisqacha

- Boblar 13 kitobga (`scripts/build_overlay.py --all`), sanad: Buxoriy + Termiziy. Kitob o‘rnatilganda qatlam avtomatik (mahalliy katalog `overlay` maydoni).
- Hadis sahifasida chap daraxt (sticky), «Faqat ismlar», roviy darajalari, roviy sahifasida o‘rin bo‘yicha saralash, Rasululloh ﷺ so‘zlari belgisi, kitob rangi dizayni. Service worker `hadis-manba-qobiq-v6`.
- Hisobot: `docs/V8-HISOBOT.md`; qarorlar #42–46. O‘zbekcha tarjima — keyingi versiya.

## 1. Asosiy talablar (o‘zgarmaydi)

- Har **asosiy kitob alohida**, har **sharh alohida** paket; “faqat kitob”, “faqat sharh”, “kitob + tanlangan sharhlar”. Birga o‘rnatilsa hadis ↔ sharh **ikki tomonlama** bog‘lanadi (faqat mos nashr va versiyada; raqam bir xilligi yetarli emas).
- **Windows, Mac, iPhone, Android**: AIsiz, internetsiz o‘qish/qidirish/sharhga o‘tish (PWA, IndexedDB, Web Worker). Telefon uchun Python/server talab qilinmaydi.
- **26-bo‘lim (yangi):** ommaviy sayt, PWA, katalog, yordam va o‘rnatish qo‘llanmalari **English va العربية** tillarida. Til tanlovi saqlanadi; ar=RTL, en=LTR; arabcha manba doim RTL; aralash matnda bidi isolation. Oddiy yo‘l: kutubxona → kitob → (faqat kitob | tanlangan sharhlar bilan) o‘rnatish → qidirish/o‘qish → shu hadis sharhi → manbali iqtibos. Terminal/Python/API kaliti/AI/hisob talab qilinmaydi; MCP — alohida ixtiyoriy bo‘lim. Katta tugmalar, yuklash hajmi/holati, “o‘rnatilgan / oflayn tayyor” belgilari. Hadis/sharhning yangi tarjimasi **o‘ylab topilmaydi** (faqat UI tarjimasi).
- **SEO:** `/en/` va `/ar/` barqaror URLlar, oldindan yaratilgan HTML (bosh sahifa, kitob/sharh kartalari, muallif, yordam), self-canonical, o‘zaro hreflang + x-default, sitemap, robots tekshiruvi. Butun GB manba sayt qobig‘iga kirmaydi; shaxsiy qaydlar/mahalliy fayllar public chiqmaydi. Rasmiy tayanch: Google “localized versions” va “JavaScript SEO basics”. Indeks/o‘rin kafolatlanmaydi; Search Console tasdig‘i kerak bo‘lsa — yakuniy qadam sifatida yoziladi.
- Real qurilmada sinalmagan narsaga **PASS yozilmaydi**. Ilmiy qamrov **INCOMPLETE** — fayl yetkazilishi bilan aralashtirilmaydi.
- Manba fayllari **read-only**. Xom korpus va shaxsiy 0-Manba **public repoga yuklanmaydi**. Qur’on/qiroat va shaxsiy qo‘lyozmalar doiradan tashqari.

## 2. Repo, nashr, branch

- Repo: `Nbeast19/vositalar` (avvalgi nomi `desktop-tutorial`, **public**). Ishchi branch: `claude/new-session-f9jsvi`; PR [Nbeast19/vositalar#3](https://github.com/Nbeast19/vositalar/pull/3) **squash bilan `main` ga qo‘shilgan** (2026-10-23).
- **Sayt:** https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/ (katalog: `…/web/en/`, `…/web/ar/`).
- **Paketlar:** Release [`hadis-manba-paketlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-paketlar-v1) — 17 kitob + 15 sharh, `SHA256SUMS`, `RIGHTS-PAKETLAR.md`. Gitda paket yo‘q.
- Workflow’lar: `hadis-manba.yml` (testlar), `hadis-manba-pages.yml` (Pages: repo + Release paketlari), `hadis-manba-jonli.yml` (nashrdan keyin jonli tekshiruv). Nashr tartibi: `docs/RELEASE.md`.
- Konteynerdan `github.io`, `api.github.com` ga kirish yo‘q (proxy 403) — jonli tekshiruv faqat Actions’da.

## 3. Bajarilgan

| Qism | Holat | Joyi |
|---|---|---|
| Python yadro: SQLite+FTS5 trigram, `ar-search-v1`, `.hmz` paket formati, xavfsiz ZIP, atomik install/upgrade/rollback, append-only jurnal, core API (13 tool), iqtibos kartasi | ✓ | `src/hadis_manba/` |
| Faqat-o‘qish audit (registry, baseline, schema probe, ichki MANIFEST, pre/post xesh) | ✓ | `audit.py` |
| MCP server (rasmiy SDK `mcp==2.3.0`, STDIO), mahalliy HTTP (127.0.0.1, Host/Origin), CLI, doctor | ✓ | `mcp_server.py`, `server.py`, `cli.py` |
| Allowlist public build (public / conditional / local_only + maxfiylik skani) | ✓ | `publish.py` |
| PWA: IndexedDB paket ombori (staging → faollashtirish), Worker qidiruv, alohida qaydlar bazasi, service worker | ✓ | `web/` |
| **Haqiqiy importerlar**: `raqamlar.sqlite`+hadith-json → 33 asos paket (29 kitob); sharhlar → 17 sharh paketi | ✓ | `src/hadis_manba/importers/`, `scripts/import_real.py`, `docs/IMPORT-RUN04.md` |
| Qidiruv tezligi (filtr → sahifa): «طلب العلم» 7,9 s → 67 ms | ✓ | `core.search_hadith` |
| i18n (en/ar/uz) PWA interfeysi, yangi oddiy yo‘l (#/ kutubxona → #/w/<work> → install), `data-act` test belgilari | ✓ (E2E 64/64) | `web/js/i18n.js`, `web/js/app.js`, `web/index.html`, `web/style.css` |
| Katalogda nomlar/mualliflar (`names`, `authors`, `names_origin`), importerlarda inglizcha/tahririy nomlar | ✓ (real paketlar 1.0.1 qayta yasaldi) | `publish.py`, importerlar |
| SEO statik sayt `/en/`, `/ar/` (canonical, hreflang, x-default, sitemap) | ✓ | `site.py`, `hadis-manba build-site`, `docs/SEO.md`, `tests/test_site.py` |
| Ikki tilli hujjatlar: `README.md` (en), `README.ar.md`, `README.uz.md`, `docs/QUICKSTART.{en,ar}.md`, `docs/{en,ar}/INSTALL.md` | ✓ | |

## 4. Test natijalari (oxirgi ishga tushirish)

- `sh scripts/verify.sh`: pytest **65 passed**, 10 skipped; Node **7/7**; Playwright **64/64** (en/ar × 1280/390, oflayn; sinov namunasi `build/demo` da).
- Haqiqiy korpus: `HADIS_MANBA_REAL_HOME=/home/user/hadis-manba-kirish/library-run04 pytest tests/test_real_corpus.py` → **10/10**.
- **Jonli sayt (Actions, headless Chromium): 14/14** — SEO 136 sahifa, 32 paket xeshi, en/ar o‘rnatish→sharh→oflayn.
- Real iPhone/Android/Windows/Mac: **sinalmagan**.

## 5. Haqiqiy manba (repo TASHQARISIDA, faqat o‘qish)

| Narsa | Joy | Holat |
|---|---|---|
| R3 nusxa (dot-20261023-03) | `/home/user/hadis-manba-kirish/hadis-input-run03/` | VERIFIED: 12 366 fayl, 6 897 901 261 bayt, manifest `704e0d2d…b28` |
| R4 nusxa (dot-20261023-04) — **joriy** | `/home/user/hadis-manba-kirish/hadis-input-run04/` | VERIFIED: 13 832 fayl, 7 137 580 275 bayt, target `13496ac3…c3d0c9`; o‘zgarmaganlar R3 bilan **hardlink** (ikkalasini ham o‘zgartirmang) |
| Receiptlar | `reassembled/`, `r4/control/`, scratchpad `RECEIPTS-R3-R4.zip` (SHA `156fc662…38aa7e`) | foydalanuvchiga yuborilgan |
| Paketlar (real) | `/home/user/hadis-manba-kirish/output-run04/dist/` (50 `.hmz`), `IMPORT-REPORT.json` | asos 1.0.1, sharh 1.0.0 |
| Mahalliy kutubxona | `/home/user/hadis-manba-kirish/library-run04/` (2,3 GB) | 50 paket o‘rnatilgan |
| Transport bo‘laklari, MIRQAT ZIPlar | `transport/`, `zips/`, `r4/parts/` | hammasi SHA bilan tasdiqlangan |

Bulut konteyneri vaqtinchalik: bu papkalar sessiya tugasa yo‘qoladi (qayta yetkazish kerak bo‘ladi).

## 6. Muhim cheklovlar va qarorlar

- Huquq: hadith-json (sunnah.com) 17 kitob — `approved` (foydalanuvchi tasdiqlagan Sunnah.com ruxsati); hadis-qoshimcha (Shamela asosidagi) 12 kitob — `unknown` → local_only; OpenITI sharhlari — `conditional` CC BY-NC-SA 4.0; goldenshamela/islamarchive sharhlari — `unknown`.
- **Haqiqiy paketlarni public repoga/Pages’ga joylash hali QILINMAGAN** — foydalanuvchidan aniq tasdiq kutiladi (repo public; git tarixi qaytmaydi). Hozir `web/catalog.json` faqat sinov namunasi.
- Sharh matnlari `preview_window` (3000 belgi, keyingi uchrashuvda kesiladi); `sharh_belgi` 1-based; eski qatlam `legacy_unreviewed`; asosga topilmagan bog‘lama yaratilmaydi (Mirqot 1 084, Tibiy 655 — asos Mishkot 4 428 yozuv).
- Tibiy: mualliflik `attribution_unresolved`. Inglizcha tarjima paketlarga kiritilmagan.
- O‘tkazib yuborilgan sharhlar: `muslim/fath-al-mulhim`, `tirmidhi/maarif-al-sunan` (META: bog‘lama/matn yo‘q).

## 7. Qolgan vazifalar

1. Google Search Console — foydalanuvchi qadami (`docs/SEO.md`); tasdiqlash faylini/meta-tegni yuborsa repo ildiziga qo‘shiladi.
2. Real qurilmalarda en/ar matritsasi (`PLATFORM-TEST-MATRIX.md`) — natija kelsa yoziladi.
3. Agar Settings → Pages → Source hali “Deploy from a branch” bo‘lsa — “GitHub Actions” ga o‘tkazish (aks holda eski nashr paketlarsiz sayt bilan ustidan yozishi mumkin; jonli tekshiruv buni ushlaydi).
4. Katta paketlarni jild bo‘yicha bo‘lish (telefon xotirasi), yuklashni davom ettirish (resume); paket ichidagi cheklov matnlari (`limitations`) hozircha o‘zbekcha.
5. Huquqi noma’lum 18 paket uchun huquq dalili topilsa — `publish.classify` orqali keyingi Release.

## 8. Buyruqlar

```sh
cd hadis-manba-platformasi
python3 scripts/build_demo.py              # sinov paketlari + web/catalog.json
python3 -m pytest -q                       # (venv: mcp==2.3.0, pytest, jsonschema)
node tests/web/core.node.test.js
NODE_PATH=$(npm root -g) node tests/web/e2e.pw.js
hadis-manba build-site --catalog web/catalog.json --out web --base-url <URL>
HADIS_MANBA_REAL_HOME=/home/user/hadis-manba-kirish/library-run04 python3 -m pytest -q tests/test_real_corpus.py
```

# Hadith Library V7 — hisobot (2026-10-24)

**Holat:** mahalliy preview, ko‘rib baholash uchun. Deploy, push, merge, Release va paket e’lon qilish **bajarilmagan**. Ishlar faqat lokal `claude/new-session-f9jsvi` branchida (commitlar push qilinmagan). Jonli sayt o‘zgarmagan.

Dizayn bo‘yicha: Codex V6 namunasi tayyor shablon sifatida ko‘chirilmadi. Undagi oqim va funksiyalar saqlandi. Ko‘rinish rasmlar va izohlardagi talablar asosida ishlab chiqildi:

- ixcham bob guruhlari, katta yashil kartalarsiz;
- chapda Kitob → Bob daraxti;
- yuqorida joy satri;
- alohida roviy indeksi.

Texnik PASS dizayn ma’qullangani degani emas — bahosi sizda.

## 1. Dastur ishlashi

**Oqim.** Kitoblar → to‘plam (97 Kitob gridi) → tanlangan Kitob mundarijasi (`#/c/…`) → batafsil reader (`#/r/…`).

- **Mundarija:** chapda Kitob → Bob daraxti, o‘ngda bob guruhlari va hadis qatorlari. Bob guruhida to‘liq asl sarlavha, yig‘iladigan bob matni, terminal roviy va parcha bor.
- **Ko‘rish rejimlari:** Ixcham / Roviy va matn / To‘liq manba va sanad.
- **Daraxt:** Kitob bosilsa boblari yoyiladi yoki yig‘iladi. Oddiy scroll faol bobni daraxtda (`aria-current`) va joy satrida yangilaydi; chap panel joyida qoladi. Qo‘lda yig‘ilgan Kitobni scroll qayta ochmaydi.
- **Telefon:** daraxt drawer’da ochiladi. Bob tanlansa drawer yopiladi; Escape bosilsa fokus tugmaga qaytadi.
- **Nomlar va ﷽:** chapda bob tarjimasi yo‘q. «Imon kitobi» / «Ilm kitobi» nomlari ko‘rsatiladi. ﷽ Kitob sarlavhasi ostida faqat asl holida, tarjima panelisiz.
- **«بدء الوحى» boshi:** nashrning old qismi (muqaddima, taqriz, sarlavha sahifasi — 61 satr) alohida, yig‘ilgan holda va «muallif matni emas» yorlig‘i bilan. Buxoriy matni ﷽ bilan boshlanadi.
- **O‘qish sozlamalari** (reader, alohida hadis sahifasi va sharh sahifasida):
  - to‘liq sanad;
  - roviy o‘rin raqamlari (1…N);
  - tarjimalarni ochiq ko‘rsatish;
  - manbadagi harakatlar;
  - ﷺ belgisini ko‘rsatish (faqat ko‘rinish; nusxa/iqtibos asl matn bilan);
  - shrift 10–36, satr oralig‘i, mavzu.

  Tanlovlar saqlanadi. Telefonda sozlamalar pastdan chiqadigan oynada ochiladi; 320/390 px’da to‘liq ekranda.
- **Roviylar.** Ismga bosilsa panel hadis ostida ochiladi (hadisni yopmaydi). Panelda: shu sanaddagi o‘rin, uch hisob (unique hadis / sanad yo‘li / zikrlar), tarjimai hol va olimlar fikri (manba havolalari bilan).
- **Roviy indeksi.** «Hadislar (N)» alohida indeks sahifasini ochadi: 20 tadan sahifalangan; har qatorda raqam, ayni ism, yo‘l va o‘rin.
  - «Kitob va Bobga ajratish» ayni natijalarni guruhlaydi; son va doira o‘zgarmaydi.
  - Qator bosilsa yagona hadis sahifasi ochiladi: to‘plam → Kitob → Bob → raqam, roviy ajratib ko‘rsatilgan.
  - Ortga — ro‘yxatning ayni sahifasi, guruhi va scrolli; yana ortga — boshlang‘ich hadis va o‘qish joyi.
  - Browser Back/Forward, deep link va reload ham ishlaydi.
- **Audit xatolari:** T01 (601 nasab), T02 (umumiy «muallaq yo‘q» da’vosi), T03 (390 px sozlamalar), T04 («Mavjud parchani ochish») tuzatildi.
- **Boshqa ekranlar:** Ilmiy bog‘lanish stoli (asar → shorih → nashr, hadis linzasi, yonma-yon qiyos); Kitoblar registri (6 guruh, 17 barqaror rang); EN/AR/UZ to‘liq interfeys (537 kalit × 3); qamrov sahifasi (texnik tafsilotlar yig‘ilgan).

**Mahalliy qatlam** (`kind: overlay`). Asos paketning sha256 xeshiga bog‘langan. Asos yangilansa qatlam qo‘llanmaydi — karantinga tushadi va soxta belgilar chiqmaydi. Fayllar: `structure.json`, `isnad.jsonl`, `persons.jsonl`, `translations.jsonl`.

**Tekshiruvlar:**

| Tekshiruv | Natija |
|---|---|
| pytest | 76 passed, 10 skipped |
| Haqiqiy korpus (alohida) | 10/10 — sovuq keshda timeout kuzatildi, kesh isigach o‘tdi |
| Node | 7/7 |
| E2E | 80/80 |
| Haqiqiy ma’lumotli dalil skriptlari | 27/27 + 5/5 |
| Sovuq offline | PASS (Chromium desktop) |
| Screenshot kampaniyasi | 122 ekran, gorizontal toshish 0, konsol xatosi 0 |

A01–A64 natijasi: `docs/V7-QABUL-A01-A64.md`.

**Sinalmagan:**

- haqiqiy iPhone, Android, Windows va Mac qurilmalari;
- brauzer zoom va VoiceOver;
- Claude Desktop kabi MCP ilovasi.

## 2. Ilmiy qamrov (faqat Buxoriy, Shamela 1681 — Sultoniya nashri)

| Ko‘rsatkich | Qiymat |
|---|---|
| Kitob | 97 |
| Bob | 3512: toc teg bilan 3252; toc oralig‘i bilan tasdiqlangan 220; tasdiqlanmagan (belgili) 40 |
| Hadisli bob / hadissiz (faqat sarlavha) bob | 3404 / 108 |
| Yozuvlar | 7277 |
| Bobga joylangan yozuvlar | 7050 |
| Kitob boshida (bobsiz) | 64 |
| Dalilsiz (bobi aniqlanmagan) | 67 |
| Paragrafi topilmagan | 96 |
| Sanad yozuvlari | 7118: bitta aniq yo‘l 5212; qisman 1788; ح tarmoqli 41; yo‘lsiz 77 |
| Zikrlar | 36 272 (matndagi oralig‘i bilan 35 684) |
| Shaxslar | 1550 (aniq `man-ID` bo‘yicha) |
| O‘zbekcha | 4 hadis, 6 bob, 2 Kitob nomi — tahririy qoralama, ilmiy tekshiruvdan o‘tmagan |
| Harakatli sharh qatlami | yo‘q |

Muhim cheklovlar:

- **Bob manbasi.** Bob sarlavhalari, ularning matni va tartibi faqat manbadan olingan. Hech biri AI tomonidan yaratilmagan yoki tarjima qilinmagan. «Manbadagi tartib» — o‘rin, bosma bob raqami emas.
- **Tahvil (ح).** Manba (page_isnads) tahvilda bitta zanjir beradi. Ikkinchi tarmoq ismlari raqamsiz qoladi; vositachilar soni berilmaydi.
- **Indeks doirasi.** Roviy indeksi faqat Buxoriy ichida va mahalliy indeks bo‘yicha ishlaydi (7277 yozuvdan 7118 tasi). Butun kitob yoki boshqa to‘plamlar uchun emas.
- **O‘zbekcha qamrovi.** 7277 yozuvdan 4 tasi qoralama, 0 tasi tekshirilgan, 7273 tasi ulanmagan. Boshqa kitoblarda tarjima yo‘q.
- **Topilmagan (o‘ylab topilmagan):**
  - harakatli sharh matni;
  - bobga tegishli sharh bog‘lamalari;
  - Nabiy ﷺ so‘zlari va dialog rollari segmentatsiyasi;
  - Buxoriydan boshqa to‘plamlarning bob qatlami.

## 3. Tarqatish doirasi

- **Repo (lokal commitlar, push qilinmagan).** Kod va testlar:
  - `scripts/build_overlay.py`, `examples/namuna_overlay.py`;
  - `web/` (app, lib, pkg, registry, i18n, style, sw);
  - `tests/test_overlay.py`, `tests/web/e2e.pw.js`;
  - hujjatlar.

  Repoda xom manba, Shamela matni, page_isnads yoki narrators ma’lumoti **yo‘q**. Testlar faqat sun’iy fixture ishlatadi.
- **Mahalliy qatlam** `hm-overlay-bukhari-structure-isnad-0.1.0.hmz` (3,6 MB, sha256 `edb263aebbf46792c6af765b3aa9fe212859edd324b820203650864919364755`) **faqat mahalliy**. Shamela/AuthenticIlm ma’lumoti «research and personal use» shartida, qayta tarqatish ruxsati yo‘q. Shuning uchun u katalogda yo‘q va public Git, Pages yoki Release’ga chiqmaydi. Uni Kutubxonam → «Fayldan o‘rnatish» orqali qo‘lda o‘rnatish mumkin.
- **Ko‘rinmaydigan ma’lumot.** Preview’dagi paketlar mavjud jonli (live-local) nusxa bilan bir xil. Shaxsiy qaydlar va mahalliy fayllar public’ga chiqmaydi.
- **Nashrdan oldin kerak bo‘ladigan ishlar (ruxsatingizdan keyin):**
  - statik /en/ va /ar/ sayt hamda Release’ni registr tartibida qayta yaratish (A09);
  - service worker versiyasi tekshiruvi;
  - jonli smoke test.

  Qatlam baribir public’ga chiqmaydi.

**Nashr uchun aniq ruxsatingizni kutaman.** Preview’ni ko‘rganingiz nashr ruxsati hisoblanmaydi.

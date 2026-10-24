# Hadith Library V7 — A01–A64 qabul jadvali (2026-10-24)

Bu ko‘rib baholash uchun **mahalliy preview** natijasi. Hech narsa deploy, push yoki Release qilinmagan. Texnik PASS dizayn ma’qullangani degani emas: dizayn bahosi va nashr ruxsati foydalanuvchida.

Holatlar: **PASS** — shu muhitda dalil bilan o‘tdi. **FAIL** — bajarilmagan yoki qisman bajarilgan; nima yetishmasligi yozilgan. **NOT TESTED** — bu bosqichda sinab ko‘rilmagan (masalan, haqiqiy qurilma). Bir talabning qismlari turli holatda bo‘lsa, ikkalasi ham yozilgan.

## Muhitlar

| Kod | Muhit |
|---|---|
| M1 | Chromium (Playwright, headless), mahalliy preview `127.0.0.1:8820`. Haqiqiy paketlar: `hm-bukhari-hj120` 1.0.1, Fath al-Bari, Umdat al-Qari + mahalliy qatlam `hm-overlay-bukhari-structure-isnad` 0.1.0 (sha256 `edb263ae…4755`). Ekranlar: 1366×900, 768×1024, 390×844, 320×720; en/ar/uz; light/dark. |
| M2 | `scripts/verify.sh` — E2E **80/80** (20 ssenariy × en/ar × desktop/mobile-390). Bunda sintetik namuna paketlar va sintetik qatlam ishlatiladi. |
| M3 | pytest **76 passed, 10 skipped**. Skip bo‘lganlar — haqiqiy korpus testlari. Ular alohida ishga tushirildi (`HADIS_MANBA_REAL_HOME=…/library-run04`): **10/10**. Izoh: birinchi, sovuq keshli ishga tushirishda 2,6 GB SQLite ustida API vaqt cheklovi (timeout) sabab 8/10 yiqildi; kesh isigach ketma-ket ikki marta 10/10. Asosiy commit `2ea9c35` da ham xuddi shunday kuzatildi; V7 `src/` ni o‘zgartirmagan. |
| M4 | Chromium, service worker yoqilgan: preview ochildi → brauzer yopildi → **tarmoqsiz** qayta ochildi (sovuq offline). |

Dalil fayllari preview ZIP ichida joylashgan:

- `dalillar/evidence-report.json` — 27 tekshiruv, 27/27 o‘tdi.
- `dalillar/evidence2-report.json` — 5 tekshiruv.
- `dalillar/offline-report.json`.
- `dalillar/verify.log`.
- `dalillar/ev-*.png`.
- `screenshots/keyin/` — 122 ekran; `after-report.json`: gorizontal toshish 0, konsol xatosi 0.
- `screenshots/oldin/` — 27 ekran (jonli versiya `2ea9c35`).
- `screenshots/oldin-keyin/` — 9 juft taqqoslash.

## Audit xatolari T01–T04

| ID | Holat | Natija |
|---|---|---|
| T01 | PASS | 601-hadisda Solimning to‘liq nasabi bitta zikr va 4-o‘rinda turadi. «وَأَبُو بَكْرِ بْنُ أَبِي حَثْمَةَ» yo‘ldan tashqarida qoladi (o‘rin raqamisiz). Ibn Umar terminal roviy, 5-o‘rinda. |
| T02 | PASS | «Muallaq yo‘q» degan umumiy da’vo olib tashlandi. Endi: «Tasniflanmagan… Bu muallaq material yo‘q degani emas». |
| T03 | PASS | O‘qish sozlamalari 390 va 320 px’da (AR/UZ) to‘liq ekranda; gorizontal toshish yo‘q. |
| T04 | PASS | Tugma nomi «Mavjud parchani ochish» («to‘liq» emas). |

## A01–A64

| ID | Holat | Amalga oshirilgani · kutilgan → amaldagi | Dalil | Muhit |
|---|---|---|---|---|
| A01 | PASS | Mundarijada uch ko‘rinish bor: Ixcham / Roviy va matn / To‘liq manba va sanad. Tanlov qurilmada saqlanadi. 8-hadis qatori: `8 \| ابْنِ عُمَرَ \| …parcha`. «To‘liq» tanlanib reload qilinganda `aria-pressed=true` va 51 to‘liq qator. | evidence «A01»; `keyin/*-04-contents`, `*-05-contents-scrolled` | M1 |
| A02 | PASS | T01 ga qarang. Takrorlangan ism har biri o‘z mention ID’si va oralig‘i bilan; monoton yo‘l moslashuvi. | evidence «A02/T01»; `keyin/*-11-h601-chain`; `test_t01_nasab…`, `test_bukhari8_ordinals_and_repeated_person…` | M1, M3 |
| A03 | PASS | 41-hadis: tasnif yo‘qligi «material yo‘q» deb ko‘rsatilmaydi. al-Mu’allo roviy sifatida qoladi, muallaq yorlig‘i emas. | evidence «A03/T02»; `keyin/*-12-h41-evidence`; `test_mualla_name_is_a_narrator…` | M1, M3 |
| A04 | PASS | 1-hadis: 6 vositachi (Humaydiy → … → Umar); muallif va Nabiy ﷺ sanalmaydi. 17661/17713 bog‘lanishi sahifa + bosma raqam bilan. ح yoki qisman yozuvga son berilmaydi. | evidence2 «A04»; `test_key_is_not_printed_number…`, `test_tahwil_branch_is_not_counted` | M1, M3 |
| A05 | PASS | Mahalliy qatlam faqat asos paketining sha256 mos kelsa qo‘llanadi; asos yangilansa qatlam karantinga tushadi. Teskari indeksda barcha ID’li zikrlar va yo‘l a’zolari bor: 1550 shaxs, 36 272 zikr. | E2E 13, 16; evidence A61 | M1, M2 |
| A06 | PASS | Roviy paneli hadis matni ostida ochiladi, ustiga tushmaydi. Panelda «Shu sanadda: 4/4-o‘rin» va uch alohida hisob: 782 / 778 / 679. | evidence «A06/A38»; `dalillar/ev-narrator-panel.png` | M1 |
| A07 | **FAIL** (qisman) | PASS qismi: roviy belgilari (sanad/terminal/yo‘ldan tashqari) manba xeshi, nusxa va eksportni o‘zgartirmaydi (A34, E2E 14). FAIL qismi: Nabiy ﷺ so‘zlari, dialog, mavquf, maqtu’, qudsiy rollari uchun manbali segmentatsiya va fixture’lar yo‘q. | — | M1, M2 |
| A08 | PASS | «ﷺ belgisini ko‘rsatish» sozlamasi (standartda o‘chiq) faqat ko‘rinishni o‘zgartiradi. Nusxa va iqtibosda asl «صلى الله عليه وسلم» qoladi. | evidence «A08» | M1 |
| A09 | **FAIL** (qisman) | PASS qismi: PWA’da yagona registr — 6 guruh, 17 asar, 17 barqaror rang (Kitoblar, to‘plam, Kutubxonam), uch tilda. FAIL qismi: statik /en/ va /ar/ sayt hamda Release qayta yaratilmadi (nashr taqiqlangan); u yerlarda eski tartib. | `keyin/*-02-books` | M1 |
| A10 | PASS | Kitoblar bo‘limida katalogdagi barcha asar va sharhlar muallif, nashr va holat bilan. Yangi metadata yaratilmagan. | `keyin/*-02-books`, `*-17-library` | M1 |
| A11 | PASS | E2E 1–5: faqat kitob; faqat sharh; asosni keyin qo‘shish; kitob + 2 sharh; mavjud paket qayta yuklanmaydi. | `dalillar/verify.log` | M2 |
| A12 | PASS | E2E 6–8: sharhni o‘chirish; asosni o‘chirish; boshqa nashr faqat raqam bilan bog‘lanmaydi. | `verify.log` | M2 |
| A13 | PASS · NOT TESTED | PASS: Fath’ning ikki nashri alohida (`test_fath_editions_are_separate`); legacy belgisi (`test_legacy_links_marked`); parcha oxiri tasdiqlanmagan oyna (`keyin/*-13-commentary`). NOT TESTED: Tibiy atribut qatlamlari bu bosqichda tekshirilmadi. | M3 (real korpus), M1 | M1, M3 |
| A14 | PASS · NOT TESTED | PASS: 600 dan keyingi hadis (601) ochiladi; oldingi/keyingi (40/42, 490/492) ishlaydi; guruh raqami saqlanadi (`test_grouped_number_kept_as_group`). NOT TESTED: cross-chapter, suffiksli va raqamsiz yozuvlarning to‘liq matritsasi. | `keyin/*-10`, `*-12` | M1, M3 |
| A15 | PASS · NOT TESTED | PASS: 320, 390 va 768 px; AR/UZ/EN; light/dark — 122 ekranda toshish 0. NOT TESTED: 360/430 px, brauzer zoom, telefonda eng katta shrift. | evidence «A15/A50» ×2; `after-report.json` | M1 |
| A16 | PASS | Yopiq drawer `hidden`, unda fokuslanadigan element 0. Ochilganda fokus ichkarida; bob tanlansa drawer yopiladi. Escape bosilsa fokus «Kitob va boblar» tugmasiga qaytadi. | evidence «A16/A59» (AR 390, UZ 320); E2E 13 | M1, M2 |
| A17 | PASS | Sharh sahifasining o‘z o‘qish sozlamalari bor. Harakatsiz parcha «harakatli qatlam ulanmagan» deb yoziladi. | evidence2 «A17»; `keyin/*-13-commentary` | M1 |
| A18 | **FAIL** | Harakatli sharh qatlami yo‘q: manbali, tekshirilgan harakatli matn ulanmagan. Faqat manbadagi mavjud harakat belgilari ko‘rsatiladi. | — | — |
| A19 | **FAIL** | Avtomatik yoki tekshirilgan harakat qatlami yo‘q. | — | — |
| A20 | PASS | Regressiya: aniq / harakatsiz / raqam / muallif bo‘yicha qidiruv; bir nechta nomzod avtomatik tanlanmaydi. | `test_exact_normalized…`, `test_multiple_candidates…`; E2E 0, 1, 11; `keyin/*-16-search` | M1, M2, M3 |
| A21 | PASS | Buzuq import va uzilgan staging kutubxonani buzmaydi; eksport/import; qayta o‘rnatish idempotent. | E2E 9, 12; `test_idempotent_reinstall`, `test_failed_install_keeps_working_library`, `test_tampered_member_rejected` | M2, M3 |
| A22 | PASS | Yangilashda ID, havola va qaydlar saqlanadi; rollback; qaydlar zaxirasi va tiklash. | E2E 10, 12; `test_upgrade_and_rollback` | M2, M3 |
| A23 | PASS · NOT TESTED | PASS (M4): tarmoqsiz sovuq ochilishda mundarija (51 qator), reader (o‘rinlar 1–4), roviy indeksi (20/791), qidiruv (4 natija), sharh va nusxa ishladi. NOT TESTED: haqiqiy telefonda. | `dalillar/offline-report.json`, `ev-offline-cold.png` | M4 |
| A24 | NOT TESTED | Statik /en/ va /ar/ sayt V7 da o‘zgartirilmadi va nashr qilinmaydi. Generator testi `test_site` PASS. | M3 | M3 |
| A25 | NOT TESTED | Haqiqiy iPhone Safari, Android Chrome, Windows va Mac qurilmalarida sinalmagan. | — | — |
| A26 | PASS | Path traversal, zip bomb, symlink, ro‘yxatda yo‘q fayl va kod rad etiladi; manba matni ko‘rsatma emas, ma’lumot; audit faqat o‘qiydi. Qatlam quruvchi repo ichiga yozishni rad etadi. Xom manba faqat o‘qildi; `library-run04` SQLite o‘zgarmadi (mtime 2026-10-23 14:30). | pytest `test_path_traversal_rejected`, `test_zip_bomb_rejected`, `test_symlink_rejected`, `test_source_text_is_data_not_instruction`, `test_audit_read_only`, `test_persons_by_exact_id_and_output_outside_repo` | M3 |
| A27 | PASS · NOT TESTED | PASS: rasmiy MCP Python SDK mijozi bilan stdio orqali tools → search → evidence (`test_mcp_stdio_real_client`). PWA MCP’siz ishlaydi (E2E 11). NOT TESTED: Claude Desktop kabi ilova ichida. | M3 | M2, M3 |
| A28 | PASS | en/ar/uz kalitlari 537 / 537 / 537, yetishmagani 0. | evidence «A28» | M1 |
| A29 | PASS · NOT TESTED | PASS: 3 til × 21 ekran; panel, indeks, sozlamalar va drawer AR/UZ da, inglizcha jim fallback yo‘q. NOT TESTED: har tilda barcha xato holatlari. | `keyin/` | M1 |
| A30 | **FAIL** | O‘zbekcha tarjima xaritasi faqat Buxoriy namunasidan: 4 hadis (8, 9, 59, 60), 6 bob sarlavhasi va kirishi, 2 Kitob nomi. Hammasi «tahririy qoralama, ilmiy tekshiruv kutilmoqda» belgisi bilan. Tarjima arabchadan keyin chiqadi va asos xeshiga bog‘langani uchun boshqa nashrga ko‘chmaydi. Qolgan 7273 yozuv va boshqa kitoblar tarjimasiz. | `keyin/*-06-reader-h8` | M1 |
| A31 | **FAIL** (qisman) | Qamrov jadvali halol: Buxoriy — 7277 / qoralama 4 / tekshirilgan 0 / ulanmagan 7273. Lekin jadval faqat o‘rnatilgan asos kitoblarni ko‘rsatadi, butun registrni emas. | evidence2 «A31»; `keyin/*-18-coverage` | M1 |
| A32 | PASS · FAIL | PASS (Buxoriy): roviy indeksi ayni asar va nashr bilan cheklangan; uch hisob; barcha natijalar sahifalangan (40 sahifa, oxirgisida 11 qator). FAIL: boshqa to‘plamlar uchun sanad indeksi yo‘q. | evidence A61 | M1 |
| A33 | PASS | Takror roviy (601-hadisda Ibn Umar), bir xil qisqa ism (Ikrima 4454 ≠ 10547), qisman indeks ogohlantirishi («7277 yozuvdan 7118 tasi»). Ikki yo‘l mexanikasi sintetik qatlamda tekshirilgan (E2E 15). | evidence A40, A06; E2E 15 | M1, M2 |
| A34 | PASS | Buxoriy 8: Ubaydulloh¹ → Hanzala² → Ikrima³ → Ibn Umar⁴. Raqamlarni o‘chirsa ham matn, sha256 (`cfbc5f35…`) va nusxa o‘zgarmaydi. | evidence «A34»; E2E 14 | M1, M2 |
| A35 | **FAIL** (qisman) | PASS qismi: soxta o‘rin yo‘q. 6-hadisda manba bitta yo‘l beradi; Abdon tarmog‘idagi ismlar raqamsiz qoladi va «vositachilar soni berilmaydi» deb yoziladi. Raqamlar mobil va RTL’da kesilmaydi. FAIL qismi: haqiqiy ma’lumotda mustaqil B yo‘li o‘rinlari yo‘q (page_isnads tahvilda bitta zanjir beradi); A/B faqat sintetik qatlamda. | evidence «A35» | M1, M2 |
| A36 | PASS | «Ilmiy bog‘lanish stoli»: asar → shorih → nashr oilasi (4 ta), hadis linzasi (8), o‘rnatilgan va o‘rnatilmagan ajratiladi. | evidence2 «A36/A37»; `ev-desk-compare.png`; `keyin/*-14-desk` | M1 |
| A37 | PASS | Tanlangan 2 sharh parchasi yonma-yon: manba, jild va bet, parcha oxiri / legacy holati bilan. 320 px’da bir ustun, toshish yo‘q. | `keyin/*-m320-14-desk` | M1 |
| A38 | PASS | Panel → «Hadislar (782)» → indeks; har qatorda o‘rin. Uch hisob aniq doira (scope) bilan. | evidence A06, A61 | M1 |
| A39 | PASS | Tarjimai hol va olimlar fikri `man-3807` ga bog‘langan, 16 ta manba havolasi bilan. «Manba parchasi, tekshirilmagan» holati ko‘rsatiladi; shaxs haqida o‘z hukmimiz chiqarilmaydi. | evidence2 «A39»; `ev-narrator-bio.png` | M1 |
| A40 | PASS | `man-4454` → 3 natija (8, 1774, 4108); `10547` u bilan aralashmaydi. | evidence «A40»; `test_persons_by_exact_id…` | M1, M3 |
| A41 | PASS | To‘plam → 97 Kitob gridi → tanlangan Kitobda 43 bob guruhi va 51 hadis qatori bir sahifada; bob yoki hadis bosilsa reader ochiladi. Kitob bob deb berilmaydi («manbada bob sarlavhasi yo‘q»). | evidence «A41/A53», «A52» | M1 |
| A42 | PASS | Imon kirishidagi «وهو قول وفعل ويزيد وينقص…» 1-bob matni sifatida chiqadi (qatlamda bor; `.hmz` da yo‘q edi). «دعاؤكم إيمانكم» (faqat sarlavha) va «أمور الإيمان» joyida. Bob matni 8-hadisga qo‘shilib ketmaydi. | evidence «A42/A48» | M1 |
| A43 | PASS | Har bobda: parent Kitob (`kitab_basis`), «manbadagi tartib N» (bosma raqam emas) va manbadagi joy «Sultoniya nashri 1-juz, 11-bet». sunnah.com book/chapter raqamlari bilan aralashmaydi. | `keyin/*-04-contents`; `test_units_attach_to_chapters_only_by_page_and_number` | M1, M3 |
| A44 | **FAIL** (qisman) | PASS qismi: manbadan tashqari bob, sarlavha yoki mansublik yaratilmaydi. FAIL qismi: bobga tegishli Fath/Umdat sharhi alohida target sifatida ulanmagan — sharhlar faqat hadis darajasida. | — | — |
| A45 | **FAIL** | Kitob/Bob qatlami faqat Buxoriy uchun (97 Kitob, 3512 bob). Boshqa to‘plamlar paketdagi bo‘limlar ro‘yxati bilan qoladi, bob sifatida ko‘rsatilmaydi. | `keyin/*-03-collection` | M1 |
| A46 | PASS | PageDown bilan faol bob b1 → b3 → b7 → … → b19 almashadi; joy satri yangilanadi; chap panel top=72 da qoladi. | evidence «A46/A57» | M1 |
| A47 | **FAIL** | O‘zbek rejimida faqat namunadagi 6 bob, 4 hadis va 2 Kitob nomi tarjimali; qolganlari tarjimasiz, o‘ylab topilmagan. Yig‘ish/yoyish originalni yashirmaydi (PASS qismi). | — | M1 |
| A48 | PASS | Ketma-ket boblar chegarasi aniq: meta satr, to‘liq sarlavha, kirish, hadislar, ajratgich — light, dark va RTL’da. | evidence «A42/A48»; `keyin/*-05`, `*-06` | M1 |
| A49 | PASS | Font 10 qilinganda reader 10px, reloaddan keyin ham saqlanadi; alohida hadis sahifasida ham 10px. 320 px’da sozlama boshqaruvlari ekran ichida (belgilash katagi 22px, butun qator bosiladi). | evidence «A49/A60» | M1 |
| A50 | PASS · NOT TESTED | PASS: 320/390 brauzer emulyatsiyasi. NOT TESTED: haqiqiy telefonda touch, qaytish va offline. | evidence «A15/A50» | M1 |
| A51 | PASS | Chapdagi daraxtda faqat ochilgan Kitobning asl boblari to‘liq o‘raladi; chapda tarjima yo‘q; uzun sarlavha kesilmaydi. | `keyin/*-04`, `*-06`, `*-21-ilm-contents` | M1 |
| A52 | PASS | Ikki umumiy ko‘rinish saqlangan (to‘plam gridi va Kitob mundarijasi); boshlang‘ich ekran reader emas. | evidence «A52» | M1 |
| A53 | PASS | Kitob → mundarija → hadis → reader; Back mundarijaga va scroll joyiga qaytaradi (900 → 900). Mobil/RTL’da ham (E2E 13 ar/mobile-390). | evidence «A53» | M1, M2 |
| A54 | PASS | «Imon kitobi» / «Ilm kitobi» (uz) va «Book of Belief» / «Book of Knowledge» (en) — faqat foydalanuvchi namunasidan, provenance bilan. ﷽ Kitob sarlavhasi ostida faqat asl holida; tarjima paneli yo‘q. Boshqa tarjima talablari saqlangan (A30/A47 ochiq). | evidence «A54» | M1 |
| A55 | PASS | Boblar faqat yoyilgan Kitob ostida; o‘ngdagi sarlavhalar to‘liq; preview’da terminal roviy va «parcha» belgisi. To‘liq sanad/matn, roviy, raqam toggle, 10px hajm, tarjimani yig‘ish va bog‘lanish stoli saqlangan. | `keyin/` | M1 |
| A56 | PASS | Kitob bosilsa boblari yoyiladi/yig‘iladi; qo‘lda yig‘ilgan Kitobni scroll qayta ochmaydi. Bobsiz Kitobda soxta «0 bob» yo‘q. | evidence «A56» | M1 |
| A57 | PASS | Faol bobda `aria-current=location`; yig‘ish/yoyish kuzatuvni buzmaydi. | evidence «A46/A57», «A56» | M1 |
| A58 | PASS (texnik) | Bob guruhlari ixcham; katta yashil kartalar va floating tugma yo‘q. Dizayn bahosi foydalanuvchida. | `oldin-keyin/*-04-contents` | M1 |
| A59 | PASS | Telefonda ham daraxt bor; bob bosilsa ayni joyga o‘tadi va menyu yopiladi; 320/390 px va RTL’da kesilmaydi. | evidence «A16/A59» | M1 |
| A60 | PASS | Reader va alohida hadis sahifasida bir xil sozlamalar: full / ord / tropen / marks / saw / fs. Tanlovlar o‘tishlarda saqlanadi. | evidence «A49/A60» | M1 |
| A61 | PASS | 20 tadan sahifalash, 791 natija, 40 sahifa; oldingi / keyingi / oxirgi. Deep link `p=40` (11 qator) va reload ishlaydi. | evidence «A61/A64», «A61 deep link» | M1 |
| A62 | PASS | Uch hisob alohida. Har qatorda manbadagi ism, yo‘l va o‘rin (masalan, «o‘rni 4/4»). Yo‘lda bo‘lsa-yu matnda belgilanmagan ism «ismi matnda belgilanmagan» deb yoziladi; noma’lum o‘rin raqamga aylantirilmaydi. | `keyin/*-08`, `*-09` | M1 |
| A63 | PASS | Yagona hadis sahifasi: to‘plam → Kitob → Bob → 491-hadis, roviy ajratib ko‘rsatiladi. «Roviy ro‘yxatiga qaytish» → 3-sahifa, guruhlangan, scroll 420. «Hadisga qaytish» → reader y=1178 va panel ochiq. Browser Back/Forward ham shu joylarni tiklaydi. | evidence «A63» ×3; `ev-single-occurrence.png` | M1 |
| A64 | PASS | Oddiy ro‘yxat → «Kitob va Bobga ajratish»: ayni 20 qator, jami 791 o‘zgarmaydi. | evidence «A61/A64» | M1 |

## Xulosa

| Holat | Soni | Talablar |
|---|---|---|
| PASS | 44 | qolganlari |
| PASS · NOT TESTED | 7 | A13, A14, A15, A23, A27, A29, A50 |
| PASS · FAIL | 1 | A32 (Buxoriyda PASS, boshqa to‘plamlarda indeks yo‘q) |
| FAIL (to‘liq yoki qisman) | 10 | A07, A09, A18, A19, A30, A31, A35, A44, A45, A47 |
| NOT TESTED | 2 | A24, A25 |
| **Jami** | **64** | |

Eng katta ochiq ishlar:

- O‘zbekcha tarjima (A30, A31, A47).
- Harakatli sharh qatlami (A18, A19).
- Buxoriydan boshqa to‘plamlar uchun Kitob/Bob va sanad indeksi (A32, A45).
- Nabiy ﷺ so‘zlari va dialog rollari (A07).
- Bobga sharh bog‘lash (A44).
- Statik sayt va Release registri (A09) — nashr ruxsatidan keyin.
- Haqiqiy qurilmalar (A25).

# Hadith Library V9 — hisobot (2026-10-24)

**Holat:** foydalanuvchi ruxsati bilan (2026-10-24) `main`ga qo‘shildi. Keyin (shu kuni, QARORLAR #53) boblar, sanad, roviylar va o‘zbekcha Kitob nomlari qatlamlari ham **ommaviy**: artifact’dagi 17 qatlam fayli o‘zgarmasdan [Release `hadis-manba-qatlamlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-qatlamlar-v1) da, saytda kitob bilan birga o‘rnatiladi. Hadis matnining o‘zbekcha tarjimasi hali qilinmadi (foydalanuvchi ko‘rsatmasi: keyingi yangilanishda).

## Nima qilindi

- **Roviylar — barcha 17 hadis kitobida** (oldin faqat Buxoriy va Termiziy): sanaddagi har bir roviyning o‘rni ¹²³, roviyni bosish → panel, roviy sahifasi; «Faqat ismlar» ko‘rinishi.

  | Kitob | Sanad manbasi | Sanad yozuvlari | Matnda raqamlangan roviy | Matnda zikr qilinmagan (yuqorida ko‘rsatiladi) | Shaxsi aniqlanmagan ism |
  |---|---|---|---|---|---|
  | Buxoriy | evidence | 7 276 / 7 277 | 38 267 | 336 | 101 |
  | Muslim | sequence | 7 459 / 7 459 | 47 701 | 845 | 1 347 |
  | Abu Dovud | sequence | 5 273 / 5 276 | 30 421 | 286 | 863 |
  | Termiziy | number_text | 4 048 / 4 053 | 22 642 | 125 | 61 |
  | Nasoiy | evidence | 5 768 / 5 768 | 34 342 | 113 | 44 |
  | Ibn Moja | text | 4 345 / 4 345 | 25 009 | — | 3 601 |
  | Molik (Muvatto) | sequence | 1 985 / 1 985 | 7 083 | 5 | 732 |
  | Doramiy | text | 3 382 / 3 406 | 15 817 | — | 2 236 |
  | Ahmad (Musnad, qisman) | text | 1 373 / 1 374 | 7 215 | — | 1 059 |
  | Al-Adab al-mufrad | text | 1 317 / 1 326 | 6 418 | — | 919 |
  | Mishkot al-masobih | text | 4 146 / 4 428 | 4 717 | — | 719 |
  | Riyozus-solihin | text | 1 676 / 1 896 | 1 793 | — | 295 |
  | Bulug‘ al-marom | text | 1 502 / 1 767 | 1 665 | — | 336 |
  | Shamoil | text | 402 / 402 | 2 109 | — | 118 |
  | Navaviy 40 | text | 41 / 42 | 41 | — | 10 |
  | Qudsiy 40 | text | 40 / 40 | 40 | — | 3 |
  | Shoh Valiyulloh 40 | text | 7 / 40 | 8 | — | 8 |

  Barcha 17 kitobda: **o‘rtada tushib qolgan o‘rin raqami — 0**, **ketma-ketligi buzilgan o‘rin — 0**, **boshqa ism ichidan olingan «roviy» — 0**. «Shaxsi aniqlanmagan ism» ustuni — zikrlar soni (ism yozilishi bo‘yicha ko‘rsatiladi).

  **Oldingi (V9 boshidagi) qatlam bilan solishtirish:**

  | | Oldin | Hozir |
  |---|---|---|
  | Ism ichidan olingan «roviy» (masalan «هشام بن عروة» dagi «عروة») | Muslim 1 094, Abu Dovud 584, Molik 118, Termiziy 28, Nasoiy 21, Buxoriy 11 | hammasida 0 |
  | Matnda raqamlangan roviy | Muslim 43 221, Abu Dovud 28 560, Ibn Moja 24 019, Molik 6 404 | 47 701, 30 421, 25 009, 7 083 |
  | Shaxsi aniqlanmagan ism | Muslim 1 903, Abu Dovud 1 421, Ibn Moja 4 694, Doramiy 3 264, Ahmad 1 436, Buxoriy 173 | 1 347, 863, 3 601, 2 236, 1 059, 101 |

  *Manba turlari:* **evidence** — shu nashrning Shamela sahifasidagi roviy havolalari; **number_text** — boshqa nashr (Bashar), hadis raqami va matn mosligi bilan; **sequence** — AuthenticIlm sanadlar jadvali, roviy ismlari matnda topilib bog‘langan; **text** — sanad jadvali yo‘q, sanad matnning o‘zidan (حدثنا / عن …) o‘qilgan.
- **O‘rin raqamlari matnning o‘z tuzilishidan** (qaror #47): ikki ism orasida rivoyat so‘zi bo‘lsa — keyingi o‘rin; faqat «و» — bir o‘rin (bir nechta ustoz); «ح / وحدثنا» — yangi yo‘l; «كلاهما / جميعا / قالا عن X» — barcha yo‘llar X dan davom etadi. «قال يحيى أخبرنا وقال الآخران حدثنا», «وهو ابن…», «يعني…», «واللفظ له», «المعنى» — izoh, roviy emas.
- **Ism ichidan ism olinmaydi** (qaror #48): «هشام بن عروة» dagi «عروة», «مولى أبي هريرة» dagi «أبي هريرة», «بشر بن عمر» dagi «بن عمر» endi alohida roviy deb raqamlanmaydi; «حدثني أبي» (otam) — alohida roviy.
- **Foydalanuvchi ko‘rsatgan misol** (Buxoriy, bosma raqam 4234): «سَالِمٌ، مَوْلَى ابْنِ مُطِيعٍ» — 6-o‘rin endi bor; ¹…⁷ uzluksiz.
- **O‘zbekcha Kitob nomlari** — barcha kitoblarda Kitob sarlavhasi ostida ko‘k rangda (427 nom, tahririy qoralama, faqat mahalliy).
- **GitHub ko‘rgazmasi:** README boshida banner + 4 surat, inglizcha va arabcha tavsif; `og:image` (ijtimoiy tarmoq va qidiruv ko‘rinishi uchun).

## Tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| pytest | 90 passed, 10 skipped |
| Node (JS = Python) | 7/7 |
| E2E (Chromium, en/ar × desktop/390) | 84/84 |
| Har kitob brauzerda (17 kitob, barcha Kitoblar o‘qish rejimida): tushib qolgan o‘rin raqami / raqamsiz roviy ismi / konsol xatosi / gorizontal toshish | hammasi **0** (Buxoriy 38 712 raqam, Muslim 48 631, Abu Dovud 30 709, Nasoiy 34 831, Ibn Moja 25 312, Termiziy 23 165 …) |
| O‘zbekcha Kitob nomi | har kitobda barcha Kitoblarda bor (Buxoriy 97/97, Muslim 57/57, …) |
| Qatlam tekshiruvi (`audit2`/`audit3`, 17 kitob) | o‘rin ketma-ketligi xatosi 0, o‘rtadagi bo‘shliq 0, ism ichidan olingan «roviy» 0 |
| Shaxsiy sinov havolasi (xostlangan nusxa) | 79 fayl; o‘rnatish base64 bo‘laklaridan — Navaviy 40 va Muslim mahalliy nusxada qayta tekshirildi (natija bir xil) |

**Sinalmagan:** haqiqiy iPhone/Android/Windows/Mac qurilmalari, VoiceOver.

## Cheklovlar (halol)

- Sanad matndan o‘qiladigan kitoblarda (Ibn Moja, Doramiy, Ahmad, Adab, Riyoz, Bulug‘, Mishkot, Shamoil, 40 hadis) roviy shaxsi ism shakli va ustoz–shogird juftligi bilan aniqlanadi; aniqlanmagan ism «shaxsi aniqlanmagan» deb ochiq ko‘rsatiladi (o‘ylab topilmaydi).
- Mishkot, Riyoz, Bulug‘ va Shoh Valiyulloh 40 hadisida ko‘p yozuvlar sanadsiz (faqat sahobiy nomi) — u yerda raqamlanadigan sanad yo‘q.
- Juda murakkab izohli sanadlar (masalan Ahmaddagi «قال عبد الله: وجدت في كتاب أبي…») to‘liq tuzilmaga keltirilmagan.
- Boblar, sanad va Kitob nomlari qatlami (Shamela/AuthenticIlm; asl sharti «research and personal use») — loyiha egasi tasdiqlagan ruxsat bilan Release’da (QARORLAR #53); xom Shamela/AuthenticIlm fayllari repoga kirmaydi. Buxoriy qatlami brauzerda bir marta ~1,5 daqiqada saqlanadi.

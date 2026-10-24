# Sanad indeksi (Sahih al-Buxoriy) — faqat mahalliy

27-bo‘lim. Foydalanuvchi qarori: sanad indeksi alohida tayyorlansin; qayta tarqatish ruxsati manbasi bilan aniqlanmaguncha **faqat mahalliy** saqlansin.

## Holat (2026-10-23)

| Savol | Javob |
|---|---|
| Indeks yasaladimi? | Ha, mahalliy: `scripts/build_isnad_index.py` → `isnad-bukhari-local.json` (repo va saytga kirmaydi). |
| Ommaga chiqadimi? | Indeks fayli — yo‘q. Undan yasalgan boblar/sanad/roviylar qatlamlari — **ha**, foydalanuvchi tasdiqlagan ruxsat bilan (2026-10-24, QARORLAR #53): [Release](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-qatlamlar-v1). |
| Ilovada ko‘rinadimi? | Hali yo‘q. Ilova hozircha faqat Nabiy ﷺga eng yaqin (terminal) roviyni ko‘rsatadi va to‘liq sanad yo‘qligini ochiq yozadi. Mahalliy indeksni ilovaga o‘rnatish (paket turi + o‘quvchida ko‘rsatish) — keyingi bosqich. |

## Manba

Foydalanuvchining 0-Manba’si (read-only), `manbalar/hadis-raqamlar/raw/`:

- `shamela-bukhari/pages.jsonl` — Shamela kitobi 1681 (ط السلطانية). Roviylar `<a href="inr://man-ID">` havolasi bilan, matn boshlanishi `<hadeeth-K>` bilan belgilangan; har paragraf bosma raqam bilan boshlanadi (`٥٤ - `).
- `task2/page_isnads.json` — `(book_id, shamela_page_id, hadeeth_key) → narrator_ids`. Buxoriy uchun `book_id = 1458`. Tartib Nabiy ﷺ tomondan muallifga qarab ketadi; oxirgi element Buxoriyning o‘zi (5495).
- `task2/narrators.json` — roviy ID → ism.

## Bog‘lash qoidasi (raqam tengligi bilan emas)

1. Paketdagi hadis (`hm-bukhari-hj120`) → uning dalil yozuvidagi `shamela-edition` nomzodi: URL’dagi sahifa ID + bosma raqam.
2. Shu sahifada shu raqam bilan boshlangan paragraf → undagi `<hadeeth-K>` kaliti.
3. `page_isnads(1458, sahifa, K)` → roviylar yo‘li.
4. Yo‘l paragrafdagi roviy havolalari tartibiga mos kelishi va har bir ism bizning matnimizda (sunnah.com) topilishi tekshiriladi.

`hadeeth_key` bosma raqam **emas**: 17661 (sahifa 10, key 1) — 1-hadis; 17713 (sahifa 104, key 1) — 54-hadis. Shuning uchun `book_id + hadeeth_key` bilan bog‘lash xato bo‘ladi. Bu holat `tests/test_isnad_index.py` da sinovga olingan.

## Vositalar soni

- Vositalar = bitta yo‘ldagi nomlari keltirilgan roviylar, **muallif (Buxoriy) va Nabiy ﷺ sanalmaydi**. 17661 da massiv uzunligi 7, vositalar 6 (Umar → Alqama → Muhammad ibn Ibrohim → Yahyo ibn Sa’id → Sufyon → Humaydiy).
- “Sanaddagi o‘rin” (`position_from_compiler`: 1 = muallifning shayxi) — bu **tabaqa emas**. Tabaqa (avlod) roviyning biografiyasidan aniqlanadi; bu indeksda tabaqa yo‘q.
- Son faqat `established_single_route` holatida beriladi. ح (tahvil) bo‘lsa, `page_isnads` faqat bitta yo‘lni beradi — `branched`, son berilmaydi.

## Qamrov (run04 ma’lumoti bilan)

| | Soni |
|---|---|
| Paketdagi yozuvlar | 7 277 |
| Shamela paragrafiga bog‘landi | 7 041 |
| Bitta yo‘l, to‘liq tasdiqlangan (son beriladi) | 4 914 |
| Qisman (son berilmaydi) | 2 086 |
| ح tarmoqli (son berilmaydi) | 41 |
| `page_isnads` qatori yo‘q | 77 |
| Shamela dalili yo‘q | 67 |
| Sahifada shu raqamli paragraf topilmadi | 92 |

“Qisman” sabablari (bir yozuvda bir nechtasi bo‘lishi mumkin): ismlarning hammasi bizning matnda topilmadi — 1 223; yo‘l sahifadagi havolalar tartibidan farq qiladi — 1 070; Nabiy ﷺga yetishi aniqlanmagan (mavquf/maqtu’/noma’lum) — 641; sahifada yo‘ldan tashqari roviy havolasi bor (ikkinchi yo‘l yoki matn ichidagi shaxs bo‘lishi mumkin) — 611.

Abu Sa’id ibn al-Mu’allo kabi ism oddiy roviy sifatida turadi; indeks muallaq tasnifini umuman bermaydi (manbada bunday maydon yo‘q).

## Ruxsat (nima uchun ommaga chiqmaydi)

- AuthenticIlm “Shamela 4 — Full Islamic Library Corpus” README (`raw/shamela-README.md`, “License” bo‘limi): “The original texts are in the public domain. The compilation and digitization rights belong to their respective owners. **Terms of use: Research and personal use.**”
- Roviy havolalari va `page_isnads` — Shamela’ning tahririy/raqamlashtirish qatlami; ochiq litsenziya (CC, ODbL va h.k.) ko‘rsatilmagan.

Ommaga chiqarish uchun **yetishmaydi**:
1. Shamela (al-Maktaba al-Shamela) egalaridan yoki AuthenticIlm’dan roviy havolalari va `page_isnads` asosidagi hosila indeksni qayta tarqatishga yozma ruxsat (yoki shunday ruxsat beruvchi litsenziya).
2. Agar ruxsat faqat hosila (ID va tartib, matnsiz) uchun bo‘lsa — bu doiraning aniq matni.
3. Ruxsat bo‘lmasa: mustaqil, ochiq litsenziyali sanad ma’lumoti (masalan, ochiq roviy bazasi) yoki o‘zimiz qo‘lda tekshirgan ma’lumot.

## Ishga tushirish (foydalanuvchi kompyuterida)

```sh
python scripts/build_isnad_index.py \
  --raw ".../0-Manba/manbalar/hadis-raqamlar/raw" \
  --package ".../hm-bukhari-hj120-1.0.1.hmz" \
  --out ".../mahalliy/isnad"
```

Natija `isnad-bukhari-local.json` — repo, Release va saytga **qo‘shilmaydi**.

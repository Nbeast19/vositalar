# Hadith Library V8 — hisobot (2026-10-24)

**Holat:** kod `claude/new-session-f9jsvi` branchida. Deploy, merge, Release va paket e’lon qilish **bajarilmagan**; jonli sayt o‘zgarmagan. O‘zbekcha tarjima bu versiyaga kiritilmadi (foydalanuvchi ko‘rsatmasi: keyingi yangilanishda).

## Nima qilindi

- **Boblar — barcha kitoblarga** (13 kitob, Shamela manbasi bilan; AI bob yaratmaydi):

  | Kitob | Kitob | Bob | Bobga joylangan yozuv |
  |---|---|---|---|
  | Buxoriy | 97 | 3512 | 7050 |
  | Muslim | 57 | 1335 | 6501 |
  | Abu Dovud | 43 | 1879 | 5198 |
  | Termiziy | 49 | 2309 | 3862 |
  | Nasoiy | 52 | 2546 | 5654 |
  | Ibn Moja | 38 | 1536 | 4309 |
  | Molik (Muvatto) | 61 | 702 | 1740 |
  | Doramiy | 24 | 1393 | 3337 |
  | Ahmad (Musnad, qisman) | 8 | 1356 | 1110 |
  | Al-Adab al-mufrad | 57 | 645 | 1305 |
  | Bulug‘ al-marom | 16 | 215 | 762 |
  | Mishkot al-masobih | 25 | 1101 | 4262 |
  | Riyozus-solihin | 20 | 380 | 1442 |

  Kitob o‘rnatilganda boblar qatlami ham avtomatik o‘rnatiladi (mahalliy katalogda bo‘lsa); oldin o‘rnatilgan kitobda «Boblar qatlamini qo‘shish» tugmasi chiqadi.
- **Chap daraxt** — mundarijada ham, alohida hadis sahifasida ham: har Kitob yoyiladi/yig‘iladi, boblar ichida; sahifa siljiganda daraxt joyida turadi, faqat joriy bob belgilanadi.
- **Roviylar (Buxoriy, Termiziy):** sanaddagi barcha roviylar ¹²³ o‘rin raqami bilan; «Faqat ismlar» tugmasi — «حدثنا / أخبرنا / عن»siz, ism ← ism ← النبي ﷺ.
- **Roviy paneli (hadis ostida):** necha hadisda ismi kelgani va o‘rinlar bo‘yicha sanoq (1-o‘rin N, 2-o‘rin M…). **Roviy sahifasi:** har hadisda o‘rni, Kitob › Bob, rang bilan; o‘rinni bosib saralash; hadis bosilsa ochiladi.
- **Rasululloh ﷺ so‘zlari** oltin fon bilan ajratiladi (barcha kitoblarda; Buxoriyda 3629, Muslimda 3195, Termiziyda 2442 hadisda).
- **Dizayn:** har kitob o‘z rangida (sarlavha lentasi islomiy geometrik naqsh bilan, daraxt, hadis kartasi, sharhlar), «shisha» panel, o‘qish chizig‘i, sahifa almashinuvi animatsiyasi, yorug‘/qorong‘i rejim.

## Tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| pytest | 78 passed, 10 skipped |
| Node | o‘tdi |
| E2E (Chromium, en/ar × desktop/390) | 84/84 |
| Haqiqiy ma’lumot (8 kitob o‘rnatildi, boblar, daraxt, sanad, roviy sahifasi) | 51/51 |
| Ko‘rinish suratlari (yorug‘/qorong‘i/telefon) | 33 ta, gorizontal toshish 0, konsol xatosi 0 |

**Sinalmagan:** haqiqiy iPhone/Android/Windows/Mac qurilmalari, VoiceOver.

## Cheklovlar

- **Muslim va Abu Dovud roviylari** — manba (`page_isnads`, book 683/630) `huggingface.co` dan olinadi; bu muhitda tarmoq ruxsati yo‘q. Ruxsat berilsa, bir buyruq bilan quriladi.
- **Ibn Moja roviylari** — mos manba topilmadi.
- Shamoil va 40 hadis kitoblarida Shamela bob tuzilmasi yo‘q.
- Boblar va sanad ma’lumoti (Shamela/AuthenticIlm, «research and personal use») **faqat mahalliy/shaxsiy** — public repo, Pages yoki Release’ga chiqmaydi. Repoda faqat kod va sun’iy sinov ma’lumoti.

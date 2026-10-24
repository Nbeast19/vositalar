# Tarqatish huquqi

**Bu huquqiy xulosa emas.** Maqsad: har asar/nashr/raqamli nusxa uchun dalil va shartni boshqarish, dalili yo'q materialni ommaviy tarqatmaga avtomatik qo'shmaslik.

## Uch tarqatma qatlami
1. **Ommaviy kod** — MIT (`LICENSE`). Manba matnlariga huquq bermaydi.
2. **Ruxsatli ma'lumot paketlari** — `build-public` allowlist:
   - `public`: barcha `rights[]` yozuvlari `approved` va `redistribution_allowed=true`, `classical_body` uchun yozuv bor.
   - `conditional`: shartli litsenziya (masalan CC BY-NC-SA) va `conditional_scope_clear=true` — alohida `paketlar-shartli/` va `catalog-shartli.json`, yorliq bilan.
   - `local_only`: `unknown`, `restricted`, doirasi noaniq `conditional` — ommaviy build'ga **kirmaydi**.
   - Maxfiylik tekshiruvi: paket matnida `/Users/…`, `C:\Users\…`, kalit/token belgilari bo'lsa — rad etiladi.
3. **Faqat mahalliy import** — foydalanuvchi o'zida qonuniy mavjud nusxani `install`/PWA "Fayldan import" bilan o'rnatadi. Yashirin scraping skripti yo'q.

## Joriy holat (2026-10-23)
| Material | rights_status | Ommaviy build | Izoh |
|---|---|---|---|
| Sinov namunasi (`namuna-*`) | approved, CC0-1.0 | faqat testlar (`build/demo`), saytda yo‘q | loyiha yozgan sun'iy ma'lumot |
| Sunnah.com manbalari (hadith-json 1.2.0, 17 kitob) | approved (foydalanuvchi tasdiqlagan ruxsat, 2026-10-23) | **public — nashr qilingan** ([Release](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-paketlar-v1)) | `permission_evidence`: "foydalanuvchi tasdig'i 2026-10-23"; qo'shimcha hujjat talab qilinmaydi |
| OpenITI korpus fayllari (masalan Mirqot JK007044 j01/j02, Mishkot Shamela0008360) | conditional — CC BY-NC-SA 4.0 ([OpenITI hujjatlari](https://github.com/OpenITI/documentation/blob/master/index.md)) | `conditional` kanal — **15 sharh nashr qilingan** (Release + `catalog-shartli.json`, litsenziya va manba havolasi har paketda) | "har kimga cheksiz tijoriy erkinlik" emas; NC va SA shartlari |
| AuthenticIlm/Shamela4_Full_DB (boblar, sanad, roviylar qatlamlari) | approved (foydalanuvchi tasdiqlagan ruxsat, 2026-10-24) | **public — nashr qilingan** ([Release `hadis-manba-qatlamlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-qatlamlar-v1), 17 qatlam) | Asl shart: «Research and personal use». `permission_evidence`: "loyiha egasi manba egasidan ruxsat olinganini tasdiqladi, 2026-10-24" (QARORLAR #53). Xom Shamela/AuthenticIlm fayllari baribir repoga kirmaydi |
| Boshqa sharh/nashr/tahqiq/hoshiya/skan | unknown (dalil yo'q) | local_only | har biri alohida tekshiriladi; katalog yozuvi va rasmiy havola berish matnni tarqatishdan alohida qaror |
| Qur'on/qiroat korpusi, tarjimalar, darslar, qo'lyozma, shaxsiy fayllar | — | **hech qachon** | doiradan tashqari (topshiriq 2-bo'lim); audit ularni `private_or_out_of_scope` deb belgilaydi |

## Huquq yozuvi maydonlari
`rights_status, license_id, license_url, license_evidence_file (+ sha256), license_checked_at, applies_to, redistribution_allowed, commercial_use_allowed, required_attribution, share_alike_requirements, permission_evidence`. Noma'lum maydon `true` qilinmaydi (`null`).

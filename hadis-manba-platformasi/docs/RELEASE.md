# Paketlarni nashr qilish (GitHub Releases + Pages)

Paketlar (`.hmz`) **gitda saqlanmaydi**: har biri GitHub Release’da alohida asset. Sayt (`web/`) gitda; Pages nashrida paketlar Release’dan olinib, SHA-256 tekshirilib saytga qo‘yiladi (brauzer Release’dan CORS sababli ololmaydi — `QARORLAR.md` #27).

## Joriy nashr
- Release: [`hadis-manba-paketlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-paketlar-v1) — 17 asosiy kitob + 15 sharh, `SHA256SUMS`, `RIGHTS-PAKETLAR.md`.
- Huquqi `unknown`/`restricted` paketlar tanlanmaydi (`publish.classify`) — mahalliy qoladi.
- Boblar va roviylar qatlamlari: [`hadis-manba-qatlamlar-v1`](https://github.com/Nbeast19/vositalar/releases/tag/hadis-manba-qatlamlar-v1) — 17 qatlam + `SHA256SUMS` (QARORLAR #53). Katalogda har kitob yonida `overlay` (`release_tag` bilan); Pages nashri ularni ham o‘z Release’idan olib, SHA-256 tekshiradi.
  Yangi qatlam versiyasi: Release’ga yuklang, so‘ng `python3 scripts/publish_release.py layers <qatlam.hmz …> --assets <assets.json> --repo Nbeast19/vositalar --tag <teg>`.

## Yangi versiya chiqarish
1. Paketlarni yasash: `python3 scripts/import_real.py --manba <0-Manba> --out <out> --commentaries`
2. Release papkasi: `python3 scripts/publish_release.py stage <out>/dist/<kerakli>.hmz … --out <stage> --tag <yangi-teg> --repo Nbeast19/vositalar`
   (`paketlar/*.hmz`, `SHA256SUMS`, `RIGHTS-PAKETLAR.md`, `RELEASE-NOTES.md`).
3. Release yaratish: `gh release create <yangi-teg> --target main --notes-file <stage>/RELEASE-NOTES.md <stage>/paketlar/*` (yoki GitHub veb sahifasida “Draft a new release”).
4. Asset ro‘yxati (`gh api repos/Nbeast19/vositalar/releases/tags/<teg> --jq '[.assets[]|{name,id}]' > assets.json`), so‘ng:
   `python3 scripts/publish_release.py catalog --stage <stage> --assets assets.json --web web --base-url https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/ --repo Nbeast19/vositalar --tag <yangi-teg>`
5. `web/` o‘zgarishlarini `main` ga kiriting → `hadis-manba-pages` nashr qiladi → `hadis-manba-jonli` jonli tekshiradi.

Eski Release’ni o‘chirmang: o‘rnatilgan foydalanuvchilar uchun `download_url` havolalari ishlashda davom etsin.

## Pages sozlamasi
Settings → Pages → Build and deployment → **Source: GitHub Actions** (workflow buni avtomatik o‘tkazishga urinadi; ruxsat bo‘lmasa qo‘lda bir marta tanlanadi). Repo ildizidagi boshqa vositalar (`.nojekyll`, avvalgidek) ham shu nashrda chiqadi.

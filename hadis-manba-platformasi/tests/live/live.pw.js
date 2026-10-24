// Jonli sayt tekshiruvi (GitHub Pages'dagi haqiqiy URL). GitHub Actions'da ishlaydi: .github/workflows/hadis-manba-jonli.yml
//   BASE=https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/ node tests/live/live.pw.js
// 1) SEO: sitemap'dagi har sahifa 200, self-canonical, hreflang en/ar/x-default, <script> yo'q; PWA noindex; robots.
// 2) PWA (Chromium headless, en 1280px va ar 390px): katalogdan kitob + sharh o'rnatish (Release'dan kelgan paketlar),
//    qidiruv, hadis → sharh → hadisga qaytish, internetsiz qayta ochish va qidiruv.
// Bu real iPhone/Android/Windows/Mac sinovi EMAS.
'use strict';
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');

const BASE = process.env.BASE || 'https://nbeast19.github.io/vositalar/hadis-manba-platformasi/web/';
const PUBLIC = process.env.PUBLIC_BASE || BASE;   // mahalliy sinovda: sahifalardagi ommaviy URL'lar shu bilan solishtiriladi
const local = u => u.replace(PUBLIC, BASE);
const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('  ✓ ' + name + ' (' + (Date.now() - t0) + ' ms)'); }
  catch (e) { results.push({ name, ok: false, error: String(e && e.stack || e) }); console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
}
function attr(tag, name) { const m = tag.match(new RegExp(name + '="([^"]*)"')); return m && m[1]; }
async function get(url) { const r = await fetch(url, { redirect: 'follow' }); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') }; }

async function seo() {
  let urls = [];
  await step('seo: sitemap.xml', async () => {
    const r = await get(BASE + 'sitemap.xml');
    assert.strictEqual(r.status, 200);
    urls = [...r.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    assert.ok(urls.length >= 20 && urls.every(u => u.startsWith(PUBLIC)), 'sitemap: ' + urls.length);
  });
  await step('seo: every page 200, self-canonical, reciprocal hreflang, x-default, no script', async () => {
    const bad = [];
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(urls.slice(i, i + 8).map(async u => {
        const r = await get(local(u));
        if (r.status !== 200) return bad.push(u + ' ' + r.status);
        const links = [...r.text.matchAll(/<link [^>]+>/g)].map(m => m[0]);
        const canon = links.filter(l => attr(l, 'rel') === 'canonical').map(l => attr(l, 'href'));
        const alt = {};
        links.filter(l => attr(l, 'rel') === 'alternate').forEach(l => { alt[attr(l, 'hreflang')] = attr(l, 'href'); });
        const lang = u.slice(PUBLIC.length).split('/')[0];
        if (canon.length !== 1 || canon[0] !== u) bad.push(u + ' canonical=' + canon);
        if (alt[lang] !== u || !alt.en || !alt.ar || alt['x-default'] !== alt.en) bad.push(u + ' hreflang=' + JSON.stringify(alt));
        if (!urls.includes(alt.en) || !urls.includes(alt.ar)) bad.push(u + ' alternate sitemapda yo\'q');
        if (/<script/i.test(r.text)) bad.push(u + ' script');
        if (!new RegExp('<html lang="' + lang + '" dir="' + (lang === 'ar' ? 'rtl' : 'ltr') + '"').test(r.text)) bad.push(u + ' lang/dir');
      }));
    }
    assert.deepStrictEqual(bad, []);
    console.log('    ' + urls.length + ' sahifa tekshirildi');
  });
  await step('seo: PWA shell noindex; robots.txt at host root does not block', async () => {
    const r = await get(BASE);
    assert.strictEqual(r.status, 200);
    assert.ok(/<meta name="robots" content="noindex">/.test(r.text));
    const host = new URL(BASE).origin;
    const rb = await get(host + '/robots.txt');
    console.log('    ' + host + '/robots.txt → HTTP ' + rb.status);
    if (rb.status === 200) assert.ok(!/^Disallow:\s*\/\s*$/m.test(rb.text), 'robots.txt hammasini yopgan');
  });
  await step('release: catalog packages served from the site and SHA-256 matches; Release download links work', async () => {
    const crypto = require('crypto');
    const cat = JSON.parse((await get(BASE + 'catalog.json')).text);
    const con = JSON.parse((await get(BASE + 'catalog-shartli.json')).text);
    const all = cat.packages.concat(con.packages);
    assert.strictEqual(all.length, 32);
    // boblar va roviylar qatlamlari (QARORLAR.md #53): kitob yonida, o'z Release'idan
    const layers = cat.packages.filter(p => p.overlay).map(p => p.overlay);
    assert.strictEqual(layers.length, 17, 'qatlamlar: ' + layers.length);
    for (const p of all.concat(layers)) {
      const r = await fetch(BASE + p.file);
      assert.strictEqual(r.status, 200, p.file);
      const h = crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
      assert.strictEqual(h, p.package_sha256, p.file);
      const d = await fetch(p.download_url, { method: 'HEAD', redirect: 'follow' });
      assert.strictEqual(d.status, 200, p.download_url);
    }
  });
}

async function go(page, hash) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(150);
  await page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
}
async function poll(page, fn, arg, timeout) {
  const end = Date.now() + (timeout || 120000);
  while (Date.now() < end) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(250); }
  throw new Error('kutish vaqti tugadi');
}
async function searchCount(page, q) {
  await go(page, '#/search');
  await page.fill('#q', q);
  await page.click('[data-act=search]');
  await page.waitForSelector('#natijalar[data-tayyor="1"]', { timeout: 60000 });
  return page.locator('#natijalar [data-act=hit]').count();
}

async function pwa(browser, lang, viewport, work, comm, unit, phrase) {
  const L = lang + ' ' + viewport.width + 'px';
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'allow' });
  await ctx.addInitScript(l => { try { if (!localStorage.getItem('hadis-manba.lang')) localStorage.setItem('hadis-manba.lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await step(L + ': open app, language, service worker', async () => {
    await page.goto(BASE);
    await page.waitForSelector('html[data-tayyor="1"]');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
    const d = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
    assert.deepStrictEqual(d, [lang, lang === 'ar' ? 'rtl' : 'ltr']);
    await go(page, '#/books');
    assert.ok(await page.locator('[data-act=open-book]').count() >= 17);
  });
  let layer = null;
  await step(L + ': install book + selected commentary (+ its chapters and narrators layer) from the catalogue', async () => {
    const book = work.replace(/^w-/, 'hm-') + '-hj120';
    layer = ((JSON.parse((await get(BASE + 'catalog.json')).text).packages.find(p => p.package_id === book) || {}).overlay || {}).package_id || null;
    await go(page, '#/w/' + work + '?tab=comms');
    await page.locator(`[data-act=pick-commentary][data-id="${comm}"]`).check();
    await page.click('[data-act=install-with]');
    const want = [book, comm].concat(layer ? [layer] : []);
    // Buxoriy qatlami (~4 MB, o'n minglab roviy yozuvi) brauzerda ~1,5 daqiqada saqlanadi — bir martalik
    await poll(page, ids => Promise.all(ids.map(id => Lib.getPackage(id))).then(ps => ps.every(p => p && p.offline_ready)), want, 300000);
    const got = await page.evaluate(() => Lib.packages().then(ps => ps.map(p => p.package_id)));
    assert.deepStrictEqual(got.sort(), want.slice().sort(), 'faqat tanlangan paketlar (va kitob qatlami)');
  });
  await step(L + ': hadith → this commentary → back to hadith', async () => {
    await go(page, '#/h/' + unit);
    assert.strictEqual(await page.locator('.text-card p.src').getAttribute('dir'), 'rtl');
    if (layer) assert.ok(await page.locator('.text-card p.src sup.ord').count() >= 1, 'sanad o\'rin raqamlari yo\'q');
    await page.waitForSelector('#sharh-panel[data-tayyor="1"]');
    const n = await page.locator('#sharh-panel [data-act=passage]').count();
    assert.ok(n >= 1, 'sharh havolasi yo\'q');
    await page.locator('#sharh-panel [data-act=passage]').first().click();
    await page.locator('#sharh-panel .c-preview [data-act=open-commentary]').click();
    await page.waitForSelector('main[data-route="s"] .text-card');
    await page.locator(`[data-act=to-hadith][href="#/h/${encodeURIComponent(unit)}"]`).first().click();
    await page.waitForSelector('.text-card p.src');
    assert.ok(decodeURIComponent(page.url()).endsWith('#/h/' + unit));
  });
  await step(L + ': previous / next follow the edition order; narrator panel keeps the hadith open', async () => {
    await go(page, '#/h/' + unit);
    const nextHref = await page.locator('[data-act=next-unit]').first().getAttribute('href');
    assert.ok(nextHref && nextHref.startsWith('#/h/'), 'next: ' + nextHref);
    // Havola bosilganda location.hash darhol o'zgaradi, hashchange va yangi render esa keyinroq keladi —
    // shuning uchun yangi sahifaning o'z havolasini kutamiz (eski sahifadagi data-tayyor="1" emas).
    await page.locator('[data-act=next-unit]').first().click();
    await page.waitForFunction(([h, u]) => decodeURIComponent(location.hash) === decodeURIComponent(h) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1'
      && decodeURIComponent(document.querySelector('[data-act=prev-unit]').getAttribute('href') || '') === '#/h/' + u, [nextHref, unit]);
    await page.locator('[data-act=prev-unit]').first().click();
    await page.waitForFunction(([h, u]) => decodeURIComponent(location.hash).endsWith(u) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1'
      && decodeURIComponent(document.querySelector('[data-act=next-unit]').getAttribute('href') || '') === decodeURIComponent(h), [nextHref, unit]);
    const nb = page.locator('[data-act=narrator]');
    if (await nb.count()) {
      await nb.first().click();
      // qatlam bilan panelda sanaddagi o'rinlar (.lvbar), qatlamsiz — hadislar ro'yxati
      await page.waitForSelector('[data-act=narrator-panel] .res-list li, [data-act=narrator-panel] .lvbar');
      assert.ok(decodeURIComponent(page.url()).endsWith('#/h/' + unit), 'roviy paneli sahifani almashtirdi');
      assert.ok(await page.locator('.text-card p.src').isVisible());
    }
  });
  await step(L + ': search online, then offline after reload', async () => {
    const on = await searchCount(page, phrase);
    assert.ok(on >= 1, 'natija yo\'q');
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('html[data-tayyor="1"]');
    const off = await searchCount(page, phrase);
    assert.strictEqual(off, on);
    await go(page, '#/h/' + unit);
    await page.waitForSelector('#sharh-panel[data-tayyor="1"]');
    assert.ok(await page.locator('#sharh-panel [data-act=passage]').count() >= 1);
    await ctx.setOffline(false);
  });
  await step(L + ': no horizontal scroll, no console errors', async () => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(w[0] <= w[1] + 1, w.join('>'));
    assert.deepStrictEqual(errors.filter(e => !/net::ERR|ERR_INTERNET_DISCONNECTED/.test(e)), []);
  });
  await ctx.close();
}

(async () => {
  console.log('BASE ' + BASE);
  await seo();
  const browser = await chromium.launch();
  await pwa(browser, 'en', { width: 1280, height: 860 }, 'w-bukhari', 'hm-sharh-bukhari-fath-al-bari', 'ed-bukhari-hj120:1', 'إنما الأعمال بالنيات');
  await pwa(browser, 'ar', { width: 390, height: 844 }, 'w-malik', 'hm-sharh-malik-al-tamhid', 'ed-malik-hj120:1111', 'الأعمال');
  await browser.close();
  const failed = results.filter(r => !r.ok);
  fs.writeFileSync('jonli-natija.json', JSON.stringify({ at: new Date().toISOString(), base: BASE,
    browser: 'chromium-headless (playwright ' + require('playwright/package.json').version + ')', results }, null, 1));
  console.log(results.length - failed.length + '/' + results.length + ' live checks passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

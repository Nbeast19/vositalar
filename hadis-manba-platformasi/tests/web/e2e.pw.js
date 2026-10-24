// PWA majburiy ssenariylari (22.5 + 26-bo'lim) — Chromium headless'da, English va العربية interfeysida,
// kompyuter (1280px) va telefon (390px) kengligida. Bu real iPhone/Android/Windows/Mac sinovi EMAS.
// Ishga tushirish: sh scripts/verify.sh  (yoki: python3 scripts/build_demo.py && node tests/web/e2e.pw.js; ilova build/demo nusxasidan)
'use strict';
const { chromium } = require('playwright');
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..', '..');
const SERVE_ROOT = path.join(PROJECT, 'build', 'demo');    // build_demo.py: GitHub project path ko'rinishida
const BASE_PATH = '/' + path.basename(PROJECT) + '/web/';
const V110 = path.join(PROJECT, 'build/test-paketlar/namuna-asos-a-1.1.0.hmz');
const OVERLAY = path.join(PROJECT, 'build/test-paketlar/namuna-overlay-a-1.0.0.hmz');
const SELECTION = path.join(PROJECT, 'dist/namuna-kitob-va-sharhlar-1.0.0.hmz');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.hmz': 'application/zip', '.xml': 'application/xml' };
const WORK = 'w-namuna';
const A1 = 'ed-namuna-a:u0001';

const fetchLog = [];
function startServer() {
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      fetchLog.push(p);
      let f = path.normalize(path.join(SERVE_ROOT, p));
      if (!f.startsWith(SERVE_ROOT)) { resp.writeHead(403); return resp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { resp.writeHead(404); return resp.end('not found'); }
      resp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

const results = [];
let currentCtxs = [];
async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('  ✓ ' + name + ' (' + (Date.now() - t0) + ' ms)'); }
  catch (e) { results.push({ name, ok: false, error: String(e && e.stack || e) }); console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
  finally { for (const c of currentCtxs) { try { await c.setOffline(false); } catch (e) { /* yopilgan */ } } }
}

async function newApp(browser, url, viewport, lang) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'allow', acceptDownloads: true });
  currentCtxs.push(ctx);
  await ctx.addInitScript(l => { try { if (!localStorage.getItem('hadis-manba.lang')) localStorage.setItem('hadis-manba.lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.waitForSelector('html[data-tayyor="1"]');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  return { ctx, page, errors };
}
async function go(page, hash) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForTimeout(120);
  await page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
}
async function poll(page, fn, arg, timeout) {  // waitForFunction Promise natijasini ishonchli kutmaydi
  const end = Date.now() + (timeout || 20000);
  while (Date.now() < end) { if (await page.evaluate(fn, arg)) return; await page.waitForTimeout(100); }
  throw new Error('kutish vaqti tugadi');
}
async function installFromCatalog(page, pid) {
  await go(page, '#/w/' + WORK + '?tab=comms');
  await page.evaluate(() => document.querySelectorAll('[data-act=progress]').forEach(b => b.remove()));
  await page.locator(`[data-pkg="${pid}"] [data-act=install]`).first().click();
  await poll(page, id => Lib.getPackage(id).then(p => !!(p && p.offline_ready)), pid);
  // o'rnatishdan keyin ilova sahifani bir marta qayta chizadi — tugashini kutamiz
  await page.waitForSelector('[data-act=progress][data-done]', { state: 'attached' });
  await page.waitForTimeout(250);
  await page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
}
async function importFile(page, file) {
  await go(page, '#/installed');
  await page.evaluate(() => document.querySelectorAll('[data-act=progress]').forEach(b => b.remove()));
  await page.setInputFiles('#import-fayl', file);
  await page.waitForSelector('[data-act=progress][data-done]', { state: 'attached', timeout: 20000 });
}
async function searchCount(page, q, scope) {
  await go(page, '#/search');
  await page.fill('#q', q);
  if (scope) await page.selectOption('#doira', scope);
  await page.click('[data-act=search]');
  await page.waitForSelector('#natijalar[data-tayyor="1"]');
  return page.locator('#natijalar [data-act=hit]').count();
}
async function offline(ctx, page, on) { await ctx.setOffline(on); await page.reload(); await page.waitForSelector('html[data-tayyor="1"]'); }
async function noHorizontalScroll(page) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (w[0] <= w[1] + 1) return;
  // qaysi element chiqib ketganini ko'rsatish (CI shriftlari lokaldagidan farq qiladi)
  const who = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect(); return r.width && (r.right > window.innerWidth + 1 || r.left < -1);
  }).slice(-6).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.') + ' ' +
    Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right)));
  assert.fail('gorizontal siljish: ' + w.join(' > ') + ' | ' + who.join(' ; '));
}
async function expectLang(page, lang) {
  const d = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
  assert.deepStrictEqual(d, [lang, lang === 'ar' ? 'rtl' : 'ltr']);
}
async function passCount(page) { await page.waitForSelector('#sharh-panel[data-tayyor="1"]'); return page.locator('#sharh-panel [data-act=passage]').count(); }
function count(p) { return fetchLog.filter(x => x.endsWith(p)).length; }

(async () => {
  const srv = await startServer();
  const URL0 = 'http://127.0.0.1:' + srv.address().port + BASE_PATH;
  const browser = await chromium.launch();
  const combos = [['en', 'desktop', { width: 1280, height: 860 }], ['ar', 'mobile-390', { width: 390, height: 844 }],
    ['ar', 'desktop', { width: 1280, height: 860 }], ['en', 'mobile-390', { width: 390, height: 844 }]];
  for (const [lang, label0, viewport] of combos) {
    const label = lang + '/' + label0;
    console.log('== ' + label + ' ==');
    currentCtxs = [];
    const A = await newApp(browser, URL0, viewport, lang);

    await step(label + ' 0: library — language, book search (Arabic/English/transliteration)', async () => {
      await expectLang(A.page, lang);
      const nav = await A.page.locator('#nav a').allTextContents();
      assert.ok(nav.length === 5 && nav[0] === (lang === 'ar' ? 'الرئيسية' : 'Home'), nav.join('|'));
      assert.strictEqual(await A.page.locator('#tabbar a').count(), 5);
      await go(A.page, '#/books');
      for (const q of ['النموذج', 'Sample', 'namudhaj', 'Sample author']) {
        await A.page.fill('#kitob-izla', q);
        assert.strictEqual(await A.page.locator('[data-act=open-book]:not(.yashirin)').count(), 1, q);
      }
      await A.page.fill('#kitob-izla', 'zzzz');
      assert.strictEqual(await A.page.locator('[data-act=open-book]:not(.yashirin)').count(), 0);
      await noHorizontalScroll(A.page);
    });
    await step(label + ' 1: one book only -> offline -> contents/search/number', async () => {
      await installFromCatalog(A.page, 'namuna-asos-a');
      await go(A.page, '#/w/' + WORK);
      assert.strictEqual(await A.page.locator('[data-pkg="namuna-asos-a"] .holat').first().getAttribute('data-status'), 'ready');
      await offline(A.ctx, A.page, true);
      assert.ok(await searchCount(A.page, 'طلب العلم') >= 2);
      await go(A.page, '#/read/namuna-asos-a');
      assert.ok(await A.page.locator('[data-act=toc-item]').count() >= 1);
      const total = (await A.page.locator('.cv-side .tk .cnt').allTextContents()).reduce((a, x) => a + Number(x), 0);
      assert.ok(total >= 12, 'mundarija: ' + total);
      await go(A.page, '#/search');
      await A.page.fill('[data-act=num-number]', '5');
      await A.page.click('[data-act=num-go]');
      await A.page.waitForSelector('[data-act=num-many]');
      await go(A.page, '#/h/' + A1);
      assert.strictEqual(await A.page.locator('.text-card p.src').getAttribute('dir'), 'rtl');
      await noHorizontalScroll(A.page);
    });
    await step(label + ' 1b: language switch keeps current hadith and installed packages', async () => {
      await go(A.page, '#/h/' + A1);
      const other = lang === 'ar' ? 'en' : 'ar';
      await A.page.selectOption('#til', other);
      await A.page.waitForSelector('.text-card p.src');
      await expectLang(A.page, other);
      assert.ok(decodeURIComponent(A.page.url()).endsWith('#/h/' + A1));
      assert.strictEqual(await A.page.evaluate(() => Lib.packages().then(p => p.length)), 1);
      await A.page.reload(); await A.page.waitForSelector('html[data-tayyor="1"]');
      await expectLang(A.page, other);                       // tanlov saqlangan
      await A.page.selectOption('#til', lang); await expectLang(A.page, lang);
    });
    await step(label + ' 1c: copy citation with source (labels in UI language, Arabic source unchanged)', async () => {
      await go(A.page, '#/h/' + A1);
      await A.page.click('[data-act=copy-citation]');
      await A.page.waitForSelector('#oxirgi-nusxa', { state: 'attached' });
      const txt = await A.page.inputValue('#oxirgi-nusxa');
      assert.ok(txt.includes(A1) && txt.includes('طَلَبِ العِلْمِ'));
      assert.ok(txt.includes(lang === 'ar' ? 'المصدر' : 'Source'), txt);
    });
    await A.ctx.close();

    const B = await newApp(browser, URL0, viewport, lang);
    await step(label + ' 2: commentary only -> offline read/search; missing main book is shown', async () => {
      await installFromCatalog(B.page, 'namuna-sharh-1');
      await offline(B.ctx, B.page, true);
      assert.strictEqual(await searchCount(B.page, 'المبادره اليه', 'commentary'), 1);
      await go(B.page, '#/s/ed-sharh1:o0001');
      await B.page.waitForSelector('[data-act=install-base]');
    });
    await step(label + ' 3: add main book later -> link activates without re-downloading commentary', async () => {
      const before = count('namuna-sharh-1-1.0.0.hmz');
      await installFromCatalog(B.page, 'namuna-asos-a');
      await go(B.page, '#/h/' + A1);
      await B.page.waitForSelector('#sharh-panel [data-act=passage]');
      assert.strictEqual(count('namuna-sharh-1-1.0.0.hmz'), before);
    });
    await step(label + ' 5: add another commentary -> main book not downloaded again', async () => {
      const before = count('namuna-asos-a-1.0.0.hmz');
      await installFromCatalog(B.page, 'namuna-sharh-2');
      assert.strictEqual(count('namuna-asos-a-1.0.0.hmz'), before);
      await go(B.page, '#/h/' + A1);
      assert.strictEqual(await passCount(B.page), 3);
    });
    await step(label + ' 6: remove one commentary -> book, other commentary and notes stay', async () => {
      await go(B.page, '#/h/' + A1);
      await B.page.click('[data-act=bookmark]');
      await poll(B.page, id => Notes.get('bookmark:' + id).then(n => !!n), A1);
      await B.page.evaluate(() => { document.querySelector('details.note-box').open = true; });
      await B.page.waitForSelector('[data-act=note]');
      await B.page.fill('[data-act=note]', 'my test note');
      await B.page.click('[data-act=note-save]');
      await poll(B.page, id => Notes.get('note:' + id).then(n => !!n), A1);
      await go(B.page, '#/installed');
      await B.page.click('[data-pkg="namuna-sharh-2"] [data-act=remove]');
      await poll(B.page, () => Lib.getPackage('namuna-sharh-2').then(p => !p));
      await go(B.page, '#/h/' + A1);
      assert.strictEqual(await passCount(B.page), 2);
      assert.strictEqual(await B.page.inputValue('[data-act=note]'), 'my test note');
    });
    await step(label + ' 10: update -> IDs/links/notes kept; rollback works', async () => {
      await importFile(B.page, V110);
      await go(B.page, '#/h/ed-namuna-a:u0003');
      await B.page.waitForSelector('text=تَصْحِيحٌ تَجْرِيبِيٌّ');
      await go(B.page, '#/h/' + A1);
      assert.strictEqual(await B.page.inputValue('[data-act=note]'), 'my test note');
      assert.strictEqual(await passCount(B.page), 2);
      await go(B.page, '#/installed');
      await B.page.click('[data-pkg="namuna-asos-a"] [data-act=rollback]');
      await poll(B.page, () => Lib.getPackage('namuna-asos-a').then(p => p && p.version === '1.0.0'));
      await go(B.page, '#/h/ed-namuna-a:u0003');
      assert.strictEqual(await B.page.locator('text=تَصْحِيحٌ تَجْرِيبِيٌّ').count(), 0);
    });
    await step(label + ' 7: remove main book -> commentary still works; link becomes install offer', async () => {
      await go(B.page, '#/installed');
      await B.page.click('[data-pkg="namuna-asos-a"] [data-act=remove]');
      await poll(B.page, () => Lib.getPackage('namuna-asos-a').then(p => !p));
      await go(B.page, '#/s/ed-sharh1:o0001');
      await B.page.waitForSelector('[data-act=install-base]');
      await go(B.page, '#/h/' + A1);
      await B.page.waitForSelector('[data-act=install-base]');
    });
    await step(label + ' 8: other edition -> no number-only link', async () => {
      await installFromCatalog(B.page, 'namuna-asos-b');
      await go(B.page, '#/h/ed-namuna-b:u0001');
      await B.page.waitForSelector('[data-act=no-comms]');
    });
    await step(label + ' 9: corrupt import and interrupted staging -> library unharmed', async () => {
      const bad = path.join(PROJECT, 'build', 'buzilgan.hmz');
      const buf = fs.readFileSync(path.join(PROJECT, 'dist/namuna-sharh-2-1.0.0.hmz'));
      fs.writeFileSync(bad, buf.subarray(0, buf.length - 120));           // kesilgan fayl (EOCD yo'q)
      await importFile(B.page, bad);
      assert.strictEqual(await B.page.locator('[data-act=progress]').last().getAttribute('data-done'), 'fail');
      const bad2 = path.join(PROJECT, 'build', 'buzilgan2.hmz');
      const b2 = Buffer.from(buf);
      const name = Buffer.from('data/occurrences.jsonl');
      const lh = b2.indexOf(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04])]), b2.indexOf(name) - 40);
      const dataStart = lh + 30 + b2.readUInt16LE(lh + 26) + b2.readUInt16LE(lh + 28);
      b2[dataStart + 40] ^= 0xff;                                          // siqilgan ma'lumot ichida
      fs.writeFileSync(bad2, b2);
      await importFile(B.page, bad2);
      assert.strictEqual(await B.page.locator('[data-act=progress]').last().getAttribute('data-done'), 'fail');
      assert.strictEqual(await B.page.evaluate(() => Lib.getPackage('namuna-sharh-2').then(p => !!p)), false);
      await B.page.evaluate(() => new Promise(r => {
        const q = indexedDB.open('hadis-manba');
        q.onsuccess = () => {
          const tx = q.result.transaction(['versions', 'units'], 'readwrite');
          tx.objectStore('versions').put({ pkgv: 'yarim@9.9.9#x', package_id: 'yarim', version: '9.9.9', state: 'staging' });
          tx.objectStore('units').put({ pkgv: 'yarim@9.9.9#x', unit_id: 'yarim:u1', text_ar: 'x', n: 'x' });
          tx.oncomplete = r;
        };
      }));
      await B.page.reload(); await B.page.waitForSelector('html[data-tayyor="1"]');
      const left = await B.page.evaluate(() => new Promise(r => {
        const q = indexedDB.open('hadis-manba');
        q.onsuccess = () => { const g = q.result.transaction('versions').objectStore('versions').get('yarim@9.9.9#x'); g.onsuccess = () => r(!!g.result); };
      }));
      assert.strictEqual(left, false);
      assert.strictEqual(await searchCount(B.page, 'المبادره اليه', 'commentary'), 1);
    });
    await step(label + ' 11: reopen offline -> search across all installed packages without AI', async () => {
      const p2 = await B.ctx.newPage();
      await B.ctx.setOffline(true);
      await p2.goto(URL0); await p2.waitForSelector('html[data-tayyor="1"]');
      await expectLang(p2, lang);
      assert.ok((await searchCount(p2, 'تجريبي')) >= 10);
      await B.ctx.setOffline(false); await p2.close();
    });
    await step(label + ' 12: package file export/import and notes backup restore', async () => {
      await go(B.page, '#/installed');
      const [dl] = await Promise.all([B.page.waitForEvent('download'), B.page.click('[data-pkg="namuna-sharh-1"] [data-act=export]')]);
      const exported = path.join(PROJECT, 'build', 'eksport-sharh1.hmz'); await dl.saveAs(exported);
      await go(B.page, '#/notes');
      const [dl2] = await Promise.all([B.page.waitForEvent('download'), B.page.click('[data-act=notes-export]')]);
      const notesFile = path.join(PROJECT, 'build', 'qaydlar.json'); await dl2.saveAs(notesFile);
      const C = await newApp(browser, URL0, viewport, lang);
      await importFile(C.page, exported);
      await go(C.page, '#/notes');
      await C.page.setInputFiles('[data-act=notes-import]', notesFile);
      await C.page.waitForSelector('text=my test note');
      assert.strictEqual(await searchCount(C.page, 'المبادره اليه', 'commentary'), 1);
      await C.ctx.close();
    });
    await step(label + ' 4: book + two selected commentaries together -> both ways', async () => {
      const D = await newApp(browser, URL0, viewport, lang);
      await go(D.page, '#/w/' + WORK + '?tab=comms');
      for (const cb of await D.page.locator('[data-act=pick-commentary]').all()) await cb.check();
      await D.page.click('[data-act=install-with]');
      await poll(D.page, () => Lib.packages().then(ps => ps.filter(p => p.offline_ready).length === 3));
      await D.page.waitForTimeout(300);
      await D.page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      await go(D.page, '#/h/' + A1);
      assert.strictEqual(await passCount(D.page), 3);
      await D.page.locator('#sharh-panel [data-act=passage]').nth(2).click();
      await D.page.locator('#sharh-panel .c-preview [data-act=open-commentary]').click();
      await D.page.waitForSelector('main[data-route="s"] .text-card');
      await D.page.click('[data-act=to-hadith]');
      await D.page.waitForSelector('.text-card p.src');
      assert.ok(decodeURIComponent(D.page.url()).endsWith('#/h/' + A1));
      await importFile(D.page, SELECTION);  // yig'ma: o'rnatilganlar qayta yozilmaydi
      await noHorizontalScroll(D.page);
      assert.deepStrictEqual(D.errors, []);
      await D.ctx.close();
    });
    // ------------------------------------------------ V7: mahalliy qatlam (sun'iy sinov ma'lumoti)
    const E = await newApp(browser, URL0, viewport, lang);
    await step(label + ' 13: local layer -> book/chapter tree, chapter groups, unplaced records shown', async () => {
      await installFromCatalog(E.page, 'namuna-asos-a');
      await importFile(E.page, OVERLAY);
      await poll(E.page, () => Lib.overlayState('ed-namuna-a').then(s => s.state === 'active'));
      await go(E.page, '#/installed');
      assert.strictEqual(await E.page.locator('[data-act=overlay-state]').getAttribute('data-state'), 'active');
      await go(E.page, '#/w/' + WORK);
      assert.strictEqual(await E.page.locator('[data-act=layer-note]').getAttribute('data-state'), 'active');
      await go(E.page, '#/c/namuna-asos-a?k=0');
      assert.strictEqual(await E.page.locator('section.bgroup[data-bab=b1] .hrow').count(), 6);
      assert.strictEqual(await E.page.locator('section.bgroup[data-bab=b2] .hrow').count(), 5);
      assert.strictEqual(await E.page.locator('section.bgroup[data-bab=unplaced] .hrow').count(), 1);
      assert.ok((await E.page.locator('section.bgroup[data-bab=b2] .warn-t').count()) >= 1);   // tekshirilmagan sarlavha belgisi
      assert.strictEqual(await E.page.locator('.cv-side a.tb').count(), 2);
      await E.page.evaluate(() => document.querySelector('.cv-side .tk-item.cur > a.tk').click());
      assert.strictEqual(await E.page.evaluate(() => document.querySelector('.cv-side .tk-item.cur .tb-list').hidden), true);
      await E.page.evaluate(() => document.querySelector('.cv-side .tk-item.cur > a.tk').click());
      assert.strictEqual(await E.page.evaluate(() => document.querySelector('.cv-side .tk-item.cur .tb-list').hidden), false);
      // yopiq mobil menyu fokus/accessibility daraxtidan chiqadi
      assert.strictEqual(await E.page.evaluate(() => document.querySelector('[data-act=tree-drawer]').hidden), true);
      if (viewport.width < 600) {
        await E.page.click('[data-act=open-tree]');
        assert.strictEqual(await E.page.evaluate(() => document.querySelector('[data-act=tree-drawer]').hidden), false);
        await E.page.keyboard.press('Escape');
        assert.strictEqual(await E.page.evaluate(() => document.querySelector('[data-act=tree-drawer]').hidden), true);
        assert.strictEqual(await E.page.evaluate(() => document.activeElement.getAttribute('data-act')), 'open-tree');
      }
      await noHorizontalScroll(E.page);
    });
    await step(label + ' 14: reader -> chain positions toggle; source text/hash and copy unchanged; settings within screen', async () => {
      await go(E.page, '#/r/namuna-asos-a?k=0&u=' + encodeURIComponent(A1));
      const art = '#u-' + A1.replace(':', '\\:');
      assert.ok((await E.page.locator(art + ' sup.ord').count()) >= 1);
      // manba matni (UI qo'shimchalari — «matnda zikr qilinmagan roviylar» satri va o'rin raqamlari — hisobga olinmaydi)
      const srcText = sel => E.page.evaluate(sel => { const c = document.querySelector(sel).cloneNode(true); c.querySelectorAll('.implied, sup.ord').forEach(x => x.remove()); return c.textContent; }, sel);
      assert.ok((await E.page.locator(art + ' [data-act=implied-narrators]').count()) === 1);   // 903 — matnda yo'q, oldingi sanaddan
      const before = await srcText(art + ' .src');
      await E.page.click('[data-act=settings]');
      const r = await E.page.evaluate(() => { const b = document.querySelector('.sheet').getBoundingClientRect(); return [b.left, b.right, b.top, b.bottom, innerWidth, innerHeight]; });
      assert.ok(r[0] >= 0 && r[1] <= r[4] && r[2] >= 0 && r[3] <= r[5] + 1, 'sozlamalar ekrandan chiqdi: ' + r.join(','));
      await E.page.uncheck('[data-set=ord]');
      assert.strictEqual(await E.page.locator(art + ' sup.ord').count(), 0);
      await E.page.fill('[data-set=fs]', '10'); await E.page.dispatchEvent('[data-set=fs]', 'input');
      assert.strictEqual(await E.page.evaluate(() => getComputedStyle(document.querySelector('.hadith .src')).fontSize), '10px');
      await E.page.keyboard.press('Escape');
      assert.strictEqual(await E.page.locator('.sheet').count(), 0);
      const after = await srcText(art + ' .src');
      assert.strictEqual(after, before);   // raqamlar yashirilgach matn aynan o'sha
      const ok = await E.page.evaluate(id => Lib.unit(id).then(u => Pkg.sha256Hex(new TextEncoder().encode(u.text_ar)).then(h => h === u.current_text_sha256)), A1);
      assert.ok(ok);
      await E.page.evaluate(() => { localStorage.setItem('hadith-library.reading', JSON.stringify({ fs: 26, ord: true, full: true, marks: true })); });
    });
    await step(label + ' 15: narrator -> paginated index (>20), grouping keeps count, single hadith highlight, back chain', async () => {
      await go(E.page, '#/r/namuna-asos-a?k=0&u=' + encodeURIComponent(A1));
      await E.page.evaluate(() => window.scrollBy(0, 30));
      const art = '#u-' + A1.replace(':', '\\:');
      await E.page.click(art + ' .nm[data-person="901"]');
      await E.page.waitForSelector('[data-act=narrator-panel]');
      // tugma ekran o'rtasida (pastki tabbar ostida qolmasin — aks holda bosishda sahifa yana siljiydi)
      await E.page.locator('[data-act=narrator-hadiths]').evaluate(el => el.scrollIntoView({ block: 'center' }));
      await E.page.waitForTimeout(100);
      const y0 = await E.page.evaluate(() => Math.round(scrollY));   // chiqib ketish paytidagi joy
      await E.page.click('[data-act=narrator-hadiths]');
      await E.page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-route') === 'n' && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.strictEqual(await E.page.locator('.nrow').count(), 20);
      const total = await E.page.locator('[data-act=ni-total]').textContent();
      await E.page.click('[data-act=ni-next]');
      await E.page.waitForFunction(() => /p=2/.test(location.hash) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.ok((await E.page.locator('.nrow').count()) >= 1);
      await E.page.click('[data-act=ni-group]');
      await E.page.waitForFunction(() => /g=1/.test(location.hash) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.strictEqual(await E.page.locator('[data-act=ni-total]').textContent(), total);
      assert.ok((await E.page.locator('.ng-k').count()) >= 1);
      const listHash = await E.page.evaluate(() => location.hash);
      await E.page.locator('.nrow a').first().click();
      await E.page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-route') === 'h' && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      await E.page.waitForSelector('[data-act=back-list]');
      await E.page.click('[data-act=back-list]');
      await E.page.waitForFunction(h => location.hash === h && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1', listHash);
      await E.page.click('[data-act=back-hadith]');
      await E.page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-route') === 'r' && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.strictEqual(await E.page.evaluate(() => Math.round(scrollY)), y0);
      await E.page.goForward(); await E.page.waitForFunction(() => document.querySelector('#asosiy').getAttribute('data-route') === 'n' && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.ok(/p=2&g=1/.test(await E.page.evaluate(() => location.hash)));
      await noHorizontalScroll(E.page);
    });
    await step(label + ' 17: single hadith -> fixed Kitob/Bab tree, names-only chain with arrows, narrator levels, level filter', async () => {
      await go(E.page, '#/h/' + A1);
      assert.strictEqual(await E.page.locator('.unit-layout .cv-side .tk-item.cur > a.tk').count(), 1);
      assert.strictEqual(await E.page.locator('.unit-layout .cv-side a.tb[aria-current="location"]').count(), 1);   // shu hadisning bobi
      if (viewport.width < 961) assert.strictEqual(await E.page.locator('[data-act=open-tree]').count(), 1);
      else {
        const tog = E.page.locator('.cv-side .tk-item.cur > [data-act=tree-toggle]');
        assert.strictEqual(await tog.getAttribute('aria-expanded'), 'true');
        await tog.click();
        assert.strictEqual(await tog.getAttribute('aria-expanded'), 'false');
        assert.strictEqual(await E.page.evaluate(() => document.querySelector('.cv-side .tk-item.cur .tb-list').hidden), true);
        await tog.click();
        // daraxt sahifa bilan siljimaydi (sticky)
        await E.page.evaluate(() => window.scrollTo(0, 400));
        const top = await E.page.evaluate(() => document.querySelector('.unit-layout .cv-side .tree').getBoundingClientRect().top);
        assert.ok(top >= 0 && top < 200, 'daraxt joyida emas: ' + top);
        await E.page.evaluate(() => window.scrollTo(0, 0));
      }
      const full = await E.page.evaluate(() => document.querySelector('.tslot p.src').textContent);
      await E.page.click('[data-act=chain-toggle]');
      assert.strictEqual(await E.page.getAttribute('[data-act=chain-toggle]', 'aria-pressed'), 'true');
      await E.page.waitForSelector('.tslot p.src.compact .chainline');
      const ch = await E.page.evaluate(() => {
        const p = document.querySelector('.tslot p.src.compact'), line = p.querySelector('.chainline');
        const names = [...line.querySelectorAll('.nm')].map(b => b.getAttribute('data-person'));
        const rest = [...p.childNodes].filter(n => n !== line && n.nodeName !== 'BR').map(n => n.textContent).join('');
        return { names, arrows: line.querySelectorAll('.arr').length, rest, partial: p.classList.contains('partial') };
      });
      assert.deepStrictEqual(ch.names, ['903', '902', '901']);   // yo'l tartibida, barcha roviylar
      assert.ok(ch.arrows >= 2);
      assert.strictEqual(ch.partial, false);
      assert.ok(!/نَصٌّ/.test(ch.rest) && /^أَوَّلُ/.test(ch.rest.replace(/[0-9A-Z,]/g, '')), 'sanad qismi qoldi: ' + ch.rest);
      await E.page.click('.tslot .chainline .nm[data-person="901"]');
      await E.page.waitForSelector('[data-act=narrator-panel] .lvbars .lvbar');
      const big = Number(await E.page.locator('[data-act=narrator-panel] .np-big b').textContent());
      const lvn = await E.page.$$eval('[data-act=narrator-panel] .lvbar .n', xs => xs.map(x => Number(x.textContent)));
      assert.strictEqual(big, 12);   // namunada 12 yozuv, hammasida shu roviy
      assert.ok(lvn.length >= 2 && Math.max.apply(null, lvn) <= big && lvn.reduce((a, b) => a + b, 0) >= big, lvn.join(','));
      await E.page.click('[data-act=chain-toggle]');
      assert.strictEqual(await E.page.locator('.tslot p.src.compact').count(), 0);
      assert.strictEqual(await E.page.evaluate(() => document.querySelector('.tslot p.src').textContent), full);   // asl matn aynan qaytdi
      // boshqa yozuvda yo'l oxiri matnda yo'q -> ismlar qatorida u ham bor (oldingi sanaddan), matn matnda zikr qilingan
      // oxirgi roviydan keyin davom etadi
      await go(E.page, '#/h/' + A1.replace('u0001', 'u0002'));
      const full2 = await E.page.evaluate(() => { const c = document.querySelector('.tslot p.src').cloneNode(true); c.querySelectorAll('.implied, sup.ord').forEach(x => x.remove()); return c.textContent; });
      await E.page.click('[data-act=chain-toggle]');
      await E.page.waitForSelector('.tslot p.src.compact .chainline');
      const c2 = await E.page.evaluate(() => { const p = document.querySelector('.tslot p.src.compact'), c = p.cloneNode(true);
        c.querySelectorAll('.chainline, .implied, sup.ord').forEach(x => x.remove());
        return { names: [...p.querySelectorAll('.chainline .nm')].map(b => b.getAttribute('data-person')), rest: c.textContent.trim() }; });
      assert.deepStrictEqual(c2.names, ['902', '901', '903']);   // 903 — matnda yo'q, yo'l oxiridan
      assert.ok(c2.rest.length > 0 && full2.trim().endsWith(c2.rest), 'matn davomi: ' + c2.rest);
      await E.page.click('[data-act=chain-toggle]');
      // roviy sahifasi: daraja bo'yicha saralash
      await go(E.page, '#/n/901?e=ed-namuna-a');
      const bars = E.page.locator('[data-act=ni-level]');
      assert.ok((await bars.count()) >= 2);
      const lv = await bars.last().getAttribute('data-level'), n = Number(await bars.last().locator('.n').textContent());
      await bars.last().click();
      await E.page.waitForFunction(l => new RegExp('lv=' + l).test(location.hash) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1', lv);
      assert.strictEqual(await E.page.locator('.nrow').count(), Math.min(n, 20));
      assert.ok((await E.page.locator('.nrow .where').count()) >= 1);   // Kitob › Bob
      await E.page.locator('[data-act=ni-level][aria-pressed="true"]').click();
      await E.page.waitForFunction(() => !/lv=/.test(location.hash) && document.querySelector('#asosiy').getAttribute('data-tayyor') === '1');
      assert.strictEqual(await E.page.locator('.nrow').count(), 20);
      await noHorizontalScroll(E.page);
    });
    await step(label + ' 16: base book updated -> layer quarantined (not applied), no chain marks', async () => {
      await importFile(E.page, V110);
      await poll(E.page, () => Lib.overlayState('ed-namuna-a').then(s => s.state === 'mismatch'));
      await go(E.page, '#/h/' + A1);
      assert.strictEqual(await E.page.locator('.tslot sup.ord').count(), 0);
      await go(E.page, '#/w/' + WORK);
      assert.strictEqual(await E.page.locator('[data-act=layer-note]').getAttribute('data-state'), 'mismatch');
      assert.deepStrictEqual(E.errors, []);
    });
    await E.ctx.close();
    await step(label + ': no console errors', async () => {
      assert.deepStrictEqual(B.errors.filter(e => !/net::ERR|ERR_INTERNET_DISCONNECTED/.test(e)), []);
    });
    await B.ctx.close();
  }
  await browser.close();
  srv.close();
  const failed = results.filter(r => !r.ok);
  fs.mkdirSync(path.join(PROJECT, 'build'), { recursive: true });
  fs.writeFileSync(path.join(PROJECT, 'build', 'e2e-natija.json'), JSON.stringify({ at: new Date().toISOString(),
    browser: 'chromium-headless (playwright ' + require('playwright/package.json').version + ')', results }, null, 1));
  console.log(results.length - failed.length + '/' + results.length + ' scenarios passed');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

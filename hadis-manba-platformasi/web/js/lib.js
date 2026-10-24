// Qurilmadagi kutubxona: IndexedDB'da paketlar, o'rnatish/almashtirish/o'chirish/rollback va o'qish so'rovlari.
// Har yozuv kaliti [pkgv, id] — yangi versiya staging'da eski versiyaga tegmay yoziladi,
// so'ng bitta tranzaksiyada faollashtiriladi. Uzilgan staging keyingi ochilishda tozalanadi.
(function (root) {
  'use strict';
  var DB_NAME = 'hadis-manba', DB_VER = 1, CHUNK = 400;
  var dbp = null;

  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function done(tx) { return new Promise(function (res, rej) { tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error('tranzaksiya bekor qilindi')); }; }); }

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = function () {
        var db = r.result;
        db.createObjectStore('packages', { keyPath: 'package_id' });
        db.createObjectStore('versions', { keyPath: 'pkgv' });
        db.createObjectStore('blobs', { keyPath: 'pkgv' });
        var u = db.createObjectStore('units', { keyPath: ['pkgv', 'unit_id'] });
        u.createIndex('unit_id', 'unit_id'); u.createIndex('pkgv', 'pkgv'); u.createIndex('numkeys', 'numkeys', { multiEntry: true });
        var o = db.createObjectStore('occ', { keyPath: ['pkgv', 'occurrence_id'] });
        o.createIndex('occurrence_id', 'occurrence_id'); o.createIndex('pkgv', 'pkgv');
        var l = db.createObjectStore('links', { keyPath: ['pkgv', 'link_id'] });
        l.createIndex('target_unit_id', 'target_unit_id'); l.createIndex('occurrence_id', 'occurrence_id'); l.createIndex('pkgv', 'pkgv');
        var e = db.createObjectStore('ents', { keyPath: ['pkgv', 'kind', 'id'] });
        e.createIndex('kind_id', ['kind', 'id']); e.createIndex('pkgv', 'pkgv');
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.onblocked = function () { rej(new Error('Baza boshqa oynada band — boshqa oynalarni yoping')); };
    });
    return dbp;
  }

  var ROW_STORES = ['units', 'occ', 'links', 'ents'];

  async function deleteRows(pkgv) {
    var db = await openDb();
    for (var s of ROW_STORES) {
      var tx = db.transaction(s, 'readwrite');
      var idx = tx.objectStore(s).index('pkgv');
      var keys = await req(idx.getAllKeys(IDBKeyRange.only(pkgv)));
      keys.forEach(function (k) { tx.objectStore(s).delete(k); });
      await done(tx);
    }
  }

  async function getAll(store, idxName, key) {
    var db = await openDb();
    var tx = db.transaction(store);
    var src = idxName ? tx.objectStore(store).index(idxName) : tx.objectStore(store);
    return req(key === undefined ? src.getAll() : src.getAll(key));
  }

  async function packages() { return (await getAll('packages')).sort(function (a, b) { return a.package_id < b.package_id ? -1 : 1; }); }
  async function activeSet() {
    var s = new Set();
    (await packages()).forEach(function (p) { s.add(p.active_pkgv); });
    return s;
  }

  // Ilova ochilganda: tugallanmagan staging qoldiqlarini tozalash.
  async function cleanup() {
    var db = await openDb();
    var vers = await getAll('versions');
    var keep = new Set();
    (await packages()).forEach(function (p) { keep.add(p.active_pkgv); if (p.previous) keep.add(p.previous.pkgv); });
    var removed = 0;
    for (var v of vers) {
      if (keep.has(v.pkgv)) continue;
      await deleteRows(v.pkgv);
      var tx = db.transaction(['versions', 'blobs'], 'readwrite');
      tx.objectStore('versions').delete(v.pkgv);
      tx.objectStore('blobs').delete(v.pkgv);
      await done(tx);
      removed++;
    }
    return removed;
  }

  function numkeys(u) {
    var keys = [];
    (u.numbers || []).forEach(function (n) {
      if (n.number_text == null) return;
      String(n.number_text).split(';').forEach(function (p) { keys.push(u.work_id + '|' + p.trim()); });
    });
    return keys;
  }

  async function estimateFree() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    var e = await navigator.storage.estimate();
    return { quota: e.quota, usage: e.usage, free: e.quota - e.usage };
  }

  // onState(holat, izoh[, ulush 0–1]): 'tekshirish' | 'joy' | 'staging' | 'faollashtirish' | 'tayyorlik' | 'tayyor'
  async function install(buf, onState, opts) {
    onState = onState || function () {};
    opts = opts || {};
    onState('tekshirish', 'Xesh va tuzilma tekshirilmoqda');
    var pkg = await Pkg.open(buf);
    var m = pkg.manifest;
    if (m.kind === 'selection') {
      var results = [];
      for (var c of m.contains) {
        var cur = await getPackage(c.package_id);
        if (cur && cur.sha256 === c.package_sha256) { results.push({ package_id: c.package_id, action: 'unchanged' }); continue; }
        var inner = Object.keys(pkg.files).filter(function (n) { return n.indexOf('packages/') === 0; });
        var found = null;
        for (var n of inner) if ((await Pkg.sha256Hex(pkg.files[n])) === c.package_sha256) found = pkg.files[n];
        if (!found) { results.push({ package_id: c.package_id, action: 'missing_in_bundle' }); continue; }
        results = results.concat(await install(found.buffer.slice(found.byteOffset, found.byteOffset + found.byteLength), onState));
      }
      return results;
    }
    var existing = await getPackage(m.package_id);
    if (existing && existing.sha256 === pkg.sha256) { onState('tayyor', "Allaqachon o'rnatilgan"); return [{ package_id: m.package_id, action: 'unchanged' }]; }
    onState('joy', "Qurilmadagi joy tekshirilmoqda");
    var need = (m.installed_bytes || buf.byteLength * 3) + (m.temporary_space_bytes || 0);
    var est = await estimateFree();
    if (est && est.free < need) throw new Error("Joy yetmaydi: kerak ~" + fmtBytes(need) + ", bo'sh ~" + fmtBytes(est.free) + ". Eski kutubxona o'zgarmadi.");
    var pkgv = m.package_id + '@' + m.package_version + '#' + pkg.sha256.slice(0, 12);
    var db = await openDb();
    onState('staging', "Vaqtinchalik joyga yozilmoqda");
    var tx = db.transaction(['versions', 'blobs'], 'readwrite');
    tx.objectStore('versions').put({ pkgv: pkgv, package_id: m.package_id, version: m.package_version, sha256: pkg.sha256, state: 'staging' });
    tx.objectStore('blobs').put({ pkgv: pkgv, data: buf });
    await done(tx);
    await deleteRows(pkgv);  // oldingi uzilgan urinish qoldig'i
    var rows = [];
    pkg.units.forEach(function (u) {
      rows.push(['units', Object.assign({}, u, { pkgv: pkgv, package_id: m.package_id, work_id: u.work_id || m.work_id,
        edition_id: u.edition_id || m.edition_id, n: Arabic.normalize(u.text_ar), numkeys: numkeys(Object.assign({ work_id: m.work_id }, u)) })]);
    });
    pkg.occurrences.forEach(function (o) {
      rows.push(['occ', Object.assign({}, o, { pkgv: pkgv, package_id: m.package_id, work_id: o.work_id || m.work_id,
        edition_id: o.edition_id || m.edition_id, n: Arabic.normalize(o.text_ar) })]);
    });
    pkg.links.forEach(function (l) { rows.push(['links', Object.assign({}, l, { pkgv: pkgv, package_id: m.package_id })]); });
    var ents = pkg.entities || {};
    Object.keys(ents).forEach(function (kind) {
      (ents[kind] || []).forEach(function (e, i) {
        var id = e.work_id && kind === 'works' ? e.work_id : (e.person_id && kind === 'persons' ? e.person_id :
          (e.edition_id && kind === 'editions' ? e.edition_id : (e.scheme_id || e.source_id || e.file_id || (kind + i))));
        if (kind === 'work_contributors') id = e.work_id + '|' + e.person_id + '|' + e.role;
        rows.push(['ents', { pkgv: pkgv, kind: kind, id: id, data: e }]);
      });
    });
    pkg.evidence.forEach(function (e) { rows.push(['ents', { pkgv: pkgv, kind: 'evidence', id: e.evidence_id, data: e }]); });
    if (m.kind === 'overlay') rows = rows.concat(overlayRows(pkg, pkgv, m));
    pkg.parallels.forEach(function (e) { rows.push(['ents', { pkgv: pkgv, kind: 'parallels', id: e.relation_id, data: e }]); });
    for (var i = 0; i < rows.length; i += CHUNK) {
      var part = rows.slice(i, i + CHUNK);
      var t = db.transaction(ROW_STORES, 'readwrite');
      part.forEach(function (r) { t.objectStore(r[0]).put(r[1]); });
      await done(t);
      onState('staging', 'Yozildi: ' + Math.min(i + CHUNK, rows.length) + ' / ' + rows.length, .6 + .3 * Math.min(i + CHUNK, rows.length) / rows.length);
    }
    onState('faollashtirish', 'Faollashtirilmoqda');
    var t2 = db.transaction(['packages', 'versions'], 'readwrite');
    var prev = await req(t2.objectStore('packages').get(m.package_id));
    var rec = { package_id: m.package_id, kind: m.kind, active_pkgv: pkgv, version: m.package_version, sha256: pkg.sha256,
      manifest: m, coverage: pkg.coverage, license: pkg.license, attribution: pkg.attribution, bytes: buf.byteLength,
      installed_at: new Date().toISOString(), offline_ready: false,
      previous: prev ? { pkgv: prev.active_pkgv, version: prev.version, sha256: prev.sha256 } : null };
    t2.objectStore('packages').put(rec);
    t2.objectStore('versions').put({ pkgv: pkgv, package_id: m.package_id, version: m.package_version, sha256: pkg.sha256, state: 'active' });
    if (prev) t2.objectStore('versions').put({ pkgv: prev.active_pkgv, package_id: m.package_id, version: prev.version, sha256: prev.sha256, state: 'previous' });
    await done(t2);
    // Eski versiya qatorlari o'chiriladi (blob rollback uchun qoladi); undan oldingisi butunlay o'chadi.
    if (prev) {
      await deleteRows(prev.active_pkgv);
      if (prev.previous && prev.previous.pkgv !== pkgv) {
        var t3 = db.transaction(['versions', 'blobs'], 'readwrite');
        t3.objectStore('versions').delete(prev.previous.pkgv);
        t3.objectStore('blobs').delete(prev.previous.pkgv);
        await done(t3);
      }
    }
    tocCache = {}; ovCache = {}; occAllCache = {};
    onState('tayyorlik', 'Mahalliy qidiruv tayyorligi tekshirilmoqda');
    var ok = await verifyReady(rec, pkg);
    rec.offline_ready = ok;
    var t4 = db.transaction('packages', 'readwrite');
    t4.objectStore('packages').put(rec);
    await done(t4);
    onState('tayyor', ok ? 'Oflayn tayyor' : "Tayyorlik tekshiruvi o'tmadi");
    return [{ package_id: m.package_id, version: m.package_version, action: opts.rollback ? 'rollback' : (prev ? 'upgrade' : 'install'), offline_ready: ok }];
  }

  async function verifyReady(rec, pkg) {
    if (rec.kind === 'overlay') {
      var got = await getAll('ents', 'pkgv', rec.active_pkgv);
      return got.length === pkg.overlayRowCount;
    }
    var units = await getAll('units', 'pkgv', rec.active_pkgv);
    var occ = await getAll('occ', 'pkgv', rec.active_pkgv);
    if (units.length !== pkg.units.length || occ.length !== pkg.occurrences.length) return false;
    var first = units[0] || occ[0];
    if (!first) return true;
    var q = Array.from(first.n).slice(0, 12).join('');
    return !q || first.n.indexOf(q) >= 0;
  }

  async function getPackage(id) {
    var db = await openDb();
    return req(db.transaction('packages').objectStore('packages').get(id));
  }

  async function uninstall(id) {
    var p = await getPackage(id);
    if (!p) return { package_id: id, action: 'not_installed' };
    var db = await openDb();
    var tx = db.transaction(['packages', 'versions', 'blobs'], 'readwrite');
    tx.objectStore('packages').delete(id);
    [p.active_pkgv, p.previous && p.previous.pkgv].forEach(function (v) {
      if (!v) return;
      tx.objectStore('versions').delete(v);
      tx.objectStore('blobs').delete(v);
    });
    await done(tx);
    await deleteRows(p.active_pkgv);
    tocCache = {}; ovCache = {}; occAllCache = {};
    return { package_id: id, action: 'removed' };
  }

  async function rollback(id, onState) {
    var p = await getPackage(id);
    if (!p || !p.previous) return { package_id: id, action: 'no_previous_version' };
    var db = await openDb();
    var b = await req(db.transaction('blobs').objectStore('blobs').get(p.previous.pkgv));
    if (!b) return { package_id: id, action: 'no_previous_version' };
    return (await install(b.data, onState, { rollback: true }))[0];
  }

  async function exportPackage(id) {
    var p = await getPackage(id);
    if (!p) return null;
    var db = await openDb();
    var b = await req(db.transaction('blobs').objectStore('blobs').get(p.active_pkgv));
    return b ? new Blob([b.data], { type: 'application/zip' }) : null;
  }

  // ---------------------------------------------------------------- o'qish
  async function activeFilter(rows) {
    var act = await activeSet();
    return rows.filter(function (r) { return act.has(r.pkgv); });
  }
  async function ent(kind, id) {
    var rows = await activeFilter(await getAll('ents', 'kind_id', [kind, id]));
    return rows.length ? rows[0].data : null;
  }
  async function ents(kind) {
    var db = await openDb();
    var all = await req(db.transaction('ents').objectStore('ents').index('kind_id').getAll(IDBKeyRange.bound([kind, ''], [kind, '￿'])));
    var act = await activeSet(), seen = new Set(), out = [];
    all.forEach(function (r) { if (act.has(r.pkgv) && !seen.has(r.id)) { seen.add(r.id); out.push(r.data); } });
    return out;
  }
  async function unit(id) { return (await activeFilter(await getAll('units', 'unit_id', id)))[0] || null; }
  async function occurrence(id) { return (await activeFilter(await getAll('occ', 'occurrence_id', id)))[0] || null; }
  // Bir nechta birlikni bitta tranzaksiyada asosiy kalit [pkgv, unit_id] bilan o'qish (Kitob o'qilishi uchun).
  async function unitsByIds(pkgv, ids) {
    var db = await openDb();
    var st = db.transaction('units').objectStore('units');
    return Promise.all(ids.map(function (id) { return req(st.get([pkgv, id])); }));
  }
  async function ovMany(kind, ids, editionId) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return {};
    var db = await openDb();
    var st = db.transaction('ents').objectStore('ents');
    var rows = await Promise.all(ids.map(function (id) { return req(st.get([s.overlay.active_pkgv, kind, String(id)])); }));
    var out = {};
    rows.forEach(function (r, i) { if (r) out[ids[i]] = r.data; });
    return out;
  }
  async function unitsOf(pkgv) { return (await getAll('units', 'pkgv', pkgv)).sort(function (a, b) { return a.seq - b.seq; }); }
  async function occOf(pkgv) { return (await getAll('occ', 'pkgv', pkgv)).sort(function (a, b) { return a.seq - b.seq; }); }

  // Mundarija indeksi: butun matnni DOMga yuklamasdan, kursor bilan yengil qatorlar (seq tartibida).
  // Bob almashuvi chapter_ar bo'yicha; har o'rnatilgan birlik indeksga kiradi (cheklov yo'q).
  var tocCache = {};
  function cursorEach(store, pkgv, fn) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var r = db.transaction(store).objectStore(store).index('pkgv').openCursor(IDBKeyRange.only(pkgv));
        r.onsuccess = function () { var c = r.result; if (!c) return res(); fn(c.value); c.continue(); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  async function toc(pkgv) {
    if (tocCache[pkgv]) return tocCache[pkgv];
    var rows = [];
    await cursorEach('units', pkgv, function (u) {
      var n0 = (u.numbers || []).find(function (n) { return n.number_text != null; });
      var nr = (u.narrators || [])[0] || {};
      rows.push({ id: u.unit_id, seq: u.seq, ch: u.chapter_ar || '', num: n0 ? String(n0.number_text) : null, vol: n0 ? n0.volume : null,
        type: u.unit_type, tp: nr.narrator_identity_status === 'verified' ? (nr.terminal_person_id || null) : null, ex: Array.from(u.text_ar || '').slice(0, 160).join('') });
    });
    rows.sort(function (a, b) { return a.seq - b.seq; });
    var chapters = [], index = {};
    rows.forEach(function (r, i) {
      index[r.id] = i;
      var last = chapters[chapters.length - 1];
      if (!last || last.title !== r.ch) chapters.push({ title: r.ch, start: i, count: 0, first: r.num });
      chapters[chapters.length - 1].count++;
      r.c = chapters.length - 1;
    });
    tocCache[pkgv] = { units: rows, chapters: chapters, index: index, kind: 'base_book' };
    return tocCache[pkgv];
  }
  async function occToc(pkgv) {
    if (tocCache[pkgv]) return tocCache[pkgv];
    var rows = [];
    await cursorEach('occ', pkgv, function (o) {
      rows.push({ id: o.occurrence_id, seq: o.seq, vol: o.volume, page: o.page, ex: Array.from(o.text_ar || '').slice(0, 160).join('') });
    });
    rows.sort(function (a, b) { return a.seq - b.seq; });
    var chapters = [], index = {};
    rows.forEach(function (r, i) {
      index[r.id] = i;
      var key = r.vol != null ? String(r.vol) : '';
      var last = chapters[chapters.length - 1];
      if (!last || last.key !== key) chapters.push({ key: key, title: key, start: i, count: 0 });
      chapters[chapters.length - 1].count++;
      r.c = chapters.length - 1;
    });
    tocCache[pkgv] = { units: rows, chapters: chapters, index: index, kind: 'commentary' };
    return tocCache[pkgv];
  }
  function dropToc() { tocCache = {}; }

  function versionOk(v, patterns) {
    return (patterns || []).some(function (p) {
      var rx = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return rx.test(v);
    });
  }

  async function linkActivation(link) {
    var pk = await packages();
    var cpkg = pk.find(function (p) { return p.package_id === link.package_id; });
    var reqs = cpkg ? (cpkg.manifest.requires_for_linked_reading || []) : [];
    var r = reqs.find(function (x) { return x.target_work_id === link.target_work_id && x.target_edition_id === link.target_edition_id; });
    if (!r) return { state: 'not_declared' };
    var base = pk.find(function (p) { return p.kind === 'base_book' && p.manifest.edition_id === link.target_edition_id; });
    if (!base) return { state: 'base_not_installed', target_work_id: link.target_work_id, target_edition_id: link.target_edition_id };
    if (!versionOk(base.version, r.compatible_package_versions)) return { state: 'incompatible_base_version', installed: base.version, compatible: r.compatible_package_versions };
    if (!(await unit(link.target_unit_id))) return { state: 'target_unit_missing' };
    return { state: 'active', base_package: base.package_id };
  }

  async function commentariesFor(unitId) {
    var links = await activeFilter(await getAll('links', 'target_unit_id', unitId));
    var out = [];
    for (var l of links) {
      var act = await linkActivation(l);
      if (act.state !== 'active') continue;
      var o = await occurrence(l.occurrence_id);
      if (o) out.push({ link: l, occ: o });
    }
    out.sort(function (a, b) { return a.occ.work_id < b.occ.work_id ? -1 : a.occ.work_id > b.occ.work_id ? 1 : a.occ.seq - b.occ.seq; });
    return out;
  }
  async function linksOfOccurrence(occId) {
    var links = await activeFilter(await getAll('links', 'occurrence_id', occId));
    var out = [];
    for (var l of links) out.push({ link: l, activation: await linkActivation(l) });
    return out;
  }

  async function resolve(workId, number, schemeId, volume) {
    var rows = await activeFilter(await getAll('units', 'numkeys', workId + '|' + String(number).trim()));
    var out = [];
    rows.forEach(function (u) {
      (u.numbers || []).forEach(function (n) {
        if (n.number_text == null) return;
        var parts = String(n.number_text).split(';').map(function (s) { return s.trim(); });
        if (parts.indexOf(String(number).trim()) < 0) return;
        if (schemeId && n.scheme_id !== schemeId) return;
        if (volume && String(n.volume) !== String(volume)) return;
        out.push({ unit: u, number: n, grouped: parts.length > 1 });
      });
    });
    return out;
  }

  // ---------------------------------------------------------------- mahalliy qatlam (overlay)
  // Qatlam ents omboriga yoziladi (sxema o'zgarmaydi): ov_struct, ov_isnad, ov_person, ov_tr va roviy teskari indeksi ov_occ.
  // ov_occ kaliti "<person>|<seq 6>|<tartib 3>" — kitob tartibida sahifalab o'qiladi (minglab natija DOMga birdan chiqmaydi).
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function overlayRows(pkg, pkgv, m) {
    var ov = pkg.overlay || {}, rows = [];
    var st = ov.structure || { kitabs: [], babs: [], unit_bab: {}, kitab_opening: [] };
    rows.push(['ents', { pkgv: pkgv, kind: 'ov_struct', id: m.target.edition_id, data: st }]);
    var kitOf = {};
    (st.kitabs || []).forEach(function (k) { (k.unit_ids || []).forEach(function (u) { kitOf[u] = k.id; }); });
    var counts = {};
    function cnt(p) { return counts[p] || (counts[p] = { units: {}, routes: {}, mentions: 0, members: 0 }); }
    (ov.isnad || []).forEach(function (r) {
      rows.push(['ents', { pkgv: pkgv, kind: 'ov_isnad', id: r.unit_id, data: r }]);
      var routeOf = {}, k = 0;
      (r.routes || []).forEach(function (ro) {
        (ro.nodes || []).forEach(function (n) {
          var x = { route_id: ro.route_id, label: ro.label, pos: n.pos, of: ro.of };
          (n.also || []).forEach(function (mid) { (routeOf[mid] = routeOf[mid] || []).push(x); });   // bir o'rindagi boshqa ustoz(lar)
          if (n.mid) (routeOf[n.mid] = routeOf[n.mid] || []).push(x);
          else {   // yo'l a'zosi, lekin sahifadagi havolasi yo'q: indeksda bor, matnda oralig'i yo'q
            var p0 = String(n.person);
            rows.push(['ents', { pkgv: pkgv, kind: 'ov_occ', id: m.target.edition_id + '|' + p0 + '|' + pad(r.seq, 6) + '|' + pad(900 + (k++), 3), data: { person: n.person, unit_id: r.unit_id, seq: r.seq,
              mid: null, as_written: null, span: false, routes: [x], kitab_id: kitOf[r.unit_id] || null, bab_id: (st.unit_bab || {})[r.unit_id] || null,
              number: r.evidence.printed_number, status: r.status } }]);
            var c0 = cnt(p0); c0.units[r.unit_id] = 1; c0.routes[ro.route_id] = 1; c0.members++;
          }
        });
      });
      (r.mentions || []).forEach(function (mn, i) {
        var p = String(mn.person), rts = routeOf[mn.mid] || [];
        rows.push(['ents', { pkgv: pkgv, kind: 'ov_occ', id: m.target.edition_id + '|' + p + '|' + pad(r.seq, 6) + '|' + pad(i, 3), data: { person: mn.person, unit_id: r.unit_id, seq: r.seq,
          mid: mn.mid, as_written: mn.as_written, span: !!mn.span, routes: rts, kitab_id: kitOf[r.unit_id] || null, bab_id: (st.unit_bab || {})[r.unit_id] || null,
          number: r.evidence.printed_number, status: r.status } }]);
        var c = cnt(p); c.units[r.unit_id] = 1; c.mentions++; rts.forEach(function (x) { c.routes[x.route_id] = 1; }); if (rts.length) c.members++;
      });
    });
    var people = {};
    (ov.persons || []).forEach(function (p) { people[String(p.person)] = p; });
    Object.keys(counts).forEach(function (p) {
      var c = counts[p];
      var data = Object.assign({}, people[p] || { person: /^\d+$/.test(p) ? Number(p) : p }, { counts: { units: Object.keys(c.units).length, routes: Object.keys(c.routes).length, mentions: c.mentions, members: c.members } });
      rows.push(['ents', { pkgv: pkgv, kind: 'ov_person', id: p, data: data }]);
    });
    (ov.translations || []).forEach(function (t) { rows.push(['ents', { pkgv: pkgv, kind: 'ov_tr', id: t.target, data: t }]); });
    pkg.overlayRowCount = rows.length;
    return rows;
  }
  // Qatlam faqat aynan o'sha asosiy paket (sha256) o'rnatilganda qo'llanadi; aks holda karantin, sabab bilan.
  async function overlayState(editionId) {
    var pk = await packages();
    var ov = pk.find(function (p) { return p.kind === 'overlay' && p.manifest.target && p.manifest.target.edition_id === editionId; });
    if (!ov) return { state: 'none' };
    var base = pk.find(function (p) { return p.kind === 'base_book' && p.manifest.edition_id === editionId; });
    var tg = ov.manifest.target;
    if (!base) return { state: 'base_missing', overlay: ov, target: tg };
    if (base.sha256 !== tg.package_sha256) return { state: 'mismatch', overlay: ov, target: tg, installed: { version: base.version, sha256: base.sha256 } };
    return { state: 'active', overlay: ov, base: base, target: tg };
  }
  var ovCache = {};
  async function ovEnt(kind, id, editionId) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return null;
    var rows = await getAll('ents', 'kind_id', [kind, String(id)]);
    var r = rows.find(function (x) { return x.pkgv === s.overlay.active_pkgv; });
    return r ? r.data : null;
  }
  async function ovStructure(editionId) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return null;
    var key = s.overlay.active_pkgv;
    if (ovCache[key]) return ovCache[key];
    var st = await ovEnt('ov_struct', editionId, editionId);
    if (!st) return null;
    var kit = {}, bab = {}, unitPlace = {};
    st.kitabs.forEach(function (k, i) { k.i = i; kit[k.id] = k; });
    st.babs.forEach(function (b, i) { b.i = i; bab[b.id] = b; });
    Object.keys(st.unit_bab || {}).forEach(function (u) { unitPlace[u] = { bab: st.unit_bab[u] }; });
    (st.kitab_opening || []).forEach(function (u) { unitPlace[u] = { opening: true }; });
    ovCache[key] = { kitabs: st.kitabs, babs: st.babs, kit: kit, bab: bab, place: unitPlace, pkgv: key };
    return ovCache[key];
  }
  // Kalit: nashr|roviy|tartib|indeks — bir nechta kitob qatlami o'rnatilganda ham har nashrning roviy ro'yxati alohida
  function occRange(person, editionId) { var k = editionId + '|' + String(person) + '|'; return IDBKeyRange.bound(['ov_occ', k], ['ov_occ', k + '￿']); }
  async function ovOccCount(person, editionId) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return 0;
    var db = await openDb();
    return req(db.transaction('ents').objectStore('ents').index('kind_id').count(occRange(person, editionId)));
  }
  // Sahifalangan o'qish: offset dan limit tagacha (kursor.advance) — butun natija xotiraga yuklanmaydi.
  async function ovOccPage(person, editionId, offset, limit) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return [];
    var db = await openDb();
    return new Promise(function (res, rej) {
      var out = [], skipped = !offset;
      var r = db.transaction('ents').objectStore('ents').index('kind_id').openCursor(occRange(person, editionId));
      r.onsuccess = function () {
        var c = r.result;
        if (!c) return res(out);
        if (!skipped) { skipped = true; c.advance(offset); return; }
        if (c.value.pkgv === s.overlay.active_pkgv) out.push(c.value.data);
        if (out.length >= limit) return res(out);
        c.continue();
      };
      r.onerror = function () { rej(r.error); };
    });
  }
  // Roviyning shu nashrdagi barcha zikrlari (daraja bo'yicha sanash va saralash uchun; bir roviyda bir necha ming qatorgacha)
  var occAllCache = {};
  async function ovOccAll(person, editionId) {
    var s = await overlayState(editionId);
    if (s.state !== 'active') return [];
    var k = s.overlay.active_pkgv + '|' + person;
    if (!occAllCache[k]) occAllCache[k] = await ovOccPage(person, editionId, 0, 1e7);
    return occAllCache[k];
  }

  function fmtBytes(n) {
    if (n == null) return '?';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }

  root.Lib = { openDb: openDb, packages: packages, getPackage: getPackage, activeSet: activeSet, cleanup: cleanup,
    install: install, uninstall: uninstall, rollback: rollback, exportPackage: exportPackage, estimateFree: estimateFree,
    unit: unit, occurrence: occurrence, unitsOf: unitsOf, occOf: occOf, ent: ent, ents: ents,
    commentariesFor: commentariesFor, toc: toc, occToc: occToc, dropToc: dropToc, linksOfOccurrence: linksOfOccurrence, linkActivation: linkActivation,
    resolve: resolve, versionOk: versionOk, fmtBytes: fmtBytes, DB_NAME: DB_NAME,
    unitsByIds: unitsByIds, ovMany: ovMany, overlayState: overlayState, ovStructure: ovStructure, ovEnt: ovEnt, ovOccCount: ovOccCount, ovOccPage: ovOccPage, ovOccAll: ovOccAll };
})(self);

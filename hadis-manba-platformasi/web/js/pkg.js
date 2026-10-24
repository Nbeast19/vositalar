// .hmz paketini ochish va tekshirish (Python pkgformat.open_package bilan bir xil qoidalar).
(function (root) {
  'use strict';
  var SCHEMA_MAJOR = '1';
  var REQUIRED = ['package.json', 'LICENSE', 'ATTRIBUTION', 'COVERAGE.json', 'SHA256SUMS'];
  var DATA = ['data/entities.json', 'data/units.jsonl', 'data/occurrences.jsonl', 'data/links.jsonl',
    'data/evidence.jsonl', 'data/parallels.jsonl', 'data/corrections.jsonl', 'data/reviews.jsonl'];
  // Mahalliy qatlam (kind=overlay): asosiy kitobning aniq versiyasiga bog'langan tuzilma/sanad/roviy/tarjima.
  var OVERLAY = ['data/overlay/structure.json', 'data/overlay/isnad.jsonl', 'data/overlay/persons.jsonl', 'data/overlay/translations.jsonl'];

  async function sha256Hex(bytes) {
    var h = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  var dec = new TextDecoder('utf-8', { fatal: true });
  function text(b) { return dec.decode(b); }
  function jsonl(b, name) {
    if (!b) return [];
    return text(b).split('\n').filter(function (l) { return l.trim(); }).map(function (l, i) {
      try { return JSON.parse(l); } catch (e) { throw new Error(name + ':' + (i + 1) + ': JSON xato'); }
    });
  }

  async function open(buf) {
    var errors = [];
    var files = await Zip.readAll(buf);
    Object.keys(files).forEach(function (n) {
      if (REQUIRED.indexOf(n) < 0 && DATA.indexOf(n) < 0 && OVERLAY.indexOf(n) < 0 && n.indexOf('packages/') !== 0) errors.push('ruxsat etilmagan fayl: ' + n);
    });
    REQUIRED.forEach(function (n) { if (!files[n]) errors.push("majburiy fayl yo'q: " + n); });
    if (errors.length) throw new Error(errors.join('; '));
    var listed = {};
    text(files.SHA256SUMS).split('\n').forEach(function (l) {
      if (!l.trim()) return;
      var i = l.indexOf('  ');
      listed[l.slice(i + 2)] = l.slice(0, i);
    });
    var present = Object.keys(files).filter(function (n) { return n !== 'SHA256SUMS'; });
    if (present.length !== Object.keys(listed).length || present.some(function (n) { return !(n in listed); })) {
      throw new Error("SHA256SUMS ro'yxati fayllarga mos emas");
    }
    for (var n in listed) {
      if ((await sha256Hex(files[n])) !== listed[n]) throw new Error('xesh mos emas: ' + n);
    }
    var m = JSON.parse(text(files['package.json']));
    if (String(m.schema_version || '').split('.')[0] !== SCHEMA_MAJOR) throw new Error('sxema versiyasi mos emas');
    if (m.normalization_version !== Arabic.VERSION) throw new Error('normalizatsiya versiyasi mos emas: ' + m.normalization_version);
    if (['base_book', 'commentary', 'selection', 'overlay'].indexOf(m.kind) < 0) throw new Error("noto'g'ri kind");
    if (m.kind !== 'overlay' && Object.keys(files).some(function (n) { return OVERLAY.indexOf(n) >= 0; })) throw new Error('ruxsat etilmagan fayl: overlay');
    if (m.kind === 'overlay' && !(m.target && m.target.package_id && m.target.package_sha256 && m.target.edition_id)) throw new Error("overlay: target yo'q");
    if (m.kind !== 'selection') {
      for (var f in (m.file_hashes || {})) {
        if (!files[f] || (await sha256Hex(files[f])) !== m.file_hashes[f]) throw new Error('manifest file_hashes mos emas: ' + f);
      }
    }
    var pkg = { manifest: m, sha256: await sha256Hex(buf), bytes: buf.byteLength, files: files };
    pkg.entities = files['data/entities.json'] ? JSON.parse(text(files['data/entities.json'])) : {};
    pkg.units = jsonl(files['data/units.jsonl'], 'units.jsonl');
    pkg.occurrences = jsonl(files['data/occurrences.jsonl'], 'occurrences.jsonl');
    pkg.links = jsonl(files['data/links.jsonl'], 'links.jsonl');
    pkg.evidence = jsonl(files['data/evidence.jsonl'], 'evidence.jsonl');
    pkg.parallels = jsonl(files['data/parallels.jsonl'], 'parallels.jsonl');
    if (m.kind === 'overlay') {
      pkg.overlay = {
        structure: files['data/overlay/structure.json'] ? JSON.parse(text(files['data/overlay/structure.json'])) : null,
        isnad: jsonl(files['data/overlay/isnad.jsonl'], 'isnad.jsonl'),
        persons: jsonl(files['data/overlay/persons.jsonl'], 'persons.jsonl'),
        translations: jsonl(files['data/overlay/translations.jsonl'], 'translations.jsonl')
      };
    }
    pkg.coverage = JSON.parse(text(files['COVERAGE.json']));
    pkg.license = text(files.LICENSE);
    pkg.attribution = text(files.ATTRIBUTION);
    // matn xeshi joriy matnga mosmi
    var all = pkg.units.concat(pkg.occurrences);
    for (var i = 0; i < all.length; i++) {
      if ((await sha256Hex(new TextEncoder().encode(all[i].text_ar))) !== all[i].current_text_sha256) {
        throw new Error('current_text_sha256 mos emas: ' + (all[i].unit_id || all[i].occurrence_id));
      }
    }
    return pkg;
  }

  var api = { open: open, sha256Hex: sha256Hex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pkg = api;
})(typeof self !== 'undefined' ? self : this);

// Hadith Library | مكتبة الحديث — interfeys (en / ar / uz). Manba matni faqat textContent orqali chiqariladi.
// Yo'l: Bosh sahifa → Kitoblar → kitob sahifasi (o'rnatish, mundarija, sharhlar) → mundarija → hadis (oldingi/keyingi,
// roviy paneli, sharh paneli, manba va tekshiruv). Eski havolalar (#/h/, #/s/, #/w/, #/read/) o'zgarmagan.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = I18N.t, en = I18N.e;
  // Har marshrut alohida konteynerda chiziladi; faqat oxirgisi #asosiy ga qo'yiladi (tez bosishda aralashmaydi).
  var root = $('asosiy'), main = root, routeSeq = 0;
  var worker = null, searchSeq = 0;
  var catalog = { packages: [] };
  var PAGE = 50;
  var keyHandler = null;

  // ---------------------------------------------------------------- DOM yordamchi
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'on') for (var ev in v) e.addEventListener(ev, v[ev]);
      else if (k === 'cls') e.className = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    // Haqiqiy paketlarda ba'zi maydonlar son (jild, raqam): Node bo'lmagan qiymat matn sifatida qo'shiladi.
    (kids || []).forEach(function (c) { if (c != null && c !== '') e.appendChild(c instanceof Node ? c : document.createTextNode(String(c))); });
    return e;
  }
  var ICONS = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    books: 'M4 4h5v16H4zM9.5 4h4v16h-4zM14.6 5.2l3.9-1 3.6 14.6-3.9 1z',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
    library: 'M6 3h12v18l-6-4-6 4z',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    auto: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 3v18',
    chevL: 'M15 18l-6-6 6-6', chevR: 'M9 18l6-6-6-6',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    type: 'M3 20 8.5 5h1L15 20M5.2 14.5h7.6M15.5 20l3-8.5h.4l3 8.5M16.5 17.3h4.4',
    bookmark: 'M6 3h12v18l-6-4-6 4z',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    note: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    x: 'M18 6 6 18M6 6l12 12',
    download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    upload: 'M12 21V9M7 14l5-5 5 5M5 3h14',
    check: 'M20 6 9 17l-5-5',
    user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01',
    alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    focus: 'M8 3H3v5M21 8V3h-5M3 16v5h5M16 21h5v-5',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15',
    phone: 'M7 2h10v20H7zM11 18h2', monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
    chain: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    dot: 'M12 12h.01'
  };
  var FLIP = { chevL: 1, chevR: 1, arrow: 1 };
  function icon(name, cls) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'i' + (FLIP[name] ? ' flip' : '') + (cls ? ' ' + cls : ''));
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ICONS.dot); s.appendChild(p);
    return s;
  }
  function arP(text, cls) { return el('p', { lang: 'ar', dir: 'rtl', cls: cls || 'src' }, [text]); }
  function arSpan(text) { return el('bdi', { lang: 'ar', dir: 'rtl', cls: 'ar-i' }, [text]); }
  function iso(text) { return el('bdi', { cls: 'iso' }, [String(text)]); }
  function idTxt(text) { return el('bdi', { cls: 'ltr-id', dir: 'ltr' }, [String(text)]); }
  function btn(label, act, onclick, cls, ic) {
    return el('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-act': act, on: { click: onclick } }, [ic ? icon(ic) : null, el('span', { cls: 'lbl', text: label })]);
  }
  function link(label, href, act, cls, ic) { return el('a', { cls: 'btn ' + (cls || ''), href: href, 'data-act': act }, [ic ? icon(ic) : null, el('span', { cls: 'lbl', text: label })]); }
  function pill(text, cls, ic) { return el('span', { cls: 'pill ' + (cls || '') }, [ic ? icon(ic) : null, text]); }
  function clear() { main.textContent = ''; window.scrollTo(0, 0); if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } }
  function toast(msg, bad) {
    var x = el('div', { cls: 'toast' + (bad ? ' bad' : ''), role: 'status', text: msg });
    document.body.appendChild(x);
    setTimeout(function () { x.remove(); }, 4200);
  }
  function download(name, blob) {
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(t('copied')); }
    catch (e) { var ta = el('textarea', { cls: 'nusxa-maydon', 'data-act': 'copy-fallback' }); ta.value = text; main.appendChild(ta); ta.select(); toast(t('copyManual')); }
    var last = el('textarea', { cls: 'yashirin', id: 'oxirgi-nusxa' }); last.value = text;
    var old = $('oxirgi-nusxa'); if (old) old.remove(); document.body.appendChild(last);
  }
  // Tarjima ichiga element (masalan arabcha ism) qo'yish: "{name}" atrofidagi matn saqlanadi, tartib tilga mos.
  function tNode(key, node) {
    var raw = (I18N.strings[I18N.lang()] || {})[key];
    if (raw == null) raw = I18N.strings.en[key] || key;
    var parts = raw.split(/\{\w+\}/);
    return [parts[0], node, parts.slice(1).join('')];
  }
  function crumbs(items) {
    var nav = el('nav', { cls: 'crumbs', 'aria-label': 'Breadcrumb' });
    items.forEach(function (it, i) {
      if (i) nav.appendChild(icon('chevR'));
      nav.appendChild(it.href ? el('a', { href: it.href, lang: it.ar ? 'ar' : null, dir: it.ar ? 'rtl' : null, 'data-act': it.act || null }, [it.text]) : el('span', { lang: it.ar ? 'ar' : null }, [it.text]));
    });
    return nav;
  }

  // ---------------------------------------------------------------- sozlamalar (mavzu, o'qish)
  var PREF_KEY = 'hadith-library.reader', THEME_KEY = 'hadith-library.theme';
  var SIZES = [21, 24, 27, 31, 36];
  function prefs() {
    var p = { size: 2, wide: false, marks: true, focus: false };
    try { Object.assign(p, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* standart */ }
    return p;
  }
  function savePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) { /* xususiy rejim */ } applyPrefs(p); }
  function applyPrefs(p) {
    var r = document.documentElement.style;
    var small = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    r.setProperty('--read-size', (SIZES[p.size] - (small ? 3 : 0)) + 'px');
    r.setProperty('--read-lh', p.wide ? '2.45' : '2.15');
  }
  function theme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function setTheme(v) {
    try { if (v === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, v); } catch (e) { /* xususiy rejim */ }
    if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v);
    renderThemeBtn();
    if (curBook) pageBook(curBook);
  }
  function renderThemeBtn() {
    var b = $('tema'), v = theme();
    b.textContent = ''; b.appendChild(icon(v === 'dark' ? 'moon' : v === 'light' ? 'sun' : 'auto'));
    b.setAttribute('aria-label', t('theme.label') + ': ' + t('theme.' + v)); b.title = t('theme.label') + ': ' + t('theme.' + v);
  }
  // Harakatlarni faqat ko'rinishda yashirish; manba matni va nusxalash o'zgarmaydi.
  function displayText(s, marks) { s = sawText(s); return marks ? s : s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, ''); }
  // "صلى الله عليه وسلم" → ﷺ faqat ko'rinishda (manba matni, nusxa va eksport o'zgarmaydi); tanlov o'qish sozlamalarida.
  var SAW_RE = (function () {
    var M = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670]*';
    return new RegExp(['ص', 'ل', 'ى'].join(M) + M + '\\s+' + ['ا', 'ل', 'ل', 'ه'].join(M) + M + '\\s+' + ['ع', 'ل', 'ي', 'ه'].join(M) + M + '\\s+' + ['و', 'س', 'ل', 'م'].join(M) + M, 'g');
  })();
  var sawOn = false;
  function sawText(s) { return sawOn ? s.replace(SAW_RE, 'ﷺ') : s; }

  // ---------------------------------------------------------------- nomlar
  // 0.2.0 qatlam paketlari nomidagi «(mahalliy qatlam)» belgisi nashrdan oldin qo'yilgan — endi ko'rsatilmaydi (QARORLAR.md #53)
  var LOCAL_TAG = /\s*\((?:local layer|mahalliy qatlam|طبقة محلية)\)$/;
  function titleOf(c) {
    var tt = (c && c.title) || {}, cut = function (x) { return x ? x.replace(LOCAL_TAG, '') : x; };
    var other = cut((I18N.lang() === 'uz' ? tt.uz : null) || tt.en || tt.uz) || (c && c.package_id) || '';
    return { ar: cut(tt.ar) || null, other: other };
  }
  async function workTitle(workId) {
    var w = await Lib.ent('works', workId);
    if (w) return w.title_ar || w.title_en || w.title_uz || workId;
    var c = catalog.packages.find(function (p) { return p.work_id === workId; });
    return c ? (c.title.ar || c.title.en || c.title.uz) : workId;
  }
  async function personName(id) {
    if (!id) return null;
    var p = await Lib.ent('persons', id);
    return p ? (p.name_ar || p.name_en || p.name_uz) : null;
  }
  async function schemeLabel(id) { var s = await Lib.ent('numbering_schemes', id); return s ? s.label : id; }
  async function numbersText(numbers) {
    var out = [];
    for (var n of (numbers || [])) {
      var lbl = await schemeLabel(n.scheme_id);
      if (n.number_text == null) out.push(lbl + ': ' + t('rd.noNum'));
      else out.push(lbl + ': ' + (n.volume ? t('num.vol', { v: n.volume }) + ', ' : '') + n.number_text + (n.variant ? ' (' + n.variant + ')' : ''));
    }
    return out;
  }
  // Nashr yorlig'i paketda o'zbekcha yozilgan ("Raqamli matn: …; bosma raqamlar: …") — UI tilida qayta tuziladi.
  function editionLabel(ed, fallback) {
    if (!ed) return fallback || '';
    var m = /^Raqamli matn:\s*([^;]+);\s*bosma raqamlar:\s*(.+)$/.exec(ed.label || '');
    if (m) return t('ed.digital', { src: m[1].trim(), num: m[2].trim() });
    return ed.label || fallback || '';
  }
  function primaryNum(numbers) { return (numbers || []).find(function (n) { return n.number_text != null; }) || null; }
  function numLabel(row) { return row.num ? (row.vol ? row.vol + ':' : '') + row.num : null; }
  function fold(s) {  // kitob/muallif nomlarini qidirish uchun: arabcha normalizatsiya + lotin harflarini soddalashtirish
    return Arabic.normalize(String(s || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[ʿʾ'`’‘ʻ\-_.]/g, '').replace(/\s+/g, ' ').trim();
  }
  function channelLabel(c) { return c.channel === 'conditional' ? t('rights.conditional') : c.channel === 'public' ? t('rights.public') : t('rights.local'); }
  function authorOf(c) { var a = (c && c.authors || [])[0]; return a ? { ar: a.name_ar, en: a.name_en || (I18N.lang() === 'uz' ? a.name_uz : null) } : null; }
  function sizeOf(c) { return c.compressed_bytes ? Lib.fmtBytes(c.compressed_bytes) : ''; }

  // Paketdagi o'zbekcha izohlar: tanish iboralar en/ar tushuntirishiga, qolgani "asl izoh" sifatida.
  function reasonText(r) {
    if (!r) return null;
    var m;
    if (r === 'Arabcha terminal + inglizcha mos') return t('nr.match');
    if (r.indexOf('Arabcha terminal aniq') === 0) return t('nr.clear');
    if (r.indexOf('Rasulullohga nisbat chegarasi aniqlanmagan') === 0) return t('nr.boundary');
    if (r.indexOf('Terminal ism aynan mos') === 0) return t('nr.case');
    if ((m = /^Terminal otasi\/bobosi yoki lug.atda yakka aniqlanmagan:\s*(.*)$/.exec(r))) return t('nr.unresolved', { x: m[1] || '—' });
    if (r.indexOf('Sahoba arabcha aniq') === 0) return t('nr.companion');
    if ((m = /^Terminalda bir nechta shaxs:\s*(.*)$/.exec(r))) return t('nr.multi', { x: m[1] });
    if (r.indexOf('90 foiz tartibli matn mosligi') === 0) return t('numr.weak');
    if (r.indexOf('Mustaqil saytda boshqa rivoyat raqami') === 0) return t('numr.other');
    if (r.indexOf("ko'rish oynasi") === 0 || r.indexOf('ko‘rish oynasi') === 0) return t('lim.preview');
    if (r.indexOf('eski qayta tekshirilmagan') === 0) return t('lim.legacy');
    return I18N.lang() === 'uz' ? r : t('orig') + ' ' + t('orig.lang') + ': ' + r;
  }

  // ---------------------------------------------------------------- katalog
  async function loadCatalog() {
    try { var r = await fetch('./catalog.json', { cache: 'no-cache' }); if (r.ok) catalog = await r.json(); }
    catch (e) { /* oflayn: o'rnatilganlar baribir ko'rinadi */ }
    if (catalog.conditional_catalog) {
      try { var r2 = await fetch('./' + catalog.conditional_catalog, { cache: 'no-cache' }); if (r2.ok) catalog.packages = catalog.packages.concat((await r2.json()).packages || []); }
      catch (e) { /* ixtiyoriy */ }
    }
  }
  async function groups() {
    var pk = await Lib.packages();
    var items = catalog.packages.slice();
    pk.forEach(function (p) {
      if (p.kind === 'overlay') return;   // mahalliy qatlam alohida (Kutubxonam, kitob sahifasi)
      if (!items.find(function (c) { return c.package_id === p.package_id; })) {
        var m = p.manifest;
        items.push({ package_id: p.package_id, kind: p.kind, package_version: p.version, title: m.title, work_id: m.work_id,
          edition_id: m.edition_id, requires_for_linked_reading: m.requires_for_linked_reading || [], rights: m.rights,
          channel: 'local', local_only: true, provides_units: m.provides_units, compressed_bytes: p.bytes, authors: [] });
      }
    });
    var g = {}, order = [];
    items.sort(function (a, b) { return Registry.sortKey(a.work_id) - Registry.sortKey(b.work_id); });
    items.forEach(function (c) {
      var w = c.kind === 'base_book' ? c.work_id : ((c.requires_for_linked_reading || [])[0] || {}).target_work_id || c.work_id;
      if (!g[w]) { g[w] = { work_id: w, bases: [], comms: [] }; order.push(w); }
      g[w][c.kind === 'base_book' ? 'bases' : 'comms'].push(c);
    });
    var inst = {};
    pk.forEach(function (p) { inst[p.package_id] = p; });
    return { groups: g, order: order, installed: inst, packages: pk };
  }
  function searchText(g) {
    var parts = [g.work_id];
    g.bases.concat(g.comms).forEach(function (c) {
      var tt = c.title || {};
      parts.push(tt.ar, tt.en, tt.uz);
      (c.names || []).forEach(function (n) { parts.push(n); });
      (c.authors || []).forEach(function (a) { parts.push(a.name_ar, a.name_en, a.name_uz); });
    });
    return fold(parts.filter(Boolean).join(' | '));
  }
  function groupState(g, inst) {
    var all = g.bases.concat(g.comms);
    var installed = all.filter(function (c) { return inst[c.package_id]; });
    var base = g.bases[0] || null;
    return { installed: installed.length, baseInst: base ? inst[base.package_id] : null, ready: installed.length && installed.every(function (c) { return inst[c.package_id].offline_ready; }) };
  }
  function bookCard(g, inst) {
    var base = g.bases[0] || {}, tt = titleOf(base.package_id ? base : (g.comms[0] || {})), au = authorOf(base);
    var st = groupState(g, inst);
    var status = st.baseInst ? pill(st.ready ? t('card.ready') : t('card.installed'), 'ok', 'check')
      : (base.compressed_bytes ? pill(t('card.get', { size: sizeOf(base) }), '', 'download') : null);
    return tint(el('a', { cls: 'book', href: '#/w/' + encodeURIComponent(g.work_id), 'data-act': 'open-book', 'data-work': g.work_id, 'data-group': Registry.groupOf(g.work_id) }, [
      el('span', { cls: 'spine', 'aria-hidden': 'true' }),
      tt.ar ? el('div', { cls: 'ttl-ar', lang: 'ar', dir: 'rtl', text: tt.ar }) : null,
      el('div', { cls: 'ttl-en', text: tt.other }),
      au ? el('div', { cls: 'auth' }, [au.ar ? arSpan(au.ar) : null, au.en ? (au.ar ? ' · ' : '') + au.en : null]) : null,
      el('div', { cls: 'row' }, [status,
        g.comms.length ? pill(t('card.comms', { n: g.comms.length }), 'accent', 'layers') : null,
        base.is_test_fixture ? pill(t('card.sample'), 'warn') : null,
        el('span', { cls: 'cta' }, [st.baseInst ? t('card.open') : t('card.view'), icon('arrow')])])]), g.work_id);
  }

  // ---------------------------------------------------------------- Bosh sahifa
  async function lastPosition() {
    var p = await Notes.get('position:last');
    if (!p) return null;
    var u = await Lib.unit(p.target);
    return u ? u : null;
  }
  async function viewHome() {
    clear();
    var data = await groups();
    var gs = data.order.map(function (k) { return data.groups[k]; });
    var bases = gs.filter(function (g) { return g.bases.length; });
    var installedGs = gs.filter(function (g) { return groupState(g, data.installed).baseInst; });
    var last = await lastPosition();

    var q = el('input', { type: 'search', id: 'bosh-izla', 'data-act': 'home-search', placeholder: t('home.searchPh'), 'aria-label': t('home.searchPh'), dir: 'auto', enterkeyhint: 'search' });
    var form = el('form', { cls: 'searchbox xl', role: 'search', on: { submit: function (e) {
      e.preventDefault(); var v = q.value.trim(); if (!v) return;
      location.hash = (/[؀-ۿ]/.test(v) && data.packages.length ? '#/search?q=' : '#/books?q=') + encodeURIComponent(v);
    } } }, [icon('search'), q]);
    var startHref = last ? '#/h/' + encodeURIComponent(last.unit_id) : installedGs.length ? '#/w/' + encodeURIComponent(installedGs[0].work_id) : '#/books';
    var heroMain = el('div', { cls: 'hero-main' }, [
      el('div', { cls: 'hero-ar', lang: 'ar', dir: 'rtl', text: 'مكتبة الحديث' }),
      el('h1', { text: t('home.title') }),
      el('p', { cls: 'lead', text: t('home.lead') }),
      form,
      el('div', { cls: 'btns' }, [link(last ? t('home.continue') : t('home.start'), startHref, 'start', 'primary lg', last ? 'bookmark' : 'books'),
        link(t('home.browse'), '#/books', 'browse', 'ghost lg', 'arrow')])]);
    var side = el('div', { cls: 'hero-side' });
    if (last) {
      var row = { num: (primaryNum(last.numbers) || {}).number_text, vol: (primaryNum(last.numbers) || {}).volume };
      side.appendChild(el('a', { cls: 'continue', href: '#/h/' + encodeURIComponent(last.unit_id), 'data-act': 'continue' }, [
        el('div', { cls: 'eyebrow', text: t('home.continue') }),
        el('div', { cls: 'ttl', lang: 'ar', dir: 'rtl', text: await workTitle(last.work_id) }),
        el('div', { cls: 'small' }, [row.num ? t('h.number', { n: numLabel(row) }) : en('unitType', last.unit_type), last.chapter_ar ? ' · ' : '', last.chapter_ar ? arSpan(last.chapter_ar) : null]),
        el('div', { cls: 'ex', lang: 'ar', dir: 'rtl', text: Array.from(last.text_ar).slice(0, 180).join('') }),
        el('span', { cls: 'go' }, [t('home.continueGo'), icon('arrow')])]));
    }
    var nComms = gs.reduce(function (a, g) { return a + g.comms.length; }, 0);
    side.appendChild(el('div', { cls: 'stat-card' }, [el('div', { cls: 'stats' }, [
      el('div', {}, [el('b', { text: String(bases.length) }), el('span', { text: t('home.statBooks') })]),
      el('div', {}, [el('b', { text: String(nComms) }), el('span', { text: t('home.statComms') })]),
      el('div', {}, [el('b', { text: String(data.packages.length) }), el('span', { text: t('home.statInstalled') })])]),
      data.packages.length ? null : el('p', { cls: 'small muted', text: t('home.nothing') })]));
    main.appendChild(el('section', { cls: 'hero' }, [heroMain, side]));

    if (installedGs.length) {
      var gridI = el('div', { cls: 'grid' });
      installedGs.forEach(function (g) { gridI.appendChild(bookCard(g, data.installed)); });
      main.appendChild(el('section', { cls: 'section' }, [el('div', { cls: 'section-head' }, [el('h2', { text: t('home.yourBooks') }), el('a', { href: '#/installed', text: t('nav.installed') })]), gridI]));
    }
    var grid = el('div', { cls: 'grid' });
    bases.filter(function (g) { return !groupState(g, data.installed).baseInst; }).slice(0, 9).forEach(function (g) { grid.appendChild(bookCard(g, data.installed)); });
    if (grid.childNodes.length)
      main.appendChild(el('section', { cls: 'section' }, [el('div', { cls: 'section-head' }, [el('h2', { text: t('home.featured') }), el('a', { href: '#/books', 'data-act': 'see-all', text: t('home.seeAll') + ' (' + bases.length + ')' })]), grid]));
    main.appendChild(el('section', { cls: 'section' }, [el('div', { cls: 'section-head' }, [el('h2', { text: t('home.how') })]),
      el('div', { cls: 'steps' }, [[t('home.s1'), t('home.s1t')], [t('home.s2'), t('home.s2t')], [t('home.s3'), t('home.s3t')]].map(function (x, i) {
        return el('div', { cls: 'step' }, [el('div', { cls: 'n', text: String(i + 1) }), el('b', { text: x[0] }), el('p', { text: x[1] })]);
      }))]));
  }

  // ---------------------------------------------------------------- Kitoblar katalogi
  async function viewBooks(params) {
    clear();
    var data = await groups();
    main.appendChild(el('h1', { text: t('books.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('books.lead') }));
    if (catalog.packages.some(function (c) { return c.is_test_fixture; })) main.appendChild(el('p', { cls: 'note warn', text: t('card.sample') }));
    var box = el('input', { type: 'search', id: 'kitob-izla', 'data-act': 'find-book', placeholder: t('books.find'), 'aria-label': t('books.find'), dir: 'auto', value: params.q || '' });
    var mode = params.f || 'all';
    var chips = el('div', { cls: 'chips', role: 'group' });
    ['all', 'installed', 'comms'].forEach(function (f) {
      chips.appendChild(el('button', { type: 'button', cls: 'chip', 'data-act': 'filter-' + f, 'aria-pressed': String(f === mode), text: t('f.' + f), on: { click: function () {
        mode = f; chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-act') === 'filter-' + f)); }); filter();
      } } }));
    });
    var count = el('span', { cls: 'small faint' });
    main.appendChild(el('div', { cls: 'searchbox' }, [icon('search'), box]));
    main.appendChild(el('div', { cls: 'section-head', id: 'filtr' }, [chips, count]));
    var list = el('div', { id: 'kitoblar' });
    main.appendChild(list);
    var cards = [], secs = {};
    data.order.forEach(function (k) {
      var g = data.groups[k], gid = Registry.groupOf(g.work_id);
      if (!secs[gid]) {
        secs[gid] = { grid: el('div', { cls: 'grid' }), cards: [] };
        secs[gid].sec = el('section', { cls: 'bgsec', 'data-group': gid }, [el('h2', { cls: 'grp-h', text: t('grp.' + gid) }), secs[gid].grid]);
        list.appendChild(secs[gid].sec);
      }
      var card = bookCard(g, data.installed);
      var c = { el: card, text: searchText(g), inst: !!groupState(g, data.installed).installed, comms: g.comms.length > 0, sec: secs[gid] };
      secs[gid].cards.push(c); cards.push(c);
      secs[gid].grid.appendChild(card);
    });
    main.appendChild(el('p', { cls: 'tiny faint section', text: t('grp.note') }));
    var none = el('div', { cls: 'empty yashirin' }, [icon('search'), el('p', { text: t('books.none') })]);
    main.appendChild(none);
    function filter() {
      var q = fold(box.value), shown = 0;
      cards.forEach(function (c) {
        var ok = (!q || c.text.indexOf(q) >= 0) && (mode === 'all' || (mode === 'installed' && c.inst) || (mode === 'comms' && c.comms));
        c.el.classList.toggle('yashirin', !ok); if (ok) shown++;
      });
      Object.keys(secs).forEach(function (k) { secs[k].sec.classList.toggle('yashirin', !secs[k].cards.some(function (c) { return !c.el.classList.contains('yashirin'); })); });
      none.classList.toggle('yashirin', shown > 0);
      count.textContent = t('books.count', { n: shown });
    }
    box.addEventListener('input', filter);
    filter();
  }

  // ---------------------------------------------------------------- Kitob sahifasi
  async function viewWork(workId, params) {
    clear();
    var data = await groups();
    var g = data.groups[workId];
    if (!g) { main.appendChild(emptyState(t('notFound'), t('books.none'), '#/books', t('home.browse'))); return; }
    var base = g.bases[0] || null, inst = data.installed;
    var bi = base ? inst[base.package_id] : null;
    pageBook(workId);
    var tt = titleOf(base || g.comms[0]), au = authorOf(base || g.comms[0]);
    var tocData = bi ? await Lib.toc(bi.active_pkgv) : null;
    var pos = await Notes.get('position:w:' + workId);
    var posUnit = pos ? await Lib.unit(pos.target) : null;
    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: tt.ar || tt.other, ar: !!tt.ar }]));

    var actions = el('div', { cls: 'btns' });
    if (bi && tocData && tocData.units.length) {
      var first = tocData.units[0];
      var pn = posUnit ? primaryNum(posUnit.numbers) : null;
      actions.appendChild(link(posUnit ? t('bk.continue', { n: pn ? pn.number_text : '' }) : t('bk.start'), '#/r/' + encodeURIComponent(base.package_id) + '?u=' + encodeURIComponent(posUnit ? posUnit.unit_id : first.id), 'start-reading', 'primary lg', 'books'));
      actions.appendChild(link(t('rd.contents'), '#/c/' + encodeURIComponent(base.package_id) + '?k=' + (posUnit && tocData.index[posUnit.unit_id] != null ? tocData.units[tocData.index[posUnit.unit_id]].c : 0), 'read', 'lg', 'list'));
      actions.appendChild(link(t('bk.searchIn'), '#/search?book=' + encodeURIComponent(workId), 'search-in', 'ghost lg', 'search'));
      if (base.package_version && bi.version !== base.package_version && !base.local_only)
        actions.appendChild(btn(t('bk.update', { v: base.package_version }), 'install', function () { installMany([base]); }, 'soft lg', 'download'));
      // kitob avval o'rnatilgan, shu qurilmadagi katalogda uning boblar qatlami bor, lekin hali o'rnatilmagan
      if (base.overlay) {
        var ovi = await Lib.getPackage(base.overlay.package_id);
        if (!ovi || ovi.sha256 !== base.overlay.package_sha256)
          actions.appendChild(btn(t('bk.installLayer', { size: sizeOf(base.overlay) }), 'install-layer', function () { installMany([base.overlay]); }, 'soft lg', 'layers'));
      }
    } else if (base && !base.local_only) {
      actions.appendChild(btn(t('bk.install', { size: sizeOf(base) }), 'install', function () { installMany([base]); }, 'primary lg', 'download'));
      if (base.download_url) actions.appendChild(el('a', { cls: 'btn ghost lg', href: base.download_url, rel: 'noopener', 'data-act': 'download-file' }, [icon('download'), t('bk.download')]));
    }
    var facts = el('div', { cls: 'facts' }, [
      base && base.provides_units ? el('span', {}, [el('b', { text: String(base.provides_units) }), ' ', t('bk.entries', { n: '' }).trim()]) : null,
      tocData ? el('span', {}, [t('bk.chapters', { n: tocData.chapters.length })]) : null,
      g.comms.length ? el('span', {}, [t('card.comms', { n: g.comms.length })]) : null,
      base ? el('span', {}, [t('bk.sizeVal', { c: sizeOf(base), i: Lib.fmtBytes(base.installed_bytes) })]) : null]);
    var statusPill = base ? el('span', { cls: 'pill holat ' + (bi ? 'ok' : ''), 'data-status': bi ? (bi.offline_ready ? 'ready' : 'installed') : 'none' },
      [bi ? icon('check') : null, bi ? (bi.offline_ready ? t('card.ready') : t('card.installed')) : t('bk.notInstalled')]) : null;
    main.appendChild(el('section', { cls: 'book-hero', 'data-pkg': base ? base.package_id : null }, [
      el('div', { cls: 'cover', 'aria-hidden': 'true' }, [el('div', { cls: 'c-ar', lang: 'ar', dir: 'rtl', text: tt.ar || '' }), el('div', { cls: 'c-orn' }), el('div', { cls: 'c-en', text: tt.other })]),
      el('div', {}, [
        tt.ar ? el('h1', { cls: 'ttl-ar', lang: 'ar', dir: 'rtl', text: tt.ar }) : el('h1', { text: tt.other }),
        tt.ar ? el('div', { cls: 'ttl-en', text: tt.other }) : null,
        au ? el('div', { cls: 'auth' }, tNode('bk.by', el('span', {}, [au.ar ? arSpan(au.ar) : null, au.en ? (au.ar ? ' · ' : '') + au.en : null]))) : null,
        el('div', { cls: 'btns' }, [statusPill, base ? pill(channelLabel(base), base.channel === 'public' ? 'accent' : 'warn') : null]),
        facts, actions,
        !base ? el('p', { cls: 'note', text: t('bk.noMain') }) : null])]));

    // Bir asarning boshqa nashrlari (masalan boshqa raqamlash) — har biri alohida paket, aralashtirilmaydi.
    if (g.bases.length > 1) {
      var eds = el('section', { cls: 'card section', 'data-act': 'editions' }, [el('h2', { text: t('bk.editions') }), el('p', { cls: 'small muted', text: t('bk.editionsLead') })]);
      g.bases.forEach(function (c) {
        var ci = inst[c.package_id];
        var acts = el('div', { cls: 'acts' });
        if (ci) acts.appendChild(link(t('my.open'), '#/read/' + encodeURIComponent(c.package_id), 'read', 'sm', 'list'));
        else if (!c.local_only) acts.appendChild(btn(t('card.get', { size: sizeOf(c) }), 'install', function () { installMany([c]); }, 'sm soft', 'download'));
        eds.appendChild(el('div', { cls: 'lib-row', 'data-pkg': c.package_id }, [el('div', {}, [
          el('b', {}, [idTxt(c.edition_id || c.package_id)]),
          el('div', { cls: 'sub' }, [c.provides_units ? t('bk.entries', { n: c.provides_units }) + ' · ' : '', el('span', { cls: 'holat', 'data-status': ci ? (ci.offline_ready ? 'ready' : 'installed') : 'none', text: ci ? t('card.installed') : t('bk.notInstalled') })])]), acts]));
      });
      main.appendChild(eds);
    }

    // Tablar
    var tabs = el('div', { cls: 'tabs', role: 'tablist' });
    var panel = el('section', { id: 'kitob-panel' });
    var current = params.tab || 'contents';
    var defs = [['contents', t('bk.tabContents')], ['comms', t('bk.tabComms') + (g.comms.length ? ' · ' + g.comms.length : '')], ['about', t('bk.tabAbout')]];
    defs.forEach(function (d) {
      tabs.appendChild(el('button', { type: 'button', role: 'tab', 'data-act': 'tab-' + d[0], 'aria-selected': String(d[0] === current), text: d[1], on: { click: function () {
        current = d[0]; tabs.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-act') === 'tab-' + current)); }); draw();
        history.replaceState(history.state, '', '#/w/' + encodeURIComponent(workId) + (current === 'contents' ? '' : '?tab=' + current));
      } } }));
    });
    main.appendChild(tabs); main.appendChild(panel);
    async function draw() {
      panel.textContent = '';
      if (current === 'contents') {
        if (!tocData) {
          panel.appendChild(el('div', { cls: 'card empty' }, [icon('books'), el('p', { text: t('bk.contentsLocked') }),
            base && !base.local_only ? btn(t('bk.install', { size: sizeOf(base) }), 'install', function () { installMany([base]); }, 'primary') : null]));
          return;
        }
        // To'plamning umumiy ko'rinishi: ichki Kitoblar ixcham ko'p ustunli ro'yxatda (bob emas)
        var bdx = await bookData(base.package_id);
        panel.appendChild(el('div', { cls: 'section-head' }, [el('h2', { text: t('col.kitabs') }), el('span', { cls: 'small faint', text: t('bk.chapters', { n: tocData.chapters.length }) })]));
        panel.appendChild(el('p', { cls: 'small muted', text: t('col.lead') }));
        var ln = overlayNote(bdx);
        panel.appendChild(ln || el('p', { cls: 'note small ok-note', 'data-act': 'layer-note', 'data-state': 'active' }, [icon('check'), ' ', t('col.layerActive')]));
        var grid = el('ol', { cls: 'kgrid' });
        tocData.chapters.forEach(function (c, i) {
          var kit = kitabOf(bdx, i);
          grid.appendChild(el('li', {}, [el('a', { cls: 'kcell', href: '#/c/' + encodeURIComponent(base.package_id) + '?k=' + i, 'data-act': 'chapter' }, [
            el('span', { cls: 'no', text: String(i + 1) }),
            el('span', { cls: 'kt', lang: 'ar', dir: 'rtl', text: c.title || t('rd.all') }),
            kit && kit.name ? el('span', { cls: 'kn', text: kit.name }) : null,
            el('span', { cls: 'km' }, [t('col.rec', { n: c.count }), kit && kit.babs ? ' · ' + (kit.babs.length ? t('col.babs', { n: kit.babs.length }) : t('col.noBabHead')) : '', c.first ? ' · ' + t('col.first', { n: c.first }) : ''])])]));
        });
        panel.appendChild(tint(grid, workId));
        panel.appendChild(el('p', { cls: 'tiny faint', text: t('col.countsNote') }));
      } else if (current === 'comms') {
        panel.appendChild(el('p', { cls: 'muted', text: t('bk.commsLead') }));
        panel.appendChild(el('div', { cls: 'btns' }, [link(t('dk.title'), '#/desk/' + encodeURIComponent(workId) + (posUnit && primaryNum(posUnit.numbers) ? '?n=' + encodeURIComponent(primaryNum(posUnit.numbers).number_text) : ''), 'open-desk', 'soft sm', 'layers')]));
        if (!g.comms.length) { panel.appendChild(el('div', { cls: 'card empty' }, [icon('layers'), el('p', { text: t('bk.noComms') })])); return; }
        var checks = [];
        var bar = el('div', { cls: 'installbar yashirin' });
        g.comms.forEach(function (c) {
          var ci = inst[c.package_id], ct = titleOf(c), ca = authorOf(c);
          var cb = el('input', { type: 'checkbox', 'data-id': c.package_id, 'data-act': 'pick-commentary', 'aria-label': ct.ar || ct.other });
          if (ci) { cb.checked = true; cb.disabled = true; }
          cb.addEventListener('change', updateBar);
          checks.push(cb);
          var acts = el('div', { cls: 'acts' });
          if (ci) acts.appendChild(link(t('my.open'), '#/read/' + encodeURIComponent(c.package_id), 'read', 'sm', 'list'));
          else if (!c.local_only) acts.appendChild(btn(t('card.get', { size: sizeOf(c) }), 'install', function () { installMany([c]); }, 'sm soft', 'download'));
          if (c.download_url) acts.appendChild(el('a', { cls: 'btn sm ghost', href: c.download_url, rel: 'noopener', 'data-act': 'download-file' }, [t('bk.download')]));
          panel.appendChild(el('div', { cls: 'comm-card', 'data-pkg': c.package_id }, [el('label', { cls: 'check' }, [cb]),
            el('div', {}, [
              ct.ar ? el('div', { cls: 'ttl-ar', lang: 'ar', dir: 'rtl', text: ct.ar }) : null,
              el('div', { cls: 'sub' }, [ct.other, ca && ca.ar ? ' · ' : '', ca && ca.ar ? arSpan(ca.ar) : null]),
              el('div', { cls: 'btns', style: null }, [
                el('span', { cls: 'pill holat ' + (ci ? 'ok' : ''), 'data-status': ci ? (ci.offline_ready ? 'ready' : 'installed') : 'none' }, [ci ? t('card.installed') : t('bk.notInstalled')]),
                c.provides_units ? pill(t('bk.passages', { n: c.provides_units })) : null,
                pill(channelLabel(c), c.channel === 'public' ? 'accent' : 'warn')])]), acts]));
        });
        var barText = el('span', { cls: 'small' });
        bar.appendChild(barText);
        bar.appendChild(btn(t('bk.installSel', { n: '' }), 'install-with', async function () {
          var ids = checks.filter(function (x) { return x.checked && !x.disabled; }).map(function (x) { return x.getAttribute('data-id'); });
          var list = (base && !inst[base.package_id] ? [base] : []).concat(ids.map(function (id) { return catalog.packages.find(function (p) { return p.package_id === id; }); }).filter(Boolean));
          await installMany(list);
        }, '', 'download'));
        panel.appendChild(bar);
        panel.appendChild(el('p', { cls: 'small faint', text: t('bk.notAgain') }));
        function updateBar() {
          var n = checks.filter(function (x) { return x.checked && !x.disabled; }).length;
          bar.classList.toggle('yashirin', n === 0);
          barText.textContent = t('bk.selected', { n: n });
          bar.querySelector('button').lastChild.textContent = base && !inst[base.package_id] ? t('bk.installWith', { n: n }) : t('bk.installSel', { n: n });
        }
      } else {
        var c0 = base || g.comms[0];
        var body = (c0.rights || []).find(function (r) { return r.applies_to === 'classical_body'; }) || {};
        var ed = bi ? await Lib.ent('editions', bi.manifest.edition_id) : null;
        var sch = bi ? await Lib.ents('numbering_schemes') : [];
        var dl = el('dl', { cls: 'meta' });
        function row(k, v) { if (v == null || v === '') return; dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', {}, [v])); }
        row(t('bk.edition'), ed ? editionLabel(ed) : idTxt(c0.edition_id));
        row(t('bk.numbering'), sch.length ? sch.map(function (s) { return s.label; }).join(' · ') : null);
        row(t('bk.source'), ed && ed.digital_source ? idTxt(ed.digital_source.replace(/^0-Manba\/manbalar\//, '')) : null);
        row(t('bk.licence'), body.license_id ? idTxt(body.license_id) : t('bk.permission'));
        row(t('bk.attribution'), body.required_attribution ? el('span', { dir: 'auto', text: body.required_attribution }) : null);
        row(t('bk.rights'), channelLabel(c0));
        row(t('bk.version'), el('span', {}, [idTxt(c0.package_id), ' · ', idTxt('v' + c0.package_version)]));
        row(t('bk.size'), t('bk.sizeVal', { c: sizeOf(c0), i: Lib.fmtBytes(c0.installed_bytes) }));
        panel.appendChild(el('div', { cls: 'card' }, [dl]));
        panel.appendChild(el('div', { cls: 'card' }, [el('h2', { text: t('bk.coverage') }), el('p', { cls: 'muted', text: t('bk.coverageText') }), el('p', { cls: 'muted', text: t('evw.type') })]));
        if (bi) panel.appendChild(el('div', { cls: 'btns' }, [btn(t('bk.remove'), 'remove', async function () {
          if (!confirm(t('confirm.remove', { name: tt.ar || tt.other }))) return;
          await Lib.uninstall(base.package_id); toast(t('removed')); route();
        }, 'ghost danger', 'trash')]));
      }
    }
    await draw();
  }
  function emptyState(title, text, href, label, act) {
    return el('div', { cls: 'card empty' }, [icon('info'), el('h2', { text: title }), el('p', { text: text }), href ? link(label, href, act || 'empty-go', 'primary') : null]);
  }

  // ---------------------------------------------------------------- o'rnatish
  var installing = 0;   // o'rnatish ketayotganda yangi versiya sahifani qayta yuklamaydi (tugaguncha kutadi)
  async function installMany(list) {
    installing++;
    try { for (var c of list) { try { await installFromCatalog(c); } catch (e) { break; } } }
    finally { installing--; }
    route();
  }
  // Kitob avval o'rnatilgan, katalogda esa uning boblar va roviylar qatlami bor (keyinroq nashr qilingan) — qatlam o'zi qo'shiladi.
  async function addMissingLayers() {
    if (navigator.onLine === false) return;
    var todo = [];
    for (var c of catalog.packages) {
      if (!c.overlay) continue;
      var b = await Lib.getPackage(c.package_id);
      if (!b || b.sha256 !== c.package_sha256) continue;
      var o = await Lib.getPackage(c.overlay.package_id);
      if (!o || o.sha256 !== c.overlay.package_sha256) todo.push(c.overlay);
    }
    if (todo.length) await installMany(todo);
  }
  async function installFromCatalog(c) {
    var inst = await Lib.getPackage(c.package_id);
    if (inst && inst.sha256 === c.package_sha256) { if (c.overlay) await installFromCatalog(c.overlay); return; }
    var tt = titleOf(c);
    var st = progressBox(tt.ar || tt.other || c.package_id);
    try {
      st.set('download', '', 0);
      var r = await fetch(c.file, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var buf = await readWithProgress(r, c.compressed_bytes, function (p) { st.set('download', Math.round(p * 100) + '%', p * 0.5); });
      if (c.package_sha256 && (await Pkg.sha256Hex(buf)) !== c.package_sha256) throw new Error('SHA-256');
      await Lib.install(buf, st.set);
      st.ok();
    } catch (e) { st.fail(e.message, c.download_url); throw e; }
    // shu qurilmadagi katalogda kitobning mahalliy qatlami (boblar, sanad) bo'lsa — birga o'rnatiladi
    if (c.overlay) await installFromCatalog(c.overlay);
  }
  async function doInstall(buf, name) {
    var st = progressBox(name);
    installing++;
    try { var res = await Lib.install(buf, st.set); st.ok(res.map(function (r) { return r.package_id + ': ' + r.action; }).join(', ')); }
    catch (e) { st.fail(e.message); }
    finally { installing--; }
  }
  async function readWithProgress(resp, expected, cb) {
    if (!resp.body || !resp.body.getReader) return resp.arrayBuffer();
    var reader = resp.body.getReader(), chunks = [], got = 0;
    for (;;) {
      var x = await reader.read();
      if (x.done) break;
      chunks.push(x.value); got += x.value.length;
      if (expected) cb(Math.min(1, got / expected));
    }
    var out = new Uint8Array(got), o = 0;
    chunks.forEach(function (c) { out.set(c, o); o += c.length; });
    return out.buffer;
  }
  // Yadro xatolari (o'zbekcha texnik matn) — foydalanuvchiga UI tilida tushuntiriladi, asl matn kichik qilib qoladi.
  function friendlyError(msg) {
    var m = String(msg || ''), k = 'err.verify', v = {};
    if (/Joy yetmaydi/.test(m)) k = 'err.space';
    else if (/boshqa oynada band/.test(m)) k = 'err.busy';
    else if (/DecompressionStream/.test(m)) k = 'err.browser';
    else if (/qaydlar fayli emas/.test(m)) k = 'err.notes';
    else if (/^HTTP (\d+)/.test(m)) { k = 'err.http'; v = { code: m.slice(5) }; }
    else if (/Failed to fetch|NetworkError|Load failed/i.test(m)) k = 'err.offline';
    return { text: t(k, v), detail: m };
  }
  var STATE_KEY = { yuklash: 'st.download', download: 'st.download', tekshirish: 'st.verify', joy: 'st.space', staging: 'st.staging',
    faollashtirish: 'st.activate', tayyorlik: 'st.ready', tayyor: 'st.done' };
  var STATE_PROGRESS = { tekshirish: .55, joy: .6, staging: .7, faollashtirish: .9, tayyorlik: .95, tayyor: 1 };
  function progressBox(name) {
    var line = el('div', { cls: 'small', text: '…' }), bar = el('i');
    var box = el('div', { cls: 'toast', role: 'status', 'data-act': 'progress' }, [el('b', { cls: 't-title' }, [t('st.installing', { name: name })]), line, el('div', { cls: 'bar' }, [bar])]);
    document.body.appendChild(box);
    return {
      set: function (s, msg, frac) {
        // Lib.install o'zbekcha texnik izoh yuboradi — foydalanuvchiga faqat bosqich nomi ko'rsatiladi.
        line.textContent = t(STATE_KEY[s] || s) + (s === 'download' && msg ? ' ' + msg : '') + (s === 'staging' && frac != null ? ' · ' + Math.round(frac * 100) + '%' : '');
        var f = frac != null ? frac : STATE_PROGRESS[s];
        if (f != null) bar.style.width = Math.round(f * 100) + '%';
      },
      ok: function () { box.setAttribute('data-done', 'ok'); line.textContent = t('st.ok'); bar.style.width = '100%'; setTimeout(function () { box.remove(); }, 2600); },
      fail: function (msg, href) {
        var fe = friendlyError(msg);
        box.setAttribute('data-done', 'fail'); box.classList.add('bad'); line.textContent = t('st.fail', { msg: fe.text });
        box.appendChild(el('p', { cls: 'tiny', dir: 'auto', text: fe.detail }));
        if (href) box.appendChild(el('p', { cls: 'small' }, [el('a', { href: href, rel: 'noopener', 'data-act': 'download-file', text: t('bk.download') }), ' — ' + t('st.manual')]));
        box.appendChild(el('button', { type: 'button', cls: 'btn sm', 'data-act': 'close', text: t('close'), on: { click: function () { box.remove(); } } }));
      }
    };
  }

  // ---------------------------------------------------------------- Mundarija (o'quvchi)
  async function viewRead(pid, params) {
    clear();
    var p = await Lib.getPackage(pid);
    if (!p) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('home.browse'))); return; }
    var isBase = p.kind === 'base_book';
    var workId = isBase ? p.manifest.work_id : (((p.manifest.requires_for_linked_reading || [])[0] || {}).target_work_id || p.manifest.work_id);
    var title = await workTitle(p.manifest.work_id);
    var data = isBase ? await Lib.toc(p.active_pkgv) : await Lib.occToc(p.active_pkgv);
    var ci = Math.max(0, Math.min(data.chapters.length - 1, parseInt(params.c || '0', 10) || 0));
    var ch = data.chapters[ci] || { title: '', start: 0, count: data.units.length };
    var pages = Math.max(1, Math.ceil(ch.count / PAGE));
    var pg = Math.max(1, Math.min(pages, parseInt(params.p || '1', 10) || 1));
    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: await workTitle(workId), ar: true, href: '#/w/' + encodeURIComponent(workId) }, { text: t('rd.contents') }]));

    var side = el('aside', { cls: 'toc-side', id: 'toc-side', 'aria-label': t('rd.chapters') });
    var filterBox = el('input', { type: 'search', placeholder: t('rd.filter'), 'aria-label': t('rd.filter'), dir: 'auto', 'data-act': 'toc-filter' });
    side.appendChild(el('div', { cls: 'section-head' }, [el('h3', { text: t('rd.chapters') }), el('button', { type: 'button', cls: 'icon-btn drawer-btn', 'aria-label': t('rd.close'), on: { click: closeDrawer } }, [icon('x')])]));
    side.appendChild(filterBox);
    var links = [];
    data.chapters.forEach(function (c, i) {
      var a = el('a', { cls: 'toc-ch', href: '#/read/' + encodeURIComponent(pid) + '?c=' + i, 'aria-current': i === ci ? 'true' : null, 'data-act': 'toc-chapter' }, [
        el('span', { cls: 'n', text: String(i + 1) }),
        el('span', { cls: 't', lang: isBase ? 'ar' : null, dir: isBase ? 'rtl' : null, text: isBase ? (c.title || t('rd.all')) : (c.title ? t('num.vol', { v: c.title }) : t('rd.all')) }),
        el('span', { cls: 'c', text: String(c.count) })]);
      links.push({ a: a, text: fold(c.title) });
      side.appendChild(a);
    });
    filterBox.addEventListener('input', function () { var q = fold(filterBox.value); links.forEach(function (l) { l.a.classList.toggle('yashirin', !!q && l.text.indexOf(q) < 0); }); });
    var scrim = el('div', { cls: 'scrim yashirin', on: { click: closeDrawer } });
    function openDrawer() { side.classList.add('open'); scrim.classList.remove('yashirin'); filterBox.focus(); }
    function closeDrawer() { side.classList.remove('open'); scrim.classList.add('yashirin'); }

    var body = el('section', { cls: 'read-main' });
    var jumpIn = el('input', { type: 'text', inputmode: 'numeric', placeholder: t('num.number'), 'aria-label': t('rd.jump'), dir: 'ltr', 'data-act': 'jump-number' });
    var jumpMsg = el('span', { cls: 'small faint', role: 'status' });
    body.appendChild(el('div', { cls: 'ch-head' }, [
      el('div', {}, [
        el('button', { type: 'button', cls: 'btn sm drawer-btn', 'data-act': 'open-contents', on: { click: openDrawer } }, [icon('list'), t('rd.chapters')]),
        el('h1', { cls: 'ch-ttl', lang: isBase ? 'ar' : null, dir: isBase ? 'rtl' : null, text: isBase ? (ch.title || title) : title }),
        el('div', { cls: 'ch-sub' }, [isBase ? null : arSpan(title), isBase ? '' : ' · ', t('rd.entriesIn', { n: ch.count })])]),
      isBase ? el('form', { cls: 'jump', on: { submit: async function (e) {
        e.preventDefault(); var v = jumpIn.value.trim(); if (!v) return;
        var r = await Lib.resolve(workId, v, null, null);
        if (!r.length) { jumpMsg.textContent = t('rd.notFound', { n: v }); return; }
        location.hash = '#/h/' + encodeURIComponent(r[0].unit.unit_id);
      } } }, [jumpIn, el('button', { type: 'submit', cls: 'btn sm', 'data-act': 'jump-go', text: t('rd.go') }), jumpMsg]) : null]));
    var list = el('ol', { cls: 'entries', start: String(ch.start + (pg - 1) * PAGE + 1) });
    data.units.slice(ch.start + (pg - 1) * PAGE, Math.min(ch.start + ch.count, ch.start + pg * PAGE)).forEach(function (r) {
      var nl = isBase ? numLabel(r) : (r.page ? (r.vol ? r.vol + ':' : '') + r.page : null);
      list.appendChild(el('li', {}, [el('a', { cls: 'entry', href: (isBase ? '#/h/' : '#/s/') + encodeURIComponent(r.id), 'data-act': 'toc-item' }, [
        el('span', { cls: 'num' + (nl ? '' : ' none'), text: nl || (isBase ? en('unitType', r.type) : '—') }),
        el('span', { cls: 'ex', lang: 'ar', dir: 'rtl', text: r.ex })])]));
    });
    function pager() {
      var base = '#/read/' + encodeURIComponent(pid) + '?c=' + ci + '&p=';
      return el('div', { cls: 'pager' }, [
        pg > 1 ? link(t('rd.prevPage'), base + (pg - 1), 'prev-page', 'sm', 'chevL') : el('span'),
        el('span', { cls: 'small faint', text: t('rd.page', { p: pg, n: pages }) }),
        pg < pages ? link(t('rd.nextPage'), base + (pg + 1), 'next-page', 'sm') : el('span')]);
    }
    if (pages > 1) body.appendChild(pager());
    body.appendChild(list);
    body.appendChild(pager());
    var nextCh = data.chapters[ci + 1];
    if (nextCh && pg === pages) body.appendChild(el('div', { cls: 'btns' }, [link(isBase ? (nextCh.title || '') : t('num.vol', { v: nextCh.title }), '#/read/' + encodeURIComponent(pid) + '?c=' + (ci + 1), 'next-chapter', 'soft', 'arrow')]));
    main.appendChild(el('div', { cls: 'reader-layout' }, [side, body]));
    main.appendChild(scrim);
    var cur = side.querySelector('[aria-current="true"]'); if (cur && cur.scrollIntoView && window.innerWidth > 960) cur.scrollIntoView({ block: 'center' });
  }

  // ---------------------------------------------------------------- alohida hadis sahifasi (yagona occurrence)
  // To'plam → Kitob → Bob → raqam; to'liq asl matn, sanad yo'li va o'rinlar (qatlam bo'lsa), tanlangan roviy belgilanadi.
  async function viewUnit(id, params) {
    params = params || {};
    var mySeq = routeSeq;
    clear();
    var u = await Lib.unit(id);
    if (!u) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('installBase'), 'install-base')); return; }
    var pr = rprefs(); applyRprefs(pr);
    var pkgs = await Lib.packages();
    var pk = pkgs.find(function (p) { return p.active_pkgv === u.pkgv; });
    var data = await Lib.toc(u.pkgv);
    var idx = data.index[u.unit_id], row = data.units[idx] || {};
    var prev = data.units[idx - 1] || null, next = data.units[idx + 1] || null;
    var bd = pk && pk.kind === 'base_book' ? await bookData(pk.package_id) : null;
    var place = bd ? placeOf(bd, u.unit_id) : null;
    var rec = bd && bd.ov ? await Lib.ovEnt('ov_isnad', u.unit_id, bd.edition) : null;
    if (rec) await attachNames([rec], bd.edition);
    if (bd) pageBook(bd.work);
    var trRec = bd && bd.ov && I18N.lang() === 'uz' ? await Lib.ovEnt('ov_tr', u.unit_id, bd.edition) : null;
    var title = await workTitle(u.work_id);
    var pn = primaryNum(u.numbers);
    var heading = pn ? t('h.number', { n: (pn.volume ? pn.volume + ':' : '') + pn.number_text }) : en('unitType', u.unit_type);
    var chIdx = row.c || 0;
    var contentsHref = pk ? '#/c/' + encodeURIComponent(pk.package_id) + '?k=' + chIdx : '#/w/' + encodeURIComponent(u.work_id);
    var readerHref = pk ? '#/r/' + encodeURIComponent(pk.package_id) + '?k=' + chIdx + '&u=' + encodeURIComponent(u.unit_id) : null;
    var cr = [{ text: t('bk.books'), href: '#/books' }, { text: title, ar: true, href: '#/w/' + encodeURIComponent(u.work_id) }];
    if (u.chapter_ar) cr.push(place && place.kit && place.kit.name ? { text: place.kit.name, href: contentsHref } : { text: u.chapter_ar, ar: true, href: contentsHref });
    if (place && place.bab) cr.push({ text: place.bab.title_ar, ar: true, href: contentsHref + '&b=' + place.bab.id });
    else if (bd && bd.ov) cr.push({ text: place && place.opening ? t('cv.opening') : t('oc.unknownBab') });
    cr.push({ text: heading });
    main.appendChild(crumbs(cr));

    function pnNav(cls) {
      function cell(r, dir) {
        var lbl = dir === 'prev' ? t('h.prev') : t('h.next');
        if (!r) return el('span', { cls: dir, 'aria-disabled': 'true', 'data-act': dir + '-unit' }, [el('span', { cls: 'dir', text: lbl }), el('span', { cls: 'where small', text: dir === 'prev' ? t('h.first') : t('h.last') })]);
        var where = r.num ? t('h.number', { n: numLabel(r) }) : en('unitType', r.type);
        return el('a', { cls: dir, href: '#/h/' + encodeURIComponent(r.id), 'data-act': dir + '-unit', rel: dir }, [
          el('span', { cls: 'dir' }, dir === 'prev' ? [icon('chevL'), lbl] : [lbl, icon('chevR')]),
          el('span', { cls: 'where' }, [where, r.c !== row.c && r.ch ? ' · ' : '', r.c !== row.c && r.ch ? arSpan(r.ch) : null])]);
      }
      return el('nav', { cls: 'nav-pn ' + (cls || ''), 'aria-label': t('h.prev') + ' / ' + t('h.next') }, [cell(prev, 'prev'), cell(next, 'next')]);
    }

    var wrap = el('div', { cls: 'read-wrap' });
    var col = el('article', { cls: 'read-col', 'aria-label': heading });
    var insp = el('aside', { cls: 'inspector', id: 'sharh-panel', 'aria-label': t('cm.title') });
    wrap.appendChild(col); wrap.appendChild(insp);
    // Chap tomonda Kitob → Bob daraxti (joyida turadi, shu hadisning bobi belgilanadi); telefonda — menyu
    var tvU = bd ? tree(bd, chIdx, 'r') : null, mmU = bd ? mobileMenu(bd, chIdx, 'r') : null, menuBtnU = null;
    if (tvU) {
      main.appendChild(el('div', { cls: 'cv-layout unit-layout' }, [el('aside', { cls: 'cv-side' }, [tvU.node]), el('div', { cls: 'cv-col' }, [wrap])]));
      main.appendChild(mmU.scrim); main.appendChild(mmU.panel);
      menuBtnU = el('button', { type: 'button', cls: 'btn sm menu-btn', 'data-act': 'open-tree', 'aria-label': t('cv.tree') }, [icon('books'), el('span', { cls: 'lbl', text: t('cv.tree') })]);
      menuBtnU.addEventListener('click', function () { mmU.open(menuBtnU); });
      afterRender = function () {
        if (!restoring) window.scrollTo(0, 0);
        tvU.scrollToCurrent();
        if (place && place.bab) { tvU.setActive(place.bab.id); mmU.tree.setActive(place.bab.id); }
      };
    } else main.appendChild(wrap);
    if (bd) tint(col, bd.work);

    // Roviy ro'yxatidan kelgan bo'lsa — qaytish (ayni sahifa/guruh/scroll: Back bilan, aks holda saqlangan manzil)
    if (params.list) {
      var fh = (history.state || {}).fromHash || '';
      col.appendChild(el('div', { cls: 'btns' }, [el('a', { cls: 'btn sm soft', href: params.list, 'data-act': 'back-list', on: { click: function (e) {
        if (fh === params.list || /^#\/n\//.test(fh)) { e.preventDefault(); history.back(); }
      } } }, [icon('chevL'), t('oc.backList')])]));
    }

    var bm = await Notes.get('bookmark:' + id);
    var srcSlot = el('div', { cls: 'tslot' });
    var narPanel = el('div', { id: 'roviy-panel' });
    var setBtn = settingsButton(function (p2, k) { pr = p2; if (k !== 'fs' && k !== 'wide' && k !== 'theme') renderSrc(); });
    var recOk0 = !!(rec && rec.text_sha256 === u.current_text_sha256 && (rec.routes || []).length);
    col.appendChild(el('div', { cls: 'read-top' }, [
      el('div', { cls: 'toolbar' }, [menuBtnU, link(t('h.contents'), contentsHref, 'contents', 'sm ghost', 'list'), readerHref ? link(t('rdv.inBook'), readerHref, 'in-book', 'sm ghost', 'books') : null]),
      el('div', { cls: 'toolbar' }, [recOk0 ? chainToggle(function (p2) { pr = p2; renderSrc(); }) : null, setBtn,
        (function () {
          var b = btn(bm ? t('h.bookmarked') : t('h.bookmark'), 'bookmark', async function () {
            if (bm) { await Notes.del('bookmark:' + id); bm = null; }
            else { bm = { key: 'bookmark:' + id, type: 'bookmark', target: id, label: Array.from(u.text_ar).slice(0, 60).join('') }; await Notes.put(bm); }
            b.lastChild.textContent = bm ? t('h.bookmarked') : t('h.bookmark');
            b.setAttribute('aria-pressed', String(!!bm));
            toast(t('saved'));
          }, 'sm ghost', 'bookmark');
          b.setAttribute('aria-pressed', String(!!bm));
          return b;
        })(),
        btn(t('h.copy'), 'copy-citation', async function () { copy(await unitCitation(u)); }, 'sm ghost', 'copy')])]));
    col.appendChild(pnNav('top'));
    col.appendChild(el('header', { cls: 'hadith-head' }, [
      place && place.bab ? el('div', { cls: 'bab-line' }, [el('span', { cls: 'tiny faint', text: babLabel(place.bab) }), el('div', { cls: 'kitab', lang: 'ar', dir: 'rtl', text: place.bab.title_ar })])
        : (u.chapter_ar ? el('div', { cls: 'kitab', lang: 'ar', dir: 'rtl', text: u.chapter_ar }) : null),
      el('div', { cls: 'hn' }, [el('h1', { text: heading }), en('attribution', u.attribution_kind) ? pill(en('attribution', u.attribution_kind)) : null])]));

    // Sanad: qatlam bo'lsa — yo'l(lar) va o'rinlar; aks holda paketdagi terminal roviy (faqat verified)
    var nar = (u.narrators || [])[0] || null;
    var person = nar && nar.terminal_person_id ? await Lib.ent('persons', nar.terminal_person_id) : null;
    var nev = nar && nar.evidence_id ? await Lib.ent('evidence', nar.evidence_id) : null;
    var evItem = ((nev && nev.items) || []).find(function (i) { return 'arabic_terminal_alias' in i; }) || {};
    var resolved = !!(nar && nar.narrator_identity_status === 'verified' && person);
    var span = resolved ? nameInText(u.text_ar, [evItem.arabic_terminal_alias].concat(person.aliases_ar || [])) : null;
    var narLabel = resolved ? personLabel(person, span, evItem, nar) : null;
    var recOk = !!(rec && rec.text_sha256 === u.current_text_sha256);
    var chainBody = el('div', { cls: 'chain-body' });
    var chain = el('details', { cls: 'card chain disclose', open: recOk ? true : null, 'data-act': 'chain' }, [el('summary', {}, [icon('chevR', 'chev'), icon('chain'), t('ch.title')]), chainBody]);
    if (recOk) chainBody.appendChild(await routesView(rec, bd.edition));
    else {
      chainBody.appendChild(el('p', { cls: 'small muted', text: bd && bd.ovs.state !== 'active' ? (overlayNote(bd) || {}).textContent || t('ch.partial') : t('ch.partial') }));
      chainBody.appendChild(el('p', { cls: 'tiny faint', text: t('ch.convention') }));
    }
    col.appendChild(chain);

    function renderSrc() {
      srcSlot.textContent = '';
      if (recOk) { srcSlot.appendChild(markedText(u, rec, pr, { highlight: params.p, onNarrator: function (m, rs) { narratorPanel(bd, u, rec, m, rs, narPanel); } })); return; }
      if (!span) { srcSlot.appendChild(markedText(u, null, pr, {})); return; }   // sanad qatlami yo'q: matn + Nabiy ﷺ so'zlari belgisi
      var srcP = el('p', { lang: 'ar', dir: 'rtl', cls: 'src' });
      var chars = Array.from(u.text_ar), nab = pr.nab !== false ? nabawiRanges(chars) : [];
      appendNab(srcP, chars, 0, span.start, nab, pr);
      srcP.appendChild(el('button', { type: 'button', cls: 'nm-inline', 'data-act': 'narrator-inline', 'aria-controls': 'roviy-panel', 'aria-expanded': 'false',
        on: { click: function () { toggleNarrator(nar.terminal_person_id); } } }, [displayText(span.text, pr.marks)]));
      appendNab(srcP, chars, span.end, chars.length, nab, pr);
      srcSlot.appendChild(srcP);
    }
    renderSrc();
    var personBtn = null;
    if (!recOk && resolved) {
      personBtn = el('button', { type: 'button', cls: 'person', 'data-act': 'narrator', 'data-person': nar.terminal_person_id, 'aria-expanded': 'false', 'aria-controls': 'roviy-panel' },
        [icon('user'), arSpan(narLabel.ar)].concat(narLabel.other ? [el('span', { cls: 'small', text: narLabel.other })] : []));
      personBtn.addEventListener('click', function () { toggleNarrator(nar.terminal_person_id); });
    }
    var unresolvedNote = nar && !resolved ? el('span', { cls: 'small' }, [pill(t('evr.' + (nar.narrator_identity_status || 'none')), 'warn'), ' ', reasonText(nar.reason) || t('nar.unresolved')]) : null;
    var hl = null;
    if (params.p && recOk) {
      var hm = (rec.mentions || []).find(function (m) { return String(m.person) === String(params.p) && m.span; });
      hl = el('p', { cls: 'small', 'data-act': 'highlight-note' }, hm ? [t('oc.highlight', { name: '' }).replace(/[:：]?\s*$/, ': '), arSpan(hm.as_written)] : [t('np.notResolved')]);
    }
    col.appendChild(el('section', { cls: 'text-card' }, [srcSlot, hl,
      recOk ? el('p', { cls: 'tiny faint', text: t('set2.ordNote') }) :
        el('div', { cls: 'narr-line' }, [el('span', { text: t('nar.nearest') + ':' }), personBtn || unresolvedNote || el('span', { cls: 'faint', text: t('nar.unresolved') }),
          personBtn ? el('span', { cls: 'tiny faint', text: t('nar.nearestHelp') }) : null])]));
    var trb = bd && bd.ov ? trBlock(trRec, pr, 'unit') : null;
    if (trb) col.appendChild(trb);
    col.appendChild(narPanel);
    var np0 = (history.state || {}).np;
    if (restoring && recOk && np0 && np0.u === u.unit_id) {
      var mm0 = (rec.mentions || []).find(function (x) { return x.mid === np0.mid; });
      if (mm0) await narratorPanel(bd, u, rec, mm0, routeInfo(rec)[mm0.mid] || [], narPanel);
    }

    var n = await Notes.get('note:' + id);
    var ta = el('textarea', { rows: 3, 'aria-label': t('h.notePh'), placeholder: t('h.notePh'), dir: 'auto', 'data-act': 'note' });
    ta.value = n ? n.text : '';
    col.appendChild(el('details', { cls: 'disclose note-box', open: n ? true : null }, [el('summary', {}, [icon('chevR', 'chev'), icon('note'), t('h.note')]),
      ta, btn(t('h.noteSave'), 'note-save', async function () {
        if (ta.value.trim()) await Notes.put({ key: 'note:' + id, type: 'note', target: id, text: ta.value }); else await Notes.del('note:' + id);
        toast(t('saved'));
      }, 'sm')]));

    col.appendChild(await evidenceCard(u));
    col.appendChild(el('div', { cls: 'section' }, [pnNav('bottom')]));
    col.appendChild(el('p', { cls: 'tiny faint', text: t('h.keys') }));
    await renderCommentaries(insp, id, pn);

    // Paketdagi terminal roviy paneli (qatlam yo'q bo'lganda): hadis yopilmaydi.
    var narState = { open: false, shown: 15 };
    function setExpanded(v) { main.querySelectorAll('[aria-controls="roviy-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', String(v)); }); }
    async function toggleNarrator(pid) {
      if (narState.open || !pid) { narPanel.textContent = ''; narState.open = false; setExpanded(false); return; }
      narState.open = true; setExpanded(true);
      var rows = data.units.filter(function (r) { return r.tp === pid; });
      function draw() {
        narPanel.textContent = '';
        var box = el('section', { cls: 'panel-below', 'aria-live': 'polite', 'data-act': 'narrator-panel' }, [
          el('div', { cls: 'section-head' }, [el('h3', {}, tNode('nar.others', arSpan(narLabel.ar))),
            el('button', { type: 'button', cls: 'icon-btn', 'aria-label': t('nar.close'), 'data-act': 'narrator-close', on: { click: function () { toggleNarrator(); } } }, [icon('x')])]),
          el('p', { cls: 'small muted' }, [pill(t('nar.count', { n: rows.length }), 'accent'), ' ', t('nar.scope')])]);
        var ul = el('ul', { cls: 'res-list' });
        rows.slice(0, narState.shown).forEach(function (r) {
          var isThis = r.id === id;
          var ex = el('p', { cls: 'rx', lang: 'ar', dir: 'rtl', text: r.ex + '…' });
          var pv = btn(t('nar.preview'), 'narrator-preview', async function () {
            if (ex.classList.contains('full')) { ex.classList.remove('full'); ex.textContent = r.ex + '…'; pv.lastChild.textContent = t('nar.preview'); return; }
            var full = await Lib.unit(r.id); ex.classList.add('full'); ex.textContent = displayText(full.text_ar, pr.marks); pv.lastChild.textContent = t('nar.hide');
          }, 'sm ghost');
          ul.appendChild(el('li', { 'data-unit': r.id }, [el('div', { cls: 'rh' }, [
            el('span', {}, [el('b', { text: r.num ? t('h.number', { n: numLabel(r) }) : en('unitType', r.type) }), r.ch ? ' · ' : '', r.ch ? arSpan(r.ch) : null, isThis ? ' ' : '', isThis ? pill(t('nar.this'), 'ok') : null]),
            el('span', { cls: 'btns' }, [pv, isThis ? null : link(t('nar.open'), '#/h/' + encodeURIComponent(r.id), 'narrator-open', 'sm soft')])]), ex]));
        });
        box.appendChild(ul);
        if (rows.length > narState.shown) box.appendChild(btn(t('nar.more'), 'narrator-more', function () { narState.shown += 15; draw(); }, 'sm'));
        narPanel.appendChild(box);
      }
      draw();
      narPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    keyHandler = function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || openSheet || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
      var rtl = document.documentElement.dir === 'rtl';
      var goNext = (e.key === 'ArrowRight' && !rtl) || (e.key === 'ArrowLeft' && rtl);
      var goPrev = (e.key === 'ArrowLeft' && !rtl) || (e.key === 'ArrowRight' && rtl);
      if (goNext && next) { location.hash = '#/h/' + encodeURIComponent(next.id); e.preventDefault(); }
      else if (goPrev && prev) { location.hash = '#/h/' + encodeURIComponent(prev.id); e.preventDefault(); }
    };
    if (mySeq !== routeSeq) return;
    document.addEventListener('keydown', keyHandler);
    await Notes.put({ key: 'position:last', type: 'position', target: id });
    await Notes.put({ key: 'position:w:' + u.work_id, type: 'position', target: id });
  }
  // Sanad yo'llari ko'rinishi: har yo'l alohida (A/B), ordinal faqat manbadagi yo'l tugunlari uchun; vositalar soni faqat bitta to'liq yo'lda.
  async function routesView(rec, edition) {
    var box = el('div', { cls: 'routes' });
    var byMid = {};
    var missing = [];
    (rec.routes || []).forEach(function (ro) { ro.nodes.forEach(function (n) { if (!n.mid) missing.push(String(n.person)); }); });
    var people = missing.length ? await Lib.ovMany('ov_person', missing, edition) : {};
    (rec.mentions || []).forEach(function (m) { byMid[m.mid] = m; });
    (rec.routes || []).forEach(function (ro) {
      var ol = el('ol', { cls: 'route', 'data-route': ro.route_id });
      ro.nodes.forEach(function (n) {
        var m = n.mid ? byMid[n.mid] : null;
        ol.appendChild(el('li', {}, [el('span', { cls: 'pos', text: ((rec.routes.length > 1) ? ro.label : '') + n.pos }),
          el('span', { lang: 'ar', dir: 'rtl', text: m ? m.as_written : ((people[String(n.person)] || {}).short_name || ('man-' + n.person)) }),
          !m || !m.span ? el('span', { cls: 'tiny faint', text: t('ni.noSpan') }) : null]));
      });
      box.appendChild(el('div', { cls: 'route-box' }, [el('div', { cls: 'tiny faint', text: t('ch.routeHead', { r: ro.label, n: ro.of }) }), ol]));
    });
    var st = rec.status === 'established_single_route' ? t('ch.count', { n: rec.intermediaries }) : t('ch.noCount');
    box.appendChild(el('p', { cls: 'small' }, [st]));
    if ((rec.reasons || []).length) box.appendChild(el('ul', { cls: 'tiny faint' }, rec.reasons.map(function (r) { return el('li', { text: t('chr.' + r.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); })) }); })));
    box.appendChild(el('p', { cls: 'tiny faint', text: t('ch.convention') }));
    var ovs = await Lib.overlayState(edition), sm = ovs.overlay && ovs.overlay.manifest.source_metadata, isn = sm && sm.isnad;
    if (isn) box.appendChild(el('p', { cls: 'tiny faint', 'data-act': 'isnad-source', text: isn.join === 'text' ? t('ch.srcText')
      : isn.join === 'sequence' ? t('ch.srcSeq', { s: isn.book_id }) : t('ch.src', { s: isn.book_id }) + (isn.join === 'number_text' ? t('ch.srcOther') : '') }));
    return box;
  }

  // Roviy ismi: shu hadis matnidagi aynan oraliq (harakatlari bilan) — normallashtirilgan taxallus orqali topiladi.
  // Topilmasa — matnda belgilanmaydi (taxmin qilinmaydi).
  function nameInText(text, cands) {
    var nm = Arabic.normalizeWithMap(text), chars = Array.from(text), seen = {};
    for (var c of cands) {
      var k = Arabic.normalize(String(c || '').replace(/^(و?عن|و)\s+/, '')).trim();
      if (Array.from(k).length < 3 || seen[k]) continue;
      seen[k] = 1;
      var i = nm.norm.indexOf(k);
      if (i < 0) continue;
      var st = nm.map[i], en2 = nm.map[i + Array.from(k).length - 1] + 1;
      while (en2 < chars.length && /[\u0610-\u061A\u064B-\u065F\u0670]/.test(chars[en2])) en2++;
      return { start: st, end: en2, text: chars.slice(st, en2).join('') };
    }
    return null;
  }
  function personLabel(person, span, evItem, nar) {
    var arName = span ? span.text : (evItem.arabic_terminal_alias || (person.aliases_ar || [])[0] || person.name_uz || '');
    var other = null;
    if (I18N.lang() === 'uz') other = person.name_uz || null;
    else if (I18N.lang() === 'en' && nar.reason === 'Arabcha terminal + inglizcha mos' && evItem.english_narrator) {
      other = evItem.english_narrator.replace(/^Narrated\s+/i, '').replace(/\s*\(.*$/, '').replace(/:\s*$/, '').trim() || null;
    }
    return { ar: arName, other: other };
  }

  async function renderCommentaries(insp, id, pn) {
    var cs = await Lib.commentariesFor(id);
    var card = el('section', { cls: 'insp-card' }, [el('h2', {}, [icon('layers'), t('cm.title')])]);
    var uu = await Lib.unit(id);
    if (uu && pn && pn.number_text) card.appendChild(link(t('dk.title'), '#/desk/' + encodeURIComponent(uu.work_id) + '?n=' + encodeURIComponent(pn.number_text), 'open-desk', 'sm ghost', 'layers'));
    insp.setAttribute('data-tayyor', '1');
    insp.appendChild(card);
    if (!cs.length) {
      card.appendChild(el('p', { cls: 'small muted', 'data-act': 'no-comms', text: t('cm.none') }));
      card.appendChild(el('p', { cls: 'small faint', text: t('cm.noneHint') }));
      return;
    }
    var groupsC = {}, order = [];
    cs.forEach(function (c) { var k = c.occ.work_id + '|' + c.occ.edition_id; if (!groupsC[k]) { groupsC[k] = []; order.push(k); } groupsC[k].push(c); });
    for (var k of order) {
      var items = groupsC[k], o0 = items[0].occ;
      var work = (await Lib.ent('works', o0.work_id)) || {};
      var author = await personName((work.author_ids || [])[0]);
      var ed = await Lib.ent('editions', o0.edition_id);
      var preview = el('div', { cls: 'c-preview yashirin' });
      var chips = el('div', { cls: 'passages' });
      var legacy = items.some(function (c) { return c.link.legacy_confidence; });
      items.forEach(function (c, i) {
        var o = c.occ;
        var lbl = o.page ? (o.volume ? t('cm.page', { v: o.volume, p: o.page }) : t('cm.pageOnly', { p: o.page })) : t('cm.noPage', { n: i + 1 });
        var chip = el('button', { type: 'button', cls: 'passage', 'aria-pressed': 'false', 'data-act': 'passage', text: lbl });
        chip.addEventListener('click', function () {
          var on = chip.getAttribute('aria-pressed') !== 'true';
          chips.querySelectorAll('.passage').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          preview.textContent = '';
          if (!on) { preview.classList.add('yashirin'); return; }
          chip.setAttribute('aria-pressed', 'true');
          var endOk = o.scope === 'full_section' && (o.statuses || {}).commentary_end_status === 'verified';
          var txt = Array.from(o.text_ar);
          preview.appendChild(el('div', { cls: 'src', lang: 'ar', dir: 'rtl', text: txt.slice(0, 1500).join('') + (txt.length > 1500 ? ' …' : '') }));
          if (!endOk) preview.appendChild(el('p', { cls: 'tiny faint', text: t('cm.preview') }));
          preview.appendChild(link(t('cm.openFull'), '#/s/' + encodeURIComponent(o.occurrence_id) + '?from=' + encodeURIComponent(id), 'open-commentary', 'sm soft', 'arrow'));
          preview.classList.remove('yashirin');
        });
        chips.appendChild(chip);
      });
      card.appendChild(el('div', { cls: 'cgroup', 'data-work': o0.work_id }, [
        el('div', { cls: 'cg-ttl', lang: 'ar', dir: 'rtl', text: work.title_ar || o0.work_id }),
        el('div', { cls: 'cg-sub' }, [author ? arSpan(author) : null, author ? ' · ' : '', ed ? ed.label : idTxt(o0.edition_id), ' · ', t('cm.passages', { n: items.length })]),
        chips, legacy ? el('p', { cls: 'tiny faint', text: t('cm.legacy') }) : null, preview,
        // To'liq ochish havolasi har doim mavjud (birinchi joy) — paneldan chiqmasdan ko'rish ixtiyoriy.
        el('div', { cls: 'btns' }, [link(t('cm.openFull'), '#/s/' + encodeURIComponent(o0.occurrence_id) + '?from=' + encodeURIComponent(id), 'open-commentary', 'sm ghost', 'arrow')])]));
    }
  }

  // Manba va tekshiruv: har yozuv uchun sodda xulosa + izohli jadval (holatlar o'chirilmaydi).
  async function evidenceCard(u) {
    var st = u.statuses || {};
    var pn = primaryNum(u.numbers) || (u.numbers || [])[0] || null;
    var ev = pn && pn.evidence_id ? await Lib.ent('evidence', pn.evidence_id) : null;
    var ed = await Lib.ent('editions', u.edition_id);
    var scheme = pn ? await schemeLabel(pn.scheme_id) : '';
    var cands = (ev && ev.candidates) || [];
    var srcNames = cands.map(function (c) {
      var nm = t('src.' + c.source); if (nm === 'src.' + c.source) nm = c.source;
      return nm + (c.number ? ' (' + c.number + (c.page ? ', ' + c.page : '') + ')' : '');
    });
    var nar = (u.narrators || [])[0] || null;
    var narOk = !!(nar && nar.narrator_identity_status === 'verified');
    var narPerson = narOk && nar.terminal_person_id ? await Lib.ent('persons', nar.terminal_person_id) : null;
    var nItem = ((ev && ev.items) || []).find(function (i) { return 'arabic_terminal_alias' in i; }) || {};
    var nSpan = narPerson ? nameInText(u.text_ar, [nItem.arabic_terminal_alias].concat(narPerson.aliases_ar || [])) : null;
    var narName = narPerson ? personLabel(narPerson, nSpan, nItem, nar).ar : null;
    var srcLabel = editionLabel(ed, u.edition_id);
    var file = (u.location && u.location.source_file || '').replace(/^0-Manba\/manbalar\//, '');
    var CLS = { verified: 'ok', limited: 'warn', conflict: 'bad', not_found: 'warn', unreviewed: 'none' };
    var ICN = { ok: 'check', warn: 'alert', bad: 'alert', none: 'info' };
    function li(cls, kids) { return el('li', { cls: cls }, [icon(ICN[cls] || 'info'), el('span', {}, kids)]); }
    var sum = el('ul', { cls: 'ev-sum' });
    sum.appendChild(li('none', [t('ev.from', { src: srcLabel })]));
    if (pn) {
      var nstat = st.number_status;
      var how = nstat === 'verified' ? t('ev.agree', { k: Math.max(1, cands.length) }) : nstat === 'conflict' ? t('ev.conflict') : nstat === 'limited' ? t('ev.one') : t('ev.nonum');
      sum.appendChild(li(CLS[nstat] || 'none', [el('b', { text: t('ev.numLine', { scheme: scheme, n: pn.number_text == null ? '—' : pn.number_text }) }), ' — ' + how]));
    }
    if (nar) sum.appendChild(li(CLS[nar.narrator_identity_status] || 'none', narOk ? tNode('ev.narrLine', arSpan(narName || '—')) : [t('ev.narrLine', { name: '' }).replace(/[:：]?\s*$/, ': '), t('nar.unresolved')]));
    sum.appendChild(li('warn', [t('ev.printLine')]));
    sum.appendChild(li('none', [t('ev.typeLine')]));

    var rows = [];
    function r(key, q, val, why, left) { rows.push([q, val, why, left, key]); }
    var nreason = pn ? reasonText(pn.reason) : null;
    if ('number_status' in st) r('number_status', t('evq.number_status'), st.number_status,
      st.number_status === 'verified' ? t('evw.number.verified', { scheme: scheme, n: pn ? pn.number_text : '—', srcs: srcNames.join('; ') || '—' }) : t('evw.number.' + st.number_status, { reason: nreason || '' }), t('evl.number'));
    if ('printed_page_status' in st) r('printed_page_status', t('evq.printed_page_status'), st.printed_page_status,
      st.printed_page_status === 'verified' && pn && pn.page ? t('evw.page.found', { p: (pn.page_volume ? pn.page_volume + ':' : '') + pn.page }) : t('evw.page.not_found'), t('evl.page'));
    if ('narrator_identity_status' in st) r('narrator_identity_status', t('evq.narrator_identity_status'), st.narrator_identity_status,
      st.narrator_identity_status === 'verified' ? t('evw.narr.ok', { name: narName || '—', reason: reasonText(nar && nar.reason) || '' }) : t('evw.narr.bad', { reason: reasonText(nar && nar.reason) || narName || '—' }), t('evl.narr'));
    if ('edition_identity_status' in st) r('edition_identity_status', t('evq.edition_identity_status'), st.edition_identity_status, t('evw.edition', { src: srcLabel, scheme: scheme || '—' }), t('evl.edition'));
    if ('source_identity_status' in st) r('source_identity_status', t('evq.source_identity_status'), st.source_identity_status, t('evw.source', { file: file || '—', rec: (u.location || {}).record || '—' }), t('evl.source'));
    if ('text_preservation_status' in st) r('text_preservation_status', t('evq.text_preservation_status'), st.text_preservation_status, t('evw.text', { sha: (u.current_text_sha256 || '').slice(0, 12) + '…' }), t('evl.text'));
    if ('semantic_review_status' in st) r('semantic_review_status', t('evq.semantic_review_status'), st.semantic_review_status, t('evw.review'), t('evl.review'));
    r('type', t('evq.type'), 'none', t('evw.type'), t('evl.type'));
    var table = el('table', { cls: 'table ev-table' }, [el('thead', {}, [el('tr', {}, [el('th', { text: t('ev.q') }), el('th', { text: t('ev.r') }), el('th', { text: t('ev.why') }), el('th', { text: t('ev.left') })])]),
      el('tbody', {}, rows.map(function (x) {
        var c = CLS[x[1]] || 'none';
        return el('tr', { 'data-field': x[4] }, [el('td', { cls: 'q', text: x[0] }), el('td', { 'data-label': t('ev.r') }, [pill(t('evr.' + x[1]), c === 'none' ? '' : c), el('div', { cls: 'tiny faint' }, [idTxt(x[4] + '=' + x[1])])]),
          el('td', { 'data-label': t('ev.why') }, x[4] === 'narrator_identity_status' && narOk && narName ? [arSpan(narName), ' — ', x[2]] : [x[2]]), el('td', { cls: 'faint', 'data-label': t('ev.left'), text: x[3] })]);
      }))]);
    var tech = el('div', { cls: 'small' }, [
      el('p', {}, [idTxt(u.unit_id + ' @ ' + u.pkgv)]),
      el('p', {}, [idTxt('current_text_sha256: ' + u.current_text_sha256)]),
      u.raw_sha256 ? el('p', {}, [idTxt('raw_sha256: ' + u.raw_sha256)]) : null,
      el('p', {}, (await numbersText(u.numbers)).map(function (x) { return el('span', { cls: 'pill', text: x }); })),
      (u.identifiers || []).length ? el('p', {}, (u.identifiers || []).map(function (i) { return idTxt(i.namespace + ':' + i.value + ' '); })) : null,
      (u.limitations || []).length ? el('ul', {}, u.limitations.map(function (l) { return el('li', { dir: 'auto', text: reasonText(l) }); })) : null]);
    return el('section', { cls: 'card evidence', 'data-act': 'evidence' }, [el('h2', {}, [icon('shield'), ' ', t('ev.title')]), sum,
      el('details', { cls: 'disclose' }, [el('summary', { 'data-act': 'evidence-more' }, [icon('chevR', 'chev'), t('ev.what')]), el('div', { cls: 'table-wrap' }, [table])]),
      el('details', { cls: 'disclose' }, [el('summary', {}, [icon('chevR', 'chev'), t('ev.tech')]), tech])]);
  }
  function statusLine(st, lims) {
    return Object.keys(st || {}).map(function (k) { return k + '=' + st[k]; }).join(', ') + (lims && lims.length ? '; ' + t('cite.notes') + ': ' + lims.join(' | ') : '');
  }
  async function unitCitation(u) {
    var ed = await Lib.ent('editions', u.edition_id);
    return [(await workTitle(u.work_id)) + ', ' + ((await numbersText(u.numbers)).join('; ') || t('rd.noNum')) + '.',
      t('cite.edition') + ': ' + editionLabel(ed, u.edition_id) + '.',
      t('cite.quote') + ': ' + u.text_ar,
      t('cite.scope') + ': ' + (u.text_kind === 'full' ? t('cite.fullUnit') : u.text_kind) + '.',
      t('cite.status') + ': ' + statusLine(u.statuses, u.limitations) + '.',
      t('cite.source') + ': ' + u.unit_id + ' @ ' + u.pkgv].join('\n');
  }

  // ---------------------------------------------------------------- sharh (to'liq joy)
  async function viewOcc(id, from) {
    clear();
    var o = await Lib.occurrence(id);
    if (!o) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('installBase'))); return; }
    var st = o.statuses || {};
    var endOk = o.scope === 'full_section' && st.commentary_end_status === 'verified';
    var work = (await Lib.ent('works', o.work_id)) || {};
    var author = await personName((work.author_ids || [])[0]);
    var ed = await Lib.ent('editions', o.edition_id);
    var links = await Lib.linksOfOccurrence(id);
    var baseWork = (links[0] && links[0].link.target_work_id) || o.work_id;
    pageBook(baseWork);
    var data = await Lib.occToc(o.pkgv);
    var idx = data.index[o.occurrence_id], prev = data.units[idx - 1], next = data.units[idx + 1];
    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: await workTitle(baseWork), ar: true, href: '#/w/' + encodeURIComponent(baseWork) + '?tab=comms' }, { text: work.title_ar || o.work_id, ar: true }]));
    var col = el('article', { cls: 'read-col' });
    main.appendChild(el('div', { cls: 'read-wrap focus' }, [col]));
    var fromU = from ? await Lib.unit(from) : null;
    var fromN = fromU ? primaryNum(fromU.numbers) : null;
    if (fromU) col.appendChild(el('div', { cls: 'btns' }, [link(t('cm.back', { n: fromN ? fromN.number_text : '' }), '#/h/' + encodeURIComponent(from), 'back-hadith', 'soft', 'chevL')]));
    col.appendChild(el('header', { cls: 'hadith-head' }, [
      el('h1', { cls: 'kitab', lang: 'ar', dir: 'rtl', text: work.title_ar || o.work_id }),
      el('div', { cls: 'small muted' }, [author ? arSpan(author) : null, author ? ' · ' : '', ed ? ed.label : idTxt(o.edition_id), ' · ',
        o.page ? (o.volume ? t('cm.page', { v: o.volume, p: o.page }) : t('cm.pageOnly', { p: o.page })) : t('cm.noPage', { n: idx + 1 })])]));
    if (o.lemma_kind === 'iqtibos_yoq') col.appendChild(el('p', { cls: 'note', text: t('cm.noLemma') }));
    else if (o.lemma_text) col.appendChild(el('p', { cls: 'small' }, [t('cm.lemma') + ' ', arSpan(o.lemma_text)]));
    if (!endOk) col.appendChild(el('p', { cls: 'note warn', text: o.scope === 'fragment' ? t('scope.fragment') : t('cm.preview') }));
    var text = Array.from(o.text_ar);
    var shown = endOk ? text : text.slice(0, 3000);
    // Sharh o'quvchisida ham o'sha o'qish sozlamalari; harakat qatlami yo'q bo'lsa — ochiq aytiladi (yaratilmaydi)
    var nMarks = (shown.join('').match(/[\u064B-\u0652]/g) || []).length;
    applyRprefs(rprefs());
    col.appendChild(el('div', { cls: 'btns' }, [settingsButton(function () {}),
      el('span', { cls: 'small faint', 'data-act': 'marks-note', text: nMarks ? t('cm.marks', { n: nMarks }) : t('cm.noMarks') })]));
    var box = el('section', { cls: 'text-card' });
    for (var s of (o.segments || [])) {
      if (s.start >= shown.length) continue;
      var who = await personName(s.person_id);
      box.appendChild(el('div', { cls: 'seg-block r-' + s.role }, [el('div', { cls: 'who' }, [t('role.' + s.role), who ? ' — ' : '', who ? arSpan(who) : null]),
        arP(shown.slice(s.start, Math.min(s.end, shown.length)).join(''), 'src')]));
    }
    if (!(o.segments || []).length) box.appendChild(arP(shown.join(''), 'src'));
    if (shown.length < text.length) box.appendChild(el('p', { cls: 'small faint', text: t('cm.cut', { n: shown.length }) }));
    col.appendChild(box);
    var back = el('section', { cls: 'card' }, [el('h2', { text: t('cm.base') })]);
    if (o.link_kind === 'umumiy') back.appendChild(el('p', { cls: 'small note', text: t('cm.general') }));
    var btns = el('div', { cls: 'btns' });
    for (var l of links) {
      if (l.activation.state === 'active') {
        var u = await Lib.unit(l.link.target_unit_id), un = u ? primaryNum(u.numbers) : null;
        btns.appendChild(link(t('cm.back', { n: un ? un.number_text : '' }), '#/h/' + encodeURIComponent(l.link.target_unit_id), 'to-hadith', from === l.link.target_unit_id ? 'primary' : '', 'arrow'));
      } else {
        back.appendChild(el('p', { cls: 'small' }, [t('link.' + l.activation.state)]));
        if (l.activation.state === 'base_not_installed') btns.appendChild(link(t('cm.installBase'), '#/w/' + encodeURIComponent(l.link.target_work_id), 'install-base', 'soft'));
      }
    }
    back.appendChild(btns);
    col.appendChild(back);
    col.appendChild(el('div', { cls: 'btns' }, [btn(t('h.copy'), 'copy-citation', async function () {
      var lines = [];
      for (var s2 of (o.segments || [])) {
        if (s2.start >= shown.length) continue;
        var w2 = await personName(s2.person_id);
        lines.push(t('cite.quote') + ' [' + t('role.' + s2.role) + (w2 ? ' — ' + w2 : '') + ']: ' + shown.slice(s2.start, Math.min(s2.end, shown.length)).join('').trim());
      }
      copy([(work.title_ar || o.work_id) + (author ? ', ' + author : '') + ', ' + (ed && ed.label || o.edition_id) + ', ' + (o.page ? (o.volume ? o.volume + ':' : '') + o.page : '—') + '.']
        .concat(lines.length ? lines : [t('cite.quote') + ': ' + shown.join('').trim()], [t('cite.scope') + ': ' + (endOk ? t('scope.full_section') : t('scope.' + o.scope)) + '.', t('cite.status') + ': ' + statusLine(st) + '.', t('cite.source') + ': ' + o.occurrence_id + ' @ ' + o.pkgv]).join('\n'));
    }, 'primary', 'copy')]));
    if ((o.limitations || []).length) col.appendChild(el('ul', { cls: 'small muted' }, o.limitations.map(function (x) { return el('li', { text: reasonText(x) }); })));
    col.appendChild(el('nav', { cls: 'nav-pn section' }, [
      prev ? el('a', { cls: 'prev', href: '#/s/' + encodeURIComponent(prev.id), 'data-act': 'prev-occ' }, [el('span', { cls: 'dir' }, [icon('chevL'), t('h.prev')]), el('span', { cls: 'where', text: prev.page ? (prev.vol ? prev.vol + ':' : '') + prev.page : '' })]) : el('span', { 'aria-disabled': 'true' }, [t('h.first')]),
      next ? el('a', { cls: 'next', href: '#/s/' + encodeURIComponent(next.id), 'data-act': 'next-occ' }, [el('span', { cls: 'dir' }, [t('h.next'), icon('chevR')]), el('span', { cls: 'where', text: next.page ? (next.vol ? next.vol + ':' : '') + next.page : '' })]) : el('span', { 'aria-disabled': 'true' }, [t('h.last')])]));
  }

  // ================================================================ V7: to'plam → Kitob → Bob → hadis
  // Kitob = paketdagi chapter_ar guruhi (manba tartibi). Bob, bob matni, sanad yo'llari, roviylar — mahalliy qatlamdan
  // (Lib.overlayState === 'active' bo'lsagina). Qatlam yo'q bo'lsa faqat Kitob darajasi ko'rsatiladi, hech narsa taxmin qilinmaydi.
  var RP_KEY = 'hadith-library.reading';
  function rprefs() {
    var p = { fs: 26, wide: false, marks: true, full: true, ord: true, tropen: false, saw: false, cmode: 'text', nab: true, chain: 'full' };
    try { Object.assign(p, JSON.parse(localStorage.getItem(RP_KEY) || '{}')); } catch (e) { /* standart */ }
    p.fs = Math.max(10, Math.min(36, Number(p.fs) || 26));
    return p;
  }
  function saveRprefs(p) { try { localStorage.setItem(RP_KEY, JSON.stringify(p)); } catch (e) { /* xususiy rejim */ } applyRprefs(p); }
  function applyRprefs(p) {
    sawOn = !!p.saw;
    var r = document.documentElement.style;
    r.setProperty('--read-size', p.fs + 'px');
    r.setProperty('--tr-size', Math.max(10, Math.round(p.fs * 0.62)) + 'px');
    r.setProperty('--read-lh', p.wide ? '2.4' : '2.05');
  }
  function bookColor(workId) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (document.documentElement.getAttribute('data-theme') !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return Registry.color(workId, dark);
  }
  function tint(node, workId) { node.style.setProperty('--bk', bookColor(workId)); return node; }
  // Butun sahifa kitob rangida (sharh sahifasi — o'z asos kitobi rangida): sarlavha lentasi, belgilar, faol bob
  var curBook = null;
  function pageBook(workId) {
    curBook = workId || null;
    var r = document.documentElement;
    if (!workId) { r.style.removeProperty('--bk'); r.removeAttribute('data-book'); return; }
    r.style.setProperty('--bk', bookColor(workId)); r.setAttribute('data-book', workId);
  }

  // Kitob/sahifa ma'lumotlari: toc (har doim) + qatlam (bo'lsa)
  async function bookData(pkgId) {
    var p = await Lib.getPackage(pkgId);
    if (!p || p.kind !== 'base_book') return null;
    var toc = await Lib.toc(p.active_pkgv);
    var ovs = await Lib.overlayState(p.manifest.edition_id);
    var ov = ovs.state === 'active' ? await Lib.ovStructure(p.manifest.edition_id) : null;
    var title = await workTitle(p.manifest.work_id);
    return { pkg: p, toc: toc, ov: ov, ovs: ovs, edition: p.manifest.edition_id, work: p.manifest.work_id, title: title };
  }
  function kitabOf(bd, i) {
    var ch = bd.toc.chapters[i];
    if (!ch) return null;
    var k = bd.ov ? bd.ov.kitabs[i] : null;
    // qatlam va toc bir xil chapter_ar guruhlariga tayanadi; mos kelmasa qatlam Kitob uchun ishlatilmaydi
    if (k && k.title_ar !== ch.title) k = null;
    var bh = k ? (k.shamela_headings || []).filter(bismOnly)[0] : null;
    return { i: i, ch: ch, ov: k, title: ch.title, count: ch.count, first: ch.first, name: kitName(k), bism: bh ? bh.intro[0].text_ar : null,
      babs: k ? k.bab_ids.map(function (b) { return bd.ov.bab[b]; }) : null };
  }
  // Kitob nomi joriy tilda — faqat qatlamda manbasi (foydalanuvchi namunasi) bilan berilgan bo'lsa; arab UI'da yo'q
  // Faqat ﷽ dan iborat Kitob kirishi — sarlavha ostida asl holida (tarjima paneli yo'q)
  function bismOnly(h) { return (h.intro || []).length > 0 && h.intro.every(function (x) { return /^\s*(﷽|بسم الله الرحمن الرحيم)\s*$/.test(x.text_ar.replace(/[\u064B-\u0670\u0640]/g, '')); }); }
  function kitName(k) { var n = k && k.names; return n && I18N.lang() !== 'ar' ? (n[I18N.lang()] || null) : null; }
  // Nashrning old qismi (Shamela «المقدمة» va toc'siz sarlavhali sahifalar) — muallif matnidan alohida, yig'ilgan holda
  function frontMatter(heads, cls) {
    var fm = heads.filter(function (h) { return h.front_matter; });
    if (!fm.length) return null;
    var n = fm.reduce(function (a, h) { return a + h.intro.length; }, 0);
    var d = el('details', { cls: 'bintro disclose front-matter', 'data-act': 'front-matter' }, [el('summary', {}, [icon('chevR', 'chev'), t('cv.frontMatter', { n: n })]),
      el('p', { cls: 'tiny faint', text: t('cv.frontNote') })]);
    fm.forEach(function (h) {
      if (h.title_ar) d.appendChild(el('h3', { cls: 'fm-title', lang: 'ar', dir: 'rtl', text: h.title_ar }));
      h.intro.forEach(function (x) { d.appendChild(arP(x.text_ar, cls)); });
    });
    return d;
  }
  // Kitob ichidagi guruhlar: [ochilish] + boblar + [bobi aniqlanmagan]. Qatlam yo'q bo'lsa bitta guruh.
  function kitabGroups(bd, kit) {
    var rows = bd.toc.units.slice(kit.ch.start, kit.ch.start + kit.ch.count);
    if (!kit.ov) return [{ kind: 'all', rows: rows }];
    var byBab = {}, opening = [], unplaced = [];
    rows.forEach(function (r) {
      var pl = bd.ov.place[r.id];
      if (pl && pl.bab && bd.ov.bab[pl.bab] && bd.ov.bab[pl.bab].kitab_id === kit.ov.id) (byBab[pl.bab] = byBab[pl.bab] || []).push(r);
      else if (pl && pl.opening) opening.push(r);
      else unplaced.push(r);
    });
    var out = [];
    var heads = (kit.ov.shamela_headings || []).filter(function (h) { return (h.intro || []).length && !bismOnly(h); });
    if (opening.length || heads.length) out.push({ kind: 'opening', rows: opening, heads: heads });
    kit.babs.forEach(function (b) { out.push({ kind: 'bab', bab: b, rows: byBab[b.id] || [] }); });
    // boshqa Kitobga yozilgan bobning hadisi (bab_hadiths_in_two_kitabs) shu Kitobda qolsa — aniqlanmagan guruhga
    rows.forEach(function (r) {
      var pl = bd.ov.place[r.id];
      if (pl && pl.bab && (!bd.ov.bab[pl.bab] || bd.ov.bab[pl.bab].kitab_id !== kit.ov.id) && unplaced.indexOf(r) < 0) unplaced.push(r);
    });
    if (unplaced.length) out.push({ kind: 'unplaced', rows: unplaced });
    return out;
  }
  function placeOf(bd, unitId) {
    var i = bd.toc.index[unitId];
    if (i == null) return null;
    var r = bd.toc.units[i], kit = kitabOf(bd, r.c);
    var pl = bd.ov ? bd.ov.place[unitId] : null;
    var bab = pl && pl.bab ? bd.ov.bab[pl.bab] : null;
    return { row: r, kit: kit, bab: bab && kit && kit.ov && bab.kitab_id === kit.ov.id ? bab : null, opening: !!(pl && pl.opening) };
  }

  // -------------------------------------------------------------- matn: roviy oraliqlari, o'rinlar, belgilash
  // Qatlam yozuvi faqat matn xeshi mos bo'lsa qo'llanadi (A07). Oraliqlar kod nuqtalarida (Array.from bilan bir xil).
  function routeInfo(rec) {
    var info = {};
    (rec.routes || []).forEach(function (ro) {
      (ro.nodes || []).forEach(function (n) {
        [n.mid].concat(n.also || []).forEach(function (mid) { if (mid) (info[mid] = info[mid] || []).push({ label: ro.label, pos: n.pos, of: ro.of, route_id: ro.route_id }); });
      });
    });
    return info;
  }
  // Yo'lning matnda zikr qilingan oxirgi roviysi (oxirgi tugunlar oldingi sanaddan bo'lsa — matnda yo'q)
  function terminalMid(rec) {
    var ro = (rec.routes || [])[0];
    if (!ro) return null;
    for (var i = ro.nodes.length - 1; i >= 0; i--) if (ro.nodes[i].mid) return ro.nodes[i].mid;
    return null;
  }
  function ordText(x, multi) { return (multi ? x.label : '') + x.pos; }
  function lvCls(pos) { return pos ? ' lv' + Math.min(pos, 9) : ''; }
  // Nabiy ﷺ so'zlari: manbadagi qo'shtirnoq ichidagi gap, bevosita oldida Nabiy ﷺga nisbat ("qola/yaqulu" + "Rasululloh/Nabiy ﷺ")
  // bo'lsa. Avtomatik belgi — matn o'zgarmaydi; nisbati topilmagan qo'shtirnoq (boshqa so'zlovchi) belgilanmaydi.
  var Q_PAIR = { '"': '"', '«': '»', '“': '”' };
  var NAB_REF = '(?:رسول الله|النبي|نبي الله)', NAB_V = '(?:قال|يقول|فقال|وقال|ويقول|فيقول)';
  var NAB_BEFORE = new RegExp('(?:' + NAB_V + '(?:\\s+(?:له|لها|لهم|لنا|لي))?\\s+' + NAB_REF + '(?:\\s*ﷺ|\\s*صلى الله عليه وسلم)?' +
    '|(?:' + NAB_REF + '|ﷺ|صلى الله عليه وسلم)[^"«“»”]{0,40}?' + NAB_V + ')[\\s:،,؛\\-ـ]*$');
  // suhbat davomi: oldingi qo'shtirnoq Nabiy ﷺ so'zi bo'lsa va oradagi gap egasiz «qola» bilan tugasa — so'zlovchi o'sha
  var NAB_CONT = /(?:^|[\s.،,؛])(?:ف|و|ثم\s+)?قال[\s:،,]*$/;
  function nabawiRanges(chars) {
    var out = [], i = 0, n = chars.length, lastEnd = -1;
    function norm(s) { return s.replace(/[ً-ٰٟـ‎‏]/g, '').replace(/[إأآ]/g, 'ا'); }
    while (i < n) {
      var close = Q_PAIR[chars[i]];
      if (!close) { i++; continue; }
      var j = i + 1;
      while (j < n && chars[j] !== close) j++;
      if (j >= n) break;
      var before = norm(chars.slice(Math.max(0, i - 90), i).join(''));
      var gap = lastEnd >= 0 && i - lastEnd <= 120 ? norm(chars.slice(lastEnd, i).join('')) : null;
      if (NAB_BEFORE.test(before) || (gap != null && NAB_CONT.test(gap))) { out.push([i, j + 1]); lastEnd = j + 1; }
      else lastEnd = -1;
      i = j + 1;
    }
    return out;
  }
  // matn bo'lagini [a, b) qo'shadi; Nabiy ﷺ so'zlari oraliqlari .nabawi ichida (matn aynan o'sha)
  function appendNab(box, chars, a, b, nab, pr) {
    var cuts = [a, b];
    nab.forEach(function (r) { if (r[0] > a && r[0] < b) cuts.push(r[0]); if (r[1] > a && r[1] < b) cuts.push(r[1]); });
    cuts.sort(function (x, y) { return x - y; });
    for (var k = 0; k < cuts.length - 1; k++) {
      if (cuts[k] === cuts[k + 1]) continue;
      var x = cuts[k], txt = document.createTextNode(displayText(chars.slice(x, cuts[k + 1]).join(''), pr.marks));
      box.appendChild(nab.some(function (r) { return x >= r[0] && x < r[1]; }) ? el('span', { cls: 'nabawi', title: t('nab.title') }, [txt]) : txt);
    }
  }
  // "Faqat ismlar": sanad yo'li ism → ism ko'rinishida (manbadagi yo'l tartibi, muallifning shayxidan), keyin matn.
  function chainLine(u, rec, info, multi, opts, pr) {
    var ro = rec.routes[0], byMid = {};
    (rec.mentions || []).forEach(function (m) { byMid[m.mid] = m; });
    var line = el('span', { cls: 'chainline', 'data-act': 'chain-names' });
    ro.nodes.forEach(function (n, k) {
      if (k) line.appendChild(el('span', { cls: 'arr', 'aria-hidden': 'true', text: ' ← ' }));
      var m = n.mid ? byMid[n.mid] : null;
      var name = m ? m.as_written : ((rec._names || {})[String(n.person)] || ('man-' + n.person));
      var mm = m || { mid: 'node:' + ro.route_id + ':' + n.pos, person: n.person, as_written: name };
      var cls = 'nm' + lvCls(n.pos) + (k === ro.nodes.length - 1 ? ' term' : '') + (opts.highlight != null && String(n.person) === String(opts.highlight) ? ' sel' : '');
      var b = el('button', { type: 'button', cls: cls, 'data-act': 'narrator', 'data-person': String(n.person), 'data-mid': mm.mid, 'aria-label': name + ' — ' + t('np.position', { p: n.pos, n: ro.of }) }, [displayText(name, pr.marks)]);
      if (opts.onNarrator) b.addEventListener('click', function () { opts.onNarrator(mm, m ? (info[m.mid] || []) : [{ label: ro.label, pos: n.pos, of: ro.of, route_id: ro.route_id }], b); });
      line.appendChild(b);
      if (pr.ord) line.appendChild(el('sup', { cls: 'ord' + lvCls(n.pos), 'aria-hidden': 'true', text: (multi ? ro.label : '') + n.pos }));
      (n.also || []).forEach(function (mid) {
        var am = byMid[mid];
        if (!am || String(am.person) === String(n.person)) return;   // o'sha roviyning ikkinchi zikri («الثقفي … عبد الوهاب»)
        line.appendChild(el('span', { cls: 'arr', 'aria-hidden': 'true', text: ' و ' }));
        var ab = el('button', { type: 'button', cls: 'nm' + lvCls(n.pos), 'data-act': 'narrator', 'data-person': String(am.person), 'data-mid': am.mid, 'aria-label': am.as_written + ' — ' + t('np.position', { p: n.pos, n: ro.of }) }, [displayText(am.as_written, pr.marks)]);
        if (opts.onNarrator) ab.addEventListener('click', function () { opts.onNarrator(am, info[am.mid] || [], ab); });
        line.appendChild(ab);
      });
    });
    if (u.attribution_kind === 'marfu') { line.appendChild(el('span', { cls: 'arr', 'aria-hidden': 'true', text: ' ← ' })); line.appendChild(el('span', { cls: 'nabi', text: 'النَّبِيُّ ﷺ' })); }
    if (multi) line.appendChild(el('span', { cls: 'more-routes tiny', lang: I18N.lang(), dir: 'auto', text: ' ' + t('rdv.moreRoutes', { n: rec.routes.length - 1 }) }));
    return line;
  }
  function markedText(u, rec, pr, opts) {
    opts = opts || {};
    var p = el('p', { lang: 'ar', dir: 'rtl', cls: 'src' });
    var chars = Array.from(u.text_ar);
    var ok = rec && rec.text_sha256 === u.current_text_sha256;
    var mentions = ok ? (rec.mentions || []).filter(function (m) { return m.span; }) : [];
    var info = ok ? routeInfo(rec) : {};
    var multi = ok && (rec.routes || []).length > 1;
    var term = ok ? terminalMid(rec) : null;
    var nab = pr.nab !== false ? nabawiRanges(chars) : [];
    var start = 0;
    var tm = term ? mentions.find(function (m) { return m.mid === term; }) : null;
    if (ok && pr.chain === 'names' && !opts.plain && (rec.routes || []).length && tm) {
      p.classList.add('compact');
      p.appendChild(chainLine(u, rec, info, multi, opts, pr));
      p.appendChild(el('br'));
      start = tm.span[1];
      while (start < chars.length && /[\s،,:؛‎‏]/.test(chars[start])) start++;
    } else if (ok && pr.chain === 'names' && !opts.plain && (rec.routes || []).length && rec.routes[0].nodes.length) {
      // oxirgi roviy matnda belgilanmagan: ismlar qatori ko'rsatiladi, matn kesilmaydi (qayerdan kesish noma'lum)
      p.classList.add('compact', 'partial');
      p.appendChild(chainLine(u, rec, info, multi, opts, pr));
      p.appendChild(el('br'));
    } else if (!pr.full && tm) {
      start = tm.span[0];
      p.appendChild(el('span', { cls: 'cut', lang: I18N.lang(), dir: 'auto', text: '… ' + t('rdv.shortened') + ' … ' }));
    }
    if (ok && !opts.plain && !p.classList.contains('compact') && (rec.routes || []).length) {
      var imp = rec.routes[0].nodes.filter(function (n) { return !n.mid; });
      if (imp.length) {
        var hint = el('span', { cls: 'implied', lang: I18N.lang(), dir: 'auto', 'data-act': 'implied-narrators' }, [t('rdv.implied') + ' ']);
        imp.forEach(function (n, k) {
          if (k) hint.appendChild(document.createTextNode(' · '));
          if (pr.ord) hint.appendChild(el('sup', { cls: 'ord' + lvCls(n.pos), text: (multi ? rec.routes[0].label : '') + n.pos }));
          hint.appendChild(el('bdi', { lang: 'ar', dir: 'rtl', text: (rec._names || {})[String(n.person)] || ('man-' + n.person) }));
        });
        p.appendChild(hint);
      }
    }
    // kesish nuqtalari: roviy oraliqlari va Nabiy ﷺ so'zlari chegaralari (matn bo'laklari aynan manbadagidek qo'shiladi)
    var cuts = {}; cuts[start] = 1; cuts[chars.length] = 1;
    var mAt = {}, curEnd = start;
    mentions.forEach(function (m) { if (m.span[0] >= curEnd) { mAt[m.span[0]] = m; cuts[m.span[0]] = 1; cuts[m.span[1]] = 1; curEnd = m.span[1]; } });
    nab.forEach(function (r) { if (r[1] > start) { cuts[Math.max(r[0], start)] = 1; cuts[r[1]] = 1; } });
    var pts = Object.keys(cuts).map(Number).filter(function (x) { return x >= start && x <= chars.length; }).sort(function (a, b) { return a - b; });
    function inNab(x) { return nab.some(function (r) { return x >= r[0] && x < r[1]; }); }
    var nabEl = null, i = 0;
    while (i < pts.length - 1) {
      var a = pts[i], isNab = inNab(a);
      if (isNab && !nabEl) { nabEl = el('span', { cls: 'nabawi', title: t('nab.title') }); p.appendChild(nabEl); }
      if (!isNab) nabEl = null;
      var box = nabEl || p, m = mAt[a];
      if (m) {
        var rs = info[m.mid] || [];
        var cls = 'nm' + lvCls(rs[0] && rs[0].pos) + (m.mid === term ? ' term' : '') + (opts.highlight != null && String(m.person) === String(opts.highlight) ? ' sel' : '') + (rs.length ? '' : ' off');
        var lbl = m.as_written + (rs.length ? ' — ' + rs.map(function (x) { return t('np.position', { p: x.pos, n: x.of }) + (multi ? ' (' + t('np.route', { r: x.label }) + ')' : ''); }).join('; ') : '');
        var txt = displayText(chars.slice(m.span[0], m.span[1]).join(''), pr.marks);
        var b = opts.plain ? el('span', { cls: cls, 'data-person': String(m.person), title: lbl }, [txt])
          : el('button', { type: 'button', cls: cls, 'data-act': 'narrator', 'data-person': String(m.person), 'data-mid': m.mid, 'aria-label': lbl, title: lbl }, [txt]);
        (function (m, rs, b) { if (opts.onNarrator) b.addEventListener('click', function () { opts.onNarrator(m, rs, b); }); })(m, rs, b);
        box.appendChild(b);
        if (pr.ord && rs.length) box.appendChild(el('sup', { cls: 'ord' + lvCls(rs[0].pos), 'aria-hidden': 'true', text: rs.map(function (x) { return ordText(x, multi); }).join(',') }));
        var j = pts.indexOf(m.span[1]);
        i = j > i ? j : i + 1;
        continue;
      }
      box.appendChild(document.createTextNode(displayText(chars.slice(a, pts[i + 1]).join(''), pr.marks)));
      i++;
    }
    return p;
  }
  function excerptAfterTerminal(u, rec) {
    var chars = Array.from(u.text_ar || '');
    var from = 0;
    if (rec && rec.text_sha256 === u.current_text_sha256) {
      var term = terminalMid(rec), m = (rec.mentions || []).find(function (x) { return x.mid === term && x.span; });
      if (m) from = m.span[1];
    }
    var s = chars.slice(from, from + 240).join('').replace(/^[\s،,:؛]+/, '');
    return { text: s + (from + 240 < chars.length ? '…' : ''), fromTerminal: from > 0 };
  }
  function trBlock(tr, pr, kind) {
    if (I18N.lang() !== 'uz') return null;
    if (!tr) return el('p', { cls: 'tr-miss tiny faint', text: t('rdv.trMissing') });
    var body = el('div', { cls: 'tr-body', lang: 'uz', dir: 'ltr' });
    if (kind === 'bab') { if (tr.title) body.appendChild(el('p', { cls: 'tr-title', text: tr.title })); (tr.intro || []).forEach(function (x) { body.appendChild(el('p', { text: x })); }); }
    else { if (tr.sanad) body.appendChild(el('p', { text: tr.sanad })); (tr.matn || []).forEach(function (x) { body.appendChild(el('p', { text: x })); }); }
    return el('details', { cls: 'tr disclose', open: pr.tropen ? true : null, 'data-act': 'translation' }, [
      el('summary', {}, [icon('chevR', 'chev'), t('rdv.trTitle')]), body, el('p', { cls: 'tiny tr-note', text: t('rdv.trDraft') })]);
  }

  // -------------------------------------------------------------- o'qish sozlamalari (reader va alohida hadis)
  var openSheet = null;
  function settingsButton(onChange) {
    var b = el('button', { type: 'button', cls: 'btn sm ghost', 'data-act': 'settings', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, [icon('type'), el('span', { cls: 'lbl', text: t('set2.title') })]);
    b.addEventListener('click', function () { if (openSheet) closeSheet(); else showSheet(b, onChange); });
    return b;
  }
  function closeSheet() {
    if (!openSheet) return;
    var s = openSheet; openSheet = null;
    s.node.remove(); s.scrim.remove();
    document.removeEventListener('keydown', s.esc);
    s.opener.setAttribute('aria-expanded', 'false');
    if (document.body.contains(s.opener)) s.opener.focus();
  }
  function showSheet(opener, onChange) {
    var pr = rprefs();
    function upd(k, v) { pr[k] = v; saveRprefs(pr); if (onChange) onChange(pr, k); }
    function check(key, label, note) {
      var cb = el('input', { type: 'checkbox', 'data-set': key });
      cb.checked = !!pr[key];
      cb.addEventListener('change', function () { upd(key, cb.checked); });
      return el('label', { cls: 'set-check' }, [cb, el('span', {}, [label, note ? el('span', { cls: 'tiny faint block', text: note }) : null])]);
    }
    var out = el('output', { cls: 'fs-out', text: String(pr.fs) });
    var range = el('input', { type: 'range', min: '10', max: '36', step: '1', value: String(pr.fs), 'aria-label': t('set2.size'), 'data-set': 'fs' });
    function setFs(v) { v = Math.max(10, Math.min(36, v)); pr.fs = v; range.value = String(v); out.textContent = String(v); saveRprefs(pr); if (onChange) onChange(pr, 'fs'); }
    range.addEventListener('input', function () { setFs(Number(range.value)); });
    function seg(opts, val, on) {
      return el('div', { cls: 'seg', role: 'group' }, opts.map(function (o) {
        return el('button', { type: 'button', 'aria-pressed': String(o[0] === val), text: o[1], on: { click: function (e) {
          e.currentTarget.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          e.currentTarget.setAttribute('aria-pressed', 'true'); on(o[0]); } } });
      }));
    }
    var node = el('div', { cls: 'sheet', role: 'dialog', 'aria-label': t('set2.title'), 'data-act': 'settings-sheet' }, [
      el('div', { cls: 'sheet-head' }, [el('h2', { text: t('set2.title') }), el('button', { type: 'button', cls: 'icon-btn', 'aria-label': t('set2.close'), 'data-act': 'settings-close', on: { click: closeSheet } }, [icon('x')])]),
      check('full', t('set2.fullIsnad')),
      check('ord', t('set2.ordinals'), t('set2.ordNote')),
      check('tropen', t('set2.translations')),
      check('marks', t('set.marks'), t('set.marksNote')),
      check('saw', t('set2.saw'), t('set2.sawNote')),
      check('nab', t('set2.nab'), t('set2.nabNote')),
      el('div', { cls: 'set-row' }, [el('span', { text: t('set2.chain') }), seg([['full', t('set2.chainFull')], ['names', t('set2.chainNames')]], pr.chain, function (v) {
        upd('chain', v); document.querySelectorAll('[data-act=chain-toggle]').forEach(function (x) { x.setAttribute('aria-pressed', String(v === 'names')); }); })]),
      el('div', { cls: 'set-row' }, [el('span', { text: t('set2.size') }), el('div', { cls: 'fs' }, [
        el('button', { type: 'button', cls: 'icon-btn', 'aria-label': 'A−', 'data-act': 'fs-minus', text: 'A−', on: { click: function () { setFs(pr.fs - 1); } } }),
        range, el('button', { type: 'button', cls: 'icon-btn', 'aria-label': 'A+', 'data-act': 'fs-plus', text: 'A+', on: { click: function () { setFs(pr.fs + 1); } } }), out])]),
      el('div', { cls: 'set-row' }, [el('span', { text: t('set.spacing') }), seg([[false, t('set.normal')], [true, t('set.wide')]], pr.wide, function (v) { upd('wide', v); })]),
      el('div', { cls: 'set-row' }, [el('span', { text: t('theme.label') }), seg([['light', t('theme.light')], ['dark', t('theme.dark')], ['auto', t('theme.auto')]], theme(), function (v) { setTheme(v); if (onChange) onChange(pr, 'theme'); })])]);
    var scrim = el('div', { cls: 'sheet-scrim', on: { click: closeSheet } });
    document.body.appendChild(scrim); document.body.appendChild(node);
    var esc = function (e) { if (e.key === 'Escape') { e.preventDefault(); closeSheet(); } };
    document.addEventListener('keydown', esc);
    opener.setAttribute('aria-expanded', 'true');
    openSheet = { node: node, scrim: scrim, esc: esc, opener: opener };
    node.querySelector('input').focus();
  }

  // -------------------------------------------------------------- Kitob → Bob daraxti (chap panel va mobil menyu)
  var treeOpen = {};   // pkg -> {kitab index: true/false} — foydalanuvchi qo'lda yig'gani esda qoladi
  function tree(bd, activeK, mode, onBab) {
    var wrap = el('nav', { cls: 'tree', 'aria-label': t('cv.tree') });
    var filterBox = el('input', { type: 'search', placeholder: t('cv.filter'), 'aria-label': t('cv.filter'), dir: 'auto', 'data-act': 'tree-filter' });
    var list = el('ol', { cls: 'tk-list' });
    var st = treeOpen[bd.pkg.package_id] = treeOpen[bd.pkg.package_id] || {};
    if (st[activeK] == null) st[activeK] = true;
    var items = [];
    bd.toc.chapters.forEach(function (ch, i) {
      var kit = kitabOf(bd, i);
      var hasBabs = !!(kit.babs && kit.babs.length);
      var open = !!st[i] && hasBabs;
      var li = el('li', { cls: 'tk-item' + (i === activeK ? ' cur' : '') + (hasBabs ? ' has-babs' : ''), 'data-k': String(i) });
      var base = '#/' + mode + '/' + encodeURIComponent(bd.pkg.package_id) + '?k=' + i;
      var head = el('a', { cls: 'tk', href: base, 'data-act': 'tree-kitab', 'aria-current': i === activeK ? 'page' : null, 'aria-expanded': hasBabs ? String(open) : null }, [
        el('span', { cls: 'no', text: String(i + 1) }),
        el('span', { cls: 'tt', lang: 'ar', dir: 'rtl' }, [kit.title || t('rd.all'), kit.name ? el('span', { cls: 'tn', lang: I18N.lang(), dir: 'auto', text: kit.name }) : null]),
        el('span', { cls: 'cnt', text: String(kit.count) })]);
      var tog = hasBabs ? el('button', { type: 'button', cls: 'tk-tog', 'data-act': 'tree-toggle', 'aria-expanded': String(open), 'aria-label': t('cv.toggleBabs', { n: kit.babs.length }), title: t('col.babs', { n: kit.babs.length }) }, [icon('chevR', 'chev')]) : null;
      var sub = el('ol', { cls: 'tb-list' });
      sub.hidden = !open;
      var filled = false;
      function fill() {
        if (filled || !hasBabs) return;
        filled = true;
        kit.babs.forEach(function (b) {
          var a = el('a', { cls: 'tb', href: base + '&b=' + b.id, 'data-act': 'tree-bab', 'data-bab': b.id }, [
            el('span', { cls: 'no', text: String(b.order) }), el('span', { cls: 'tt', lang: 'ar', dir: 'rtl', text: b.title_ar }),
            el('span', { cls: 'cnt', text: String(b.unit_ids.length) })]);
          if (i === activeK) a.addEventListener('click', function (e) { if (onBab) { e.preventDefault(); onBab(b.id); } });
          sub.appendChild(el('li', {}, [a]));
        });
      }
      function setOpen(o) {
        st[i] = o; if (o) fill(); sub.hidden = !o;
        head.setAttribute('aria-expanded', String(o)); if (tog) tog.setAttribute('aria-expanded', String(o));
      }
      if (open) fill();
      head.addEventListener('click', function (e) {
        if (i !== activeK) { st[i] = true; return; }   // boshqa Kitob: o'z sahifasiga o'tadi (ochiq holda)
        if (!hasBabs) return;
        e.preventDefault();
        setOpen(!st[i]);
      });
      if (tog) tog.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setOpen(!st[i]); });
      li.appendChild(head);
      if (tog) li.appendChild(tog);
      li.appendChild(sub);
      items.push({ li: li, text: fold(kit.title + ' ' + (kit.name || '')) });
      list.appendChild(li);
    });
    filterBox.addEventListener('input', function () { var q = fold(filterBox.value); items.forEach(function (x) { x.li.classList.toggle('yashirin', !!q && x.text.indexOf(q) < 0); }); });
    wrap.appendChild(el('div', { cls: 'tree-head' }, [el('h2', { text: t('cv.tree') }), filterBox]));
    wrap.appendChild(list);
    return {
      node: wrap,
      setActive: function (babId) {
        list.querySelectorAll('a.tb').forEach(function (a) {
          var on = a.getAttribute('data-bab') === babId;
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
          if (on && !a.closest('ol').hidden) {
            // faqat panelning o'zi siljiydi (oyna emas)
            var box = wrap, top = a.offsetTop - box.offsetTop, h = a.offsetHeight;
            if (top < box.scrollTop + 60 || top + h > box.scrollTop + box.clientHeight - 20) box.scrollTop = Math.max(0, top - box.clientHeight / 3);
          }
        });
      },
      scrollToCurrent: function () {
        var c = list.querySelector('.tk-item.cur');
        if (!c) return;
        var head = wrap.querySelector('.tree-head');
        wrap.scrollTop = Math.max(0, c.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop - (head ? head.offsetHeight : 0) - 8);
      }
    };
  }
  // Mobil: daraxt menyusi (yopiq holatda hidden — fokus va accessibility daraxtidan chiqadi)
  function mobileMenu(bd, activeK, mode, onBab) {
    var panel = el('div', { cls: 'drawer', role: 'dialog', 'aria-label': t('cv.tree'), 'data-act': 'tree-drawer' });
    panel.hidden = true;
    var scrim = el('div', { cls: 'drawer-scrim' });
    scrim.hidden = true;
    var opener = null;
    var tv = tree(bd, activeK, mode, function (b) { close(); if (onBab) onBab(b); });
    panel.appendChild(el('div', { cls: 'drawer-head' }, [el('b', { text: t('cv.tree') }), el('button', { type: 'button', cls: 'icon-btn', 'aria-label': t('cv.close'), 'data-act': 'drawer-close', on: { click: function () { close(); } } }, [icon('x')])]));
    panel.appendChild(tv.node);
    function esc(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
    function open(btnEl) {
      opener = btnEl; panel.hidden = false; scrim.hidden = false; document.addEventListener('keydown', esc);
      document.body.classList.add('no-scroll'); tv.scrollToCurrent();
      var f = panel.querySelector('a[aria-current="location"]') || panel.querySelector('input'); if (f) f.focus();
    }
    function close() {
      panel.hidden = true; scrim.hidden = true; document.removeEventListener('keydown', esc); document.body.classList.remove('no-scroll');
      if (opener && document.body.contains(opener)) opener.focus();
    }
    scrim.addEventListener('click', close);
    return { panel: panel, scrim: scrim, open: open, close: close, tree: tv };
  }

  // Faol bobni oddiy scroll bilan kuzatish (A46/A57): ko'rinish maydonining yuqori uchdan birini kesib o'tgan oxirgi bob
  var spyOff = null;
  function scrollSpy(sections, onActive) {
    if (spyOff) spyOff();
    var last = null, raf = 0;
    function check() {
      raf = 0;
      var line = Math.min(window.innerHeight * 0.33, 260), cur = null;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top - line <= 0) cur = sections[i]; else break;
      }
      if (!cur && sections.length) cur = sections[0];
      var id = cur ? cur.getAttribute('data-bab') : null;
      if (id !== last) { last = id; onActive(id, cur); }
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(check); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    setTimeout(check, 0);
    spyOff = function () { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); spyOff = null; };
    return check;
  }

  function overlayNote(bd) {
    var s = bd.ovs;
    if (s.state === 'active') return null;
    var txt = s.state === 'mismatch' ? t('col.layerMismatch', { v: s.target.package_version }) : s.state === 'base_missing' ? t('col.layerBase') : t('col.layerNone');
    return el('p', { cls: 'note small', 'data-act': 'layer-note', 'data-state': s.state }, [icon('info'), ' ', txt]);
  }
  function babLabel(b) { return t('cv.bab') + ' · ' + t('cv.order', { o: b.order }); }
  // Bob sarlavhasining manbadagi joyi: bosma nashr juz/bet (Shamela 1681 sahifasi bo'yicha); raqam emas, joy
  function babSrc(b) { var s = b.source || {}; return s.part && s.page_num ? el('span', { cls: 'faint', title: 'Shamela · ' + s.page, text: t('cv.srcPage', { v: s.part, p: s.page_num }) }) : null; }
  function shamelaOf(bd) { var m = bd && bd.ovs && bd.ovs.overlay && bd.ovs.overlay.manifest; return (m && m.source_metadata && m.source_metadata.shamela_book) || '—'; }

  // -------------------------------------------------------------- Kitob mundarijasi: chap daraxt + o'ngda ixcham bob guruhlari
  async function viewContents(pkgId, params) {
    clear();
    var bd = await bookData(pkgId);
    if (!bd) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('home.browse'))); return; }
    var ki = Math.max(0, Math.min(bd.toc.chapters.length - 1, parseInt(params.k || '0', 10) || 0));
    var kit = kitabOf(bd, ki);
    pageBook(bd.work);
    var groupsK = kitabGroups(bd, kit);
    var ids = groupsK.reduce(function (a, g) { return a.concat(g.rows.map(function (r) { return r.id; })); }, []);
    var units = await Lib.unitsByIds(bd.pkg.active_pkgv, ids), ub = {};
    units.forEach(function (u) { if (u) ub[u.unit_id] = u; });
    var recs = bd.ov ? await Lib.ovMany('ov_isnad', ids, bd.edition) : {};
    var readBase = '#/r/' + encodeURIComponent(pkgId) + '?k=' + ki;

    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: bd.title, ar: true, href: '#/w/' + encodeURIComponent(bd.work) }, { text: kit.title, ar: true }]));
    var mm = mobileMenu(bd, ki, 'c', function (b) { goBab(b); });
    var tv = tree(bd, ki, 'c', function (b) { goBab(b); });
    var loc = el('div', { cls: 'locbar', 'data-act': 'locbar', 'aria-live': 'polite' });
    var locText = el('div', { cls: 'loc-text' });
    var menuBtn = el('button', { type: 'button', cls: 'btn sm menu-btn', 'data-act': 'open-tree', 'aria-label': t('cv.tree') }, [icon('books'), el('span', { cls: 'lbl', text: t('cv.tree') })]);
    menuBtn.addEventListener('click', function () { mm.open(menuBtn); });
    loc.appendChild(menuBtn); loc.appendChild(locText);
    function setLoc(b) {
      locText.textContent = '';
      locText.appendChild(el('span', { cls: 'tiny faint', text: t('cv.now') + ': ' }));
      locText.appendChild(kit.name ? el('span', { cls: 'loc-kit', title: kit.title, text: kit.name }) : arSpan(kit.title));
      if (b) { locText.appendChild(el('span', { cls: 'sep', text: ' › ' })); locText.appendChild(el('span', { cls: 'loc-bab', lang: 'ar', dir: 'rtl', text: b.title_ar })); locText.appendChild(el('span', { cls: 'tiny faint', text: ' · ' + t('cv.order', { o: b.order }) })); }
    }
    setLoc(null);

    var body = el('section', { cls: 'cv-main', 'data-act': 'contents' });
    tint(body, bd.work);
    body.appendChild(el('header', { cls: 'kit-head' }, [
      el('div', { cls: 'eyebrow' }, [el('span', { cls: 'bk-dot', 'aria-hidden': 'true' }), arSpan(bd.title)]),
      el('h1', { lang: 'ar', dir: 'rtl', text: kit.title }), kit.name ? el('p', { cls: 'kit-name', text: kit.name }) : null,
      kit.bism ? el('p', { cls: 'bism', lang: 'ar', dir: 'rtl', 'data-act': 'kitab-bismillah', text: kit.bism }) : null,
      el('p', { cls: 'small muted' }, [kit.babs && kit.babs.length ? t('cv.kitabStats', { b: kit.babs.length, n: kit.count }) : (kit.babs ? t('col.noBabHead') + ' · ' : '') + t('col.rec', { n: kit.count }),
        kit.first ? ' · ' + t('col.first', { n: kit.first }) : '']),
      el('div', { cls: 'btns' }, [link(t('cv.read'), readBase, 'read-kitab', 'primary sm', 'books'), link(t('cv.overview'), '#/w/' + encodeURIComponent(bd.work), 'overview', 'ghost sm', 'list')])]));
    var note = overlayNote(bd); if (note) body.appendChild(note);
    if (kit.babs) body.appendChild(el('p', { cls: 'tiny faint', text: t('cv.scope', { s: shamelaOf(bd) }) }));
    // Ko'rinish rejimi (A01): ixcham / roviy va matn / to'liq manba va sanad — tanlov eslab qolinadi
    var cpr = rprefs();
    var modeSeg = el('div', { cls: 'seg', role: 'group', 'aria-label': t('cv.mode') }, [['compact', t('cv.mCompact')], ['text', t('cv.mText')], ['full', t('cv.mFull')]].map(function (o) {
      return el('button', { type: 'button', 'aria-pressed': String(cpr.cmode === o[0]), 'data-act': 'cmode-' + o[0], text: o[1], on: { click: function (e) {
        cpr = rprefs(); cpr.cmode = o[0]; saveRprefs(cpr);
        modeSeg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === e.currentTarget)); });
        body.setAttribute('data-mode', o[0]);
        body.querySelectorAll('.hrow').forEach(function (a) { fillRow(a); });
      } } });
    }));
    body.setAttribute('data-mode', cpr.cmode);
    body.appendChild(el('div', { cls: 'cv-tools' }, [el('span', { cls: 'small faint', text: t('cv.mode') }), modeSeg]));

    function fillRow(a) {
      var id = a.getAttribute('data-unit'), u = ub[id], rec = recs[id] || null, slot = a.querySelector('.ex');
      if (!u || !slot) return;
      if (body.getAttribute('data-mode') === 'full') { var full = markedText(u, rec, Object.assign({}, rprefs(), { full: true }), { plain: true }); full.className = 'ex full src'; slot.replaceWith(full); }
      else { var ex = excerptAfterTerminal(u, rec); slot.replaceWith(el('span', { cls: 'ex', lang: 'ar', dir: 'rtl', text: displayText(ex.text, true) })); }
    }
    function row(r) {
      var u = ub[r.id] || { text_ar: r.ex };
      var rec = recs[r.id] || null;
      var ex = excerptAfterTerminal(u, rec);
      var termName = null;
      if (rec && rec.text_sha256 === u.current_text_sha256) {
        var tm = terminalMid(rec), m = (rec.mentions || []).find(function (x) { return x.mid === tm; });
        termName = m ? m.as_written : null;
      }
      var nl = numLabel(r);
      var a0 = el('a', { cls: 'hrow', href: readBase + '&u=' + encodeURIComponent(r.id), 'data-act': 'toc-item', 'data-unit': r.id }, [
        el('span', { cls: 'num' + (nl ? '' : ' none'), text: nl || en('unitType', r.type) }),
        el('span', { cls: 'hb' }, [
          termName ? el('span', { cls: 'who', lang: 'ar', dir: 'rtl', title: t('cv.terminal'), text: termName }) : null,
          el('span', { cls: 'ex', lang: 'ar', dir: 'rtl', text: displayText(ex.text, true) }),
          el('span', { cls: 'tag tiny', text: t('cv.excerpt') })]),
        icon('chevR', 'go')]);
      if (cpr.cmode === 'full') fillRow(a0);
      return el('li', {}, [a0]);
    }
    var sections = [];
    groupsK.forEach(function (g) {
      var sec = el('section', { cls: 'bgroup', 'data-bab': g.bab ? g.bab.id : g.kind });
      if (g.kind === 'bab') {
        var b = g.bab;
        sec.id = 'bab-' + b.id;
        sec.appendChild(el('div', { cls: 'bmeta' }, [el('span', { text: babLabel(b) }), el('span', { text: g.rows.length ? t('cv.hadithN', { n: g.rows.length }) : t('cv.noHadith') }),
          babSrc(b), b.evidence === 'line_pattern_unverified' ? el('span', { cls: 'warn-t', text: t('cv.unverified') }) : null]));
        sec.appendChild(el('h2', { cls: 'btitle' }, [el('a', { href: readBase + '&b=' + b.id, 'data-act': 'open-bab', lang: 'ar', dir: 'rtl', text: b.title_ar })]));
        if (b.intro && b.intro.length) {
          var d = el('details', { cls: 'bintro disclose' }, [el('summary', {}, [icon('chevR', 'chev'), t('cv.introN', { n: b.intro.length })])]);
          b.intro.forEach(function (x) { d.appendChild(arP(x.text_ar, 'src sm')); });
          sec.appendChild(d);
        }
      } else if (g.kind === 'opening') {
        sec.appendChild(el('div', { cls: 'bmeta' }, [el('span', { text: t('cv.opening') })]));
        var fm = frontMatter(g.heads, 'src sm'); if (fm) sec.appendChild(fm);
        g.heads.forEach(function (h) {
          if (!h.intro.length || h.front_matter) return;
          var d = el('details', { cls: 'bintro disclose' }, [el('summary', {}, [icon('chevR', 'chev'), t('cv.introN', { n: h.intro.length })])]);
          h.intro.forEach(function (x) { d.appendChild(arP(x.text_ar, 'src sm')); });
          sec.appendChild(d);
        });
      } else if (g.kind === 'unplaced') {
        sec.appendChild(el('div', { cls: 'bmeta warn-t' }, [el('span', { text: t('cv.unplaced') })]));
        sec.appendChild(el('p', { cls: 'tiny faint', text: t('cv.unplacedNote') }));
      }
      if (g.rows.length) { var ul = el('ul', { cls: 'hrows' }); g.rows.forEach(function (r) { ul.appendChild(row(r)); }); sec.appendChild(ul); }
      body.appendChild(sec);
      if (g.kind === 'bab') sections.push(sec);
    });
    if (!groupsK.some(function (g) { return g.rows.length || g.kind === 'bab'; })) body.appendChild(el('p', { cls: 'faint', text: t('cv.empty') }));

    var aside = el('aside', { cls: 'cv-side' }, [tv.node]);
    // joy satri hujjat oqimidan tashqarida (balandligi o'zgarsa sahifa sakramaydi; bob nomi to'liq qoladi)
    main.appendChild(el('div', { cls: 'cv-layout' }, [aside, el('div', { cls: 'cv-col' }, [el('div', { cls: 'locwrap' }, [loc]), el('div', { cls: 'locspace', 'aria-hidden': 'true' }), body])]));
    main.appendChild(mm.scrim); main.appendChild(mm.panel);

    function goBab(id) {
      var s = document.getElementById('bab-' + id);
      if (s) { window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - stickyOffset(), behavior: 'auto' }); history.replaceState(history.state, '', '#/c/' + encodeURIComponent(pkgId) + '?k=' + ki + '&b=' + id); }
    }
    afterRender = function () {
      if (sections.length) scrollSpy(sections, function (id) { var b = bd.ov && bd.ov.bab[id]; setLoc(b || null); tv.setActive(id); mm.tree.setActive(id); });
      tv.scrollToCurrent();
      if (params.b && !restoring) goBab(params.b);
    };
  }
  function stickyOffset() { var a = document.querySelector('.appbar'), l = document.querySelector('.locbar'); return (a ? a.offsetHeight : 0) + (l ? l.offsetHeight : 0) + 8; }

  // -------------------------------------------------------------- batafsil o'qish: Kitob uzluksiz, bob boshiga yoki hadisga
  async function viewReader(pkgId, params) {
    clear();
    var bd = await bookData(pkgId);
    if (!bd) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('home.browse'))); return; }
    var ki = parseInt(params.k || '', 10);
    if (isNaN(ki) && params.u && bd.toc.index[params.u] != null) ki = bd.toc.units[bd.toc.index[params.u]].c;
    ki = Math.max(0, Math.min(bd.toc.chapters.length - 1, ki || 0));
    var kit = kitabOf(bd, ki);
    pageBook(bd.work);
    var groupsK = kitabGroups(bd, kit);
    var ids = groupsK.reduce(function (a, g) { return a.concat(g.rows.map(function (r) { return r.id; })); }, []);
    var units = await Lib.unitsByIds(bd.pkg.active_pkgv, ids), ub = {};
    units.forEach(function (u) { if (u) ub[u.unit_id] = u; });
    var recs = bd.ov ? await Lib.ovMany('ov_isnad', ids, bd.edition) : {};
    if (bd.ov) await attachNames(Object.keys(recs).map(function (k) { return recs[k]; }), bd.edition);
    var trs = bd.ov && I18N.lang() === 'uz' ? await Lib.ovMany('ov_tr', ids.concat((kit.babs || []).map(function (b) { return b.id; })), bd.edition) : {};
    var pr = rprefs(); applyRprefs(pr);
    var contentsHref = '#/c/' + encodeURIComponent(pkgId) + '?k=' + ki;

    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: bd.title, ar: true, href: '#/w/' + encodeURIComponent(bd.work) },
      { text: kit.title, ar: true, href: contentsHref }, { text: t('rdv.title') }]));
    var mm = mobileMenu(bd, ki, 'r', function (b) { goBab(b); });
    var tv = tree(bd, ki, 'r', function (b) { goBab(b); });
    var loc = el('div', { cls: 'locbar', 'data-act': 'locbar', 'aria-live': 'polite' });
    var locText = el('div', { cls: 'loc-text' });
    var menuBtn = el('button', { type: 'button', cls: 'btn sm menu-btn', 'data-act': 'open-tree', 'aria-label': t('cv.tree') }, [icon('books'), el('span', { cls: 'lbl', text: t('cv.tree') })]);
    menuBtn.addEventListener('click', function () { mm.open(menuBtn); });
    var blocks = [];
    var setBtn = settingsButton(function (p2, k) { pr = p2; if (k !== 'fs' && k !== 'wide' && k !== 'theme') blocks.forEach(function (f) { f(); }); if (k === 'theme') main.querySelectorAll('.cv-main').forEach(function (x) { tint(x, bd.work); }); });
    loc.appendChild(menuBtn); loc.appendChild(locText);
    loc.appendChild(el('div', { cls: 'loc-tools' }, [link(t('rdv.contents'), contentsHref, 'contents', 'sm ghost', 'list'), setBtn]));
    function setLoc(b) {
      locText.textContent = '';
      locText.appendChild(el('span', { cls: 'tiny faint', text: t('cv.now') + ': ' }));
      locText.appendChild(kit.name ? el('span', { cls: 'loc-kit', title: kit.title, text: kit.name }) : arSpan(kit.title));
      if (b) { locText.appendChild(el('span', { cls: 'sep', text: ' › ' })); locText.appendChild(el('span', { cls: 'loc-bab', lang: 'ar', dir: 'rtl', text: b.title_ar })); }
    }
    setLoc(null);

    var body = el('section', { cls: 'cv-main reading', 'data-act': 'reader' });
    tint(body, bd.work);
    body.appendChild(el('header', { cls: 'kit-head' }, [
      el('div', { cls: 'eyebrow' }, [el('span', { cls: 'bk-dot', 'aria-hidden': 'true' }), arSpan(bd.title)]),
      el('h1', { lang: 'ar', dir: 'rtl', text: kit.title }), kit.name ? el('p', { cls: 'kit-name', text: kit.name }) : null,
      kit.bism ? el('p', { cls: 'bism', lang: 'ar', dir: 'rtl', 'data-act': 'kitab-bismillah', text: kit.bism }) : null,
      el('p', { cls: 'small muted' }, [kit.babs && kit.babs.length ? t('cv.kitabStats', { b: kit.babs.length, n: kit.count }) : (kit.babs ? t('col.noBabHead') + ' · ' : '') + t('col.rec', { n: kit.count })])]));
    var note = overlayNote(bd); if (note) body.appendChild(note);

    var sections = [], openers = {};
    groupsK.forEach(function (g) {
      var sec = el('section', { cls: 'rbab', 'data-bab': g.bab ? g.bab.id : g.kind });
      if (g.kind === 'bab') {
        var b = g.bab;
        sec.id = 'bab-' + b.id;
        sec.appendChild(el('div', { cls: 'bmeta' }, [el('span', { text: babLabel(b) }), el('span', { text: g.rows.length ? t('cv.hadithN', { n: g.rows.length }) : t('cv.noHadith') }),
          babSrc(b), b.evidence === 'line_pattern_unverified' ? el('span', { cls: 'warn-t', text: t('cv.unverified') }) : null]));
        sec.appendChild(el('h2', { cls: 'btitle', lang: 'ar', dir: 'rtl', text: b.title_ar }));
        var trb = trBlock(trs[b.id], pr, 'bab'); if (trb && trs[b.id]) sec.appendChild(trb);
        if (b.intro && b.intro.length) {
          var d = el('details', { cls: 'bintro disclose', open: true }, [el('summary', {}, [icon('chevR', 'chev'), t('cv.intro')])]);
          b.intro.forEach(function (x) { d.appendChild(arP(x.text_ar, 'src')); });
          sec.appendChild(d);
        }
        sections.push(sec);
      } else if (g.kind === 'opening') {
        sec.appendChild(el('div', { cls: 'bmeta' }, [el('span', { text: t('cv.opening') })]));
        var fm = frontMatter(g.heads, 'src'); if (fm) sec.appendChild(fm);
        g.heads.forEach(function (h) { if (!h.front_matter) h.intro.forEach(function (x) { sec.appendChild(arP(x.text_ar, 'src')); }); });
      } else if (g.kind === 'unplaced') {
        sec.appendChild(el('div', { cls: 'bmeta warn-t' }, [el('span', { text: t('cv.unplaced') })]));
        sec.appendChild(el('p', { cls: 'tiny faint', text: t('cv.unplacedNote') }));
      }
      g.rows.forEach(function (r) { var u = ub[r.id]; if (u) sec.appendChild(hadithBlock(bd, u, recs[r.id] || null, trs[r.id] || null, rprefs, blocks, { openers: openers })); });
      body.appendChild(sec);
    });
    var aside = el('aside', { cls: 'cv-side' }, [tv.node]);
    // joy satri hujjat oqimidan tashqarida (balandligi o'zgarsa sahifa sakramaydi; bob nomi to'liq qoladi)
    main.appendChild(el('div', { cls: 'cv-layout' }, [aside, el('div', { cls: 'cv-col' }, [el('div', { cls: 'locwrap' }, [loc]), el('div', { cls: 'locspace', 'aria-hidden': 'true' }), body])]));
    main.appendChild(mm.scrim); main.appendChild(mm.panel);
    // keyingi/oldingi Kitob
    var nav = el('nav', { cls: 'nav-pn section' }, [
      ki > 0 ? el('a', { cls: 'prev', href: '#/r/' + encodeURIComponent(pkgId) + '?k=' + (ki - 1), 'data-act': 'prev-kitab' }, [el('span', { cls: 'dir' }, [icon('chevL'), t('h.prev')]), el('span', { cls: 'where', lang: 'ar', dir: 'rtl', text: bd.toc.chapters[ki - 1].title })]) : el('span', { 'aria-disabled': 'true' }, [t('h.first')]),
      ki < bd.toc.chapters.length - 1 ? el('a', { cls: 'next', href: '#/r/' + encodeURIComponent(pkgId) + '?k=' + (ki + 1), 'data-act': 'next-kitab' }, [el('span', { cls: 'dir' }, [t('h.next'), icon('chevR')]), el('span', { cls: 'where', lang: 'ar', dir: 'rtl', text: bd.toc.chapters[ki + 1].title })]) : el('span', { 'aria-disabled': 'true' }, [t('h.last')])]);
    body.appendChild(nav);

    // ortga qaytilganda — ketilgan paytda ochiq bo'lgan roviy paneli ham tiklanadi (joy aynan saqlanadi)
    var np = (history.state || {}).np;
    if (restoring && np && openers[np.u]) await openers[np.u](np.mid);
    function goBab(id) {
      var s = document.getElementById('bab-' + id);
      if (s) { window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - stickyOffset(), behavior: 'auto' }); history.replaceState(history.state, '', '#/r/' + encodeURIComponent(pkgId) + '?k=' + ki + '&b=' + id); }
    }
    afterRender = function () {
      if (sections.length) scrollSpy(sections, function (id) { var b = bd.ov && bd.ov.bab[id]; setLoc(b || null); tv.setActive(id); mm.tree.setActive(id); });
      tv.scrollToCurrent();
      if (restoring) return;
      if (params.u) { var h = document.getElementById('u-' + params.u); if (h) window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - stickyOffset(), behavior: 'auto' }); }
      else if (params.b) goBab(params.b);
    };
    if (params.u) { await Notes.put({ key: 'position:last', type: 'position', target: params.u }); await Notes.put({ key: 'position:w:' + bd.work, type: 'position', target: params.u }); }
  }

  // "Faqat ismlar" ↔ to'liq sanad (tanlov eslab qolinadi; sahifadagi barcha tugmalar birga yangilanadi)
  function chainToggle(onChange) {
    var on = rprefs().chain === 'names';
    var b = el('button', { type: 'button', cls: 'btn sm ghost chain-tog', 'data-act': 'chain-toggle', 'aria-pressed': String(on), title: t('rdv.namesHelp') }, [icon('chain'), el('span', { cls: 'lbl', text: t('rdv.namesOnly') })]);
    b.addEventListener('click', function () {
      var p2 = rprefs(); p2.chain = p2.chain === 'names' ? 'full' : 'names'; saveRprefs(p2);
      document.querySelectorAll('[data-act=chain-toggle]').forEach(function (x) { x.setAttribute('aria-pressed', String(p2.chain === 'names')); });
      onChange(p2);
    });
    return b;
  }
  // Roviy kimligi: roviylar bazasidagi ID yoki (matndan olingan, shaxs aniqlanmagan) ism — buni ochiq aytamiz
  function isTextPerson(id) { return /^t[0-9a-f]+$/.test(String(id)); }
  function personIdLine(id) { return isTextPerson(id) ? [el('span', { cls: 'warn-t', text: t('np.textName') })] : [t('np.id') + ': ', idTxt('man-' + id)]; }
  // Yo'l tugunlari matnda belgilanmagan bo'lsa — ismi roviylar ro'yxatidan (manba qisqa ismi)
  async function attachNames(recs, edition) {
    var need = {};
    recs.forEach(function (r) { (r && r.routes || []).forEach(function (ro) { ro.nodes.forEach(function (n) { if (!n.mid) need[String(n.person)] = 1; }); }); });
    var ids = Object.keys(need), map = {};
    if (ids.length) { var got = await Lib.ovMany('ov_person', ids, edition); ids.forEach(function (k) { if (got[k]) map[k] = got[k].short_name; }); }
    recs.forEach(function (r) { if (r) r._names = map; });
  }
  // Bitta hadis bloki (reader ichida): sarlavha, belgilangan matn, tarjima, roviy paneli, sharhlar.
  function hadithBlock(bd, u, rec, tr, getPr, blocks, opts) {
    var pn = primaryNum(u.numbers);
    var heading = pn ? t('h.number', { n: (pn.volume ? pn.volume + ':' : '') + pn.number_text }) : en('unitType', u.unit_type);
    var art = el('article', { cls: 'hadith', id: 'u-' + u.unit_id, 'data-unit': u.unit_id });
    var textSlot = el('div', { cls: 'tslot' });
    var panelSlot = el('div', { cls: 'pslot' });
    var commSlot = el('div', { cls: 'cslot' });
    function render() {
      textSlot.textContent = '';
      textSlot.appendChild(markedText(u, rec, getPr(), { highlight: opts.highlight, onNarrator: function (m, rs) { narratorPanel(bd, u, rec, m, rs, panelSlot); } }));
    }
    render();
    blocks.push(render);
    if (opts.openers) opts.openers[u.unit_id] = function (mid) {
      var m = rec && (rec.mentions || []).find(function (x) { return x.mid === mid; });
      if (m) return narratorPanel(bd, u, rec, m, routeInfo(rec)[mid] || [], panelSlot);
    };
    var okRec = rec && rec.text_sha256 === u.current_text_sha256 && (rec.routes || []).length;
    var chainBtn = okRec ? chainToggle(function () { blocks.forEach(function (f) { f(); }); }) : null;
    var commBtn = btn(t('rdv.comms'), 'comms', async function () {
      if (commSlot.firstChild) { commSlot.textContent = ''; commBtn.setAttribute('aria-expanded', 'false'); return; }
      commBtn.setAttribute('aria-expanded', 'true');
      await renderCommentaries(commSlot, u.unit_id, pn);
    }, 'sm ghost', 'layers');
    commBtn.setAttribute('aria-expanded', 'false');
    art.appendChild(el('header', { cls: 'h-head' }, [
      el('a', { cls: 'h-num', href: '#/h/' + encodeURIComponent(u.unit_id), 'data-act': 'open-single', title: t('rdv.single') }, [heading]),
      en('attribution', u.attribution_kind) ? pill(en('attribution', u.attribution_kind)) : null,
      el('span', { cls: 'h-tools' }, [chainBtn, commBtn, link(t('rdv.single'), '#/h/' + encodeURIComponent(u.unit_id), 'open-single-page', 'sm ghost', 'arrow')])]));
    art.appendChild(textSlot);
    var trb = trBlock(tr, getPr(), 'unit'); if (trb) art.appendChild(trb);
    art.appendChild(panelSlot);
    art.appendChild(commSlot);
    return art;
  }

  // -------------------------------------------------------------- qisqa roviy paneli (hadis ostida, hadis yopilmaydi)
  function rememberPanel(v) { try { history.replaceState(Object.assign({}, history.state || {}, { np: v }), '', location.href); } catch (e) { /* */ } }
  async function narratorPanel(bd, u, rec, m, rs, slot) {
    if (slot.getAttribute('data-mid') === m.mid) { slot.textContent = ''; slot.removeAttribute('data-mid'); rememberPanel(null); return; }
    slot.textContent = ''; slot.setAttribute('data-mid', m.mid);
    rememberPanel({ u: u.unit_id, mid: m.mid });
    var person = await Lib.ovEnt('ov_person', m.person, bd.edition);
    var c = (person && person.counts) || { units: 0, routes: 0, mentions: 0 };
    var stats = await coverageOf(bd);
    var lv = levelStats(await Lib.ovOccAll(m.person, bd.edition));
    var multi = (rec.routes || []).length > 1;
    var listHref = '#/n/' + encodeURIComponent(m.person) + '?e=' + encodeURIComponent(bd.edition) + '&from=' + encodeURIComponent(u.unit_id);
    var box = el('section', { cls: 'npanel', 'data-act': 'narrator-panel', 'aria-live': 'polite' });
    tint(box, bd.work);
    box.appendChild(el('div', { cls: 'np-head' }, [
      el('div', {}, [el('div', { cls: 'np-name', lang: 'ar', dir: 'rtl', text: m.as_written }),
        person && person.short_name ? el('div', { cls: 'small', lang: 'ar', dir: 'rtl', text: person.short_name }) : null,
        el('div', { cls: 'tiny faint' }, personIdLine(m.person))]),
      el('button', { type: 'button', cls: 'icon-btn', 'aria-label': t('np.close'), 'data-act': 'narrator-close', on: { click: function () { slot.textContent = ''; slot.removeAttribute('data-mid'); rememberPanel(null); } } }, [icon('x')])]));
    box.appendChild(el('p', { cls: 'np-pos' }, rs.length ? rs.map(function (x) { return el('span', { cls: 'pill lvp' + lvCls(x.pos) }, [t('np.position', { p: x.pos, n: x.of }) + (multi ? ' · ' + t('np.route', { r: x.label }) : '')]); }) : [el('span', { cls: 'small faint', text: t('np.noRoute') })]));
    box.appendChild(el('p', { cls: 'np-big' }, [el('b', { text: String(c.units) }), ' ', el('span', { text: t('np.inHadiths') })]));
    box.appendChild(levelBars(lv, null));
    box.appendChild(el('p', { cls: 'tiny faint', text: t('np.scope', { book: bd.title, m: stats.mapped, t: stats.total }) + ' ' + t('ni.levelNote') }));
    box.appendChild(el('div', { cls: 'btns' }, [link(t('np.details'), listHref, 'narrator-hadiths', 'primary sm', 'list')]));
    slot.appendChild(box);
  }
  // Roviy darajalari: har o'rin (sanadda muallifning shayxidan nechanchi) uchun nechta hadis; o'rni noma'lum alohida.
  function levelStats(rows) {
    var by = {}, none = {}, units = {};
    rows.forEach(function (r) {
      units[r.unit_id] = 1;
      if (!r.routes.length) { none[r.unit_id] = 1; return; }
      r.routes.forEach(function (x) { (by[x.pos] = by[x.pos] || {})[r.unit_id] = 1; });
    });
    var lv = Object.keys(by).map(Number).sort(function (a, b) { return a - b; }).map(function (p) { return { pos: p, n: Object.keys(by[p]).length }; });
    return { levels: lv, none: Object.keys(none).length, units: Object.keys(units).length };
  }
  function levelBars(st, onPick, cur) {
    var max = Math.max.apply(null, st.levels.map(function (x) { return x.n; }).concat([st.none, 1]));
    var wrap = el('div', { cls: 'lvbars', role: onPick ? 'group' : null, 'aria-label': t('np.levels') });
    function bar(key, label, n, cls) {
      var fill = el('span', { cls: 'fill' }); fill.style.setProperty('--w', Math.max(4, Math.round(n / max * 100)) + '%');
      var inner = [el('span', { cls: 'lbl', text: label }), el('span', { cls: 'track' }, [fill]), el('b', { cls: 'n', text: String(n) })];
      var node = onPick ? el('button', { type: 'button', cls: 'lvbar' + cls, 'data-act': 'ni-level', 'data-level': key, 'aria-pressed': String(String(cur) === String(key)) }, inner)
        : el('div', { cls: 'lvbar' + cls }, inner);
      if (onPick) node.addEventListener('click', function () { onPick(String(cur) === String(key) ? null : key); });
      wrap.appendChild(node);
    }
    st.levels.forEach(function (x) { bar(x.pos, t('np.levelN', { p: x.pos }), x.n, lvCls(x.pos)); });
    if (st.none) bar('0', t('np.levelNone'), st.none, ' lv0');
    return wrap;
  }
  function bioBlock(person) {
    var wrap = el('div', { cls: 'np-bio' });
    if ((person.summary || []).length) {
      var dl = el('dl', { cls: 'meta ar-meta', lang: 'ar', dir: 'rtl' });
      if (person.long_name) { dl.appendChild(el('dt', { text: '—' })); dl.appendChild(el('dd', { text: person.long_name })); }
      person.summary.forEach(function (kv) { dl.appendChild(el('dt', { text: kv[0] })); dl.appendChild(el('dd', { text: kv[1] })); });
      wrap.appendChild(el('details', { cls: 'disclose', 'data-act': 'narrator-bio' }, [el('summary', {}, [icon('chevR', 'chev'), t('np.bio')]), dl, el('p', { cls: 'tiny faint', text: t('np.status') })]));
    }
    if ((person.opinions || []).length) {
      var ol = el('div', { cls: 'opinions', lang: 'ar', dir: 'rtl' });
      person.opinions.forEach(function (g) {
        var who = g[0], quotes = g[1] || [];
        ol.appendChild(el('div', { cls: 'op' }, [el('b', { text: who })].concat(quotes.map(function (q) {
          return el('blockquote', {}, [el('p', { text: q[0] }), q[1] ? el('cite', { text: q[1] }) : null]);
        }))));
      });
      wrap.appendChild(el('details', { cls: 'disclose', 'data-act': 'narrator-opinions' }, [el('summary', {}, [icon('chevR', 'chev'), t('np.opinions') + ' (' + person.opinions.length + ')']), ol, el('p', { cls: 'tiny faint', text: t('np.status') })]));
    }
    if (!wrap.firstChild) wrap.appendChild(el('p', { cls: 'small faint', text: t('np.noBio') }));
    return wrap;
  }
  var covCache = {};
  async function coverageOf(bd) {
    var k = bd.ovs.overlay ? bd.ovs.overlay.active_pkgv : 'none';
    if (covCache[k]) return covCache[k];
    var cov = (bd.ovs.overlay && bd.ovs.overlay.coverage) || {};
    var isn = cov.isnad || {};
    var mapped = (isn['status:established_single_route'] || 0) + (isn['status:partial'] || 0) + (isn['status:branched'] || 0) + (isn['status:no_route'] || 0);
    covCache[k] = { mapped: mapped, total: cov.units || bd.toc.units.length };
    return covCache[k];
  }

  // -------------------------------------------------------------- roviy indeksi: alohida, sahifalangan sahifa
  var NI_PAGE = 20;
  async function viewNarrator(personId, params) {
    clear();
    var ed = params.e || 'ed-bukhari-hj120';
    var pk = (await Lib.packages()).find(function (p) { return p.kind === 'base_book' && p.manifest.edition_id === ed; });
    if (!pk) { main.appendChild(emptyState(t('notFound'), t('notInstalled'), '#/books', t('home.browse'))); return; }
    var bd = await bookData(pk.package_id);
    if (!bd.ov) { main.appendChild(el('div', { cls: 'card note' }, [el('p', { text: t('ni.unavailable') }), overlayNote(bd)])); return; }
    pageBook(bd.work);
    var person = await Lib.ovEnt('ov_person', personId, ed);
    var all = await Lib.ovOccAll(personId, ed);
    var lv = levelStats(all);
    var level = params.lv != null && params.lv !== '' ? params.lv : null;
    // daraja bo'yicha saralash: shu o'rindagi zikrlar (0 — yo'lda o'rni noma'lum)
    var picked = level == null ? all : all.filter(function (r) { return level === '0' ? !r.routes.length : r.routes.some(function (x) { return String(x.pos) === level; }); });
    var total = picked.length;
    var pages = Math.max(1, Math.ceil(total / NI_PAGE));
    var pg = Math.max(1, Math.min(pages, parseInt(params.p || '1', 10) || 1));
    var grouped = params.g === '1';
    var rows = picked.slice((pg - 1) * NI_PAGE, pg * NI_PAGE);
    var stats = await coverageOf(bd);
    var c = (person && person.counts) || { units: 0, routes: 0, mentions: 0 };
    var self = function (p, g, l) {
      l = l === undefined ? level : l;
      return '#/n/' + encodeURIComponent(personId) + '?e=' + encodeURIComponent(ed) + (params.from ? '&from=' + encodeURIComponent(params.from) : '') + '&p=' + p + (g ? '&g=1' : '') + (l != null ? '&lv=' + l : '');
    };
    var name = person ? person.short_name : ('man-' + personId);
    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: bd.title, ar: true, href: '#/w/' + encodeURIComponent(bd.work) }, { text: t('ni.title') }]));
    var wrap = el('section', { cls: 'nidx', 'data-act': 'narrator-index' });
    tint(wrap, bd.work);
    var fromHash = (history.state || {}).fromHash || '';
    var back = params.from ? el('a', { cls: 'btn sm soft', href: '#/h/' + encodeURIComponent(params.from), 'data-act': 'back-hadith', on: { click: function (e) {
      if (/^#\/(h|r)\//.test(fromHash)) { e.preventDefault(); history.back(); }
    } } }, [icon('chevL'), t('ni.back')]) : null;
    wrap.appendChild(el('div', { cls: 'btns' }, [back]));
    wrap.appendChild(el('header', { cls: 'ni-head' }, [
      el('div', { cls: 'eyebrow' }, [el('span', { cls: 'bk-dot', 'aria-hidden': 'true' }), arSpan(bd.title)]),
      el('h1', { lang: 'ar', dir: 'rtl', text: name }),
      person && person.long_name && person.long_name !== name ? el('p', { cls: 'small muted', lang: 'ar', dir: 'rtl', text: person.long_name }) : null,
      el('p', { cls: 'tiny faint' }, personIdLine(personId).concat([' · ', idTxt(ed)]))]));
    wrap.appendChild(el('div', { cls: 'np-counts' }, [
      el('div', {}, [el('b', { text: String(c.units) }), el('span', { text: t('np.units') })]),
      el('div', {}, [el('b', { text: String(c.routes) }), el('span', { text: t('np.routes') })]),
      el('div', {}, [el('b', { text: String(c.mentions) }), el('span', { text: t('np.mentions') })])]));
    wrap.appendChild(el('p', { cls: 'tiny faint', text: t('ni.scope', { book: bd.title, m: stats.mapped, t: stats.total }) }));
    if (isTextPerson(personId)) wrap.appendChild(el('p', { cls: 'note warn small', 'data-act': 'text-name-note', text: t('ni.textNote') }));
    // darajalar: bosilsa ro'yxat shu o'ringa saralanadi (son va doira ko'rsatiladi)
    wrap.appendChild(el('div', { cls: 'lv-card' }, [el('h2', { cls: 'h3', text: t('np.levels') }), el('p', { cls: 'tiny faint', text: t('ni.levelNote') }),
      levelBars(lv, function (k) { replaceRoute(self(1, grouped, k == null ? null : String(k)), false); }, level)]));
    var tog = el('div', { cls: 'seg', role: 'group', 'aria-label': t('ni.group') }, [
      el('a', { href: self(pg, false), 'aria-pressed': String(!grouped), 'data-act': 'ni-flat', text: t('ni.flat'), on: { click: function (e) { e.preventDefault(); replaceRoute(self(pg, false), true); } } }),
      el('a', { href: self(pg, true), 'aria-pressed': String(grouped), 'data-act': 'ni-group', text: t('ni.group'), on: { click: function (e) { e.preventDefault(); replaceRoute(self(pg, true), true); } } })]);
    wrap.appendChild(el('div', { cls: 'section-head' }, [el('span', { cls: 'small', 'data-act': 'ni-total' }, [t('ni.total', { n: total }),
      level != null ? el('span', { cls: 'pill lvp' + lvCls(Number(level)) }, [level === '0' ? t('np.levelNone') : t('np.levelN', { p: level })]) : null]), tog]));
    function plink(label, p2, act, cls, ic) {
      var a = link(label, self(p2, grouped), act, cls, ic);
      a.addEventListener('click', function (e) { e.preventDefault(); replaceRoute(self(p2, grouped)); });
      return a;
    }
    function pager() {
      return el('div', { cls: 'pager' }, [
        el('span', { cls: 'btns' }, [pg > 1 ? plink(t('ni.firstPage'), 1, 'ni-first', 'sm ghost') : null, pg > 1 ? plink(t('rd.prevPage'), pg - 1, 'ni-prev', 'sm', 'chevL') : null]),
        el('span', { cls: 'small faint', 'data-act': 'ni-page', text: t('ni.page', { p: pg, n: pages }) + ' · ' + t('ni.perPage', { k: NI_PAGE }) }),
        el('span', { cls: 'btns' }, [pg < pages ? plink(t('rd.nextPage'), pg + 1, 'ni-next', 'sm') : null, pg < pages ? plink(t('ni.lastPage'), pages, 'ni-last', 'sm ghost') : null])]);
    }
    if (!total) wrap.appendChild(el('p', { cls: 'note', text: t('ni.none') }));
    else {
      wrap.appendChild(pager());
      var list = el('ol', { cls: 'nlist', start: String((pg - 1) * NI_PAGE + 1) });
      var lastK = null, lastB = null;
      rows.forEach(function (r) {
        var kit = bd.ov.kit[r.kitab_id], bab = r.bab_id ? bd.ov.bab[r.bab_id] : null;
        var noBab = (bd.ov.place[r.unit_id] || {}).opening ? t('ni.opening') : t('oc.unknownBab');   // Kitob boshidagi (bobsiz) yozuv yoki aniqlanmagan
        if (grouped) {
          if (r.kitab_id !== lastK) { var kn = kitName(kit); list.appendChild(el('li', { cls: 'ng-k' }, [el('span', { lang: 'ar', dir: 'rtl', text: kit ? kit.title_ar : '—' }), kn ? el('span', { cls: 'ng-kn', text: kn }) : null])); lastK = r.kitab_id; lastB = null; }
          if ((r.bab_id || 'x') !== lastB) { list.appendChild(el('li', { cls: 'ng-b' }, [el('span', { cls: 'ng-l tiny', text: bab ? babLabel(bab) : noBab }), bab ? el('span', { cls: 'ng-t', lang: 'ar', dir: 'rtl', text: bab.title_ar }) : null])); lastB = r.bab_id || 'x'; }
        }
        var pos = r.routes.length ? r.routes.map(function (x) { return (r.routes.length > 1 || x.label !== 'A' ? t('ni.route', { r: x.label }) + ' · ' : '') + t('ni.pos', { p: x.pos, n: x.of }); }).join('; ') : t('ni.noPos');
        var p0 = r.routes.length ? r.routes[0].pos : 0;
        var listHash = self(pg, grouped);
        list.appendChild(el('li', { cls: 'nrow' + (p0 ? lvCls(p0) : ' lv0') }, [el('a', { href: '#/h/' + encodeURIComponent(r.unit_id) + '?p=' + encodeURIComponent(personId) + '&list=' + encodeURIComponent(listHash), 'data-act': 'ni-row', 'data-unit': r.unit_id }, [
          el('span', { cls: 'num', text: r.number != null ? String(r.number) : '—' }),
          el('span', { cls: 'nm-as', lang: 'ar', dir: 'rtl', text: r.as_written || (person ? person.short_name : '') }),
          el('span', { cls: 'rp small' }, [el('span', { cls: 'lvdot' + (p0 ? lvCls(p0) : ' lv0'), 'aria-hidden': 'true' }), pos, r.span ? null : el('span', { cls: 'tiny faint', text: ' · ' + t('ni.noSpan') })]),
          grouped ? null : el('span', { cls: 'where tiny' }, [el('span', { lang: 'ar', dir: 'rtl', text: kit ? kit.title_ar : '—' }), ' › ', bab ? el('span', { lang: 'ar', dir: 'rtl', text: bab.title_ar }) : el('span', { text: noBab })]),
          el('span', { cls: 'go small' }, [t('ni.open'), icon('chevR')])])]));
      });
      wrap.appendChild(list);
      wrap.appendChild(pager());
    }
    if (person) wrap.appendChild(el('section', { cls: 'card ni-bio' }, [el('h2', { cls: 'h3', text: t('ni.bio') }), bioBlock(person)]));
    main.appendChild(wrap);
  }

  // -------------------------------------------------------------- Ilmiy bog'lanish stoli: asar oilasi → hadis linzasi → qiyoslash
  // Har aloqa o'rnatilgan paketlardagi haqiqiy link/occurrence'ga tayanadi; o'rnatilmagan paket ichidagi bog'lama taxmin qilinmaydi.
  async function viewDesk(workId, params) {
    clear();
    var data = await groups();
    var g = data.groups[workId];
    if (!g) { main.appendChild(emptyState(t('notFound'), t('books.none'), '#/books', t('home.browse'))); return; }
    var base = g.bases[0] || null, bi = base ? data.installed[base.package_id] : null;
    var title = await workTitle(workId);
    pageBook(workId);
    main.appendChild(crumbs([{ text: t('bk.books'), href: '#/books' }, { text: title, ar: true, href: '#/w/' + encodeURIComponent(workId) }, { text: t('dk.title') }]));
    var wrap = tint(el('section', { cls: 'desk', 'data-act': 'desk' }), workId);
    wrap.appendChild(el('h1', { text: t('dk.title') }));
    wrap.appendChild(el('p', { cls: 'muted', text: t('dk.lead') }));
    // 1) asar oilasi: asos asar → sharh asari → muallif → nashr/paket
    var fam = el('section', { cls: 'card dk-family', 'data-act': 'desk-family' }, [el('h2', {}, [el('span', { cls: 'dk-step', text: '1' }), t('dk.family')])]);
    var root0 = el('div', { cls: 'dk-root' }, [el('span', { cls: 'bk-dot', 'aria-hidden': 'true' }), arSpan(title), base ? el('span', { cls: 'small faint' }, [' · ', idTxt(base.edition_id)]) : null,
      bi ? pill(t('card.installed'), 'ok', 'check') : pill(t('bk.notInstalled'))]);
    fam.appendChild(root0);
    var byWork = {};
    g.comms.forEach(function (c) { (byWork[c.work_id] = byWork[c.work_id] || []).push(c); });
    var ul = el('ul', { cls: 'dk-tree' });
    Object.keys(byWork).forEach(function (w) {
      var eds = byWork[w], c0 = eds[0], ct = titleOf(c0), ca = authorOf(c0);
      var li = el('li', { 'data-work': w }, [el('div', { cls: 'dk-work' }, [ct.ar ? arSpan(ct.ar) : ct.other, ca && ca.ar ? el('span', { cls: 'small faint' }, [' — ', arSpan(ca.ar)]) : null])]);
      var eul = el('ul', { cls: 'dk-eds' });
      eds.forEach(function (c) {
        var ci = data.installed[c.package_id];
        eul.appendChild(el('li', { 'data-pkg': c.package_id }, [idTxt(c.edition_id || c.package_id), ' · ', idTxt('v' + c.package_version), ' · ',
          ci ? pill(t('card.installed'), 'ok') : (c.local_only ? pill(t('rights.local'), 'warn') : pill(t('bk.notInstalled'))),
          c.provides_units ? el('span', { cls: 'tiny faint', text: ' · ' + t('bk.passages', { n: c.provides_units }) }) : null]));
      });
      li.appendChild(eul); ul.appendChild(li);
    });
    fam.appendChild(g.comms.length ? ul : el('p', { cls: 'small faint', text: t('bk.noComms') }));
    wrap.appendChild(fam);
    // 2) hadis linzasi
    var lens = el('section', { cls: 'card dk-lens', 'data-act': 'desk-lens' }, [el('h2', {}, [el('span', { cls: 'dk-step', text: '2' }), t('dk.lens')])]);
    var num = el('input', { type: 'text', inputmode: 'numeric', placeholder: t('num.number'), 'aria-label': t('num.number'), dir: 'ltr', 'data-act': 'desk-number', value: params.n || '' });
    lens.appendChild(el('form', { cls: 'filters', on: { submit: function (e) { e.preventDefault(); if (num.value.trim()) replaceRoute('#/desk/' + encodeURIComponent(workId) + '?n=' + encodeURIComponent(num.value.trim()), true); } } },
      [num, el('button', { type: 'submit', cls: 'btn sm', 'data-act': 'desk-go', text: t('num.go') })]));
    wrap.appendChild(lens);
    var unitRow = null;
    if (params.n && bi) {
      var res = await Lib.resolve(workId, params.n, null, null);
      unitRow = res.length ? res[0].unit : null;
      if (res.length > 1) lens.appendChild(el('p', { cls: 'note warn small', text: t('num.many', { n: res.length }) }));
    }
    if (params.n && !bi) lens.appendChild(el('p', { cls: 'note small', text: t('link.base_not_installed') }));
    var linked = [];
    if (unitRow) {
      lens.appendChild(el('div', { cls: 'dk-pin' }, [el('div', { cls: 'small faint', text: t('h.number', { n: params.n }) }), arP(Array.from(unitRow.text_ar).slice(0, 600).join('') + (unitRow.text_ar.length > 600 ? '…' : ''), 'src sm')]));
      linked = await Lib.commentariesFor(unitRow.unit_id);
      var tb = el('ul', { cls: 'dk-status' });
      Object.keys(byWork).forEach(function (w) {
        byWork[w].forEach(function (c) {
          var ci = data.installed[c.package_id], mine = linked.filter(function (x) { return x.occ.package_id === c.package_id || x.occ.pkgv === (ci && ci.active_pkgv); });
          var st = !ci ? (c.local_only ? 'dk.stLocal' : 'dk.stNotInstalled') : mine.length ? 'dk.stLinked' : 'dk.stNoLink';
          var ct = titleOf(c);
          tb.appendChild(el('li', { 'data-pkg': c.package_id, 'data-state': st }, [el('span', { lang: 'ar', dir: 'rtl', cls: 'ar-i', text: ct.ar || ct.other }), ' · ', idTxt(c.edition_id),
            ' — ', el('b', { text: t(st, { n: mine.length }) }),
            mine.length ? el('span', { cls: 'small' }, [' · ', mine.map(function (x) { return x.occ.page ? (x.occ.volume ? x.occ.volume + ':' : '') + x.occ.page : '—'; }).join(', ')]) : null,
            mine.length ? el('label', { cls: 'check small dk-pick' }, [el('input', { type: 'checkbox', 'data-act': 'desk-pick', 'data-pkg': c.package_id, checked: (params.cmp || '').split(',').indexOf(c.package_id) >= 0 ? true : null }), t('dk.compare')]) : null]));
        });
      });
      lens.appendChild(tb);
      lens.appendChild(el('p', { cls: 'tiny faint', text: t('dk.honest') }));
      tb.addEventListener('change', function () {
        var ids = Array.from(tb.querySelectorAll('[data-act=desk-pick]:checked')).map(function (x) { return x.getAttribute('data-pkg'); });
        replaceRoute('#/desk/' + encodeURIComponent(workId) + '?n=' + encodeURIComponent(params.n) + (ids.length ? '&cmp=' + ids.join(',') : ''), true);
      });
    }
    // 3) qiyoslash: hadis yuqorida, tanlangan sharhlar alohida ustunlarda (sun'iy sinxronizatsiya yo'q)
    var cmp = (params.cmp || '').split(',').filter(Boolean);
    if (unitRow && cmp.length) {
      var board = el('section', { cls: 'dk-compare', 'data-act': 'desk-compare' }, [el('h2', {}, [el('span', { cls: 'dk-step', text: '3' }), t('dk.compareTitle')])]);
      var cols = el('div', { cls: 'dk-cols' });
      for (var pid of cmp) {
        var items = linked.filter(function (x) { return x.occ.package_id === pid; });
        if (!items.length) continue;
        var o = items[0].occ, work = (await Lib.ent('works', o.work_id)) || {}, ed = await Lib.ent('editions', o.edition_id), au = await personName((work.author_ids || [])[0]);
        var endOk = o.scope === 'full_section' && (o.statuses || {}).commentary_end_status === 'verified';
        var txt = Array.from(o.text_ar);
        cols.appendChild(el('article', { cls: 'dk-col', 'data-pkg': pid }, [
          el('div', { cls: 'cg-ttl', lang: 'ar', dir: 'rtl', text: work.title_ar || o.work_id }),
          el('div', { cls: 'cg-sub' }, [au ? arSpan(au) : null, au ? ' · ' : '', ed ? ed.label : idTxt(o.edition_id), ' · ', o.page ? (o.volume ? t('cm.page', { v: o.volume, p: o.page }) : t('cm.pageOnly', { p: o.page })) : '—']),
          o.lemma_text ? el('p', { cls: 'small' }, [t('cm.lemma') + ' ', arSpan(o.lemma_text)]) : null,
          endOk ? null : el('p', { cls: 'tiny faint', text: t('cm.preview') }),
          arP(txt.slice(0, 1800).join('') + (txt.length > 1800 ? ' …' : ''), 'src sm'),
          link(endOk ? t('cm.openSection') : t('cm.openFull'), '#/s/' + encodeURIComponent(o.occurrence_id) + '?from=' + encodeURIComponent(unitRow.unit_id), 'open-commentary', 'sm soft', 'arrow')]));
      }
      board.appendChild(cols);
      wrap.appendChild(board);
    }
    if (unitRow) wrap.appendChild(el('div', { cls: 'btns section' }, [link(t('dk.backHadith'), '#/h/' + encodeURIComponent(unitRow.unit_id), 'desk-hadith', 'soft', 'chevL')]));
    main.appendChild(wrap);
  }

  // ---------------------------------------------------------------- qidiruv
  function getWorker() { if (!worker) worker = new Worker('./js/search-worker.js'); return worker; }
  async function viewSearch(params) {
    clear();
    var pk = await Lib.packages();
    var onlyWork = params.book || null;
    main.appendChild(el('div', { cls: 'search-head' }, [el('h1', { text: t('srch.title') }), el('p', { cls: 'muted', text: t('srch.lead') })]));
    if (!pk.length) { main.appendChild(emptyState(t('srch.title'), t('srch.empty'), '#/books', t('srch.toBooks'))); return; }
    var q = el('input', { id: 'q', type: 'search', lang: 'ar', dir: 'rtl', placeholder: t('srch.ph'), 'aria-label': t('srch.ph'), value: params.q || '', enterkeyhint: 'search' });
    var mode = el('select', { id: 'rejim', 'aria-label': t('srch.mode') }, [el('option', { value: 'normalized', text: t('srch.norm') }), el('option', { value: 'exact', text: t('srch.exact') })]);
    var scope = el('select', { id: 'doira', 'aria-label': t('srch.scope') }, [el('option', { value: 'all', text: t('srch.all') }), el('option', { value: 'base', text: t('srch.base') }), el('option', { value: 'commentary', text: t('srch.comm') })]);
    var authors = el('select', { id: 'muallif', 'aria-label': t('srch.anyAuthor') }, [el('option', { value: '', text: t('srch.anyAuthor') })]);
    for (var c of pk.filter(function (p) { return p.kind === 'commentary'; }))
      for (var a of (c.manifest.author_ids || [])) authors.appendChild(el('option', { value: a, text: t('srch.ownWords', { name: (await personName(a)) || a }) }));
    var vonly = el('input', { type: 'checkbox', id: 'faqat-tasdiq' });
    mode.value = params.mode || 'normalized'; scope.value = params.scope || 'all';
    var res = el('div', { id: 'natijalar', 'aria-live': 'polite' });
    main.appendChild(el('form', { cls: 'search-head', role: 'search', on: { submit: function (e) { e.preventDefault(); run(); } } }, [
      onlyWork ? el('p', { cls: 'btns' }, [el('span', { cls: 'pill accent' }, tNode('srch.inBook', arSpan(await workTitle(onlyWork)))), el('a', { href: '#/search', cls: 'small', text: t('srch.clearBook') })]) : null,
      el('div', { cls: 'btns' }, [el('div', { cls: 'searchbox xl', style: null }, [icon('search'), q]), el('button', { cls: 'btn primary lg', type: 'submit', 'data-act': 'search', text: t('srch.go') })]),
      el('div', { cls: 'filters' }, [mode, scope, authors, el('label', { cls: 'check small' }, [vonly, t('srch.verified')])])]));
    main.querySelector('.search-head .searchbox').classList.add('grow');
    main.appendChild(res);
    main.appendChild(await numberForm(pk));
    async function run() {
      var text = q.value.trim();
      if (!text) return;
      var act = await Lib.packages();
      if (onlyWork) act = act.filter(function (p) { return p.manifest.work_id === onlyWork || (p.manifest.requires_for_linked_reading || []).some(function (r) { return r.target_work_id === onlyWork; }); });
      var id = ++searchSeq;
      res.textContent = ''; res.removeAttribute('data-tayyor');
      res.appendChild(el('p', { cls: 'faint', text: t('srch.busy') }));
      var w = getWorker();
      w.onmessage = async function (e) {
        var d = e.data;
        if (d.id !== searchSeq) return;
        if (d.error) { res.textContent = ''; res.appendChild(el('p', { cls: 'note bad', text: t('srch.error', { msg: d.error }) })); res.setAttribute('data-tayyor', '1'); return; }
        if (d.done) await renderHits(res, d, text);
      };
      w.postMessage({ id: id, query: text, mode: mode.value, scope: authors.value ? 'commentary' : scope.value, authorId: authors.value || null,
        verifiedOnly: vonly.checked, pkgvs: act.map(function (p) { return p.active_pkgv; }) });
    }
    if (params.q) run();
  }
  async function renderHits(res, d, query) {
    res.textContent = '';
    res.appendChild(el('p', { cls: 'small faint', text: t('srch.count', { n: d.total, ms: d.ms }) + (d.capped ? t('srch.capped') : '') + ' · ' + t('srch.notId') }));
    if (d.total > 25 && Arabic.normalize(query).length < 8) res.appendChild(el('p', { cls: 'note warn small', text: t('srch.short') }));
    if (!d.total) res.appendChild(el('div', { cls: 'card empty' }, [icon('search'), el('p', { text: t('srch.none') })]));
    var list = el('div', { cls: 'hits' }), shown = 0;
    for (var h of d.hits) {
      if (shown++ >= 200) { res.appendChild(el('p', { cls: 'faint', text: t('srch.more') })); break; }
      var sn = h.snippet, chars = Array.from(sn.text);
      var p = el('p', { lang: 'ar', dir: 'rtl', cls: 'hx' }, [
        (sn.truncated && sn.original_offset > 0 ? '… ' : '') + chars.slice(0, sn.match_start).join(''),
        el('mark', { text: chars.slice(sn.match_start, sn.match_end).join('') }),
        chars.slice(sn.match_end).join('') + (sn.truncated ? ' …' : '')]);
      var pn = h.kind === 'unit' ? primaryNum(h.numbers) : null;
      var layer = h.kind === 'unit' ? null : t('role.' + h.layer) + (h.layer_person ? ' — ' + ((await personName(h.layer_person)) || '') : '');
      list.appendChild(el('a', { cls: 'hit', 'data-act': 'hit', href: (h.kind === 'unit' ? '#/h/' : '#/s/') + encodeURIComponent(h.id) }, [
        el('div', { cls: 'hh' }, [arSpan(await workTitle(h.work_id)), pn ? pill(t('h.number', { n: (pn.volume ? pn.volume + ':' : '') + pn.number_text }), 'accent') : null,
          layer ? pill(layer) : null]), p]));
    }
    res.appendChild(list);
    res.setAttribute('data-tayyor', '1');
  }
  async function numberForm(pk) {
    var works = [];
    pk.filter(function (p) { return p.kind === 'base_book'; }).forEach(function (b) { if (works.indexOf(b.manifest.work_id) < 0) works.push(b.manifest.work_id); });
    var wsel = el('select', { 'aria-label': t('num.book'), 'data-act': 'num-book' });
    for (var w of works) wsel.appendChild(el('option', { value: w, text: await workTitle(w) }));
    var num = el('input', { type: 'text', inputmode: 'numeric', placeholder: t('num.number'), 'aria-label': t('num.number'), 'data-act': 'num-number', dir: 'ltr' });
    var vol = el('input', { type: 'text', inputmode: 'numeric', placeholder: t('num.volume'), 'aria-label': t('num.volume'), 'data-act': 'num-volume', dir: 'ltr' });
    var out = el('div', { id: 'raqam-natija', cls: 'hits' });
    return el('form', { cls: 'card section', on: { submit: async function (e) {
      e.preventDefault(); out.textContent = '';
      if (!num.value.trim()) return;
      var r = await Lib.resolve(wsel.value, num.value, null, vol.value.trim() || null);
      if (!r.length) { out.appendChild(el('p', { cls: 'note', text: t('num.none') })); return; }
      if (r.length === 1) { location.hash = '#/h/' + encodeURIComponent(r[0].unit.unit_id); return; }
      out.appendChild(el('p', { cls: 'note warn small', 'data-act': 'num-many', text: t('num.many', { n: r.length }) }));
      for (var c of r) {
        out.appendChild(el('a', { cls: 'hit', 'data-act': 'num-hit', href: '#/h/' + encodeURIComponent(c.unit.unit_id) }, [
          el('div', { cls: 'hh' }, [pill((await schemeLabel(c.number.scheme_id)) + ': ' + (c.number.volume ? t('num.vol', { v: c.number.volume }) + ', ' : '') + c.number.number_text, 'accent'), c.grouped ? pill(t('num.grouped')) : null, idTxt(c.unit.edition_id)]),
          el('p', { cls: 'hx', lang: 'ar', dir: 'rtl', text: Array.from(c.unit.text_ar).slice(0, 160).join('') + '…' })]));
      }
    } } }, [el('h2', { text: t('num.title') }), works.length ? null : el('p', { cls: 'faint small', text: t('num.noBook') }),
      el('div', { cls: 'filters' }, [wsel, num, vol, el('button', { type: 'submit', cls: 'btn', 'data-act': 'num-go', text: t('num.go') })]), out]);
  }

  // ---------------------------------------------------------------- Mening kutubxonam
  async function viewInstalled() {
    clear();
    main.appendChild(el('h1', { text: t('my.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('my.lead') }));
    var pk = await Lib.packages();
    if (!pk.length) main.appendChild(emptyState(t('my.none'), t('home.lead'), '#/books', t('my.browse')));
    for (var p of pk) {
      var tt = titleOf(p.manifest);
      var isBase = p.kind === 'base_book';
      var pos = isBase ? await Notes.get('position:w:' + p.manifest.work_id) : null;
      var acts = el('div', { cls: 'acts' }, [
        pos ? link(t('my.continue'), '#/h/' + encodeURIComponent(pos.target), 'continue', 'sm primary', 'books') : null,
        p.kind === 'overlay' ? null : link(t('my.open'), '#/read/' + encodeURIComponent(p.package_id), 'read', 'sm', 'list'),
        btn(t('my.export'), 'export', (function (pp) { return async function () { download(pp.package_id + '-' + pp.version + '.hmz', await Lib.exportPackage(pp.package_id)); }; })(p), 'sm ghost', 'download'),
        p.previous ? btn(t('my.rollback', { v: p.previous.version }), 'rollback', (function (pp) { return async function () { var s = progressBox(pp.package_id); try { await Lib.rollback(pp.package_id, s.set); s.ok(); } catch (e) { s.fail(e.message); } route(); }; })(p), 'sm ghost') : null,
        btn(t('my.remove'), 'remove', (function (pp, name) { return async function () { if (confirm(t('confirm.remove', { name: name }))) { await Lib.uninstall(pp.package_id); toast(t('removed')); route(); } }; })(p, tt.ar || tt.other), 'sm ghost danger', 'trash')]);
      var ovInfo = null;
      if (p.kind === 'overlay') {
        var os = await Lib.overlayState(p.manifest.target.edition_id);
        ovInfo = el('p', { cls: 'small', 'data-act': 'overlay-state', 'data-state': os.state }, [
          pill(os.state === 'active' ? t('ov.applied') : os.state === 'mismatch' ? t('ov.mismatch') : t('ov.baseMissing'), os.state === 'active' ? 'ok' : 'warn'), ' ',
          t('ov.for', { book: await workTitle(p.manifest.work_id), v: 'v' + p.manifest.target.package_version }), ' · ', t('ov.local')]);
      }
      main.appendChild(el('div', { cls: 'lib-row', 'data-pkg': p.package_id }, [el('div', {}, [ovInfo,
        tt.ar ? el('div', { cls: 'ttl-ar', lang: 'ar', dir: 'rtl', text: tt.ar }) : el('b', { text: tt.other }),
        el('div', { cls: 'sub' }, [tt.ar ? tt.other + ' · ' : '', isBase ? t('my.mainBook') : p.kind === 'overlay' ? t('my.overlay') : t('my.commentary'), ' · ', idTxt('v' + p.version), ' · ', Lib.fmtBytes(p.bytes), ' · ',
          el('span', { cls: 'holat', 'data-status': p.offline_ready ? 'ready' : 'installed', text: p.offline_ready ? t('my.ready') : t('my.notReady') })]),
        el('details', { cls: 'disclose small' }, [el('summary', {}, [icon('chevR', 'chev'), t('my.licence')]), el('pre', { cls: 'code', text: (p.license || '') + '\n' + (p.attribution || '') }), el('p', {}, [idTxt('sha256: ' + p.sha256)])])]), acts]));
    }
    var est = await Lib.estimateFree();
    var persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    var notes = (await Notes.all()).filter(function (i) { return i.type !== 'position'; });
    main.appendChild(el('div', { cls: 'two section' }, [
      el('section', { cls: 'card' }, [el('h2', { text: t('my.import') }), el('p', { cls: 'small muted', text: t('my.importText') }),
        el('label', { cls: 'btn primary' }, [icon('upload'), t('my.importBtn'), el('input', { type: 'file', accept: '.hmz,.zip,application/zip', cls: 'yashirin', id: 'import-fayl', 'data-act': 'import-file',
          on: { change: async function (e) { var f = e.target.files[0]; if (!f) return; await doInstall(await f.arrayBuffer(), f.name); route(); } } })])]),
      el('section', { cls: 'card' }, [el('h2', { text: t('my.storage') }), est ? el('p', { cls: 'small', text: t('my.used', { used: Lib.fmtBytes(est.usage), free: Lib.fmtBytes(est.free) }) }) : null,
        el('p', { cls: 'small muted', text: persisted ? t('my.persisted') : t('my.notPersisted') }),
        persisted ? null : btn(t('my.persist'), 'persist', async function () { var ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; toast(ok ? t('my.granted') : t('my.denied')); route(); }, 'sm')]),
      el('section', { cls: 'card' }, [el('h2', { text: t('my.notes') }), el('p', { cls: 'small muted', text: t('my.notesText', { n: notes.length }) }), link(t('my.notes'), '#/notes', 'notes', 'sm', 'bookmark')])]));
  }
  async function viewNotes() {
    clear();
    main.appendChild(el('h1', { text: t('notes.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('notes.lead') }));
    var items = (await Notes.all()).filter(function (i) { return i.type !== 'position'; });
    if (!items.length) main.appendChild(el('div', { cls: 'card empty' }, [icon('bookmark'), el('p', { text: t('notes.none') })]));
    var list = el('div', { cls: 'hits' });
    for (var i of items) {
      var isOcc = /:o\d/.test(i.target);
      var u = isOcc ? null : await Lib.unit(i.target), pn = u ? primaryNum(u.numbers) : null;
      list.appendChild(el('a', { cls: 'hit', href: (isOcc ? '#/s/' : '#/h/') + encodeURIComponent(i.target) }, [
        el('div', { cls: 'hh' }, [pill(i.type === 'bookmark' ? t('notes.bookmark') : t('notes.note'), i.type === 'bookmark' ? 'accent' : ''),
          u ? arSpan(await workTitle(u.work_id)) : idTxt(i.target), pn ? pill(t('h.number', { n: pn.number_text })) : null]),
        i.label ? el('p', { cls: 'hx', lang: 'ar', dir: 'rtl', text: i.label }) : null, i.text ? el('p', { dir: 'auto', text: i.text }) : null]));
    }
    main.appendChild(list);
    main.appendChild(el('div', { cls: 'btns section' }, [
      btn(t('notes.export'), 'notes-export', async function () { download('hadith-library-notes-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([await Notes.exportJson()], { type: 'application/json' })); }, '', 'download'),
      el('label', { cls: 'btn' }, [icon('upload'), t('notes.import'), el('input', { type: 'file', accept: '.json,application/json', cls: 'yashirin', 'data-act': 'notes-import', on: { change: async function (e) {
        try { var n = await Notes.importJson(await e.target.files[0].text()); toast(t('notes.restored', { n: n })); route(); } catch (err) { toast(friendlyError(err.message).text, true); }
      } } })])]));
  }
  function viewHelp() {
    clear();
    main.appendChild(el('h1', { text: t('help.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('help.lead') }));
    main.appendChild(el('section', { cls: 'card' }, [el('h2', { text: t('help.start') }), el('ol', {}, t('help.steps').split('|').map(function (s) { return el('li', { text: s }); }))]));
    main.appendChild(el('section', { cls: 'section' }, [el('h2', { text: t('help.installApp') }), el('div', { cls: 'help-grid' }, [
      el('div', { cls: 'card platform' }, [icon('phone'), el('div', {}, [el('b', { text: 'iPhone / iPad' }), el('p', { cls: 'small muted', text: t('help.iphone') })])]),
      el('div', { cls: 'card platform' }, [icon('phone'), el('div', {}, [el('b', { text: 'Android' }), el('p', { cls: 'small muted', text: t('help.android') })])]),
      el('div', { cls: 'card platform' }, [icon('monitor'), el('div', {}, [el('b', { text: 'Windows · Mac · Linux' }), el('p', { cls: 'small muted', text: t('help.desktop') })])])])]));
    main.appendChild(el('div', { cls: 'help-grid section' }, [['help.offline', 'help.offlineText'], ['help.status', 'help.statusText'], ['help.narr', 'help.narrText'], ['help.files', 'help.filesText']].map(function (x) {
      return el('section', { cls: 'card' }, [el('h2', { text: t(x[0]) }), el('p', { cls: 'small muted', text: t(x[1]) })]);
    })));
    var langDir = I18N.lang() === 'ar' ? 'ar' : 'en';
    main.appendChild(el('section', { cls: 'card section' }, [el('h2', { text: t('help.more') }), el('div', { cls: 'btns' }, [
      el('a', { cls: 'btn sm', href: './' + langDir + '/', text: t('help.catalog') }), link(t('help.coverage'), '#/coverage', 'coverage', 'sm'), link(t('help.ai'), '#/ai', 'ai', 'sm ghost')])]));
  }
  async function viewCoverage() {
    clear();
    main.appendChild(el('h1', { text: t('cov.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('cov.text') }));
    // O'zbekcha tarjima qamrovi: har o'rnatilgan asosiy kitob bo'yicha (qoralama ≠ tekshirilgan; topilmagani ochiq)
    var trs = await Lib.ents('ov_tr');
    var tbody = el('tbody');
    for (var bp of (await Lib.packages()).filter(function (x) { return x.kind === 'base_book'; })) {
      var total = ((bp.manifest.coverage || {}).source_records) || 0;
      var draft = trs.filter(function (x) { return x.target_kind === 'unit' && x.target.indexOf(bp.manifest.edition_id + ':') === 0; }).length;
      tbody.appendChild(el('tr', { 'data-pkg': bp.package_id }, [el('td', {}, [arSpan(await workTitle(bp.manifest.work_id))]), el('td', { text: String(total) }), el('td', { text: String(draft) }), el('td', { text: '0' }), el('td', { text: String(total - draft) })]));
    }
    main.appendChild(el('section', { cls: 'card', 'data-act': 'translation-coverage' }, [el('h2', { text: t('cov.tr') }), el('div', { cls: 'table-wrap' }, [el('table', { cls: 'table' }, [
      el('thead', {}, [el('tr', {}, [t('cov.trBook'), t('cov.trUnits'), t('cov.trDraft'), t('cov.trReviewed'), t('cov.trMissing')].map(function (h) { return el('th', { text: h }); }))]), tbody])]),
      el('p', { cls: 'small muted', text: t('cov.trNote') })]));
    for (var p of await Lib.packages()) {
      var c = p.manifest.coverage || {}, den = (p.coverage || {}).denominator;
      var rows = Object.keys(c).filter(function (k) { return k !== 'kind'; }).map(function (k) {
        return el('tr', {}, [el('th', { text: k }), el('td', { dir: 'ltr', text: typeof c[k] === 'object' ? JSON.stringify(c[k]) : String(c[k]) })]);
      });
      var pct = den && den.verified && den.value && c.source_records != null ? t('cov.pct', { p: (100 * c.source_records / den.value).toFixed(1), d: den.value }) : t('cov.noPct');
      var tt = titleOf(p.manifest);
      // Xom manifest qamrovi texnik tafsilot sifatida yig'ilgan holda (ma'lumot yashirilmaydi, ochib ko'rish mumkin)
      main.appendChild(el('section', { cls: 'card' }, [el('h2', {}, [tt.ar ? arSpan(tt.ar) : tt.other]), el('p', { cls: 'small muted' }, [c.source_records != null ? t('cov.trUnits') + ': ' + c.source_records + ' · ' : '', pct]),
        el('details', { cls: 'disclose' }, [el('summary', {}, [icon('chevR', 'chev'), t('ev.tech')]), el('div', { cls: 'table-wrap' }, [el('table', { cls: 'table' }, rows)])])]));
    }
  }
  function viewAi() {
    clear();
    main.appendChild(el('h1', { text: t('ai.title') }));
    main.appendChild(el('p', { cls: 'muted', text: t('ai.text') }));
    var cfg = JSON.stringify({ mcpServers: { 'hadis-manba': { command: 'hadis-manba', args: ['mcp'] } } }, null, 2);
    main.appendChild(el('section', { cls: 'card' }, [el('h2', { text: t('ai.config') }), el('pre', { cls: 'code', text: cfg }), btn(t('ai.copy'), 'copy-mcp', function () { copy(cfg); }, 'sm', 'copy')]));
    main.appendChild(el('section', { cls: 'card' }, [el('h2', { text: t('ai.noMcp') }), el('p', { cls: 'muted', text: t('ai.noMcpText') })]));
  }

  // ---------------------------------------------------------------- qobiq: nav, til, mavzu, marshrut
  var NAV = [['#/', 'nav.home', 'nav-home', 'home', ''], ['#/books', 'nav.books', 'nav-books', 'books', 'books'], ['#/search', 'nav.search', 'nav-search', 'search', 'search'],
    ['#/installed', 'nav.installed', 'nav-installed', 'library', 'installed'], ['#/help', 'nav.help', 'nav-help', 'help', 'help']];
  function renderShell() {
    document.title = t('app.name') + (I18N.lang() === 'ar' ? '' : ' | مكتبة الحديث');
    document.documentElement.setAttribute('data-lang', I18N.lang());
    $('otish').textContent = t('skip');
    $('brand-name').textContent = t('app.name');
    $('brand-ar').textContent = I18N.lang() === 'ar' ? 'Hadith Library' : 'مكتبة الحديث';
    $('brand-ar').setAttribute('lang', I18N.lang() === 'ar' ? 'en' : 'ar');
    $('brand-ar').setAttribute('dir', I18N.lang() === 'ar' ? 'ltr' : 'rtl');
    $('yangilash').textContent = t('update.available');
    $('futer').textContent = t('footer');
    var nav = $('nav'), tab = $('tabbar'); nav.textContent = ''; tab.textContent = '';
    NAV.forEach(function (x) {
      nav.appendChild(el('a', { href: x[0], 'data-act': x[2], 'data-sec': x[4] }, [t(x[1])]));
      tab.appendChild(el('a', { href: x[0], 'data-act': 'tab-' + x[2], 'data-sec': x[4] }, [icon(x[3]), el('span', { text: t(x[1]) })]));
    });
    var sel = $('til'); sel.textContent = '';
    I18N.langs.forEach(function (l) { sel.appendChild(el('option', { value: l, lang: l, text: I18N.names[l] })); });
    sel.value = I18N.lang();
    sel.setAttribute('aria-label', t('nav.lang'));
    renderThemeBtn();
    netState();
  }
  function netState() { var b = $('tarmoq'); b.textContent = navigator.onLine ? '' : t('offline.banner'); b.classList.toggle('yashirin', navigator.onLine); }
  var SECTION = { '': '', books: 'books', w: 'books', read: 'books', kitob: 'books', h: 'books', s: 'books', c: 'books', r: 'books', n: 'books', desk: 'books', search: 'search', installed: 'installed', paketlar: 'installed', notes: 'installed', qaydlar: 'installed', help: 'help', coverage: 'help', qamrov: 'help', ai: 'help' };
  // Marshrutlar ketma-ket: bir vaqtda ikkita render bo'lmaydi (aks holda umumiy `main` aralashadi).
  var routing = false, routePending = false;
  // Har tarix yozuviga kalit (history.state.k): Back/Forward/reload'da shu yozuvning scrolli tiklanadi;
  // yangi yozuvda esa ko'rinish o'z nishoniga (bob/hadis) o'tadi. Tarix yozuvi qayerdan kelgani: state.fromHash.
  var afterRender = null, restoring = false, lastKey = null, lastHash = null, navSeq = 0;
  var SCROLL_KEY = 'hadith-library.scroll';
  function scrollMem() { try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}'); } catch (e) { return {}; } }
  var skipSave = false;
  // Shu tarix yozuvining o'zini almashtirish (sahifa/guruh/filtr): Back baribir oldingi ekranga qaytadi.
  function replaceRoute(hash, keepScroll) {
    history.replaceState(history.state, '', hash);
    if (!keepScroll) { var m = scrollMem(); delete m[lastKey]; try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m)); } catch (e) { /* */ } skipSave = true; }
    route();
  }
  function saveScroll(k, y) { if (!k) return; var m = scrollMem(); m[k] = y; var ks = Object.keys(m); if (ks.length > 80) delete m[ks[0]]; try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(m)); } catch (e) { /* xususiy rejim */ } }
  async function route() {
    if (routing) { routePending = true; return; }
    routing = true;
    try { await routeOnce(); } finally { routing = false; }
    if (routePending) { routePending = false; return route(); }
  }
  async function routeOnce() {
    var my = ++routeSeq;
    root.removeAttribute('data-tayyor');
    pageBook(null);
    if (lastKey && !skipSave) saveScroll(lastKey, window.scrollY);
    skipSave = false;
    if (spyOff) spyOff();
    closeSheet();
    document.body.classList.remove('no-scroll');
    var st0 = history.state || {};
    var key = st0.k;
    restoring = !!(key && scrollMem()[key] != null);
    if (!key) {
      key = 'k' + Date.now().toString(36) + '-' + (++navSeq);
      history.replaceState(Object.assign({}, st0, { k: key, fromHash: lastHash }), '', location.href);
    }
    lastKey = key; lastHash = location.hash || '#/';
    afterRender = null;
    main = el('div');
    var h = location.hash || '#/';
    var qi = h.indexOf('?'), params = {};
    if (qi >= 0) { new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { params[k] = v; }); h = h.slice(0, qi); }
    var parts = h.slice(2).split('/');
    var sec = SECTION[parts[0]] != null ? SECTION[parts[0]] : '';
    document.querySelectorAll('#nav a, #tabbar a').forEach(function (a) { if (a.getAttribute('data-sec') === sec) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    try {
      if (parts[0] === 'h') await viewUnit(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 'c') await viewContents(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 'r') await viewReader(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 'n') await viewNarrator(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 'desk') await viewDesk(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 's') await viewOcc(decodeURIComponent(parts.slice(1).join('/')), params.from);
      else if (parts[0] === 'w') await viewWork(decodeURIComponent(parts.slice(1).join('/')), params);
      else if (parts[0] === 'read' || parts[0] === 'kitob') {
        var rp = await Lib.getPackage(decodeURIComponent(parts[1]));
        if (rp && rp.kind === 'base_book') await viewContents(rp.package_id, { k: params.c || '0' });
        else await viewRead(decodeURIComponent(parts[1]), params);
      }
      else if (parts[0] === 'books') await viewBooks(params);
      else if (parts[0] === 'search') await viewSearch(params);
      else if (parts[0] === 'installed' || parts[0] === 'paketlar') await viewInstalled();
      else if (parts[0] === 'coverage' || parts[0] === 'qamrov') await viewCoverage();
      else if (parts[0] === 'notes' || parts[0] === 'qaydlar') await viewNotes();
      else if (parts[0] === 'help') viewHelp();
      else if (parts[0] === 'ai') viewAi();
      else await viewHome();
    } catch (e) {
      clear();
      main.appendChild(el('div', { cls: 'card note bad' }, [el('h1', { text: t('error') }), el('p', { text: String(e && e.message || e) })]));
    }
    if (my !== routeSeq) return;  // eskirgan render — yangisi allaqachon chizilmoqda
    root.textContent = '';
    while (main.firstChild) root.appendChild(main.firstChild);
    main = root;
    root.setAttribute('data-route', parts[0] || 'home');
    root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter');
    if (restoring) window.scrollTo(0, scrollMem()[key] || 0);
    else if (!afterRender) window.scrollTo(0, 0);
    if (afterRender) { try { afterRender(); } catch (e) { /* ko'rinish ishlayveradi */ } }
    root.setAttribute('data-tayyor', '1');
    root.focus({ preventScroll: true });
  }
  async function start() {
    try { await Lib.cleanup(); } catch (e) { /* birinchi ochilish */ }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('pagehide', function () { saveScroll(lastKey, window.scrollY); });
    applyRprefs(rprefs());
    await loadCatalog();
    renderShell();
    $('til').addEventListener('change', function (e) { I18N.set(e.target.value); renderShell(); route(); });
    $('tema').addEventListener('click', function () { var v = theme(); setTheme(v === 'auto' ? 'light' : v === 'light' ? 'dark' : 'auto'); });
    window.addEventListener('hashchange', route);
    window.addEventListener('online', netState);
    window.addEventListener('offline', netState);
    await route();
    document.documentElement.setAttribute('data-tayyor', '1');
    addMissingLayers();
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      if (!reg) return;
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            var b = $('yangilash'); b.classList.remove('yashirin'); b.onclick = function () { nw.postMessage('yangila'); };
          }
        });
      });
    });
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    // yangi versiya o'zi faollashadi (sw.js skipWaiting) — sahifa qayta yuklanadi, o'rnatish ketayotgan bo'lsa tugagach
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      reloaded = true;
      (function wait() { if (installing) setTimeout(wait, 500); else location.reload(); })();
    });
  }
  window.HadisApp = { route: route, seq: function () { return routeSeq; } };
  start();
})();

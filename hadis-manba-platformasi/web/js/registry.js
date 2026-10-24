// Kitoblar registri: barcha ekranlarda bir xil ilmiy tur guruhi, guruh ichidagi tartib va barqaror kitob rangi.
// Guruhlash tahririy katalog tartibi (to'plam turi bo'yicha) — sahihlik reytingi emas (i18n: grp.note).
// Rang faqat kitob identifikatsiyasi uchun; roviy/matn rollari bu ranglardan foydalanmaydi.
(function (root) {
  'use strict';
  var GROUPS = [
    ['sahihayn', ['w-bukhari', 'w-muslim']],
    ['sunan', ['w-abudawud', 'w-tirmidhi', 'w-nasai', 'w-ibnmajah', 'w-darimi']],
    ['muwatta', ['w-malik']],
    ['musnad', ['w-ahmed']],
    ['selected', ['w-mishkat-almasabih', 'w-riyad-assalihin', 'w-bulugh-almaram', 'w-aladab-almufrad', 'w-shamail-muhammadiyah']],
    ['arbain', ['w-nawawi40', 'w-qudsi40', 'w-shahwaliullah40']]
  ];
  var ACCENT = {
    'w-bukhari': '#247D73', 'w-muslim': '#396AC3', 'w-abudawud': '#9B5925', 'w-tirmidhi': '#9F4268', 'w-nasai': '#7050A0',
    'w-ibnmajah': '#B04538', 'w-darimi': '#8A721F', 'w-malik': '#47773F', 'w-ahmed': '#7B5844', 'w-mishkat-almasabih': '#5963B0',
    'w-riyad-assalihin': '#3A7E51', 'w-bulugh-almaram': '#996828', 'w-aladab-almufrad': '#9B527F', 'w-shamail-muhammadiyah': '#387F91',
    'w-nawawi40': '#8265A6', 'w-qudsi40': '#617377', 'w-shahwaliullah40': '#727D33'
  };
  var ABBR = {
    'w-bukhari': 'خ', 'w-muslim': 'م', 'w-abudawud': 'د', 'w-tirmidhi': 'ت', 'w-nasai': 'ن', 'w-ibnmajah': 'ه', 'w-darimi': 'مي',
    'w-malik': 'ط', 'w-ahmed': 'حم', 'w-mishkat-almasabih': 'مش', 'w-riyad-assalihin': 'ر', 'w-bulugh-almaram': 'بل',
    'w-aladab-almufrad': 'أد', 'w-shamail-muhammadiyah': 'شم', 'w-nawawi40': '٤٠', 'w-qudsi40': 'ق٤٠', 'w-shahwaliullah40': 'و٤٠'
  };
  var pos = {};
  GROUPS.forEach(function (g, gi) { g[1].forEach(function (w, wi) { pos[w] = { group: g[0], gi: gi, wi: wi }; }); });

  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(c) { return '#' + c.map(function (x) { return ('0' + Math.round(x).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, f) { var x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map(function (v, i) { return v + (y[i] - v) * f; })); }
  // Qorong'i fonda o'qilishi uchun och variant (kontrast tests/web/core.node.test.js da tekshiriladi).
  function color(workId, dark) {
    var c = ACCENT[workId] || '#5f6b66';
    return dark ? mix(c, '#ffffff', 0.42) : c;
  }
  function groupOf(workId) { return (pos[workId] || { group: 'other' }).group; }
  function sortKey(workId) { var p = pos[workId]; return p ? p.gi * 100 + p.wi : 9999; }
  function sortWorks(ids) { return ids.slice().sort(function (a, b) { return sortKey(a) - sortKey(b) || (a < b ? -1 : 1); }); }
  var api = { GROUPS: GROUPS, ACCENT: ACCENT, color: color, groupOf: groupOf, sortKey: sortKey, sortWorks: sortWorks,
    abbr: function (w) { return ABBR[w] || ''; }, groupIds: GROUPS.map(function (g) { return g[0]; }).concat(['other']) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Registry = api;
})(typeof self !== 'undefined' ? self : this);

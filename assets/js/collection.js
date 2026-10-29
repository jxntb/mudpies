/* MudPies — The Collection: series filters and section drawings. */
(function () {
  'use strict';

  /* Filters ----------------------------------------------------------------- */
  var bar = document.querySelector('[data-filters]');
  var rows = Array.prototype.slice.call(document.querySelectorAll('.cat-table tbody tr[data-piece]'));
  var dossiers = Array.prototype.slice.call(document.querySelectorAll('.dossier[data-piece]'));
  var count = document.querySelector('[data-filter-count]');
  var empty = document.querySelector('[data-empty]');
  var includeReturned = document.querySelector('[data-include-returned]');
  var buttons = bar ? Array.prototype.slice.call(bar.querySelectorAll('[data-series]')) : [];
  var series = 'all';

  function matches(el) {
    var okSeries = series === 'all' || el.getAttribute('data-series') === series;
    var okStatus = includeReturned.checked || el.getAttribute('data-status') !== 'returned';
    return okSeries && okStatus;
  }

  function apply() {
    var shown = 0;
    rows.forEach(function (row) {
      var ok = matches(row);
      row.classList.toggle('is-filtered', !ok);
      if (ok) shown++;
    });
    dossiers.forEach(function (d) { d.classList.toggle('is-filtered', !matches(d)); });
    count.textContent = 'Showing ' + shown + ' of ' + rows.length + ' pieces';
    empty.hidden = shown !== 0;
  }

  if (bar && includeReturned) {
    bar.hidden = false;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        series = btn.getAttribute('data-series');
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        apply();
      });
    });
    includeReturned.addEventListener('change', apply);

    /* Arriving at a filtered-out entry by link should still show it. */
    var reveal = function () {
      var id = window.location.hash.slice(1);
      var target = id && document.getElementById(id);
      if (target && target.classList.contains('is-filtered')) {
        series = 'all';
        includeReturned.checked = true;
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-series') === 'all')); });
        apply();
        target.scrollIntoView();
      }
    };
    window.addEventListener('hashchange', reveal);
  }

  /* Section drawings -----------------------------------------------------------
     Each entry carries its measurements as data attributes; we draw a
     cross-section at a constant 1:5-ish scale so pieces can be compared. */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var K = 11.5;          // pixels per centimetre
  var CX = 260;          // centre line
  var BASE = 118;        // table line

  function profile(d, h, dome, lip, broken) {
    var R = d / 2 * K;
    var H = h * K;
    var top = BASE - H;
    var domeH = dome * H * 0.35;
    var lipH = lip ? Math.min(0.75 * K, H * 0.3) : 0;
    var lipW = lip ? 1.4 * K : 0;
    var jag = function (x, y, dir) {
      // a broken edge: short irregular steps down the wall
      var pts = [];
      for (var i = 1; i <= 5; i++) {
        var t = i / 6;
        pts.push((x + dir * (i % 2 ? 3.5 : -2.5)).toFixed(1) + ' ' + (y + (BASE - y) * t).toFixed(1));
      }
      return pts.join(' L ');
    };
    var left = CX - R;
    var right = CX + R;
    var p = 'M ' + left.toFixed(1) + ' ' + BASE;
    if (broken) p += ' L ' + jag(left, top, 1).split(' L ').reverse().join(' L ');
    p += ' L ' + left.toFixed(1) + ' ' + (top + 4).toFixed(1);
    if (lip) {
      p += ' Q ' + left.toFixed(1) + ' ' + (top - lipH).toFixed(1) + ' ' + (left + lipW * 0.55).toFixed(1) + ' ' + (top - lipH).toFixed(1);
      p += ' Q ' + (left + lipW).toFixed(1) + ' ' + (top - lipH).toFixed(1) + ' ' + (left + lipW).toFixed(1) + ' ' + top.toFixed(1);
    } else {
      p += ' Q ' + left.toFixed(1) + ' ' + top.toFixed(1) + ' ' + (left + 6).toFixed(1) + ' ' + top.toFixed(1);
    }
    p += ' Q ' + CX + ' ' + (top - domeH * 2).toFixed(1) + ' ' + (right - (lip ? lipW : 6)).toFixed(1) + ' ' + top.toFixed(1);
    if (lip) {
      p += ' Q ' + (right - lipW).toFixed(1) + ' ' + (top - lipH).toFixed(1) + ' ' + (right - lipW * 0.45).toFixed(1) + ' ' + (top - lipH).toFixed(1);
      p += ' Q ' + right.toFixed(1) + ' ' + (top - lipH).toFixed(1) + ' ' + right.toFixed(1) + ' ' + (top + 4).toFixed(1);
    } else {
      p += ' Q ' + right.toFixed(1) + ' ' + top.toFixed(1) + ' ' + right.toFixed(1) + ' ' + (top + 4).toFixed(1);
    }
    if (broken) p += ' L ' + jag(right, top, -1);
    p += ' L ' + right.toFixed(1) + ' ' + BASE + ' Z';
    return { path: p, R: R, H: H, top: top, lipH: lipH, domeH: domeH };
  }

  function el(name, attrs, text) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
  }

  function draw(host, index) {
    var d = parseFloat(host.getAttribute('data-d'));
    var h = parseFloat(host.getAttribute('data-h'));
    var dome = parseFloat(host.getAttribute('data-dome') || '0');
    var lip = host.getAttribute('data-lip') === 'rolled';
    var broken = host.getAttribute('data-broken') === 'true';
    var fissure = host.getAttribute('data-fissure') === 'true';
    var incomplete = host.getAttribute('data-incomplete') === 'true';
    var shape = profile(d, h, dome, lip, broken);
    var id = 'hatch-' + index;

    var svg = el('svg', { viewBox: '0 0 520 168', focusable: 'false' });
    var defs = el('defs', {});
    var pattern = el('pattern', { id: id, width: '6', height: '6', patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.appendChild(el('line', { x1: '0', y1: '0', x2: '0', y2: '6', stroke: 'currentColor', 'stroke-width': '1', opacity: '0.45' }));
    defs.appendChild(pattern);
    var clip = el('clipPath', { id: id + '-half' });
    clip.appendChild(el('rect', { x: '0', y: '0', width: String(CX), height: '168' }));
    defs.appendChild(clip);
    svg.appendChild(defs);

    var g = el('g', { fill: 'none', stroke: 'currentColor', 'stroke-width': '1' });
    if (incomplete) {
      g.appendChild(el('path', { d: shape.path, fill: 'url(#' + id + ')', 'clip-path': 'url(#' + id + '-half)' }));
      g.appendChild(el('path', { d: shape.path, 'stroke-dasharray': '3 4', opacity: '0.55' }));
      g.appendChild(el('path', { d: shape.path, 'clip-path': 'url(#' + id + '-half)', 'stroke-width': '1.3' }));
    } else {
      g.appendChild(el('path', { d: shape.path, fill: 'url(#' + id + ')', 'stroke-width': '1.3' }));
    }
    if (fissure) {
      var fx = CX - shape.R * 0.18;
      var fy = shape.top - shape.domeH * 0.8;
      g.appendChild(el('path', {
        d: 'M ' + (fx - 5) + ' ' + fy + ' L ' + (fx - 1) + ' ' + (fy + shape.H * 0.42) + ' L ' + (fx + 1.5) + ' ' + (fy + shape.H * 0.62) +
          ' L ' + (fx + 3) + ' ' + (fy + shape.H * 0.4) + ' L ' + (fx + 6) + ' ' + fy,
        fill: 'var(--bg)', 'stroke-width': '1.1'
      }));
    }
    // table line, centre line
    g.appendChild(el('line', { x1: '30', y1: String(BASE), x2: '490', y2: String(BASE), opacity: '0.35' }));
    g.appendChild(el('line', { x1: String(CX), y1: String(shape.top - shape.lipH - 18), x2: String(CX), y2: String(BASE + 8), 'stroke-dasharray': '8 3 2 3', opacity: '0.35' }));
    // diameter dimension
    var dy = BASE + 22;
    var l = CX - shape.R;
    var r = CX + shape.R;
    g.appendChild(el('line', { x1: String(l), y1: String(dy), x2: String(r), y2: String(dy) }));
    g.appendChild(el('line', { x1: String(l), y1: String(BASE + 5), x2: String(l), y2: String(dy + 5), opacity: '0.6' }));
    g.appendChild(el('line', { x1: String(r), y1: String(BASE + 5), x2: String(r), y2: String(dy + 5), opacity: '0.6' }));
    g.appendChild(el('path', { d: 'M ' + (l + 4) + ' ' + (dy - 4) + ' L ' + (l - 4) + ' ' + (dy + 4) + ' M ' + (r + 4) + ' ' + (dy - 4) + ' L ' + (r - 4) + ' ' + (dy + 4) }));
    // height dimension
    var hx = r + 26;
    var topY = shape.top - shape.lipH;
    g.appendChild(el('line', { x1: String(hx), y1: String(topY), x2: String(hx), y2: String(BASE) }));
    g.appendChild(el('line', { x1: String(r + 6), y1: String(topY), x2: String(hx + 5), y2: String(topY), opacity: '0.6' }));
    g.appendChild(el('path', { d: 'M ' + (hx - 4) + ' ' + (topY + 4) + ' L ' + (hx + 4) + ' ' + (topY - 4) + ' M ' + (hx - 4) + ' ' + (BASE + 4) + ' L ' + (hx + 4) + ' ' + (BASE - 4) }));
    svg.appendChild(g);

    svg.appendChild(el('text', { x: String(CX), y: String(dy + 18), 'text-anchor': 'middle' }, 'Ø ' + Math.round(d * 10)));
    svg.appendChild(el('text', { x: String(hx + 10), y: String((topY + BASE) / 2 + 4) }, 'H ' + Math.round(h * 10)));
    svg.appendChild(el('text', { x: '30', y: '14' }, incomplete ? 'Section A–A · incomplete, as is the piece' : 'Section A–A · mm'));
    host.appendChild(svg);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-section]'), draw);
})();

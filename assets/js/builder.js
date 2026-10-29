/* MudPies — the atelier (Build Your Own).

   A small, dependency-free renderer draws the configured piece on a canvas:
   - each earth is a procedurally generated, tileable texture (value noise +
     grains), so nothing taints the canvas and "Save image" works anywhere;
   - the surface finish, weathering, edge and inclusions are painted into a
     plan-view texture whenever the configuration changes;
   - every frame projects that plan onto a turntable view: a shaded wall, a
     domed top built from thin terraces, a lip, and a fixed studio light.

   Kept from Version 1: the shape / size / surface / inclusion model, drag to
   turn, auto-spin, surprise, reset, save as image, local persistence. */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-canvas]');
  var form = document.querySelector('[data-controls]');
  if (!canvas || !form || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Catalogue ---------------------------------------------------------------- */
  var EARTHS = {
    e01: { code: 'E-01', name: 'Hollow Loam', word: 'the Hollow', density: 1.3, tones: ['#2b1b11', '#4a3020', '#73523b'], contrast: 1.45, grain: { count: 1500, size: [0.5, 1.8], light: '#9a7b5e', dark: '#140c07' }, flakes: { count: 16, color: '#6e4b2c', size: [6, 13] } },
    e02: { code: 'E-02', name: 'Understorey', word: 'Understorey', density: 1.26, tones: ['#2a190f', '#432a1b', '#664632'], contrast: 1.2, grain: { count: 2400, size: [0.4, 1.2], light: '#80614a', dark: '#160d07' }, flakes: { count: 4, color: '#7d5634', size: [8, 15] } },
    e03: { code: 'E-03', name: 'Deep Umber', word: 'Umber', density: 1.55, tones: ['#1f120b', '#3a2418', '#5f3f2b'], contrast: 1.7, grain: { count: 800, size: [1.2, 3.6], light: '#74513b', dark: '#110905' } },
    e04: { code: 'E-04', name: 'Scree Red', word: 'Scree', density: 1.72, tones: ['#4a2416', '#7c412a', '#a96b4e'], contrast: 1.35, grain: { count: 460, size: [2, 5.2], light: '#cf9a7b', dark: '#2e140b', angular: true } },
    e05: { code: 'E-05', name: 'Valley Red', word: 'the Red Country', density: 1.6, tones: ['#8a3c20', '#b25c35', '#d3875b'], contrast: 0.9, grain: { count: 3000, size: [0.3, 1], light: '#eaa97f', dark: '#6e2f17' } },
    e06: { code: 'E-06', name: 'Pale Ochre', word: 'Ochre', density: 1.48, tones: ['#9a7452', '#c29b77', '#e2c7a6'], contrast: 0.95, grain: { count: 2600, size: [0.4, 1.5], light: '#f3e1ca', dark: '#7f5b3c' } },
    e07: { code: 'E-07', name: 'Husk', word: 'Husk', density: 1.16, tones: ['#25170f', '#45291c', '#6e4a36'], contrast: 1.55, grain: { count: 280, size: [2, 6], light: '#8b654e', dark: '#120905' }, flakes: { count: 42, color: '#5c3925', size: [8, 17] } },
    e08: { code: 'E-08', name: 'Brick Clay', word: 'Brick', density: 1.82, tones: ['#83381d', '#ab5330', '#cd7a52'], contrast: 1.1, grain: { count: 1000, size: [0.8, 2.6], light: '#e3986e', dark: '#5f240f' } },
    e09: { code: 'E-09', name: 'Cave Floor', word: 'the Third Chamber', density: 1.66, tones: ['#382a21', '#5b4b3f', '#857568'], contrast: 1.25, grain: { count: 1700, size: [0.5, 2.8], light: '#a99b90', dark: '#1d140e' } }
  };
  var FORMS = { round: 'Round', oval: 'Oval', fluted: 'Fluted', cushion: 'Cushion', pebble: 'Pebble', tiered: 'Tiered' };
  var EDGES = { soft: 'Soft', rolled: 'Rolled lip', crimped: 'Thumb-crimped', broken: 'Broken' };
  var SURFACES = { raw: 'Raw', burnished: 'Burnished', raked: 'Raked spiral', speckled: 'Mica-flecked' };
  var WEATHERING = { intact: 'Intact', hairline: 'Hairline', cracked: 'Sun-cracked', fissure: 'Fissure' };
  var INCLUSIONS = { leaf: 'Dried leaf', twig: 'Twig', pebbles: 'River pebbles', flower: 'Pressed flower', seeds: 'Seed scatter', mica: 'Mica seam', thumb: 'Maker’s thumbprint' };
  var INCLUSION_MASS = { leaf: 1, twig: 3, pebbles: 46, flower: 1, seeds: 2, mica: 4, thumb: 0 };
  var NUMBER_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

  var DEFAULTS = { earth: 'e06', form: 'round', diameter: 26, height: 5, dome: 30, edge: 'soft', surface: 'raked', weathering: 'intact', inclusions: ['leaf'], name: '' };

  // Starting points taken from the catalogue (collection.html → "Commission a sibling").
  var PRESETS = {
    '007': { ref: 'No. 007, Fault Line', earth: 'e06', form: 'round', diameter: 27, height: 6, dome: 18, edge: 'soft', surface: 'raked', weathering: 'fissure', inclusions: [] },
    '011': { ref: 'No. 011, Meridian', earth: 'e09', form: 'round', diameter: 29, height: 5, dome: 0, edge: 'rolled', surface: 'raw', weathering: 'hairline', inclusions: [] },
    '014': { ref: 'No. 014, Old Weather', earth: 'e01', form: 'pebble', diameter: 31, height: 4, dome: 12, edge: 'broken', surface: 'speckled', weathering: 'intact', inclusions: [] },
    '019': { ref: 'No. 019, Noon', earth: 'e06', form: 'round', diameter: 28, height: 5, dome: 6, edge: 'rolled', surface: 'raked', weathering: 'hairline', inclusions: [] },
    '023': { ref: 'No. 023, Nocturne', earth: 'e03', form: 'round', diameter: 26, height: 6, dome: 0, edge: 'rolled', surface: 'burnished', weathering: 'intact', inclusions: [] },
    '026': { ref: 'No. 026, Salt Margin', earth: 'e06', form: 'round', diameter: 33, height: 5, dome: 0, edge: 'rolled', surface: 'raked', weathering: 'cracked', inclusions: [] },
    '031': { ref: 'No. 031, Low Tide', earth: 'e09', form: 'round', diameter: 30, height: 4, dome: 6, edge: 'broken', surface: 'raw', weathering: 'cracked', inclusions: [] }
  };
  var STORAGE_KEY = 'mudpies.atelier.v2';

  /* Small utilities ------------------------------------------------------------ */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function angDiff(a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function grams(n) { return Math.round(n / 10) * 10; }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function signature(cfg) {
    return [cfg.earth, cfg.form, cfg.diameter, cfg.height, cfg.dome, cfg.edge, cfg.surface, cfg.weathering, cfg.inclusions.slice().sort().join('+')].join('|');
  }

  /* Earth textures: seamless tiles, generated once per earth -------------------- */
  var TILE = 320;
  var tiles = {};
  function earthTile(key) {
    if (tiles[key]) return tiles[key];
    var e = EARTHS[key];
    var c = document.createElement('canvas');
    c.width = c.height = TILE;
    var g = c.getContext('2d');
    var rand = rng(hash(key + ':tile'));
    var img = g.createImageData(TILE, TILE);
    var data = img.data;
    var octaves = [{ L: 5, a: 0.46 }, { L: 10, a: 0.26 }, { L: 20, a: 0.16 }, { L: 64, a: 0.12 }];
    octaves.forEach(function (o) {
      o.v = new Float32Array(o.L * o.L);
      for (var i = 0; i < o.v.length; i++) o.v[i] = rand();
    });
    var c0 = rgb(e.tones[0]), c1 = rgb(e.tones[1]), c2 = rgb(e.tones[2]);
    for (var y = 0; y < TILE; y++) {
      for (var x = 0; x < TILE; x++) {
        var v = 0;
        for (var k = 0; k < octaves.length; k++) {
          var o = octaves[k];
          var fx = x / TILE * o.L, fy = y / TILE * o.L;
          var ix = Math.floor(fx), iy = Math.floor(fy);
          var tx = fx - ix, ty = fy - iy;
          tx = tx * tx * (3 - 2 * tx);
          ty = ty * ty * (3 - 2 * ty);
          var x0 = ix % o.L, x1 = (ix + 1) % o.L, y0 = iy % o.L, y1 = (iy + 1) % o.L;
          var top = o.v[y0 * o.L + x0] + (o.v[y0 * o.L + x1] - o.v[y0 * o.L + x0]) * tx;
          var bot = o.v[y1 * o.L + x0] + (o.v[y1 * o.L + x1] - o.v[y1 * o.L + x0]) * tx;
          v += o.a * (top + (bot - top) * ty);
        }
        v = clamp((v - 0.5) * e.contrast + 0.5 + (rand() - 0.5) * 0.12, 0, 1);
        var col = v < 0.5 ? mix(c0, c1, v * 2) : mix(c1, c2, (v - 0.5) * 2);
        var p = (y * TILE + x) * 4;
        data[p] = col[0]; data[p + 1] = col[1]; data[p + 2] = col[2]; data[p + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // Grains and fragments, drawn with wrap-around copies so the tile stays seamless.
    function wrapped(x, y, r, draw) {
      for (var ox = -1; ox <= 1; ox++) {
        for (var oy = -1; oy <= 1; oy++) {
          var px = x + ox * TILE, py = y + oy * TILE;
          if (px + r < 0 || px - r > TILE || py + r < 0 || py - r > TILE) continue;
          draw(px, py);
        }
      }
    }
    var gs = e.grain, light = rgb(gs.light), dark = rgb(gs.dark);
    for (var n = 0; n < gs.count; n++) {
      var gx = rand() * TILE, gy = rand() * TILE;
      var r = gs.size[0] + rand() * (gs.size[1] - gs.size[0]);
      var isLight = rand() < 0.5;
      var alpha = isLight ? 0.3 + rand() * 0.4 : 0.3 + rand() * 0.45;
      var rot = rand() * Math.PI, squash = 0.55 + rand() * 0.45;
      var sides = 4 + Math.floor(rand() * 3), jag = [];
      for (var s = 0; s < sides; s++) jag.push(0.65 + rand() * 0.5);
      g.fillStyle = rgba(isLight ? light : dark, alpha.toFixed(2));
      wrapped(gx, gy, r, function (px, py) {
        g.beginPath();
        if (gs.angular) {
          for (var s2 = 0; s2 < sides; s2++) {
            var a = rot + s2 / sides * Math.PI * 2;
            g.lineTo(px + Math.cos(a) * r * jag[s2], py + Math.sin(a) * r * jag[s2] * squash);
          }
          g.closePath();
        } else {
          g.ellipse(px, py, r, r * squash, rot, 0, Math.PI * 2);
        }
        g.fill();
      });
      if (gs.angular && isLight) {
        g.strokeStyle = 'rgba(255,230,210,0.18)';
        g.lineWidth = 0.6;
      }
    }
    if (e.flakes) {
      var fc = rgb(e.flakes.color);
      for (var f = 0; f < e.flakes.count; f++) {
        var fx2 = rand() * TILE, fy2 = rand() * TILE;
        var len = e.flakes.size[0] + rand() * (e.flakes.size[1] - e.flakes.size[0]);
        var ang = rand() * Math.PI, wid = len * (0.25 + rand() * 0.2), bend = (rand() - 0.5) * 0.6;
        var tone = mix(fc, [255, 236, 210], rand() * 0.18);
        wrapped(fx2, fy2, len, function (px, py) {
          g.save();
          g.translate(px, py);
          g.rotate(ang);
          g.beginPath();
          g.moveTo(-len / 2, 0);
          g.quadraticCurveTo(0, -wid + bend * wid, len / 2, 0);
          g.quadraticCurveTo(0, wid * 0.6 + bend * wid, -len / 2, 0);
          g.fillStyle = 'rgba(0,0,0,0.28)';
          g.translate(0.8, 1);
          g.fill();
          g.translate(-0.8, -1);
          g.fillStyle = rgba(tone, 0.85);
          g.fill();
          g.strokeStyle = 'rgba(255,235,210,0.16)';
          g.lineWidth = 0.6;
          g.stroke();
          g.restore();
        });
      }
    }
    tiles[key] = c;
    return c;
  }

  /* Geometry ------------------------------------------------------------------ */
  var OUTLINE_STEPS = 220;
  var FISSURE_ANGLE = -2.05;
  var BROKEN_NOTCHES = [[0.35, 0.06, 0.14], [1.62, 0.045, 0.1], [2.85, 0.07, 0.18], [4.05, 0.035, 0.09], [5.2, 0.055, 0.12]];

  function radiusAt(cfg, a, R) {
    var r;
    switch (cfg.form) {
      case 'oval': r = R / Math.sqrt(Math.pow(Math.cos(a), 2) + Math.pow(Math.sin(a) / 0.72, 2)); break;
      case 'fluted': r = R * (0.968 + 0.032 * Math.cos(a * 22)); break;
      case 'cushion':
        var n = 3.4;
        r = R * 0.88 * Math.pow(Math.pow(Math.abs(Math.cos(a)), n) + Math.pow(Math.abs(Math.sin(a)), n), -1 / n);
        break;
      case 'pebble': r = R * (1 + 0.07 * Math.sin(2 * a + 1.1) + 0.045 * Math.sin(3 * a + 0.3) + 0.02 * Math.sin(5 * a + 2.2)) / 1.08; break;
      default: r = R;
    }
    if (cfg.edge === 'crimped') {
      var count = Math.max(16, Math.round(Math.PI * 2 * R / 2.4));
      r *= 1 - 0.024 * Math.pow(0.5 + 0.5 * Math.cos(a * count), 3);
    }
    if (cfg.edge === 'broken') {
      for (var i = 0; i < BROKEN_NOTCHES.length; i++) {
        var nn = BROKEN_NOTCHES[i];
        var d = angDiff(a, nn[0]) / nn[2];
        if (Math.abs(d) < 1) r *= 1 - nn[1] * (1 - Math.abs(d)) * (0.75 + 0.25 * Math.sin(d * 9));
      }
      r *= 1 - 0.008 * Math.abs(Math.sin(a * 37)) - 0.006 * Math.abs(Math.sin(a * 71 + 1));
    }
    if (cfg.weathering === 'fissure') r *= 1 - 0.06 * Math.exp(-Math.pow(angDiff(a, FISSURE_ANGLE) / 0.03, 2));
    return r;
  }

  function geometry(cfg) {
    var R = cfg.diameter / 2;
    var H = cfg.height;
    var outline = [];
    for (var i = 0; i < OUTLINE_STEPS; i++) {
      var a = i / OUTLINE_STEPS * Math.PI * 2;
      var r = radiusAt(cfg, a, R);
      outline.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    var tiers = cfg.form === 'tiered'
      ? [{ s: 1, y0: 0, h: H * 0.5 }, { s: 0.68, y0: H * 0.5, h: H * 0.3 }, { s: 0.42, y0: H * 0.8, h: H * 0.3 }]
      : [{ s: 1, y0: 0, h: H }];
    var dome = cfg.dome / 100 * Math.min(R * 0.42, 7.5) * (cfg.form === 'tiered' ? 0.45 : 1);
    var lip = cfg.edge === 'rolled' ? Math.min(0.75, H * 0.2) : 0;
    return { R: R, H: H, outline: outline, tiers: tiers, dome: dome, lip: lip, totalHeight: tiers[tiers.length - 1].y0 + tiers[tiers.length - 1].h + dome + lip };
  }

  function shapeArea(cfg, R) {
    var factor = { round: 1, oval: 0.72, fluted: 0.97, cushion: 0.93, pebble: 0.9, tiered: 1 }[cfg.form];
    return Math.PI * R * R * factor;
  }

  function estimate(cfg, geo) {
    var volume = 0;
    var base = shapeArea(cfg, geo.R);
    geo.tiers.forEach(function (t) { volume += base * t.s * t.s * t.h; });
    var top = geo.tiers[geo.tiers.length - 1];
    volume += base * top.s * top.s * geo.dome * 0.5;
    if (geo.lip) volume += 2 * Math.PI * geo.R * 1.4 * geo.lip;
    // Cured earth is porous: roughly 39% of its wet, packed density remains.
    var mass = volume * EARTHS[cfg.earth].density * 0.39;
    cfg.inclusions.forEach(function (k) { mass += INCLUSION_MASS[k] || 0; });
    var days = clamp(Math.round(7 + cfg.height * 4.1 + geo.dome * 1.6 + (EARTHS[cfg.earth].density - 1.2) * 14 + (cfg.surface === 'burnished' ? 6 : 0)), 9, 61);
    return { mass: grams(mass), days: days };
  }

  /* Plan texture: the top surface, seen from directly above, in centimetres --------- */
  var PLAN = 1024;
  var SPAN = 22;                    // the plan covers -22…22 cm in both directions
  var PX = PLAN / (2 * SPAN);
  var plan = document.createElement('canvas');
  plan.width = plan.height = PLAN;
  var pg = plan.getContext('2d');

  function outlinePath(g, geo, scale) {
    g.beginPath();
    for (var i = 0; i < geo.outline.length; i++) {
      var p = geo.outline[i];
      if (i === 0) g.moveTo(p[0] * scale, p[1] * scale);
      else g.lineTo(p[0] * scale, p[1] * scale);
    }
    g.closePath();
  }

  function withShadow(g, fn) {
    g.save();
    g.shadowColor = 'rgba(15,8,3,0.45)';
    g.shadowBlur = 5;
    g.shadowOffsetX = 2;
    g.shadowOffsetY = 3;
    fn();
    g.restore();
  }

  function paintSurface(cfg, geo, rand) {
    var R = geo.R;
    var mid = rgb(EARTHS[cfg.earth].tones[1]);
    if (cfg.surface === 'burnished') {
      pg.fillStyle = rgba(mid, 0.45);
      outlinePath(pg, geo, 1);
      pg.fill();
      pg.lineWidth = 0.18;
      for (var b = 0; b < 26; b++) {
        var br = R * (0.15 + rand() * 0.8), start = rand() * Math.PI * 2;
        pg.strokeStyle = 'rgba(255,244,228,' + (0.03 + rand() * 0.05).toFixed(3) + ')';
        pg.beginPath();
        pg.arc(0, 0, br, start, start + 0.6 + rand() * 1.4);
        pg.stroke();
      }
    } else if (cfg.surface === 'raked') {
      pg.beginPath();
      for (var t = 0; ; t += 0.04) {
        var r = 0.5 + 0.34 * t / (Math.PI * 2);
        if (r > R * 0.95) break;
        var w = 1 + 0.01 * Math.sin(t * 3.3);
        pg.lineTo(Math.cos(t) * r * w, Math.sin(t) * r * w);
      }
      pg.lineCap = 'round';
      pg.strokeStyle = 'rgba(22,11,4,0.34)';
      pg.lineWidth = 0.085;
      pg.stroke();
      pg.save();
      pg.translate(-0.045, -0.06);
      pg.strokeStyle = 'rgba(255,240,220,0.2)';
      pg.lineWidth = 0.05;
      pg.stroke();
      pg.restore();
    } else if (cfg.surface === 'speckled') {
      for (var m = 0; m < 700; m++) {
        var mr = Math.sqrt(rand()) * R, ma = rand() * Math.PI * 2, size = 0.03 + rand() * 0.07;
        pg.save();
        pg.translate(Math.cos(ma) * mr, Math.sin(ma) * mr);
        pg.rotate(rand() * Math.PI);
        pg.fillStyle = rand() < 0.72 ? 'rgba(236,218,170,' + (0.55 + rand() * 0.4).toFixed(2) + ')' : 'rgba(20,12,6,0.45)';
        pg.fillRect(-size, -size * 0.5, size * 2, size);
        pg.restore();
      }
    } else {
      for (var p = 0; p < 160; p++) {
        var pr = Math.sqrt(rand()) * R, pa = rand() * Math.PI * 2;
        pg.fillStyle = 'rgba(15,8,4,' + (0.18 + rand() * 0.25).toFixed(2) + ')';
        pg.beginPath();
        pg.arc(Math.cos(pa) * pr, Math.sin(pa) * pr, 0.03 + rand() * 0.07, 0, Math.PI * 2);
        pg.fill();
      }
    }
  }

  function crackPath(points) {
    pg.beginPath();
    points.forEach(function (p, i) { if (i) pg.lineTo(p[0], p[1]); else pg.moveTo(p[0], p[1]); });
  }

  function strokeCrack(points, width) {
    crackPath(points);
    pg.lineJoin = 'round';
    pg.lineCap = 'round';
    pg.strokeStyle = 'rgba(14,7,3,0.82)';
    pg.lineWidth = width;
    pg.stroke();
    pg.save();
    pg.translate(-0.035, -0.04);
    crackPath(points);
    pg.strokeStyle = 'rgba(255,236,212,0.22)';
    pg.lineWidth = width * 0.4;
    pg.stroke();
    pg.restore();
  }

  function randomCrack(rand, R, angle, length) {
    var pts = [];
    var x = Math.cos(angle) * R * 0.99, z = Math.sin(angle) * R * 0.99;
    var dir = angle + Math.PI + (rand() - 0.5) * 0.5;
    for (var travelled = 0; travelled < length; travelled += 0.3) {
      pts.push([x, z]);
      dir += (rand() - 0.5) * 0.7;
      var toCentre = Math.atan2(-z, -x);
      dir += angDiff(toCentre, dir) * 0.08;
      x += Math.cos(dir) * 0.3;
      z += Math.sin(dir) * 0.3;
    }
    return pts;
  }

  // Voronoi cells by half-plane clipping: the polygons of dried, shrinking mud.
  function voronoi(seeds, bound) {
    return seeds.map(function (s, i) {
      var poly = [[-bound, -bound], [bound, -bound], [bound, bound], [-bound, bound]];
      for (var j = 0; j < seeds.length && poly.length; j++) {
        if (j === i) continue;
        var o = seeds[j];
        var mx = (s[0] + o[0]) / 2, mz = (s[1] + o[1]) / 2, nx = o[0] - s[0], nz = o[1] - s[1];
        var out = [];
        for (var k = 0; k < poly.length; k++) {
          var a = poly[k], b = poly[(k + 1) % poly.length];
          var da = (a[0] - mx) * nx + (a[1] - mz) * nz, db = (b[0] - mx) * nx + (b[1] - mz) * nz;
          if (da <= 0) out.push(a);
          if ((da <= 0) !== (db <= 0)) {
            var t = da / (da - db);
            out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          }
        }
        poly = out;
      }
      return poly;
    });
  }

  function paintWeathering(cfg, geo, rand) {
    var R = geo.R;
    if (cfg.weathering === 'hairline') {
      var count = R > 15 ? 3 : 2;
      for (var c = 0; c < count; c++) {
        var start = -1.2 + c * 2.3 + rand() * 0.6;
        strokeCrack(randomCrack(rand, R, start, R * (0.45 + rand() * 0.4)), 0.055);
      }
    } else if (cfg.weathering === 'cracked') {
      var seeds = [], n = Math.round(R * R * 0.24);
      for (var i = 0; i < n; i++) {
        var rr = Math.sqrt(rand()) * R * 1.05, aa = rand() * Math.PI * 2;
        seeds.push([Math.cos(aa) * rr, Math.sin(aa) * rr]);
      }
      var cells = voronoi(seeds, R * 1.3);
      var edges = {};
      pg.save();
      outlinePath(pg, geo, 0.985);
      pg.clip();
      cells.forEach(function (poly) {
        for (var k = 0; k < poly.length; k++) {
          var a = poly[k], b = poly[(k + 1) % poly.length];
          // Order the endpoints so a shared edge is jittered identically from both cells.
          if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) { var tmp = a; a = b; b = tmp; }
          var key = a[0].toFixed(2) + ',' + a[1].toFixed(2) + ':' + b[0].toFixed(2) + ',' + b[1].toFixed(2);
          if (edges[key]) continue;
          edges[key] = true;
          var er = rng(hash(key));
          var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
          if (len < 0.05) continue;
          var nx = -dz / len, nz = dx / len, pts = [a];
          for (var s = 1; s < 4; s++) {
            var off = (er() - 0.5) * Math.min(0.3, len * 0.18);
            pts.push([a[0] + dx * s / 4 + nx * off, a[1] + dz * s / 4 + nz * off]);
          }
          pts.push(b);
          strokeCrack(pts, 0.07 + er() * 0.05);
        }
      });
      pg.restore();
    } else if (cfg.weathering === 'fissure') {
      var a0 = FISSURE_ANGLE;
      var sx = Math.cos(a0) * R * 1.02, sz = Math.sin(a0) * R * 1.02;
      var ex = Math.cos(a0) * R * 0.14, ez = Math.sin(a0) * R * 0.14;
      var steps = 26, left = [], right = [], centre = [];
      var px = -(ez - sz), pz = ex - sx, pl = Math.hypot(px, pz);
      px /= pl; pz /= pl;
      for (var f = 0; f <= steps; f++) {
        var t = f / steps;
        var wob = (rand() - 0.5) * 0.5 * (1 - t * 0.4) + Math.sin(t * 9) * 0.22;
        var cx = sx + (ex - sx) * t + px * wob, cz = sz + (ez - sz) * t + pz * wob;
        var half = (0.95 * Math.pow(1 - t, 0.85) + 0.03) / 2;
        centre.push([cx, cz]);
        left.push([cx + px * half, cz + pz * half]);
        right.push([cx - px * half, cz - pz * half]);
      }
      pg.beginPath();
      left.concat(right.reverse()).forEach(function (p, i) { if (i) pg.lineTo(p[0], p[1]); else pg.moveTo(p[0], p[1]); });
      pg.closePath();
      pg.fillStyle = 'rgba(12,6,3,0.92)';
      pg.fill();
      crackPath(left);
      pg.strokeStyle = 'rgba(255,236,212,0.32)';
      pg.lineWidth = 0.06;
      pg.stroke();
      // the fractured inner face catching a little light
      crackPath(centre);
      pg.strokeStyle = 'rgba(80,46,26,0.6)';
      pg.lineWidth = 0.08;
      pg.stroke();
      for (var bch = 0; bch < 3; bch++) {
        var from = centre[4 + bch * 6];
        var branch = [from];
        var bd = a0 + Math.PI + (bch % 2 ? 1 : -1) * (0.9 + rand() * 0.5);
        var bx = from[0], bz = from[1];
        for (var bs = 0; bs < 6; bs++) {
          bd += (rand() - 0.5) * 0.6;
          bx += Math.cos(bd) * 0.32;
          bz += Math.sin(bd) * 0.32;
          branch.push([bx, bz]);
        }
        strokeCrack(branch, 0.045);
      }
    }
  }

  function paintEdge(cfg, geo, rand) {
    var R = geo.R;
    if (cfg.edge === 'rolled') {
      pg.save();
      outlinePath(pg, geo, 1);
      pg.clip();
      for (var i = 0; i < 4; i++) {
        outlinePath(pg, geo, 0.868 - i * 0.004);
        pg.strokeStyle = 'rgba(12,6,2,' + (0.16 - i * 0.03).toFixed(2) + ')';
        pg.lineWidth = 0.32 - i * 0.05;
        pg.stroke();
      }
      outlinePath(pg, geo, 0.94);
      pg.strokeStyle = 'rgba(255,240,222,0.1)';
      pg.lineWidth = 0.55;
      pg.stroke();
      pg.restore();
    } else if (cfg.edge === 'crimped') {
      var count = Math.max(16, Math.round(Math.PI * 2 * R / 2.4));
      for (var c = 0; c < count; c++) {
        var a = (c + 0.5) / count * Math.PI * 2;
        var r = radiusAt(cfg, a, R) * 0.9;
        pg.save();
        pg.translate(Math.cos(a) * r, Math.sin(a) * r);
        pg.rotate(a);
        var g = pg.createRadialGradient(0, 0, 0, 0, 0, 0.75);
        g.addColorStop(0, 'rgba(14,7,3,0.34)');
        g.addColorStop(1, 'rgba(14,7,3,0)');
        pg.fillStyle = g;
        pg.beginPath();
        pg.ellipse(0, 0, 0.55, 0.85, 0, 0, Math.PI * 2);
        pg.fill();
        pg.strokeStyle = 'rgba(255,238,215,0.16)';
        pg.lineWidth = 0.07;
        pg.beginPath();
        pg.arc(-0.25, 0, 0.62, Math.PI * 0.62, Math.PI * 1.38);
        pg.stroke();
        pg.restore();
      }
    } else if (cfg.edge === 'broken') {
      pg.save();
      outlinePath(pg, geo, 1);
      pg.clip();
      for (var k = 0; k < 420; k++) {
        var ba = rand() * Math.PI * 2, br = radiusAt(cfg, ba, R) * (0.93 + rand() * 0.07);
        pg.fillStyle = 'rgba(14,7,3,' + (0.2 + rand() * 0.35).toFixed(2) + ')';
        pg.beginPath();
        pg.arc(Math.cos(ba) * br, Math.sin(ba) * br, 0.04 + rand() * 0.12, 0, Math.PI * 2);
        pg.fill();
      }
      pg.restore();
    }
    // A soft fall-off at the very rim, whatever the edge.
    pg.save();
    outlinePath(pg, geo, 1);
    pg.clip();
    outlinePath(pg, geo, 1);
    pg.strokeStyle = 'rgba(10,5,2,0.2)';
    pg.lineWidth = 0.7;
    pg.stroke();
    pg.restore();
  }

  function polar(R, rho, angle) { return [Math.cos(angle) * R * rho, Math.sin(angle) * R * rho]; }

  function paintInclusions(cfg, geo, rand) {
    var R = geo.R, on = {};
    cfg.inclusions.forEach(function (k) { on[k] = true; });

    if (on.mica) {
      var ma = 0.35, pts = [], steps = 18;
      var from = polar(R, 0.93, ma), to = polar(R, 0.9, ma + Math.PI * 0.78);
      for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var bow = Math.sin(t * Math.PI) * R * 0.2;
        var x = from[0] + (to[0] - from[0]) * t, z = from[1] + (to[1] - from[1]) * t;
        var dx = to[0] - from[0], dz = to[1] - from[1], l = Math.hypot(dx, dz);
        var j = (i && i < steps) ? (rand() - 0.5) * 0.45 : 0;
        pts.push([x - dz / l * (bow + j), z + dx / l * (bow + j)]);
      }
      crackPath(pts);
      pg.lineJoin = 'round';
      pg.lineCap = 'round';
      pg.strokeStyle = 'rgba(25,14,6,0.6)';
      pg.lineWidth = 0.3;
      pg.stroke();
      var gold = pg.createLinearGradient(from[0], from[1], to[0], to[1]);
      gold.addColorStop(0, '#f1dc9f');
      gold.addColorStop(0.45, '#c8a35a');
      gold.addColorStop(0.7, '#ecd394');
      gold.addColorStop(1, '#b48f4c');
      crackPath(pts);
      pg.strokeStyle = gold;
      pg.lineWidth = 0.19;
      pg.stroke();
      pg.fillStyle = 'rgba(255,250,232,0.9)';
      for (var s = 2; s < pts.length - 1; s += 3) {
        pg.beginPath();
        pg.arc(pts[s][0] - 0.03, pts[s][1] - 0.03, 0.045, 0, Math.PI * 2);
        pg.fill();
      }
    }

    if (on.thumb) {
      var tp = polar(R, 0.76, 5.55);
      pg.save();
      pg.translate(tp[0], tp[1]);
      pg.rotate(5.55 + Math.PI / 2);
      var dip = pg.createRadialGradient(0, 0, 0, 0, 0, 1.3);
      dip.addColorStop(0, 'rgba(10,5,2,0.16)');
      dip.addColorStop(1, 'rgba(10,5,2,0)');
      pg.fillStyle = dip;
      pg.beginPath();
      pg.ellipse(0, 0, 1.05, 1.35, 0, 0, Math.PI * 2);
      pg.fill();
      pg.beginPath();
      pg.ellipse(0, 0, 0.95, 1.22, 0, 0, Math.PI * 2);
      pg.clip();
      pg.strokeStyle = 'rgba(14,7,3,0.36)';
      pg.lineWidth = 0.028;
      for (var ring = 1; ring < 15; ring++) {
        var rx = ring * 0.075, rz = ring * 0.095;
        pg.beginPath();
        for (var q = 0; q <= 64; q++) {
          var qa = q / 64 * Math.PI * 2;
          var wob = 1 + 0.06 * Math.sin(qa * 3 + ring * 0.7);
          pg.lineTo(Math.cos(qa) * rx * wob, Math.sin(qa) * rz * wob - ring * 0.012);
        }
        pg.stroke();
      }
      pg.restore();
    }

    if (on.seeds) {
      var sc = polar(R, 0.66, 1.3);
      for (var sd = 0; sd < 18; sd++) {
        var sr = Math.sqrt(rand()) * Math.min(1.7, R * 0.16), sa = rand() * Math.PI * 2, srot = rand() * Math.PI;
        pg.save();
        pg.translate(sc[0] + Math.cos(sa) * sr, sc[1] + Math.sin(sa) * sr);
        pg.rotate(srot);
        withShadow(pg, function () {
          pg.fillStyle = '#2c1b10';
          pg.beginPath();
          pg.ellipse(0, 0, 0.17, 0.09, 0, 0, Math.PI * 2);
          pg.fill();
        });
        pg.fillStyle = 'rgba(255,236,210,0.28)';
        pg.beginPath();
        pg.ellipse(-0.04, -0.03, 0.07, 0.03, 0, 0, Math.PI * 2);
        pg.fill();
        pg.restore();
      }
    }

    if (on.leaf) {
      var lp = polar(R, 0.5, 2.35);
      pg.save();
      pg.translate(lp[0], lp[1]);
      pg.rotate(0.6);
      var L = Math.min(4.4, R * 0.34), W = L * 0.42;
      var leaf = function () {
        pg.beginPath();
        pg.moveTo(0, -L / 2);
        pg.bezierCurveTo(W / 2, -L / 4, W / 2, L / 4, 0, L / 2);
        pg.bezierCurveTo(-W / 2, L / 4, -W / 2, -L / 4, 0, -L / 2);
      };
      withShadow(pg, function () {
        leaf();
        var lg = pg.createLinearGradient(-W / 2, -L / 2, W / 2, L / 2);
        lg.addColorStop(0, '#8a7d47');
        lg.addColorStop(0.55, '#6d6236');
        lg.addColorStop(1, '#8d6436');
        pg.fillStyle = lg;
        pg.fill();
      });
      pg.strokeStyle = 'rgba(48,40,18,0.75)';
      pg.lineWidth = 0.05;
      pg.beginPath();
      pg.moveTo(0, -L / 2);
      pg.lineTo(0, L * 0.62);
      pg.stroke();
      pg.lineWidth = 0.03;
      for (var v = -2; v <= 2; v++) {
        pg.beginPath();
        pg.moveTo(0, v * L * 0.14);
        pg.lineTo(W * 0.32, v * L * 0.14 - L * 0.09);
        pg.moveTo(0, v * L * 0.14 + L * 0.04);
        pg.lineTo(-W * 0.32, v * L * 0.14 - L * 0.05);
        pg.stroke();
      }
      pg.restore();
    }

    if (on.flower) {
      var fp = polar(R, 0.47, -0.85);
      pg.save();
      pg.translate(fp[0], fp[1]);
      var petal = Math.min(1.05, R * 0.085);
      withShadow(pg, function () {
        for (var pt = 0; pt < 5; pt++) {
          pg.save();
          pg.rotate(pt / 5 * Math.PI * 2 + 0.3);
          var pgrad = pg.createLinearGradient(0, 0, 0, -petal * 1.4);
          pgrad.addColorStop(0, '#9c675c');
          pgrad.addColorStop(1, '#c3958a');
          pg.fillStyle = pgrad;
          pg.beginPath();
          pg.ellipse(0, -petal * 0.72, petal * 0.42, petal * 0.72, 0, 0, Math.PI * 2);
          pg.fill();
          pg.restore();
        }
      });
      pg.fillStyle = '#c69d47';
      pg.beginPath();
      pg.arc(0, 0, petal * 0.3, 0, Math.PI * 2);
      pg.fill();
      pg.fillStyle = 'rgba(80,50,15,0.55)';
      for (var dt = 0; dt < 7; dt++) {
        pg.beginPath();
        pg.arc(Math.cos(dt) * petal * 0.15, Math.sin(dt * 1.7) * petal * 0.15, 0.04, 0, Math.PI * 2);
        pg.fill();
      }
      pg.restore();
    }

    if (on.twig) {
      var tw = polar(R, 0.34, 0.6);
      var TL = Math.min(5.2, R * 0.42);
      pg.save();
      pg.translate(tw[0], tw[1]);
      pg.rotate(-0.5);
      pg.lineCap = 'round';
      withShadow(pg, function () {
        pg.strokeStyle = '#4e3421';
        pg.lineWidth = 0.3;
        pg.beginPath();
        pg.moveTo(-TL / 2, 0.1);
        pg.quadraticCurveTo(0, -0.25, TL / 2, 0.05);
        pg.stroke();
        pg.lineWidth = 0.16;
        pg.beginPath();
        pg.moveTo(-TL * 0.05, -0.12);
        pg.quadraticCurveTo(TL * 0.08, -0.7, TL * 0.2, -1.05);
        pg.stroke();
      });
      pg.strokeStyle = 'rgba(255,232,205,0.22)';
      pg.lineWidth = 0.07;
      pg.beginPath();
      pg.moveTo(-TL / 2, 0.02);
      pg.quadraticCurveTo(0, -0.33, TL / 2, -0.03);
      pg.stroke();
      pg.restore();
    }

    if (on.pebbles) {
      var pp = polar(R, 0.6, 4.15);
      [[0, 0, 0.82, 0.62, '#9a948a'], [1.05, 0.45, 0.6, 0.48, '#b2ab9f'], [0.15, 0.95, 0.5, 0.4, '#7a746b']].forEach(function (s) {
        pg.save();
        pg.translate(pp[0] + s[0], pp[1] + s[1]);
        withShadow(pg, function () {
          var gg = pg.createRadialGradient(-s[2] * 0.35, -s[3] * 0.4, 0, 0, 0, s[2] * 1.1);
          gg.addColorStop(0, '#e2ddd3');
          gg.addColorStop(0.35, s[4]);
          gg.addColorStop(1, '#4f4a43');
          pg.fillStyle = gg;
          pg.beginPath();
          pg.ellipse(0, 0, s[2], s[3], 0.4, 0, Math.PI * 2);
          pg.fill();
        });
        pg.restore();
      });
    }
  }

  function buildPlan(cfg, geo) {
    var rand = rng(hash(signature(cfg)));
    pg.setTransform(1, 0, 0, 1, 0, 0);
    pg.clearRect(0, 0, PLAN, PLAN);
    var pattern = pg.createPattern(earthTile(cfg.earth), 'repeat');
    var s = 10 * PX / TILE;                       // one tile spans 10 cm
    if (pattern.setTransform) pattern.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    pg.fillStyle = pattern;
    pg.fillRect(0, 0, PLAN, PLAN);
    pg.setTransform(PX, 0, 0, PX, SPAN * PX, SPAN * PX);
    paintSurface(cfg, geo, rand);
    paintWeathering(cfg, geo, rand);
    paintEdge(cfg, geo, rand);
    paintInclusions(cfg, geo, rand);
    pg.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* Renderer --------------------------------------------------------------------- */
  var LIGHT = (function () { var x = -0.6, z = 0.62, l = Math.hypot(x, z); return [x / l, z / l]; })();
  var view = { theta: -0.55, phi: 0.56, spin: !reduceMotion, cy: null };
  var topCanvas = document.createElement('canvas');
  var tctx = topCanvas.getContext('2d');

  function renderScene(g, W, H, dpr, cfg, geo, opts) {
    opts = opts || {};
    var top = opts.top || topCanvas;
    var tg = top.getContext('2d');
    if (top.width !== Math.round(W * dpr) || top.height !== Math.round(H * dpr)) {
      top.width = Math.round(W * dpr);
      top.height = Math.round(H * dpr);
    }
    var sinP = Math.sin(view.phi), cosP = Math.cos(view.phi);
    var ct = Math.cos(view.theta), st = Math.sin(view.theta);
    var R = geo.R;
    var k = Math.min(W / 46, H / 31);
    var upward = (18 * sinP + geo.totalHeight * cosP) * k;
    var downward = 18 * sinP * k + 36;
    if (upward + downward > H * 0.96) k *= H * 0.96 / (upward + downward);
    var targetCy = H / 2 + ((R * sinP + geo.totalHeight * cosP) * k - (R * sinP * k + 34)) / 2;
    var cy = opts.cy || targetCy;
    var cx = W / 2;

    function proj(x, y, z) {
      var xr = x * ct - z * st, zr = x * st + z * ct;
      return [cx + k * xr, cy + k * (zr * sinP - y * cosP)];
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (opts.background) opts.background(g, W, H);

    // Cast and contact shadows on the table
    var base = proj(0, 0, 0);
    g.save();
    g.translate(base[0] + R * k * 0.12, base[1] + R * k * 0.05);
    g.scale(1, sinP);
    var cast = g.createRadialGradient(0, 0, R * k * 0.5, 0, 0, R * k * 1.42);
    cast.addColorStop(0, 'rgba(46,30,16,0.3)');
    cast.addColorStop(1, 'rgba(46,30,16,0)');
    g.fillStyle = cast;
    g.beginPath();
    g.arc(0, 0, R * k * 1.45, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.save();
    g.translate(base[0], base[1] + 1.5);
    g.scale(1, sinP);
    var contact = g.createRadialGradient(0, 0, R * k * 0.8, 0, 0, R * k * 1.07);
    contact.addColorStop(0, 'rgba(22,13,6,0.48)');
    contact.addColorStop(1, 'rgba(22,13,6,0)');
    g.fillStyle = contact;
    g.beginPath();
    g.arc(0, 0, R * k * 1.08, 0, Math.PI * 2);
    g.fill();
    g.restore();

    var wallPattern = g.createPattern(earthTile(cfg.earth), 'repeat');
    var ws = k * 10 / TILE;
    if (wallPattern.setTransform) {
      var shift = (view.theta * R * k) % (ws * TILE);
      wallPattern.setTransform(new DOMMatrix([ws, 0, 0, ws, shift, 0]));
    }

    geo.tiers.forEach(function (tier, index) {
      var last = index === geo.tiers.length - 1;
      var yTop = tier.y0 + tier.h;
      var lip = last ? geo.lip : 0;
      var dome = last ? geo.dome : 0;
      var s = tier.s;
      var n = geo.outline.length;

      /* Wall */
      var wall = new Path2D();
      var stops = [];
      var minX = Infinity, maxX = -Infinity;
      var rimEdges = [];
      for (var i = 0; i < n; i++) {
        var a = geo.outline[i], b = geo.outline[(i + 1) % n];
        var ax = a[0] * s, az = a[1] * s, bx = b[0] * s, bz = b[1] * s;
        var nx = bz - az, nz = -(bx - ax);
        var nzr = nx * st + nz * ct;
        if (nzr <= 0) continue;
        var nxr = nx * ct - nz * st, nl = Math.hypot(nxr, nzr);
        var A1 = proj(ax, yTop + lip, az), B1 = proj(bx, yTop + lip, bz), B0 = proj(bx, tier.y0, bz), A0 = proj(ax, tier.y0, az);
        wall.moveTo(A1[0], A1[1]);
        wall.lineTo(B1[0], B1[1]);
        wall.lineTo(B0[0], B0[1]);
        wall.lineTo(A0[0], A0[1]);
        wall.closePath();
        var diffuse = Math.max(0, (nxr / nl) * LIGHT[0] + (nzr / nl) * LIGHT[1]);
        var mx = (A1[0] + B1[0]) / 2;
        stops.push([mx, diffuse]);
        minX = Math.min(minX, A1[0], B1[0]);
        maxX = Math.max(maxX, A1[0], B1[0]);
        rimEdges.push([A1, B1, ax, az, bx, bz]);
      }
      if (stops.length) {
        g.fillStyle = wallPattern;
        g.fill(wall);
        stops.sort(function (p, q) { return p[0] - q[0]; });
        var shade = g.createLinearGradient(minX, 0, maxX, 0);
        var span = Math.max(1, maxX - minX);
        for (var j = 0; j < stops.length; j += Math.max(1, Math.floor(stops.length / 40))) {
          var d = stops[j][1];
          shade.addColorStop(clamp((stops[j][0] - minX) / span, 0, 1), 'rgba(30,14,5,' + clamp(0.6 - d * 0.62, 0.02, 0.6).toFixed(3) + ')');
        }
        g.fillStyle = shade;
        g.fill(wall);
        var topY = proj(0, yTop, 0)[1], botY = proj(0, tier.y0, 0)[1];
        var ao = g.createLinearGradient(0, topY - R * k * sinP, 0, botY + R * k * sinP);
        ao.addColorStop(0, 'rgba(0,0,0,0)');
        ao.addColorStop(1, 'rgba(10,5,2,0.22)');
        g.fillStyle = ao;
        g.fill(wall);
        // compression lines in the wall, and the rim catching light
        [0.36, 0.7].forEach(function (f) {
          var hy = tier.y0 + tier.h * f;
          g.beginPath();
          rimEdges.forEach(function (e) {
            var p = proj(e[2], hy, e[3]), q = proj(e[4], hy, e[5]);
            g.moveTo(p[0], p[1]);
            g.lineTo(q[0], q[1]);
          });
          g.strokeStyle = 'rgba(10,5,2,0.13)';
          g.lineWidth = 1;
          g.stroke();
        });
        g.beginPath();
        rimEdges.forEach(function (e) { g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); });
        g.strokeStyle = 'rgba(255,240,222,0.22)';
        g.lineWidth = 1;
        g.stroke();
      }

      /* Top: thin terraces from the rim inwards, each a slice of the plan texture */
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.clearRect(0, 0, top.width, top.height);
      var layers = dome > 0 ? clamp(Math.ceil(dome * k * cosP / 1.1), 2, 30) : 1;
      for (var L = 0; L < layers; L++) {
        var rho = layers === 1 ? 1 : 1 - (L / layers) * 0.97;
        var y = yTop + dome * (1 - rho * rho);
        drawPlanSlice(tg, rho * s, y, false);
      }
      if (lip) drawPlanSlice(tg, s, yTop + lip, true);

      // Studio light, fixed while the piece turns
      tg.setTransform(dpr, 0, 0, dpr, 0, 0);
      tg.globalCompositeOperation = 'source-atop';
      var Rs = R * s * k;
      var hx = cx - Rs * 0.34;
      var hy = cy - k * (yTop + dome * 0.75) * cosP - Rs * 0.32 * sinP;
      var strength = 0.55 + Math.min(dome / 5, 0.45);
      var light = tg.createRadialGradient(hx, hy, 0, hx, hy, Rs * 1.9);
      light.addColorStop(0, 'rgba(255,240,214,' + (0.3 * strength).toFixed(3) + ')');
      light.addColorStop(0.45, 'rgba(255,240,214,' + (0.05 * strength).toFixed(3) + ')');
      light.addColorStop(0.75, 'rgba(46,22,8,' + (0.08 * strength).toFixed(3) + ')');
      light.addColorStop(1, 'rgba(46,22,8,' + (0.26 * strength).toFixed(3) + ')');
      tg.fillStyle = light;
      tg.fillRect(0, 0, W, H);
      if (cfg.surface === 'burnished') {
        var spec = tg.createRadialGradient(hx + Rs * 0.08, hy + Rs * 0.04 * sinP, 0, hx + Rs * 0.08, hy, Rs * 0.62);
        spec.addColorStop(0, 'rgba(255,250,240,0.42)');
        spec.addColorStop(0.5, 'rgba(255,250,240,0.1)');
        spec.addColorStop(1, 'rgba(255,250,240,0)');
        tg.fillStyle = spec;
        tg.fillRect(0, 0, W, H);
      }
      tg.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(top, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    // Dimension line on the table
    if (!opts.noDimension) {
      var dimY = cy + R * k * sinP + 26;
      g.strokeStyle = 'rgba(22,20,18,0.42)';
      g.fillStyle = 'rgba(22,20,18,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - R * k, dimY);
      g.lineTo(cx + R * k, dimY);
      g.moveTo(cx - R * k, dimY - 5);
      g.lineTo(cx - R * k, dimY + 5);
      g.moveTo(cx + R * k, dimY - 5);
      g.lineTo(cx + R * k, dimY + 5);
      g.stroke();
      var label = 'Ø ' + cfg.diameter + ' cm';
      g.font = '11px "Fragment Mono", ui-monospace, monospace';
      var tw = g.measureText(label).width;
      g.fillStyle = opts.labelGround || 'rgba(232,225,213,1)';
      g.fillRect(cx - tw / 2 - 8, dimY - 7, tw + 16, 14);
      g.fillStyle = 'rgba(22,20,18,0.72)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, cx, dimY + 0.5);
    }
    return targetCy;

    function drawPlanSlice(c, scale, y, ring) {
      c.save();
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.beginPath();
      contour(c, scale, y);
      if (ring) contour(c, scale * 0.865, y);
      c.clip(ring ? 'evenodd' : 'nonzero');
      c.setTransform(dpr * k * ct, dpr * k * st * sinP, -dpr * k * st, dpr * k * ct * sinP, dpr * cx, dpr * (cy - k * y * cosP));
      c.drawImage(plan, -SPAN, -SPAN, 2 * SPAN, 2 * SPAN);
      c.restore();
      if (ring) {
        // the lip throws a little shadow onto the floor of the piece
        c.save();
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.beginPath();
        contour(c, scale * 0.865, y);
        c.strokeStyle = 'rgba(12,6,2,0.32)';
        c.lineWidth = 2.2;
        c.stroke();
        c.restore();
      }
    }

    function contour(c, scale, y) {
      for (var i = 0; i < geo.outline.length; i++) {
        var p = geo.outline[i];
        var q = proj(p[0] * scale, y, p[1] * scale);
        if (i === 0) c.moveTo(q[0], q[1]);
        else c.lineTo(q[0], q[1]);
      }
      c.closePath();
    }
  }

  /* State ---------------------------------------------------------------------------- */
  var state = clone(DEFAULTS);
  var geo = null;
  var planDirty = true;
  var dpr = 1;
  var W = 0;
  var H = 0;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function valid(cfg) {
    return cfg && EARTHS[cfg.earth] && FORMS[cfg.form] && EDGES[cfg.edge] && SURFACES[cfg.surface] && WEATHERING[cfg.weathering] &&
      Array.isArray(cfg.inclusions) && isFinite(cfg.diameter) && isFinite(cfg.height) && isFinite(cfg.dome);
  }
  function normalise(cfg) {
    var out = clone(DEFAULTS);
    Object.keys(DEFAULTS).forEach(function (key) { if (cfg[key] !== undefined) out[key] = cfg[key]; });
    out.diameter = clamp(+out.diameter, 14, 36);
    out.height = clamp(+out.height, 2, 10);
    out.dome = clamp(+out.dome, 0, 100);
    out.inclusions = out.inclusions.filter(function (k) { return INCLUSIONS[k]; });
    out.name = String(out.name || '').slice(0, 40);
    return out;
  }

  function generatedName(cfg) {
    var noun = cfg.weathering === 'fissure' ? 'Fault' :
      cfg.weathering === 'cracked' ? 'Drought' :
      cfg.weathering === 'hairline' ? 'Meridian' :
      cfg.surface === 'burnished' ? 'Nocturne' :
      cfg.surface === 'raked' ? 'Spiral' :
      cfg.surface === 'speckled' ? 'Constellation' : 'Study';
    return noun + ' in ' + EARTHS[cfg.earth].word;
  }
  function displayName(cfg) { return cfg.name.trim() || generatedName(cfg); }
  function specimenNumber(cfg) { return 'C-' + (1000 + hash(signature(cfg)) % 9000); }
  function domeWord(v) { return v === 0 ? 'Flat' : v < 25 ? 'Gentle' : v < 60 ? 'Domed' : 'Mounded'; }
  function inclusionList(cfg) {
    return cfg.inclusions.length ? cfg.inclusions.map(function (k) { return INCLUSIONS[k]; }).join(', ') : 'None';
  }
  function describe(cfg, est) {
    return displayName(cfg) + ': a ' + FORMS[cfg.form].toLowerCase() + ' piece in ' + EARTHS[cfg.earth].name + ', ' +
      cfg.diameter + ' centimetres across and ' + cfg.height + ' high, ' + domeWord(cfg.dome).toLowerCase() + ', with a ' +
      EDGES[cfg.edge].toLowerCase() + ' edge, ' + SURFACES[cfg.surface].toLowerCase() + ' surface, ' +
      WEATHERING[cfg.weathering].toLowerCase() + (cfg.inclusions.length ? ', and ' + inclusionList(cfg).toLowerCase() : '') +
      '. Approximately ' + thousands(est.mass) + ' grams.';
  }

  /* Form <-> state ----------------------------------------------------------------- */
  var nameInput = form.querySelector('[data-name-input]');
  function readForm() {
    var data = new FormData(form);
    state.earth = data.get('earth');
    state.form = data.get('form');
    state.diameter = parseFloat(data.get('diameter'));
    state.height = parseFloat(data.get('height'));
    state.dome = parseFloat(data.get('dome'));
    state.edge = data.get('edge');
    state.surface = data.get('surface');
    state.weathering = data.get('weathering');
    state.inclusions = data.getAll('inclusions');
    state.name = String(data.get('name') || '').slice(0, 40);
  }
  function writeForm() {
    ['earth', 'form', 'edge', 'surface', 'weathering'].forEach(function (key) {
      var input = form.querySelector('input[name="' + key + '"][value="' + state[key] + '"]');
      if (input) input.checked = true;
    });
    ['diameter', 'height', 'dome'].forEach(function (key) { form.elements[key].value = state[key]; });
    Array.prototype.forEach.call(form.querySelectorAll('input[name="inclusions"]'), function (cb) {
      cb.checked = state.inclusions.indexOf(cb.value) !== -1;
    });
    nameInput.value = state.name;
  }

  function out(sel, text) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { el.textContent = text; });
  }

  var specList = document.querySelector('[data-spec]');
  function fillSpec(list, cfg, est) {
    var rows = [
      ['Earth', EARTHS[cfg.earth].code + ' ' + EARTHS[cfg.earth].name],
      ['Form', FORMS[cfg.form] + ', ' + domeWord(cfg.dome).toLowerCase()],
      ['Dimensions', 'Ø ' + cfg.diameter + ' cm · H ' + cfg.height + ' cm'],
      ['Edge', EDGES[cfg.edge]],
      ['Surface', SURFACES[cfg.surface]],
      ['Weathering', WEATHERING[cfg.weathering]],
      ['Inclusions', inclusionList(cfg)],
      ['Est. mass', '≈ ' + thousands(est.mass) + ' g'],
      ['Curing', est.days + ' days at 2,940 m'],
      ['Edition', 'One of one']
    ];
    list.textContent = '';
    rows.forEach(function (r) {
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = r[0];
      dd.textContent = r[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      list.appendChild(wrap);
    });
  }

  var announcer = document.querySelector('[data-announce]');
  var announceTimer = null;
  var saveTimer = null;

  function update(options) {
    options = options || {};
    geo = geometry(state);
    planDirty = true;
    var est = estimate(state, geo);
    var name = displayName(state);
    out('[data-out="earth"]', EARTHS[state.earth].code + ' ' + EARTHS[state.earth].name);
    out('[data-out="form"]', FORMS[state.form]);
    out('[data-out="diameter"]', state.diameter + ' cm');
    out('[data-out="height"]', state.height + ' cm');
    out('[data-out="dome"]', domeWord(state.dome));
    out('[data-out="edge"]', EDGES[state.edge]);
    out('[data-out="surface"]', SURFACES[state.surface]);
    out('[data-out="weathering"]', WEATHERING[state.weathering]);
    out('[data-out="inclusions"]', NUMBER_WORDS[state.inclusions.length] || String(state.inclusions.length));
    out('[data-out-name]', name);
    out('[data-out-number]', 'No. ' + specimenNumber(state));
    out('[data-out-dims]', 'Ø ' + state.diameter + ' cm · H ' + state.height + ' cm · ≈ ' + thousands(est.mass) + ' g');
    nameInput.placeholder = generatedName(state);
    fillSpec(specList, state, est);
    var description = describe(state, est);
    canvas.setAttribute('aria-label', 'Preview. ' + description);
    if (!options.silent) {
      window.clearTimeout(announceTimer);
      announceTimer = window.setTimeout(function () { announcer.textContent = description; }, 900);
    }
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persist, 250);
    requestRender();
  }

  function persist() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* storage unavailable: fine */ }
  }
  function restore() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && valid(saved)) return normalise(saved);
    } catch (err) { /* ignore */ }
    return null;
  }

  /* Drawing loop ------------------------------------------------------------------- */
  var needsFrame = false;
  var lastTime = 0;
  var dragging = false;
  function requestRender() {
    if (!needsFrame) {
      needsFrame = true;
      window.requestAnimationFrame(frame);
    }
  }
  function frame(time) {
    needsFrame = false;
    var dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    if (view.spin && !dragging && !document.hidden) view.theta += dt * 0.32;
    if (!W || !H) return;
    if (planDirty) {
      buildPlan(state, geo);
      planDirty = false;
    }
    var target = renderScene(ctx, W, H, dpr, state, geo, { cy: view.cy });
    view.cy = view.cy === null ? target : view.cy + (target - view.cy) * 0.18;
    if (Math.abs(view.cy - target) > 0.5) requestRender();
    var deg = ((view.theta * 180 / Math.PI) % 360 + 360) % 360;
    angleOut.textContent = 'θ ' + ('00' + Math.round(deg)).slice(-3) + '° · φ ' + Math.round(view.phi * 180 / Math.PI) + '°';
    if (view.spin && !document.hidden && stageVisible) requestRender();
    else lastTime = 0;
  }
  var angleOut = document.querySelector('[data-out-angle]');

  var stage = document.querySelector('.stage__table');
  var stageVisible = true;
  function resize() {
    var rect = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(10, Math.round(rect.width));
    H = Math.max(10, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    view.cy = null;
    requestRender();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      stageVisible = entries[0].isIntersecting;
      if (stageVisible) requestRender();
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) requestRender(); });

  /* Turning the piece ------------------------------------------------------------------ */
  var turntable = document.querySelector('[data-turntable]');
  function setSpin(on) {
    view.spin = on;
    turntable.setAttribute('aria-pressed', String(on));
    requestRender();
  }
  turntable.addEventListener('click', function () { setSpin(!view.spin); });
  turntable.setAttribute('aria-pressed', String(view.spin));

  var last = null;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    last = [e.clientX, e.clientY, e.pointerType];
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    if (view.spin) setSpin(false);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging || !last) return;
    view.theta += (e.clientX - last[0]) * 0.011;
    if (last[2] !== 'touch') view.phi = clamp(view.phi - (e.clientY - last[1]) * 0.006, 0.22, 1.25);
    last = [e.clientX, e.clientY, last[2]];
    requestRender();
  });
  function endDrag() {
    dragging = false;
    last = null;
    canvas.classList.remove('is-dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', function (e) {
    var handled = true;
    if (e.key === 'ArrowLeft') view.theta -= 0.18;
    else if (e.key === 'ArrowRight') view.theta += 0.18;
    else if (e.key === 'ArrowUp') view.phi = clamp(view.phi + 0.08, 0.22, 1.25);
    else if (e.key === 'ArrowDown') view.phi = clamp(view.phi - 0.08, 0.22, 1.25);
    else handled = false;
    if (handled) {
      e.preventDefault();
      if (view.spin) setSpin(false);
      requestRender();
    }
  });

  /* Controls ----------------------------------------------------------------------------- */
  form.addEventListener('input', function () { readForm(); update(); });
  form.addEventListener('change', function () { readForm(); update(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  document.querySelector('[data-reset]').addEventListener('click', function () {
    state = clone(DEFAULTS);
    writeForm();
    update();
    view.theta = -0.55;
    view.phi = 0.56;
    hidePresetNote();
  });

  document.querySelector('[data-surprise]').addEventListener('click', function () {
    var pick = function (obj) { var keys = Object.keys(obj); return keys[Math.floor(Math.random() * keys.length)]; };
    state.earth = pick(EARTHS);
    state.form = pick(FORMS);
    state.diameter = Math.round((16 + Math.random() * 18) * 2) / 2;
    state.height = Math.round((2.5 + Math.random() * 6) * 2) / 2;
    state.dome = Math.round(Math.random() * 80);
    state.edge = pick(EDGES);
    state.surface = pick(SURFACES);
    state.weathering = pick(WEATHERING);
    state.inclusions = Object.keys(INCLUSIONS).filter(function () { return Math.random() < 0.26; });
    state.name = '';
    writeForm();
    update();
    hidePresetNote();
  });

  /* Save image ---------------------------------------------------------------------------- */
  function exportCanvas(width, height, withLabel) {
    var c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    var g = c.getContext('2d');
    if (planDirty) { buildPlan(state, geo); planDirty = false; }
    var sceneH = withLabel ? height - 150 : height;
    renderScene(g, width, sceneH, 1, state, geo, {
      top: document.createElement('canvas'),
      labelGround: '#e8e1d5',
      background: function (bg, w, h) {
        bg.fillStyle = '#e8e1d5';
        bg.fillRect(0, 0, w, withLabel ? height : h);
        var vg = bg.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.75);
        vg.addColorStop(0, 'rgba(255,252,246,0.55)');
        vg.addColorStop(1, 'rgba(255,252,246,0)');
        bg.fillStyle = vg;
        bg.fillRect(0, 0, w, h);
      }
    });
    if (withLabel) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = 'rgba(22,20,18,0.14)';
      g.fillRect(48, height - 138, width - 96, 1);
      g.fillStyle = '#161412';
      g.textAlign = 'left';
      g.textBaseline = 'alphabetic';
      g.font = '300 44px Fraunces, Georgia, serif';
      g.fillText(displayName(state), 48, height - 80);
      g.font = '15px "Fragment Mono", ui-monospace, monospace';
      g.fillStyle = '#5b574f';
      var est = estimate(state, geo);
      g.fillText(('No. ' + specimenNumber(state) + '  ·  ' + EARTHS[state.earth].name + '  ·  Ø ' + state.diameter + ' cm  ·  H ' + state.height + ' cm  ·  ≈ ' + thousands(est.mass) + ' g').toUpperCase(), 48, height - 46);
      g.textAlign = 'right';
      g.fillText('MUDPIES — THE ATELIER', width - 48, height - 80);
    }
    return c;
  }

  function download(c, filename) {
    if (!c.toBlob) return;
    c.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, 'image/png');
  }
  function fileSlug() { return 'mudpie-' + specimenNumber(state).toLowerCase(); }

  document.querySelector('[data-save-image]').addEventListener('click', function () {
    download(exportCanvas(1400, 1150, true), fileSlug() + '.png');
  });

  /* Certificate of formation ---------------------------------------------------------- */
  var dialog = document.querySelector('[data-certificate]');
  var phases = dialog ? Array.prototype.slice.call(dialog.querySelectorAll('[data-phase]')) : [];
  var cureTimer = null;

  function showPhase(name) {
    phases.forEach(function (p) { p.hidden = p.getAttribute('data-phase') !== name; });
    var focus = dialog.querySelector('[data-phase="' + name + '"] .cert-focus');
    if (focus) focus.focus();
  }

  function fillCertificate() {
    var est = estimate(state, geo);
    var number = 'No. ' + specimenNumber(state);
    dialog.querySelector('[data-cert-number]').textContent = number;
    dialog.querySelector('[data-cert-name]').textContent = displayName(state);
    fillSpec(dialog.querySelector('[data-cert-spec]'), state, est);
    var image = dialog.querySelector('[data-cert-image]');
    image.src = exportCanvas(960, 720, false).toDataURL('image/png');
    image.alt = 'Rendering of ' + describe(state, est);
    dialog.querySelector('[data-entered-name]').textContent = displayName(state);
    dialog.querySelector('[data-queue]').textContent = thousands(2000 + hash(signature(state) + state.name) % 900);
  }

  function finishCuring() {
    window.clearInterval(cureTimer);
    cureTimer = null;
    fillCertificate();
    showPhase('certificate');
  }

  function openCertificate() {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    var steps = Array.prototype.slice.call(dialog.querySelectorAll('[data-cure-steps] li'));
    var bar = dialog.querySelector('[data-cure-bar]');
    steps.forEach(function (li) { li.className = ''; });
    bar.style.transform = 'scaleX(0)';
    showPhase('curing');
    dialog.showModal();
    showPhase('curing');
    if (reduceMotion) {
      finishCuring();
      return;
    }
    var i = 0;
    steps[0].className = 'is-active';
    cureTimer = window.setInterval(function () {
      steps[i].className = 'is-done';
      i++;
      bar.style.transform = 'scaleX(' + (i / steps.length) + ')';
      if (i >= steps.length) {
        window.setTimeout(finishCuring, 420);
        window.clearInterval(cureTimer);
        return;
      }
      steps[i].className = 'is-active';
    }, 720);
  }

  if (dialog) {
    document.querySelector('[data-commission]').addEventListener('click', openCertificate);
    dialog.querySelector('[data-cure-skip]').addEventListener('click', finishCuring);
    dialog.querySelector('[data-cert-close]').addEventListener('click', function () { dialog.close(); });
    Array.prototype.forEach.call(dialog.querySelectorAll('[data-cert-adjust]'), function (b) {
      b.addEventListener('click', function () { dialog.close(); });
    });
    dialog.querySelector('[data-cert-enter]').addEventListener('click', function () { showPhase('entered'); });
    dialog.querySelector('[data-cert-another]').addEventListener('click', function () {
      dialog.close();
      document.querySelector('[data-reset]').click();
      document.querySelector('.atelier').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    dialog.querySelector('[data-cert-save]').addEventListener('click', function () {
      download(certificateCanvas(), fileSlug() + '-certificate.png');
    });
    dialog.addEventListener('close', function () {
      window.clearInterval(cureTimer);
      cureTimer = null;
      document.querySelector('[data-commission]').focus();
    });
    // A click on the backdrop closes the dialog.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  }

  function certificateCanvas() {
    var w = 1200, h = 1560;
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var g = c.getContext('2d');
    g.fillStyle = '#f2ece2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(22,20,18,0.35)';
    g.lineWidth = 1;
    g.strokeRect(40.5, 40.5, w - 81, h - 81);
    g.strokeRect(52.5, 52.5, w - 105, h - 105);
    g.fillStyle = '#161412';
    g.textBaseline = 'alphabetic';
    g.font = '15px "Fragment Mono", ui-monospace, monospace';
    g.fillText('CERTIFICATE OF FORMATION', 100, 130);
    g.textAlign = 'right';
    g.fillText('NO. ' + specimenNumber(state), w - 100, 130);
    g.textAlign = 'left';
    var scene = exportCanvas(1000, 760, false);
    g.drawImage(scene, 100, 170, 1000, 760);
    g.font = '300 64px Fraunces, Georgia, serif';
    g.fillText(displayName(state), 100, 1020);
    var est = estimate(state, geo);
    var lines = [
      ['Earth', EARTHS[state.earth].code + ' ' + EARTHS[state.earth].name],
      ['Form', FORMS[state.form] + ', ' + domeWord(state.dome).toLowerCase()],
      ['Dimensions', 'Ø ' + state.diameter + ' cm · H ' + state.height + ' cm'],
      ['Finish', EDGES[state.edge] + ' edge · ' + SURFACES[state.surface] + ' · ' + WEATHERING[state.weathering]],
      ['Inclusions', inclusionList(state)],
      ['Est. mass', '≈ ' + thousands(est.mass) + ' g'],
      ['Curing', est.days + ' days at 2,940 m'],
      ['Edition', 'One of one']
    ];
    g.font = '19px "Instrument Sans", Helvetica, Arial, sans-serif';
    lines.forEach(function (l, i) {
      var y = 1080 + i * 40;
      g.fillStyle = 'rgba(22,20,18,0.14)';
      g.fillRect(100, y + 14, 1000, 1);
      g.fillStyle = '#5b574f';
      g.font = '14px "Fragment Mono", ui-monospace, monospace';
      g.fillText(l[0].toUpperCase(), 100, y);
      g.fillStyle = '#161412';
      g.font = '19px "Instrument Sans", Helvetica, Arial, sans-serif';
      g.fillText(l[1], 330, y);
    });
    // The founder's mark, redrawn as a vector so the export never depends on files.
    g.save();
    g.translate(w - 230, h - 230);
    g.strokeStyle = '#6c2e12';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(8, 6); g.lineTo(122, 4); g.lineTo(124, 110); g.lineTo(6, 112); g.closePath();
    g.stroke();
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(28, 92); g.lineTo(52, 30); g.lineTo(58, 70); g.lineTo(78, 30); g.lineTo(84, 66); g.lineTo(104, 40);
    g.stroke();
    g.restore();
    g.fillStyle = '#5b574f';
    g.font = '14px "Fragment Mono", ui-monospace, monospace';
    g.fillText('FORMED FOR THE BEARER OF THIS CERTIFICATE', 100, h - 150);
    g.fillText('MUDPIES IS A WORK OF FICTION. NOTHING HAS BEEN ORDERED.', 100, h - 118);
    return c;
  }

  /* Presets, restore, start ------------------------------------------------------------- */
  var note = document.querySelector('[data-preset-note]');
  function hidePresetNote() { if (note) note.hidden = true; }

  var params = new URLSearchParams(window.location.search);
  var from = params.get('from');
  if (from && PRESETS[from]) {
    var preset = PRESETS[from];
    state = normalise(preset);
    if (note) {
      note.textContent = 'Begun from ' + preset.ref + '. Change anything you like; the original will not mind.';
      note.hidden = false;
    }
  } else {
    var saved = restore();
    if (saved) state = saved;
  }
  writeForm();
  update({ silent: true });
  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRender);
})();

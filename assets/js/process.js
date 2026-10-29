/* MudPies — The Process.
   Scroll-driven scenes (progress, active captions, scrubbed film), the
   altimeter/chapter index, the library hotspots and the route drawing.
   Everything here is an enhancement: without it the page reads as an essay. */
(function () {
  'use strict';

  var root = document.documentElement;
  var motionOK = root.classList.contains('motion-ok');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* Scene progress ------------------------------------------------------------ */
  var steps = scenes.map(function (scene) {
    return Array.prototype.slice.call(scene.querySelectorAll('[data-step]')).map(function (el) {
      var range = el.getAttribute('data-step').split(',').map(parseFloat);
      return { el: el, from: range[0], to: range[1] };
    });
  });
  var progress = scenes.map(function () { return -1; });

  function sceneProgress(scene) {
    var r = scene.getBoundingClientRect();
    var travel = r.height - window.innerHeight;
    if (travel <= 0) return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
    return clamp(-r.top / travel, 0, 1);
  }

  function updateScenes() {
    if (!motionOK) return;
    scenes.forEach(function (scene, i) {
      var p = sceneProgress(scene);
      if (Math.abs(p - progress[i]) < 0.0005) return;
      progress[i] = p;
      scene.style.setProperty('--p', p.toFixed(4));
      steps[i].forEach(function (s) { s.el.classList.toggle('is-active', p >= s.from && p <= s.to); });
      var film = films[i];
      if (film) {
        film.target = p;
        if (film.visible) startLoop();
      }
    });
  }

  /* Films: scrubbed by scroll, or played on request ------------------------------- */
  function pickSource(video) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var small = video.getAttribute('data-src-small');
    return small && (saveData || window.innerWidth < 760) ? small : video.getAttribute('data-src');
  }

  var films = scenes.map(function (scene) {
    var video = scene.querySelector('[data-scrub]');
    if (!video) return null;
    var film = { scene: scene, video: video, target: 0, current: 0, duration: 0, loaded: false, visible: false };
    video.addEventListener('loadedmetadata', function () {
      film.duration = video.duration || 8;
      if (motionOK) startLoop();
    });
    video.addEventListener('loadeddata', function () {
      scene.classList.add('is-video-ready');
      if (motionOK) {
        // A brief play/pause primes the decoder so seeking paints frames on iOS.
        var attempt = video.play();
        if (attempt && attempt.then) attempt.then(function () { video.pause(); }).catch(function () {});
      }
    });
    return film;
  });

  function load(film) {
    if (film.loaded) return;
    film.loaded = true;
    var url = pickSource(film.video);
    var direct = function () {
      film.video.src = url;
      film.video.load();
    };
    // Scrubbing needs a seekable video. Some simple local servers ignore HTTP
    // Range requests, which leaves a streamed video unseekable; a blob is
    // seekable whatever served it. file:// pages cannot fetch, but seek fine.
    if (motionOK && window.fetch && window.location.protocol !== 'file:') {
      window.fetch(url)
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.blob();
        })
        .then(function (blob) {
          film.video.src = URL.createObjectURL(blob);
          film.video.load();
        })
        .catch(direct);
    } else {
      direct();
    }
  }

  var running = false;
  function scrubLoop() {
    var busy = false;
    films.forEach(function (film) {
      if (!film || !film.visible || !film.duration) return;
      var goal = film.target * Math.max(0, film.duration - 0.06);
      film.current += (goal - film.current) * 0.2;
      if (Math.abs(goal - film.current) < 0.002) film.current = goal;
      var v = film.video;
      var behind = Math.abs(v.currentTime - film.current) > 0.015;
      if (!v.seeking && behind) v.currentTime = film.current;
      // Keep the loop alive only until the frame on screen matches the scroll.
      if (goal !== film.current || behind || v.seeking) busy = true;
    });
    running = busy;
    if (busy) window.requestAnimationFrame(scrubLoop);
  }
  function startLoop() {
    if (!running) {
      running = true;
      window.requestAnimationFrame(scrubLoop);
    }
  }

  if ('IntersectionObserver' in window) {
    var near = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var film = films[scenes.indexOf(entry.target)];
        if (!film) return;
        if (entry.isIntersecting && motionOK) load(film);
      });
    }, { rootMargin: '120% 0px 120% 0px' });
    var inView = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var film = films[scenes.indexOf(entry.target)];
        if (!film) return;
        film.visible = entry.isIntersecting;
        if (film.visible && motionOK) startLoop();
      });
    });
    scenes.forEach(function (scene, i) {
      if (films[i]) { near.observe(scene); inView.observe(scene); }
    });
  }

  // Reduced motion: no scrubbing. Offer each film as an ordinary, user-started clip.
  if (!motionOK) {
    films.forEach(function (film) {
      if (!film) return;
      var button = film.scene.querySelector('[data-film-toggle]');
      if (!button) return;
      button.hidden = false;
      button.addEventListener('click', function () {
        load(film);
        film.video.controls = true;
        film.video.removeAttribute('aria-hidden');
        var poster = film.scene.querySelector('.scene__poster');
        film.video.setAttribute('aria-label', 'Expedition film. ' + (poster ? poster.alt : ''));
        film.scene.classList.add('is-playing');
        var attempt = film.video.play();
        if (attempt && attempt.catch) attempt.catch(function () {});
        button.hidden = true;
        film.video.focus();
      });
    });
  }

  /* Gauge: altitude and chapter index ---------------------------------------------- */
  var gauge = document.querySelector('[data-gauge]');
  var altOut = gauge && gauge.querySelector('[data-gauge-alt]');
  var progressOut = gauge && gauge.querySelector('[data-gauge-progress]');
  var links = gauge ? Array.prototype.slice.call(gauge.querySelectorAll('[data-gauge-link]')) : [];
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var footer = document.querySelector('.site-footer');
  var mainEl = document.getElementById('main');
  var lastChapter = null;
  var formatAlt = function (m) { return Math.round(m).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  function updateGauge() {
    if (!gauge) return;
    var mid = window.innerHeight / 2;
    var active = null;
    var local = 0;
    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) {
        active = chapters[i];
        local = chapters[i].hasAttribute('data-scene') ? sceneProgress(chapters[i]) : clamp((mid - r.top) / r.height, 0, 1);
        break;
      }
    }
    var footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
    gauge.classList.toggle('is-visible', !!active && footerTop > window.innerHeight * 0.75);
    if (!active) return;

    var from = parseFloat(active.getAttribute('data-alt-from'));
    var to = parseFloat(active.getAttribute('data-alt-to'));
    altOut.textContent = formatAlt(from + (to - from) * local);

    var name = active.getAttribute('data-chapter');
    if (name === 'descent' && local < 0.16) name = 'prologue';
    if (name !== lastChapter) {
      lastChapter = name;
      links.forEach(function (a) {
        if (a.getAttribute('data-gauge-link') === name) a.setAttribute('aria-current', 'step');
        else a.removeAttribute('aria-current');
      });
    }
    gauge.classList.toggle('is-light', active.getAttribute('data-header-tone') === 'light');

    if (progressOut && mainEl) {
      var total = mainEl.offsetHeight - window.innerHeight;
      progressOut.style.setProperty('--progress', clamp(window.scrollY / total, 0, 1).toFixed(4));
    }
  }

  /* Route drawing -------------------------------------------------------------------- */
  var routeMap = document.querySelector('[data-route-map]');
  function updateRoute() {
    if (!routeMap || !motionOK) return;
    var r = routeMap.getBoundingClientRect();
    var p = clamp((window.innerHeight * 0.9 - r.top) / (r.height + window.innerHeight * 0.3), 0, 1);
    routeMap.style.setProperty('--route', p.toFixed(4));
  }

  /* Frame loop driven by scroll --------------------------------------------------------- */
  var queued = false;
  function frame() {
    queued = false;
    updateScenes();
    updateGauge();
    updateRoute();
  }
  function queue() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(frame);
    }
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  frame();

  /* Library hotspots ---------------------------------------------------------------------- */
  var hotspotLayer = document.querySelector('[data-hotspots]');
  if (hotspotLayer) {
    hotspotLayer.hidden = false;
    var spots = Array.prototype.slice.call(hotspotLayer.querySelectorAll('.hotspot'));
    var entries = Array.prototype.slice.call(document.querySelectorAll('.earth-index li[data-earth]'));
    var narrow = window.matchMedia('(max-width: 900px)');

    var mark = function (code, on) {
      spots.forEach(function (s) { if (s.getAttribute('data-earth') === code) s.classList.toggle('is-hover', on); });
      entries.forEach(function (li) { if (li.getAttribute('data-earth') === code) li.classList.toggle('is-hover', on); });
    };
    var select = function (code) {
      spots.forEach(function (s) {
        var on = s.getAttribute('data-earth') === code;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-pressed', String(on));
      });
      entries.forEach(function (li) {
        var on = li.getAttribute('data-earth') === code;
        li.classList.toggle('is-active', on);
        if (on && narrow.matches) li.scrollIntoView({ block: 'nearest', behavior: motionOK ? 'smooth' : 'auto' });
      });
    };

    spots.forEach(function (s) {
      s.setAttribute('aria-pressed', 'false');
      var code = s.getAttribute('data-earth');
      s.addEventListener('click', function () { select(code); });
      s.addEventListener('pointerenter', function () { mark(code, true); });
      s.addEventListener('pointerleave', function () { mark(code, false); });
    });
    entries.forEach(function (li) {
      var code = li.getAttribute('data-earth');
      li.addEventListener('pointerenter', function () { spots.forEach(function (s) { s.classList.toggle('is-hover', s.getAttribute('data-earth') === code); }); });
      li.addEventListener('pointerleave', function () { spots.forEach(function (s) { s.classList.remove('is-hover'); }); });
    });
  }
})();

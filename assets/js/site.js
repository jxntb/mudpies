/* MudPies — shared behaviour for every page.
   Header states, the mobile menu, scroll reveals, in-view video, and the
   footer's studio readout. No dependencies; safe to load with `defer`. */
(function () {
  'use strict';

  var root = document.documentElement;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReducedMotion = function () { return motionQuery.matches; };

  window.MudPies = window.MudPies || {};
  window.MudPies.ready = true;
  window.MudPies.prefersReducedMotion = prefersReducedMotion;

  /* Header ------------------------------------------------------------------
     Solid once scrolled; slips away while reading downward and returns on the
     way back up; turns light whenever it sits over a section marked
     data-header="dark". */
  var header = document.querySelector('[data-header]');
  var toneSections = Array.prototype.slice.call(document.querySelectorAll('[data-header-tone]'));
  var lastY = window.scrollY;
  var ticking = false;
  var menuOpen = false;

  function updateHeader() {
    ticking = false;
    if (!header) return;
    var y = window.scrollY;
    var delta = y - lastY;
    header.classList.toggle('is-scrolled', y > 8);

    var focusInside = header.contains(document.activeElement);
    if (!menuOpen && !focusInside && y > window.innerHeight * 0.6 && delta > 6) {
      header.classList.add('is-hidden');
    } else if (delta < -6 || y < window.innerHeight * 0.6 || menuOpen) {
      header.classList.remove('is-hidden');
    }
    lastY = y;

    var probe = (header.offsetHeight || 64) / 2;
    var dark = document.body.getAttribute('data-header-default') === 'dark';
    for (var i = 0; i < toneSections.length; i++) {
      var r = toneSections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        dark = toneSections[i].getAttribute('data-header-tone') === 'dark';
        break;
      }
    }
    header.classList.toggle('is-dark', dark || menuOpen);
  }

  function requestHeaderUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    }
  }

  if (header) {
    window.addEventListener('scroll', requestHeaderUpdate, { passive: true });
    window.addEventListener('resize', requestHeaderUpdate);
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    updateHeader();
  }

  /* Mobile menu -------------------------------------------------------------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('site-menu');

  function focusables() {
    var list = [toggle];
    if (menu) {
      list = list.concat(Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])')));
    }
    return list;
  }

  function setMenu(open, restoreFocus) {
    if (!menu || !toggle) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if ('inert' in menu) menu.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('[data-menu-label]').textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    updateHeader();
    if (open) {
      var first = menu.querySelector('a[href]');
      if (first) window.setTimeout(function () { first.focus(); }, 60);
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  if (menu && toggle) {
    menu.setAttribute('aria-hidden', 'true');
    if ('inert' in menu) menu.inert = true;
    toggle.addEventListener('click', function () { setMenu(!menuOpen, true); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) setMenu(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(false, true);
      } else if (e.key === 'Tab') {
        var items = focusables();
        var firstEl = items[0];
        var lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (mq) {
      if (mq.matches && menuOpen) setMenu(false, false);
    });
  }

  /* Reveals ------------------------------------------------------------------- */
  var revealTargets = document.querySelectorAll('[data-reveal], [data-lines]');
  if ('IntersectionObserver' in window && root.classList.contains('motion-ok')) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(revealTargets, function (el) { revealObserver.observe(el); });
  } else {
    Array.prototype.forEach.call(revealTargets, function (el) { el.classList.add('is-in'); });
  }

  /* In-view video ----------------------------------------------------------------
     <video data-inview data-src="large.mp4" data-src-small="small.mp4">
     Sources are attached only when the video approaches the viewport, the
     smaller file on narrow screens or when the visitor asks to save data.
     Under reduced motion nothing autoplays; a button offers playback instead. */
  function pickSource(video) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var small = video.getAttribute('data-src-small');
    if (small && (saveData || window.innerWidth < 760)) return small;
    return video.getAttribute('data-src');
  }

  function attachSource(video) {
    if (video.getAttribute('src')) return;
    var src = pickSource(video);
    if (src) {
      video.setAttribute('src', src);
      video.load();
    }
  }

  var inviewVideos = document.querySelectorAll('video[data-inview]');
  Array.prototype.forEach.call(inviewVideos, function (video) {
    var frame = video.closest('[data-video-frame]');
    var button = frame ? frame.querySelector('[data-video-toggle]') : null;
    var userPaused = false;

    function setButton(playing) {
      if (!button) return;
      button.setAttribute('aria-pressed', String(playing));
      button.querySelector('[data-video-toggle-label]').textContent = playing ? 'Pause film' : 'Play film';
    }

    function play() {
      attachSource(video);
      var p = video.play();
      if (p && p.catch) p.catch(function () { setButton(false); });
    }

    video.addEventListener('play', function () { setButton(true); });
    video.addEventListener('pause', function () { setButton(false); });

    if (button) {
      button.hidden = false;
      button.addEventListener('click', function () {
        if (video.paused) { userPaused = false; play(); }
        else { userPaused = true; video.pause(); }
      });
    }

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (entry.intersectionRatio >= 0.35 && !prefersReducedMotion() && !userPaused) play();
          else if (entry.intersectionRatio > 0) attachSource(video);
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(video);
  });

  /* Studio readout ---------------------------------------------------------------
     A small piece of theatre: studio time, relative humidity and sky, derived
     deterministically from the date so every visitor sees the same weather. */
  function seeded(n) {
    var x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function updateReadout() {
    var now = new Date();
    var day = Math.floor(now.getTime() / 864e5);
    var hour = now.getUTCHours();
    var skies = ['Clear and dry', 'High cloud', 'Overcast, still', 'Mist on the col', 'Light rain'];
    var sky = skies[Math.floor(seeded(day + 0.31) * skies.length)];
    var rh = Math.round(46 + seeded(day * 24 + hour) * 32 + (sky === 'Light rain' ? 14 : 0));
    var curing = sky === 'Light rain' ? 'Suspended' : String(11 + Math.floor(seeded(day * 1.7) * 6)) + ' pieces';
    var time;
    try {
      time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }).format(now);
    } catch (err) {
      time = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    }
    var set = function (sel, text) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { el.textContent = text; });
    };
    set('[data-readout-time]', time);
    set('[data-readout-rh]', Math.min(rh, 96) + '%');
    set('[data-readout-sky]', sky);
    set('[data-readout-curing]', curing);
  }

  if (document.querySelector('[data-readout-time]')) {
    updateReadout();
    window.setInterval(updateReadout, 30000);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Fragment landing ---------------------------------------------------------------
     When a page is opened at a fragment (index.html#about), late-loading media
     can push the target down. Settle the position once everything has loaded. */
  if (window.location.hash.length > 1) {
    // Never fight a visitor who has already started moving around the page.
    var interacted = false;
    var noteInteraction = function () { interacted = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (type) {
      window.addEventListener(type, noteInteraction, { once: true, passive: true });
    });
    window.addEventListener('load', function () {
      if (interacted) return;
      var target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (!target) return;
      var padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      var offset = target.getBoundingClientRect().top - padding;
      if (Math.abs(offset) > 12) window.scrollTo({ top: window.scrollY + offset, behavior: 'instant' });
    });
  }
  window.addEventListener('load', function () {
    window.setTimeout(function () { root.classList.add('smooth-scroll'); }, 100);
  });
})();

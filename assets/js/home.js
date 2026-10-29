/* MudPies — homepage: raking light on the hero specimen, expedition timecode. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Raking light: a lamp follows the pointer across No. 001 so the surface
     can be read the way the studio reads it. Fine pointers only. */
  var frame = document.querySelector('[data-raking]');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (frame && finePointer && !reduceMotion) {
    var pending = null;
    frame.addEventListener('pointerenter', function () { frame.classList.add('is-lit'); });
    frame.addEventListener('pointerleave', function () { frame.classList.remove('is-lit'); });
    frame.addEventListener('pointermove', function (e) {
      if (pending) return;
      pending = window.requestAnimationFrame(function () {
        pending = null;
        var r = frame.getBoundingClientRect();
        frame.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        frame.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* Timecode overlay for the expedition film, as it would read on the camera. */
  var video = document.querySelector('[data-timecode-source]');
  var readout = document.querySelector('[data-timecode]');
  if (video && readout) {
    var FPS = 24;
    var START = 10 * 3600 + 42 * 60 + 8; // the moment the camera was switched on
    var raf = null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var format = function (t) {
      var total = START + t;
      var whole = Math.floor(total);
      return pad(Math.floor(whole / 3600) % 24) + ':' + pad(Math.floor(whole / 60) % 60) + ':' +
        pad(whole % 60) + ':' + pad(Math.floor((total - whole) * FPS));
    };
    var tick = function () {
      readout.textContent = format(video.currentTime);
      raf = window.requestAnimationFrame(tick);
    };
    readout.textContent = format(0);
    video.addEventListener('play', function () {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(tick);
    });
    video.addEventListener('pause', function () { window.cancelAnimationFrame(raf); });
  }
})();

/* MudPies — Field Notes: filter entries by kind; mark the entry being read. */
(function () {
  'use strict';

  var filters = document.querySelector('[data-note-filters]');
  var notes = Array.prototype.slice.call(document.querySelectorAll('.note[data-kind]'));
  var tocItems = Array.prototype.slice.call(document.querySelectorAll('.notes-toc li[data-kind]'));
  var count = document.querySelector('[data-note-count]');
  var empty = document.querySelector('[data-notes-empty]');
  var WORDS = ['No entries', 'One entry', 'Two entries', 'Three entries', 'Four entries', 'Five entries', 'Six entries', 'Seven entries', 'Eight entries'];

  if (filters) {
    filters.hidden = false;
    var buttons = Array.prototype.slice.call(filters.querySelectorAll('[data-kind]'));
    var apply = function (kind) {
      var shown = 0;
      notes.forEach(function (n) {
        var ok = kind === 'all' || n.getAttribute('data-kind') === kind;
        n.classList.toggle('is-filtered', !ok);
        if (ok) shown++;
      });
      tocItems.forEach(function (li) {
        li.classList.toggle('is-filtered', !(kind === 'all' || li.getAttribute('data-kind') === kind));
      });
      count.textContent = WORDS[shown] || shown + ' entries';
      empty.hidden = shown > 0;
    };
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        apply(b.getAttribute('data-kind'));
      });
    });
    // Following a link to an entry that is filtered out resets the filter.
    window.addEventListener('hashchange', function () {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target && target.classList.contains('is-filtered')) {
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-kind') === 'all')); });
        apply('all');
        target.scrollIntoView();
      }
    });
  }

  // Highlight the index entry for the note currently being read.
  if ('IntersectionObserver' in window) {
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('.notes-toc a'), function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (id) {
          if (id === e.target.id) links[id].setAttribute('aria-current', 'true');
          else links[id].removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    notes.forEach(function (n) { io.observe(n); });
  }
})();

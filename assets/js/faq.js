/* MudPies — Questions: live search, open/close all, and deep links that open
   the question they point to. The accordions themselves are native <details>. */
(function () {
  'use strict';

  var tools = document.querySelector('[data-faq-tools]');
  var input = document.querySelector('[data-faq-search]');
  var count = document.querySelector('[data-faq-count]');
  var empty = document.querySelector('[data-faq-empty]');
  var items = Array.prototype.slice.call(document.querySelectorAll('details.faq'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
  var openedBySearch = [];

  function normalise(s) { return s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim(); }
  items.forEach(function (d) { d.dataset.text = normalise(d.textContent); });

  function filter() {
    var q = normalise(input.value);
    var shown = 0;
    // Close anything the previous search opened, so results don't pile up.
    openedBySearch.forEach(function (d) { d.open = false; });
    openedBySearch = [];
    items.forEach(function (d) {
      var terms = q.split(' ').filter(Boolean);
      var ok = terms.every(function (t) { return d.dataset.text.indexOf(t) !== -1; });
      d.classList.toggle('is-filtered', !ok);
      if (ok) {
        shown++;
        if (q.length >= 3 && !d.open) { d.open = true; openedBySearch.push(d); }
      }
    });
    groups.forEach(function (g) { g.classList.toggle('is-filtered', !g.querySelector('details.faq:not(.is-filtered)')); });
    count.textContent = shown === items.length ? items.length + ' questions' : shown + ' of ' + items.length + ' questions';
    empty.hidden = shown !== 0;
  }

  if (tools && input) {
    tools.hidden = false;
    input.addEventListener('input', filter);
    document.querySelector('[data-faq-expand]').addEventListener('click', function () {
      items.forEach(function (d) { if (!d.classList.contains('is-filtered')) d.open = true; });
    });
    document.querySelector('[data-faq-collapse]').addEventListener('click', function () {
      items.forEach(function (d) { d.open = false; });
      openedBySearch = [];
    });
  }

  // faq.html#can-i-eat-one opens that answer (and clears any search hiding it).
  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (!target || target.tagName !== 'DETAILS') return;
    if (target.classList.contains('is-filtered') && input) {
      input.value = '';
      filter();
    }
    target.open = true;
    target.scrollIntoView({ block: 'start' });
    var summary = target.querySelector('summary');
    if (summary) summary.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', openFromHash);
  if (window.location.hash) window.addEventListener('load', openFromHash);
})();

// Cafet'MIAGE public page: two tabs, one for the opening days and one for the stock.
// No library. The tab is in the address (…/cafet/#stock, …/cafet/#horaires), so a link goes
// straight to it. Add ?ecran for the screen in front of the café: stock only, no tabs.
(function () {
  'use strict';

  var TABS = ['horaires', 'stock'];
  var TITLES = {
    horaires: "Jours d'ouverture — Cafet'MIAGE",
    stock: "Stock du service — Cafet'MIAGE",
  };
  var screenMode = new URLSearchParams(window.location.search).has('ecran');

  var tab = function (id) { return document.getElementById('tab-' + id); };
  var panel = function (id) { return document.getElementById('panel-' + id); };
  var fromHash = function () {
    var id = window.location.hash.replace('#', '');
    return TABS.indexOf(id) >= 0 ? id : null;
  };

  function show(id, writeHash) {
    TABS.forEach(function (t) {
      var on = t === id;
      tab(t).setAttribute('aria-selected', on ? 'true' : 'false');
      tab(t).tabIndex = on ? 0 : -1;
      panel(t).hidden = !on;
    });
    document.title = TITLES[id];
    if (writeHash) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + id);
      } catch (e) { /* the address stays as it is */ }
    }
  }

  TABS.forEach(function (id) {
    tab(id).addEventListener('click', function () { show(id, true); });
  });

  // Arrow keys move between tabs, as on any tab list.
  document.querySelector('.pc-tabs').addEventListener('keydown', function (e) {
    var current = e.target.closest && e.target.closest('.pc-tab');
    var at = current ? TABS.indexOf(current.id.replace('tab-', '')) : -1;
    if (at < 0) return;
    var next = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    next = (next + TABS.length) % TABS.length;
    show(TABS[next], true);
    tab(TABS[next]).focus();
  });

  window.addEventListener('hashchange', function () {
    var id = fromHash();
    if (id) show(id, false);
  });

  // The screen in front of the café only ever shows the stock.
  show(screenMode ? 'stock' : fromHash() || TABS[0], false);
})();

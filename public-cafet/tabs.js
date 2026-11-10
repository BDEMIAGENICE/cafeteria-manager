// Cafet'MIAGE public page: two tabs, one for the opening days and one for the stock.
// No library. The tab is in the address (…/cafet/#stock, …/cafet/#horaires), so a link goes
// straight to it. Add ?ecran for the screen in front of the café: stock only, no tabs.
//
// Changing tab is animated: a pill slides under the tab labels and the new tab slides in from
// the side it sits on. Nothing moves for people who ask their system for reduced motion.
(function () {
  'use strict';

  var I18N = window.CafetI18n;
  var TABS = ['horaires', 'stock'];
  var screenMode = new URLSearchParams(window.location.search).has('ecran');
  var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var current = null;

  var tab = function (id) { return document.getElementById('tab-' + id); };
  var panel = function (id) { return document.getElementById('panel-' + id); };
  var fromHash = function () {
    var id = window.location.hash.replace('#', '');
    return TABS.indexOf(id) >= 0 ? id : null;
  };

  // The pill behind the selected tab. Without it (this script not running) the selected tab
  // paints its own background, see .pc-tabs.has-pill in the stylesheet.
  var bar = document.querySelector('.pc-tabs');
  var pill = document.createElement('span');
  pill.className = 'pc-pill';
  pill.setAttribute('aria-hidden', 'true');
  bar.prepend(pill);

  // animate: slide to the tab; otherwise jump there (first paint, resize, a label that changed).
  function movePill(animate) {
    var target = tab(current);
    if (!target || !target.offsetWidth) return; // tabs hidden (?ecran)
    if (!animate || reducedMotion.matches) pill.classList.add('is-still');
    pill.style.width = target.offsetWidth + 'px';
    pill.style.height = target.offsetHeight + 'px';
    pill.style.transform = 'translate(' + target.offsetLeft + 'px, ' + target.offsetTop + 'px)';
    bar.classList.add('has-pill');
    if (!animate || reducedMotion.matches) {
      void pill.offsetWidth; // apply the jump before the transition comes back
      pill.classList.remove('is-still');
    }
  }

  // The new tab comes from the side where its label is.
  function slideIn(id, from) {
    var node = panel(id);
    node.classList.remove('pc-in-right', 'pc-in-left');
    void node.offsetWidth; // restart the animation if it was still running
    node.classList.add(TABS.indexOf(id) > TABS.indexOf(from) ? 'pc-in-right' : 'pc-in-left');
  }

  function show(id, options) {
    options = options || {};
    var previous = current;
    current = id;
    TABS.forEach(function (t) {
      var on = t === id;
      tab(t).setAttribute('aria-selected', on ? 'true' : 'false');
      tab(t).tabIndex = on ? 0 : -1;
      panel(t).hidden = !on;
    });
    document.title = I18N.t('title.' + id);
    var changed = Boolean(options.animate && previous && previous !== id);
    movePill(changed);
    if (changed && !reducedMotion.matches) slideIn(id, previous);
    if (options.writeHash) {
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + id);
      } catch (e) { /* the address stays as it is */ }
    }
  }

  TABS.forEach(function (id) {
    tab(id).addEventListener('click', function () { show(id, { animate: true, writeHash: true }); });
    panel(id).addEventListener('animationend', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('pc-in-right', 'pc-in-left');
    });
  });

  // Arrow keys move between tabs, as on any tab list.
  bar.addEventListener('keydown', function (e) {
    var focused = e.target.closest && e.target.closest('.pc-tab');
    var at = focused ? TABS.indexOf(focused.id.replace('tab-', '')) : -1;
    if (at < 0) return;
    var next = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    next = (next + TABS.length) % TABS.length;
    show(TABS[next], { animate: true, writeHash: true });
    tab(TABS[next]).focus();
  });

  window.addEventListener('hashchange', function () {
    var id = fromHash();
    if (id && id !== current) show(id, { animate: true });
  });

  // The title follows the language.
  I18N.onChange(function () { document.title = I18N.t('title.' + current); });

  // Labels change width with the language and when the font arrives: keep the pill on its tab.
  if (window.ResizeObserver) {
    var watcher = new ResizeObserver(function () { movePill(false); });
    TABS.forEach(function (id) { watcher.observe(tab(id)); });
  } else {
    window.addEventListener('resize', function () { movePill(false); });
  }

  // The screen in front of the café only ever shows the stock.
  show(screenMode ? 'stock' : fromHash() || TABS[0]);
})();

// Cafet'MIAGE public page, "Stock" tab. No sign-in, no build step, no library: it reads the
// public_stock() function of the app's Supabase database through its REST API.
//
// Add ?ecran to the address on the screen in front of the café: the page then shows only
// this tab, keeps the screen awake and slowly scrolls the list when it is longer than the screen.
(function () {
  'use strict';

  var site = window.PUBLIC_CONFIG || {};
  var config = site.stock || {};
  var I18N = window.CafetI18n;
  var t = I18N.t;
  var refreshMs = (config.refreshSeconds || 30) * 1000;
  var screenMode = new URLSearchParams(window.location.search).has('ecran');
  var RANK = { ok: 0, low: 1, out: 2 };

  var el = function (id) { return document.getElementById(id); };
  var items = null; // the last stock received
  var lastUpdate = null;
  var emptyKey = 'loading'; // what #stock-empty says while it is shown
  var failed = false; // the last load failed

  if (screenMode) document.getElementById('page').classList.add('ps-screen');

  // Numbers and prices follow the page's language ("2,50 €" / "€2.50").
  var qty, eur;
  function setFormats() {
    qty = new Intl.NumberFormat(I18N.locale(), { maximumFractionDigits: 1 });
    eur = new Intl.NumberFormat(I18N.locale(), { style: 'currency', currency: 'EUR' });
  }
  setFormats();
  var clock = function (d, seconds) {
    return d.toLocaleTimeString(I18N.locale(), {
      hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hourCycle: 'h23',
    });
  };

  // Text goes in with textContent only: names come from the database.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function render() {
    var groups = el('stock-groups');
    groups.replaceChildren();

    el('stock-empty').hidden = items.length > 0;
    if (!items.length) emptyKey = 'stock.none';

    var count = { ok: 0, low: 0, out: 0 };
    items.forEach(function (i) { count[i.status] += 1; });
    var summary = el('stock-summary');
    summary.hidden = !items.length;
    summary.replaceChildren();
    ['ok', 'low', 'out'].forEach(function (s) {
      var part = make('span', 'ps-count');
      part.append(make('span', 'ps-dot is-' + s), document.createTextNode(I18N.count('stock.count.' + s, count[s])));
      summary.append(part);
    });

    // Grouped by category; in each, what is left first, sold out last.
    var byCat = new Map();
    items.forEach(function (i) {
      var key = i.category || '';
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key).push(i);
    });
    var headings = byCat.size > 1 || (byCat.size === 1 && !byCat.has(''));

    byCat.forEach(function (list, category) {
      var section = make('section', 'ps-group');
      if (headings) section.append(make('h2', 'ps-cat', category || t('stock.other')));
      var grid = make('ul', 'ps-grid');
      list
        .slice()
        // product names are French, whatever the page's language: the order does not move on a switch
        .sort(function (a, b) { return RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name, 'fr'); })
        .forEach(function (i) {
          var li = make('li', 'ps-item is-' + i.status);
          li.append(make('span', 'ps-item-name', i.name));
          li.append(make('span', 'ps-item-qty', i.status === 'out' ? '0' : qty.format(i.quantity)));
          var foot = make('span', 'ps-item-foot');
          foot.append(make('span', 'ps-badge is-' + i.status, t('stock.status.' + i.status)));
          if (i.price != null) foot.append(make('span', 'ps-price', eur.format(i.price)));
          li.append(foot);
          grid.append(li);
        });
      section.append(grid);
      groups.append(section);
    });
  }

  // The messages around the list: what they say depends on the state and on the language.
  function renderMessages() {
    el('stock-empty').textContent = t(emptyKey);
    var alert = el('stock-alert');
    alert.hidden = !failed;
    if (failed) {
      alert.textContent = lastUpdate
        ? t('stock.lostConnection', { time: clock(lastUpdate) })
        : t('stock.unavailable');
    }
    // This is when the page was reloaded, not when the stock was counted: say so.
    el('stock-foot').textContent = lastUpdate
      ? t('stock.footUpdated', { time: clock(lastUpdate, true) })
      : t('stock.footDefault');
  }

  function showError() {
    failed = true;
    if (!lastUpdate) el('stock-empty').hidden = true;
    renderMessages();
  }

  var loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    try {
      var res = await fetch(site.supabaseUrl + '/rest/v1/rpc/public_stock', {
        method: 'POST',
        headers: { apikey: site.publishableKey, 'Content-Type': 'application/json' },
        body: '{}',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var received = await res.json();
      items = Array.isArray(received) ? received : [];
      lastUpdate = new Date();
      failed = false;
      render();
      renderMessages();
    } catch (e) {
      showError();
    } finally {
      loading = false;
    }
  }

  function tick() {
    var now = new Date();
    el('stock-time').textContent = clock(now);
    var date = now.toLocaleDateString(I18N.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
    el('stock-date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
  }

  // Keeps the café screen awake, where the browser allows it.
  var lock = null;
  async function keepAwake() {
    if (!screenMode || !('wakeLock' in navigator)) return;
    try { lock = await navigator.wakeLock.request('screen'); } catch (e) { /* the screen's settings decide */ }
  }

  // On the café screen, when the list is longer than the screen: scroll down slowly,
  // wait at the bottom, go back to the top, wait, and again.
  function autoScroll() {
    var STEP_MS = 40, WAIT_MS = 5000, wait = WAIT_MS;
    setInterval(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 4) return;
      if (wait > 0) { wait -= STEP_MS; return; }
      if (window.scrollY >= max - 1) {
        wait = WAIT_MS * 2;
        setTimeout(function () { window.scrollTo(0, 0); }, WAIT_MS);
        return;
      }
      window.scrollBy(0, 1);
    }, STEP_MS);
  }

  // Switching language redraws everything that is text.
  I18N.onChange(function () {
    setFormats();
    if (items) render();
    renderMessages();
    tick();
  });

  if (!site.supabaseUrl || !site.publishableKey || /COLLER_ICI|VOTRE-PROJET/.test(site.supabaseUrl + site.publishableKey)) {
    emptyKey = 'unconfigured';
    renderMessages();
    return;
  }

  renderMessages();
  tick();
  setInterval(tick, 1000);
  load();
  setInterval(load, refreshMs);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { load(); keepAwake(); }
  });
  keepAwake();
  if (screenMode) autoScroll();
})();

// Cafet'MIAGE public stock page. No sign-in, no build step, no library: it reads the
// public_stock() function of the app's Supabase database through its REST API.
//
// Add ?ecran to the address on the screen in front of the café: the page keeps the
// screen awake and slowly scrolls the list when it is longer than the screen.
(function () {
  'use strict';

  var config = window.PUBLIC_STOCK_CONFIG || {};
  var refreshMs = (config.refreshSeconds || 30) * 1000;
  var screenMode = new URLSearchParams(window.location.search).has('ecran');
  var LABELS = { ok: 'Disponible', low: 'Bientôt épuisé', out: 'Épuisé' };
  var PLURALS = { ok: 'disponibles', low: 'bientôt épuisés', out: 'épuisés' };
  var RANK = { ok: 0, low: 1, out: 2 };

  var el = function (id) { return document.getElementById(id); };
  var lastUpdate = null;

  if (screenMode) document.getElementById('page').classList.add('ps-screen');

  var qty = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  var eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  var clock = function (d, seconds) {
    return d.toLocaleTimeString('fr-FR', {
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

  function render(items) {
    var groups = el('groups');
    groups.replaceChildren();

    el('empty').hidden = items.length > 0;
    if (!items.length) el('empty').textContent = 'Aucun produit pour le moment.';

    var count = { ok: 0, low: 0, out: 0 };
    items.forEach(function (i) { count[i.status] += 1; });
    var summary = el('summary');
    summary.hidden = !items.length;
    summary.replaceChildren();
    ['ok', 'low', 'out'].forEach(function (s) {
      var part = make('span', 'ps-count');
      part.append(make('span', 'ps-dot is-' + s), document.createTextNode(count[s] + ' ' + (count[s] > 1 ? PLURALS[s] : LABELS[s].toLowerCase())));
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
      if (headings) section.append(make('h2', 'ps-cat', category || 'Autres'));
      var grid = make('ul', 'ps-grid');
      list
        .slice()
        .sort(function (a, b) { return RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name, 'fr'); })
        .forEach(function (i) {
          var li = make('li', 'ps-item is-' + i.status);
          li.append(make('span', 'ps-item-name', i.name));
          li.append(make('span', 'ps-item-qty', i.status === 'out' ? '0' : qty.format(i.quantity)));
          var foot = make('span', 'ps-item-foot');
          foot.append(make('span', 'ps-badge is-' + i.status, LABELS[i.status]));
          if (i.price != null) foot.append(make('span', 'ps-price', eur.format(i.price)));
          li.append(foot);
          grid.append(li);
        });
      section.append(grid);
      groups.append(section);
    });
  }

  function showError() {
    var alert = el('alert');
    alert.hidden = false;
    alert.textContent = lastUpdate
      ? 'Connexion perdue : stock affiché de ' + clock(lastUpdate) + '. Nouvel essai automatique.'
      : 'Le stock ne peut pas être affiché pour le moment. Nouvel essai automatique.';
    if (!lastUpdate) el('empty').hidden = true;
  }

  var loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    try {
      var res = await fetch(config.supabaseUrl + '/rest/v1/rpc/public_stock', {
        method: 'POST',
        headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
        body: '{}',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var items = await res.json();
      render(Array.isArray(items) ? items : []);
      lastUpdate = new Date();
      el('alert').hidden = true;
      el('foot').textContent =
        'Mis à jour à ' + clock(lastUpdate, true) + ' · actualisation automatique toutes les ' + refreshMs / 1000 + ' secondes';
    } catch (e) {
      showError();
    } finally {
      loading = false;
    }
  }

  function tick() {
    var now = new Date();
    el('time').textContent = clock(now);
    var date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    el('date').textContent = date.charAt(0).toUpperCase() + date.slice(1);
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

  if (!config.supabaseUrl || !config.publishableKey || /COLLER_ICI/.test(config.publishableKey)) {
    el('empty').textContent = 'Page pas encore configurée : renseignez la clé dans config.js.';
    return;
  }

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

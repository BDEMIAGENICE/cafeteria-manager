// Cafet'MIAGE public page, "Jours d'ouverture" tab. No sign-in, no build step, no library: it
// reads the public_opening() function of the app's Supabase database through its REST API.
(function () {
  'use strict';

  var site = window.PUBLIC_CONFIG || {};
  var config = site.opening || {};
  // The screen in front of the café (?ecran) only shows the stock: nothing to load here.
  if (new URLSearchParams(window.location.search).has('ecran')) return;
  var I18N = window.CafetI18n;
  var t = I18N.t;
  var days = Math.min(Math.max(config.days || 28, 1), 90);
  var refreshMs = (config.refreshSeconds || 300) * 1000;
  var TZ = 'Europe/Paris';

  var el = function (id) { return document.getElementById(id); };
  var rows = null; // [{ date: 'YYYY-MM-DD', open, time_label, special }], today first
  var lastUpdate = null;
  var emptyKey = 'loading'; // what #opening-empty says while it is shown
  var failed = false; // the last load failed

  // Text goes in with textContent only.
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // 'YYYY-MM-DD' -> a Date at UTC midnight, for formatting the calendar day itself.
  var asDate = function (key) {
    var p = key.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  };
  var fmt = function (key, opts) {
    return asDate(key).toLocaleDateString(I18N.locale(), Object.assign({ timeZone: 'UTC' }, opts));
  };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var longDay = function (key) { return fmt(key, { weekday: 'long', day: 'numeric', month: 'long' }); };
  var weekday = function (key) { return asDate(key).getUTCDay() || 7; }; // 1 = Monday
  var addDays = function (key, n) {
    var d = asDate(key);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  // "12:15–13:30" -> ["12:15", "13:30"]
  function hours(label) {
    var m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(label || '');
    if (!m) return null;
    var pad = function (h) { return h.length === 1 ? '0' + h : h; };
    return [pad(m[1]) + ':' + m[2], pad(m[3]) + ':' + m[4]];
  }
  var span = function (label) {
    var h = hours(label);
    return h ? h[0] + ' – ' + h[1] : label;
  };

  // A time in Paris as "HH:MM", whatever the device's time zone or the page's language: it is
  // compared with the opening hours as text, so it must always look like them.
  function parisTimeOf(date) {
    return date.toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  var parisClock = function () { return parisTimeOf(new Date()); };

  function nextOpening(fromIndex) {
    for (var i = fromIndex; i < rows.length; i++) if (rows[i].open) return rows[i];
    return null;
  }

  function renderToday() {
    if (!rows || !rows.length) return;
    var today = rows[0];
    var box = el('opening-today');
    var status = el('opening-today-status');
    var detail = el('opening-today-detail');
    var now = parisClock();
    var h = today.open ? hours(today.time_label) : null;
    var later = nextOpening(1);
    var nextText = later
      ? t('opening.nextOpening', { day: longDay(later.date), hours: span(later.time_label) })
      : t('opening.noOpening', { days: days });
    var state;

    if (h && now < h[0]) {
      state = 'is-soon';
      status.textContent = t('opening.opensAt', { time: h[0] });
      detail.textContent = t(today.special ? 'opening.todayFromToSpecial' : 'opening.todayFromTo', { from: h[0], to: h[1] });
    } else if (h && now < h[1]) {
      state = 'is-open';
      status.textContent = t('opening.openNow');
      detail.textContent = t('opening.until', { time: h[1] });
    } else if (h) {
      state = 'is-closed';
      status.textContent = t('opening.over');
      detail.textContent = nextText;
    } else {
      state = 'is-closed';
      status.textContent = t(today.special ? 'opening.closedSpecial' : 'opening.closedToday');
      detail.textContent = nextText;
    }
    box.className = 'po-today ' + state;
    box.hidden = false;
  }

  function renderWeeks() {
    var weeks = el('opening-weeks');
    weeks.replaceChildren();
    el('opening-empty').hidden = rows.length > 0;
    if (!rows.length) {
      emptyKey = 'opening.none';
      el('opening-empty').textContent = t(emptyKey);
      return;
    }

    var byDate = new Map(rows.map(function (r) { return [r.date, r]; }));
    var todayKey = rows[0].date;
    var monday = addDays(todayKey, 1 - weekday(todayKey));
    var last = rows[rows.length - 1].date;

    for (var w = 0, start = monday; start <= last; w++, start = addDays(start, 7)) {
      var section = make('section', 'po-week');
      var title = w === 0 ? t('opening.thisWeek') : w === 1 ? t('opening.nextWeek') : t('opening.weekOf', { date: fmt(start, { day: 'numeric', month: 'long' }) });
      section.append(make('h2', 'po-week-title', title));
      var grid = make('ol', 'po-grid');

      for (var i = 0; i < 7; i++) {
        var key = addDays(start, i);
        var row = byDate.get(key);
        var li = make('li', 'po-day');
        if (!row) {
          // before today, or past the last day shown
          li.classList.add('is-none');
          li.setAttribute('aria-hidden', 'true');
          li.append(make('span', 'po-day-name', fmt(key, { weekday: 'short' })));
          li.append(make('span', 'po-day-num', fmt(key, { day: 'numeric' })));
          grid.append(li);
          continue;
        }
        li.classList.add(row.open ? 'is-open' : row.special ? 'is-off' : 'is-closed');
        if (key === todayKey) li.classList.add('is-today');
        var head = make('span', 'po-day-head');
        head.append(make('span', 'po-day-name', cap(fmt(key, { weekday: 'long' }))));
        head.append(make('span', 'po-day-num', fmt(key, { day: 'numeric', month: 'short' })));
        li.append(head);
        if (row.open) {
          li.append(make('span', 'po-day-hours', span(row.time_label)));
          if (row.special) li.append(make('span', 'po-tag', t('opening.special')));
        } else {
          li.append(make('span', 'po-day-closed', t(row.special ? 'opening.closedExceptional' : 'opening.closed')));
        }
        if (key === todayKey) li.append(make('span', 'po-tag po-tag-today', t('opening.today')));
        grid.append(li);
      }
      section.append(grid);
      weeks.append(section);
    }
  }

  // The messages around the list: what they say depends on the state and on the language.
  function renderMessages() {
    el('opening-empty').textContent = t(emptyKey);
    var alert = el('opening-alert');
    alert.hidden = !failed;
    if (failed) {
      alert.textContent = lastUpdate
        ? t('opening.lostConnection', { time: parisTimeOf(lastUpdate) })
        : t('opening.unavailable');
    }
    el('opening-foot').textContent = lastUpdate
      ? t('opening.footUpdated', { time: parisTimeOf(lastUpdate) })
      : t('opening.footDefault');
  }

  function showError() {
    failed = true;
    if (!lastUpdate) el('opening-empty').hidden = true;
    renderMessages();
  }

  var loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    try {
      var res = await fetch(site.supabaseUrl + '/rest/v1/rpc/public_opening', {
        method: 'POST',
        headers: { apikey: site.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: days }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      rows = Array.isArray(data) ? data : [];
      lastUpdate = new Date();
      failed = false;
      renderWeeks();
      renderToday();
      renderMessages();
    } catch (e) {
      showError();
    } finally {
      loading = false;
    }
  }

  // Switching language redraws everything that is text.
  I18N.onChange(function () {
    if (rows) { renderWeeks(); renderToday(); }
    renderMessages();
  });

  if (!site.supabaseUrl || !site.publishableKey || /COLLER_ICI|VOTRE-PROJET/.test(site.supabaseUrl + site.publishableKey)) {
    emptyKey = 'unconfigured';
    renderMessages();
    return;
  }

  renderMessages();
  load();
  setInterval(load, refreshMs);
  setInterval(renderToday, 30000); // "opens at" turns into "open now" without a reload
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') load();
  });
})();

// Cafet'MIAGE public page: French and English. No library.
//
// Loaded first, as window.CafetI18n. Static text carries data-i18n="key" (its text) or
// data-i18n-label="key" (its aria-label) and is translated here. Text the other scripts build
// goes through t(key, params) and is redrawn from onChange(), which runs after each switch.
// What the database holds (product names, categories) is shown as it is.
//
// The language is the one chosen with the FR / EN buttons (kept on this device), otherwise the
// browser's, otherwise French. The screen in front of the café (?ecran) is always French.
(function () {
  'use strict';

  var STORAGE_KEY = 'cafet-lang';
  var LOCALES = { fr: 'fr-FR', en: 'en-GB' }; // en-GB: day before month, 24-hour clock, as in France

  var STRINGS = {
    fr: {
      'meta.description': "Les jours d'ouverture de la Cafet'MIAGE et son stock, mis à jour à la main par l'équipe au début de chaque service (pas en temps réel).",
      'title.horaires': "Jours d'ouverture — Cafet'MIAGE",
      'title.stock': "Stock du service — Cafet'MIAGE",
      'lang.label': 'Langue',
      'tabs.label': 'Rubriques',
      'tab.horaires': "Jours d'ouverture",
      'tab.stock': 'Stock',
      'loading': 'Chargement…',
      'unconfigured': 'Page pas encore configurée : renseignez la clé dans config.js.',

      'opening.title': "Jours d'ouverture",
      'opening.today': "Aujourd'hui",
      'opening.noticeLead': "Les jours d'ouverture changent d'une semaine à l'autre.",
      'opening.noticeBody': "Les semaines éloignées sont indicatives tant que l'équipe ne les a pas planifiées : jetez un œil à cette page avant de venir.",
      'opening.footDefault': 'Page actualisée automatiquement',
      'opening.footUpdated': 'Page actualisée à {time}',
      'opening.none': 'Aucun jour à afficher.',
      'opening.lostConnection': 'Connexion perdue : horaires affichés de {time}. Nouvel essai automatique.',
      'opening.unavailable': 'Les horaires ne peuvent pas être affichés pour le moment. Nouvel essai automatique.',
      'opening.nextOpening': 'Prochaine ouverture : {day}, {hours}.',
      'opening.noOpening': 'Aucune ouverture prévue dans les {days} prochains jours.',
      'opening.opensAt': 'Ouvre à {time}',
      'opening.todayFromTo': "Aujourd'hui de {from} à {to}.",
      'opening.todayFromToSpecial': "Aujourd'hui de {from} à {to} (horaires exceptionnels).",
      'opening.openNow': 'Ouvert maintenant',
      'opening.until': "Jusqu'à {time}.",
      'opening.over': 'Service terminé',
      'opening.closedSpecial': 'Fermé exceptionnellement',
      'opening.closedToday': "Fermé aujourd'hui",
      'opening.thisWeek': 'Cette semaine',
      'opening.nextWeek': 'Semaine prochaine',
      'opening.weekOf': 'Semaine du {date}',
      'opening.special': 'Exceptionnel',
      'opening.closedExceptional': 'Fermeture exceptionnelle',
      'opening.closed': 'Fermé',

      'stock.title': 'Stock du service',
      'stock.noticeLead': "Ce n'est pas le stock en temps réel.",
      'stock.noticeBody': "L'équipe le met à jour à la main au début de chaque service : en cours de service, il peut en rester moins que ce qui est affiché.",
      'stock.footDefault': 'Stock mis à jour à la main en début de service',
      'stock.footUpdated': 'Page rechargée à {time} · le stock, lui, est mis à jour à la main en début de service',
      'stock.none': 'Aucun produit pour le moment.',
      'stock.lostConnection': 'Connexion perdue : dernier chargement à {time}. Nouvel essai automatique.',
      'stock.unavailable': 'Le stock ne peut pas être affiché pour le moment. Nouvel essai automatique.',
      'stock.other': 'Autres',
      'stock.status.ok': 'Disponible',
      'stock.status.low': 'Bientôt épuisé',
      'stock.status.out': 'Épuisé',
      'stock.count.ok.one': '{n} disponible',
      'stock.count.ok.other': '{n} disponibles',
      'stock.count.low.one': '{n} bientôt épuisé',
      'stock.count.low.other': '{n} bientôt épuisés',
      'stock.count.out.one': '{n} épuisé',
      'stock.count.out.other': '{n} épuisés',
    },

    en: {
      'meta.description': "The Cafet'MIAGE opening days and its stock, updated by hand by the team at the start of each service (not in real time).",
      'title.horaires': "Opening days — Cafet'MIAGE",
      'title.stock': "Service stock — Cafet'MIAGE",
      'lang.label': 'Language',
      'tabs.label': 'Sections',
      'tab.horaires': 'Opening days',
      'tab.stock': 'Stock',
      'loading': 'Loading…',
      'unconfigured': 'Page not set up yet: fill in the key in config.js.',

      'opening.title': 'Opening days',
      'opening.today': 'Today',
      'opening.noticeLead': 'Opening days change from one week to the next.',
      'opening.noticeBody': 'Weeks further ahead are only indicative until the team has planned them: have a look at this page before you come.',
      'opening.footDefault': 'Page refreshes automatically',
      'opening.footUpdated': 'Page refreshed at {time}',
      'opening.none': 'No days to show.',
      'opening.lostConnection': 'Connection lost: showing the hours from {time}. Retrying automatically.',
      'opening.unavailable': "The opening days can't be shown right now. Retrying automatically.",
      'opening.nextOpening': 'Next opening: {day}, {hours}.',
      'opening.noOpening': 'No opening planned in the next {days} days.',
      'opening.opensAt': 'Opens at {time}',
      'opening.todayFromTo': 'Today from {from} to {to}.',
      'opening.todayFromToSpecial': 'Today from {from} to {to} (special hours).',
      'opening.openNow': 'Open now',
      'opening.until': 'Until {time}.',
      'opening.over': 'Service over',
      'opening.closedSpecial': 'Special closure',
      'opening.closedToday': 'Closed today',
      'opening.thisWeek': 'This week',
      'opening.nextWeek': 'Next week',
      'opening.weekOf': 'Week of {date}',
      'opening.special': 'Special',
      'opening.closedExceptional': 'Special closure',
      'opening.closed': 'Closed',

      'stock.title': 'Service stock',
      'stock.noticeLead': 'This is not the live stock.',
      'stock.noticeBody': 'The team updates it by hand at the start of each service: during service, there may be less left than what is shown.',
      'stock.footDefault': 'Stock updated by hand at the start of each service',
      'stock.footUpdated': 'Page reloaded at {time} · the stock itself is updated by hand at the start of each service',
      'stock.none': 'No products at the moment.',
      'stock.lostConnection': 'Connection lost: last loaded at {time}. Retrying automatically.',
      'stock.unavailable': "The stock can't be shown right now. Retrying automatically.",
      'stock.other': 'Other',
      'stock.status.ok': 'Available',
      'stock.status.low': 'Running low',
      'stock.status.out': 'Sold out',
      'stock.count.ok.one': '{n} available',
      'stock.count.ok.other': '{n} available',
      'stock.count.low.one': '{n} running low',
      'stock.count.low.other': '{n} running low',
      'stock.count.out.one': '{n} sold out',
      'stock.count.out.other': '{n} sold out',
    },
  };

  var screenMode = new URLSearchParams(window.location.search).has('ecran');
  var listeners = [];

  function saved() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === 'fr' || value === 'en' ? value : null;
    } catch (e) {
      return null; // storage blocked (private window…): the choice just is not kept
    }
  }

  function initial() {
    if (screenMode) return 'fr';
    var chosen = saved();
    if (chosen) return chosen;
    var browser = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^en/i.test(browser) ? 'en' : 'fr';
  }

  var lang = initial();

  function t(key, params) {
    var text = STRINGS[lang][key];
    if (text == null) text = STRINGS.fr[key];
    if (text == null) return key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      return params[name] != null ? params[name] : whole;
    });
  }

  // "1 disponible" / "3 disponibles": the .one or .other form of a key, with {n}.
  function count(key, n) {
    return t(key + (n > 1 ? '.other' : '.one'), { n: n });
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-label]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-label')));
    });
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('meta.description'));
    document.querySelectorAll('.pc-lang-btn').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  function setLang(next) {
    if (next !== 'fr' && next !== 'en') return;
    if (next === lang) return;
    lang = next;
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* not kept */ }
    apply();
    listeners.forEach(function (listener) { listener(lang); });
  }

  document.querySelectorAll('.pc-lang-btn').forEach(function (button) {
    button.addEventListener('click', function () { setLang(button.getAttribute('data-lang')); });
  });

  apply();

  window.CafetI18n = {
    t: t,
    count: count,
    lang: function () { return lang; },
    locale: function () { return LOCALES[lang]; },
    onChange: function (listener) { listeners.push(listener); },
  };
})();

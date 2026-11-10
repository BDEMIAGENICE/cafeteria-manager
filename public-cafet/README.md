# Page publique — jours d'ouverture et stock

Une seule page sans connexion, avec deux onglets : **Jours d'ouverture** et **Stock**. Elle lit
la même base Supabase que l'app. Adresse : `<adresse du site>/cafet/`.

- Fichiers statiques, sans build ni dépendance : `index.html`, `style.css`, `config.js`, et un
  script par partie (`i18n.js`, `tabs.js`, `opening.js`, `stock.js`).
- L'onglet est dans l'adresse : `…/cafet/#horaires` et `…/cafet/#stock` ouvrent directement
  l'onglet voulu. Sans rien, la page s'ouvre sur les jours d'ouverture.
- Changer d'onglet est animé : une pastille glisse sous l'onglet choisi et le contenu arrive
  par le côté de l'onglet. Rien ne bouge si le système demande de réduire les animations.
- La page est en français et en anglais. Les boutons **FR / EN**, en haut, changent la langue
  (dates, heures, prix et messages compris). Le choix est gardé sur l'appareil ; à la première
  visite, la page suit la langue du navigateur, sinon le français. L'écran `?ecran` reste en
  français. Les noms de produits et de catégories viennent de la base et ne sont pas traduits.
  Tous les textes sont dans `i18n.js` : pour modifier une phrase, c'est là.
- Les anciennes adresses `…/horaires/` et `…/stock/` (y compris `…/stock/?ecran`) redirigent
  vers le bon onglet : les liens déjà partagés continuent de marcher.

## Onglet « Jours d'ouverture »

Montre quels jours la Cafet'MIAGE ouvre, et à quelle heure, sur les 4 prochaines semaines.

- En haut, le bandeau d'aujourd'hui, selon l'heure de Paris :
  - jour d'ouverture, avant l'heure : un **compte à rebours** jusqu'à l'ouverture (« Ouvre dans
    03:14:58 ») qui défile à la seconde ;
  - pendant le service : un bandeau **vert**, « La cafet est ouverte actuellement », avec l'heure
    de fermeture ;
  - service fini : « Service terminé pour aujourd'hui » et le prochain jour d'ouverture ;
  - jour fermé : « Fermé aujourd'hui » (ou « Fermé exceptionnellement »), avec un encadré bien
    visible pour la **prochaine ouverture** (jour, horaire, « Demain » / « Dans 3 jours »).
- Les fermetures et horaires exceptionnels saisis dans l'app (« Modifier ce jour ») sont signalés.
- Actualisation toutes les 5 minutes (`opening.refreshSeconds`), sur `opening.days` jours
  (28 par défaut, 90 au plus).

La page appelle la fonction `public_opening(days)` (migration
`supabase/migrations/20261110100000_service_weeks.sql`). Elle applique la même règle que
l'app : l'exception de la date s'il y en a une, sinon le plan de sa semaine (les jours que
l'équipe a choisi d'ouvrir cette semaine-là), sinon l'horaire habituel du jour de la semaine.
Une semaine non planifiée suit donc l'horaire habituel : la page prévient que les semaines
éloignées sont indicatives. Elle ne renvoie que la date, ouvert ou non, l'horaire et si le jour
sort de l'ordinaire. Rien sur l'équipe ni sur les inscriptions.

## Onglet « Stock »

Affiche le stock de la Cafet'MIAGE, pour les étudiants et pour l'écran devant la cafet.

**Ce n'est pas un stock en temps réel** : l'équipe le met à jour à la main, au début de chaque
service (depuis l'écran Stock de l'app). L'onglet le dit en haut, en toutes lettres.

- La page se recharge toute seule toutes les 30 secondes (`stock.refreshSeconds` dans
  `config.js`), et dès qu'elle revient au premier plan, pour afficher le stock dès que l'équipe
  l'a mis à jour.
- Si le réseau coupe, le dernier stock reste affiché avec un message, et la page réessaie toute seule.
- « Page rechargée à … » en bas donne l'heure du dernier rechargement de la page, pas celle de
  la saisie du stock.

La page appelle la fonction `public_stock()` de la base (migration
`supabase/migrations/20261109000000_public_stock.sql`). La table des produits reste réservée
à l'équipe : la fonction ne renvoie que le nom, la catégorie, la quantité, l'état et le prix
de vente. Jamais le coût d'achat ni la consommation.

| État | Règle |
|---|---|
| Disponible | quantité au-dessus du minimum |
| Bientôt épuisé | quantité au minimum ou en dessous |
| Épuisé | quantité à 0 |

## Écran devant la cafet

Ouvrir l'adresse avec `?ecran` : `<adresse du site>/cafet/?ecran`

L'écran n'affiche que le stock, sans onglets. Les textes sont plus grands, le curseur est
masqué, l'écran ne se met pas en veille quand le navigateur le permet, et la liste défile
lentement si elle dépasse la hauteur de l'écran. Mettre le navigateur en plein écran (F11).
L'ancienne adresse `<adresse du site>/stock/?ecran` fonctionne toujours.

## Mise en ligne

Guide pas à pas, avec le SQL à copier et un dépannage : `docs/deployer-stock-public.html`
(à ouvrir dans un navigateur).

La page fait partie du build : `npm run build` copie ce dossier dans `dist/cafet/` et y met
les valeurs `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, les mêmes que l'app.
Elle est donc publiée avec le site, sur n'importe quel hébergeur (GitHub Pages, Vercel…).
Le build crée aussi `dist/stock/` et `dist/horaires/`, de simples redirections.

1. Exécuter dans l'éditeur SQL du projet Supabase `supabase/migrations/20261109000000_public_stock.sql`
   et `supabase/migrations/20261110100000_service_weeks.sql` (déjà fait si le site tourne).
2. Déployer le site comme d'habitude.

Pour héberger la page seule, ailleurs : copier ce dossier et remplir `config.js`
(Supabase, Project Settings > API Keys, « Publishable key »).

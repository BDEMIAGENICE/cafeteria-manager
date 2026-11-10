# Jours d'ouverture — page publique

Page sans connexion qui montre aux étudiants quels jours la Cafet'MIAGE ouvre, et à quelle
heure, sur les 4 prochaines semaines. Elle lit la même base Supabase que l'app.

- Fichiers statiques, sans build ni dépendance : `index.html`, `style.css`, `app.js`, `config.js`.
- En haut, l'état du jour selon l'heure de Paris : « Ouvre à 12:15 », « Ouvert maintenant »,
  « Service terminé » ou « Fermé », avec la prochaine ouverture.
- Les fermetures et horaires exceptionnels saisis dans l'app (« Modifier ce jour ») sont signalés.
- Actualisation toutes les 5 minutes (`refreshSeconds`), sur `days` jours (28 par défaut, 90 au plus).
- Lien vers la page stock, et inversement.

## Ce que voient les visiteurs

La page appelle la fonction `public_opening(days)` (migration
`supabase/migrations/20261110100000_service_weeks.sql`). Elle applique la même règle que
l'app : l'exception de la date s'il y en a une, sinon le plan de sa semaine (les jours que
l'équipe a choisi d'ouvrir cette semaine-là), sinon l'horaire habituel du jour de la semaine.
Une semaine non planifiée suit donc l'horaire habituel : la page prévient que les semaines
éloignées sont indicatives. Elle ne renvoie que la date, ouvert ou non, l'horaire et si le jour sort de
l'ordinaire. Rien sur l'équipe ni sur les inscriptions.

## Mise en ligne

La page fait partie du build : `npm run build` copie ce dossier dans `dist/horaires/` et y met
`VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, comme pour l'app et la page stock.
Adresse : `<adresse du site>/horaires/`.

1. Exécuter `supabase/migrations/20261110100000_service_weeks.sql` dans l'éditeur SQL du
   projet Supabase utilisé par le site (elle crée les plans de semaine et remplace
   `public_opening()`; la migration `20261110000000_public_opening.sql` n'est plus nécessaire
   si celle-ci est exécutée).
2. Déployer le site comme d'habitude.

Guide pas à pas : `docs/deployer-stock-public.html`.

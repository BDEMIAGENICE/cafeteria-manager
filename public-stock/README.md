# Stock en direct — page publique

Page sans connexion qui affiche ce qu'il reste au comptoir de la Cafet'MIAGE, pour les
étudiants et pour l'écran devant la cafet. Elle lit la même base Supabase que l'app.

- Fichiers statiques, sans build ni dépendance : `index.html`, `style.css`, `app.js`, `config.js`.
- Actualisation automatique toutes les 30 secondes (`refreshSeconds` dans `config.js`), et dès que la page revient au premier plan.
- Si le réseau coupe, le dernier stock reste affiché avec un message, et la page réessaie toute seule.
- Les stocks sont saisis une fois par service, au début : la page le dit en haut, car en cours
  de service il peut en rester moins que ce qui est affiché. « Page actualisée à … » en bas
  donne l'heure du dernier rechargement de la page, pas celle de la saisie du stock.

## Ce que voient les visiteurs

La page appelle la fonction `public_stock()` de la base (migration
`supabase/migrations/20261109000000_public_stock.sql`). La table des produits reste réservée
à l'équipe : la fonction ne renvoie que le nom, la catégorie, la quantité, l'état et le prix
de vente. Jamais le coût d'achat ni la consommation.

| État | Règle |
|---|---|
| Disponible | quantité au-dessus du minimum |
| Bientôt épuisé | quantité au minimum ou en dessous |
| Épuisé | quantité à 0 |

## Mise en ligne

Guide pas à pas, avec le SQL à copier et un dépannage : `docs/deployer-stock-public.html`
(à ouvrir dans un navigateur).

La page fait partie du build : `npm run build` copie ce dossier dans `dist/stock/` et y met
les valeurs `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, les mêmes que l'app.
Elle est donc publiée avec le site, sur n'importe quel hébergeur (GitHub Pages, Vercel…),
à l'adresse `<adresse du site>/stock/`.

1. Exécuter `supabase/migrations/20261109000000_public_stock.sql` dans l'éditeur SQL du
   projet Supabase utilisé par le site.
2. Déployer le site comme d'habitude.

Pour héberger la page seule, ailleurs : copier ce dossier et remplir `config.js`
(Supabase, Project Settings > API Keys, « Publishable key »).

## Écran devant la cafet

Ouvrir l'adresse avec `?ecran` :
`<adresse du site>/stock/?ecran`

Les textes sont plus grands, le curseur est masqué, l'écran ne se met pas en veille quand le
navigateur le permet, et la liste défile lentement si elle dépasse la hauteur de l'écran.
Mettre le navigateur en plein écran (F11).

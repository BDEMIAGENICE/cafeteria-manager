# Stock en direct — page publique

Page sans connexion qui affiche ce qu'il reste au comptoir de la Cafet'MIAGE, pour les
étudiants et pour l'écran devant la cafet. Elle lit la même base Supabase que l'app.

- Fichiers statiques, sans build ni dépendance : `index.html`, `style.css`, `app.js`, `config.js`.
- Actualisation automatique toutes les 30 secondes (`refreshSeconds` dans `config.js`), et dès que la page revient au premier plan.
- Si le réseau coupe, le dernier stock reste affiché avec un message, et la page réessaie toute seule.

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

1. Exécuter la migration dans l'éditeur SQL de Supabase.
2. Merger dans `main` : le workflow GitHub Pages copie ce dossier sur
   `https://tonoplas909.github.io/cafeteria-manager/stock/` et y met la clé publishable
   des variables du dépôt.

Pour héberger la page ailleurs, copier le dossier et remplir `publishableKey` dans
`config.js` (Supabase, Project Settings > API Keys, « Publishable key »).

## Écran devant la cafet

Ouvrir l'adresse avec `?ecran` :
`https://tonoplas909.github.io/cafeteria-manager/stock/?ecran`

Les textes sont plus grands, le curseur est masqué, l'écran ne se met pas en veille quand le
navigateur le permet, et la liste défile lentement si elle dépasse la hauteur de l'écran.
Mettre le navigateur en plein écran (F11).

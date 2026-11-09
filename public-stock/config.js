// Where the stock is read from: the same Supabase project as the Cafet'MIAGE app.
// `npm run build` fills both values in dist/stock/ from VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY, like the app. Fill them here only to host this folder alone:
// Supabase, Project Settings > API Keys ("Publishable key", meant for browsers).
window.PUBLIC_STOCK_CONFIG = {
  supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
  publishableKey: 'COLLER_ICI_LA_CLE_PUBLISHABLE', // sb_publishable_…
  refreshSeconds: 30,
};

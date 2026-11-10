// Where the data is read from: the same Supabase project as the Cafet'MIAGE app.
// `npm run build` fills the first two values in dist/cafet/ from VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY, like the app. Fill them here only to host this folder alone:
// Supabase, Project Settings > API Keys ("Publishable key", meant for browsers).
window.PUBLIC_CONFIG = {
  supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
  publishableKey: 'COLLER_ICI_LA_CLE_PUBLISHABLE', // sb_publishable_…
  stock: { refreshSeconds: 30 },
  opening: {
    days: 28, // how many days ahead, from today (1 to 90)
    refreshSeconds: 300,
  },
};

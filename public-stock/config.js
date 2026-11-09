// Where the stock is read from: the same Supabase project as the Cafet'MIAGE app.
// The publishable key is meant for browsers (the app ships it to every visitor too):
// copy it from Supabase, Project Settings > API Keys, "Publishable key".
window.PUBLIC_STOCK_CONFIG = {
  supabaseUrl: 'https://pqwwmspzrvdbaceuotky.supabase.co',
  publishableKey: 'COLLER_ICI_LA_CLE_PUBLISHABLE', // sb_publishable_…
  refreshSeconds: 30,
};

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// After a build, give the service worker the list of this build's files (so the whole app is
// stored on first visit and opens offline) and a cache name that changes with every deploy.
function precacheServiceWorker() {
  return {
    name: 'precache-service-worker',
    apply: 'build',
    writeBundle(options, bundle) {
      const out = options.dir ? path.resolve(options.dir) : path.resolve('dist');
      const swPath = path.join(out, 'sw.js');
      if (!fs.existsSync(swPath)) return;

      const bundled = Object.keys(bundle).filter((f) => f.startsWith('assets/'));
      const fontsDir = path.join(out, 'fonts');
      const fonts = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir).map((f) => `fonts/${f}`) : [];
      const files = [...bundled, ...fonts].sort();
      const version = crypto.createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);

      const sw = fs
        .readFileSync(swPath, 'utf8')
        .replace('/*__PRECACHE__*/[]', JSON.stringify(files))
        .replace('__BUILD__', version);
      fs.writeFileSync(swPath, sw);
    },
  };
}

// The public page (no sign-in) ships with the site, set up with the same Supabase values the
// app is built with. It is part of the build so it works on any host (GitHub Pages, Vercel, …)
// without an extra deploy step. It is a folder of static files: one page, one tab for the
// opening days and one for the stock.
const PUBLIC_PAGES = [{ from: 'public-cafet', to: 'cafet' }];

// The opening days and the stock used to be two pages, /horaires/ and /stock/. Those
// addresses were shared, so they stay and lead to the matching tab (keeping ?ecran).
const LEGACY_PAGES = { stock: 'stock', horaires: 'horaires' }; // old folder -> tab

const redirectPage = (tab) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Cafet'MIAGE</title>
    <script>
      // Served without the closing slash, "../cafet/" would point one level too high.
      if (!/\\/$|\\.html$/.test(location.pathname)) location.replace(location.pathname + '/' + location.search + location.hash);
      else location.replace('../cafet/' + location.search + '#${tab}');
    </script>
  </head>
  <body>
    <p><a href="../cafet/#${tab}">Cafet'MIAGE</a></p>
  </body>
</html>
`;

function publicPages(env) {
  return {
    name: 'public-pages',
    apply: 'build',
    writeBundle(options) {
      const out = options.dir ? path.resolve(options.dir) : path.resolve('dist');
      for (const [folder, tab] of Object.entries(LEGACY_PAGES)) {
        fs.mkdirSync(path.join(out, folder), { recursive: true });
        fs.writeFileSync(path.join(out, folder, 'index.html'), redirectPage(tab));
      }
      for (const page of PUBLIC_PAGES) {
        const target = path.join(out, page.to);
        fs.cpSync(path.resolve(page.from), target, { recursive: true });
        fs.rmSync(path.join(target, 'README.md'), { force: true });
        const config = path.join(target, 'config.js');
        const filled = fs
          .readFileSync(config, 'utf8')
          .replace(/supabaseUrl: '[^']*'/, `supabaseUrl: ${JSON.stringify(env.VITE_SUPABASE_URL ?? '')}`)
          .replace(/publishableKey: '[^']*'/, `publishableKey: ${JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')}`);
        fs.writeFileSync(config, filled);
      }
    },
  };
}

// Relative base so the build works from a GitHub Pages sub-path (/<repo>/).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return { base: './', plugins: [react(), precacheServiceWorker(), publicPages(env)] };
});

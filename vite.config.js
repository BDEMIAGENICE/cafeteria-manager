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

// The public pages (no sign-in) ship with the site, set up with the same Supabase values the
// app is built with. They are part of the build so they work on any host (GitHub Pages,
// Vercel, …) without an extra deploy step. Each is a folder of static files.
const PUBLIC_PAGES = [
  { from: 'public-stock', to: 'stock' }, // what is left on the counter
  { from: 'public-opening', to: 'horaires' }, // which days the café opens
];

function publicPages(env) {
  return {
    name: 'public-pages',
    apply: 'build',
    writeBundle(options) {
      const out = options.dir ? path.resolve(options.dir) : path.resolve('dist');
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

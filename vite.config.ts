import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import securityHeaders from './infra/security-headers.json' with { type: 'json' };

const FELT = '#1d3b2a';

export default defineConfig({
  plugins: [
    react(),
    /**
     * The installable, offline PWA (NF-5, ADR-0006). The whole build is
     * precached, so the game runs with no network once it has loaded.
     * `autoUpdate` swaps a new service worker in on the next launch; the
     * game is saved after every action, so nothing is lost when it does.
     * Unknown paths fall back to `index.html`, matching CloudFront's
     * 403/404 mapping in `infra/left-bauer.yaml`.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon.svg', 'apple-touch-icon.png', 'sounds/*.mp3'],
      manifest: {
        name: 'Left Bauer',
        short_name: 'Left Bauer',
        description: 'Euchre against computer players.',
        theme_color: FELT,
        background_color: FELT,
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,mp3}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/workbox-/],
      },
      // The service worker stays out of the dev server, where it would fight HMR.
      devOptions: { enabled: false },
    }),
  ],
  // The production headers (infra/left-bauer.yaml), so the E2E run tests the CSP.
  preview: { headers: securityHeaders },
  // Shown on the About screen (UI-3).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});

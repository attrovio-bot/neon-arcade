import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * BASE_PATH is injected by CI so the site works from a project page
 * (https://user.github.io/repo/) as well as from a custom domain.
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Neon Arcade',
        short_name: 'Arcade',
        description: 'Binary game packs, downloaded on demand and cached for offline play.',
        theme_color: '#05060a',
        background_color: '#05060a',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Game packs (*.arcp) are deliberately NOT precached: they are opt-in
        // downloads that live in IndexedDB so they can be listed and deleted.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['**/packs/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/packs/index.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arcade-catalog',
              networkTimeoutSeconds: 4,
              expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 4 },
            },
          },
        ],
      },
    }),
  ],
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/winweb-cockpit/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt' statt 'autoUpdate': iOS erkennt eine neue Version manchmal nicht
      // zuverlässig von selbst. Die App registriert den Service Worker deshalb selbst
      // (injectRegister: false) und zeigt einen Button zum manuellen Aktualisieren an,
      // der auch jederzeit einen frischen Check erzwingen kann.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Winweb Cockpit',
        short_name: 'Cockpit',
        description: 'Management-Cockpit für Finanzen, Vertrieb und Projekte – komplett offline',
        theme_color: '#17140f',
        background_color: '#17140f',
        display: 'standalone',
        start_url: '/winweb-cockpit/',
        scope: '/winweb-cockpit/',
        icons: [
          {
            src: 'icon-192-v1.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512-v1.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Fester Cache-Namens-Präfix, damit der "App aktualisieren"-Button (siehe
        // src/lib/pwaUpdate.tsx) beim Aufräumen zuverlässig NUR die eigenen Caches trifft
        // und nicht die einer anderen App auf derselben Domain (marschummers.github.io).
        cacheId: 'winweb-cockpit',
      },
    }),
  ],
})

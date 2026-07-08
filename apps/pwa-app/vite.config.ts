import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTablet = mode === 'tablet';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        // Only run PWA features in full on the offline tablet
        // Or keep it for both, but configure caching strictly for offline capabilities in tablet mode
        manifest: {
          id: '/',
          start_url: '/',
          scope: '/',
          name: isTablet ? 'Barefoot Doctors' : 'Afiyet Clinical Dashboard',
          short_name: isTablet ? 'Barefoot Doctors' : 'Afiyet Admin',
          description: 'Healthcare platform for rural and underserved areas.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Pre-cache all static assets built by Vite
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Optimize offline operations
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@afiyet/shared': path.resolve(__dirname, '../../packages/shared/src'),
        events: 'events',
      }
    },
    define: {
      // Inject target version so client app can dynamically toggle routes/features
      'import.meta.env.VITE_APP_TARGET': JSON.stringify(isTablet ? 'tablet' : 'dashboard'),
      'global': 'globalThis',
      'process.env': '{}'
    },
    server: {
      port: 3000,
      host: true
    },
    preview: {
      port: 3000,
      host: true
    }
  };
});

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Niagara Navigator',
        short_name: 'Navigator',
        description: 'Tesla-inspired Building Automation Dashboard',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in dev mode for testing
      }
    })
  ],
  base: '/file/web1/', // Use absolute path from station root (like LivePoints.html)
  build: {
    assetsDir: 'assets',
    // Build as IIFE (non-module) for Niagara ord?file: compatibility
    rollupOptions: {
      output: {
        format: 'iife', // IIFE format works with ord?file: scheme
        name: 'NiagaraDashboard',
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        inlineDynamicImports: true // Single bundle file
      }
    }
  }
})

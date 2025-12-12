import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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

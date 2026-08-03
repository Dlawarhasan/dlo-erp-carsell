import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'DLO ERP — پێشانگای ئۆتۆمبێل',
        short_name: 'DLO ERP',
        description: 'بەڕێوەبردنی تەواوی پێشانگای ئۆتۆمبێل — حسابات، عەقد، ئۆتۆمبێل',
        lang: 'ckb',
        dir: 'rtl',
        start_url: './',
        display: 'standalone',
        background_color: '#0B0F14',
        theme_color: '#0B0F14',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase'
            if (id.includes('tesseract')) return 'ocr'
            if (id.includes('zxing')) return 'scanner'
            if (id.includes('jszip')) return 'zip'
            return 'vendor'
          }
        },
      },
    },
  },
})

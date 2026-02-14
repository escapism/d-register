import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from 'vite-plugin-pwa'
import Unfonts from "unplugin-fonts/vite";
import Icons from "unplugin-icons/vite";
import Components from "unplugin-vue-components/vite";
import IconsResolver from "unplugin-icons/resolver";
import { fileURLToPath, URL } from 'node:url'

const base = "/d-register/"

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    Unfonts({
      google: {
        families: [{
          name: "M PLUS 1",
          styles: 'wght@400;500',
          defer: true
        }],
      },
    }),
    Icons({
      compiler: "vue3",
      autoInstall: true,
      scale: 0,
    }),
    Components({
      resolvers: [
        IconsResolver({ prefix: "i", enabledCollections: ["octicon"] }),
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dレジ',
        short_name: '同人レジ',
        description: '同人誌即売会用レジアプリ',
        theme_color: '#131416',
        background_color: '#131416',
        lang: "ja",
        icons: [
          { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Google Fontsなどの外部リソースもキャッシュに含める設定
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
});

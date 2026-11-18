import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(() => {
  const envFile = path.resolve(import.meta.dirname || '.', '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }

  const isSingleFile = process.env.SINGLE_FILE === 'true';
  const basePath = isSingleFile ? './' : process.env.VITE_BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(isSingleFile
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
              manifest: {
                id: basePath,
                name: 'I-LAB',
                short_name: 'I-LAB',
                description: 'I-LAB: Master naming, reading, and writing chemical compounds.',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                start_url: basePath,
                scope: basePath,
                icons: [
                  {
                    src: `${basePath.replace(/\/$/, '')}/pwa-192x192.png`,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: `${basePath.replace(/\/$/, '')}/pwa-512x512.png`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: `${basePath.replace(/\/$/, '')}/pwa-512x512.png`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                navigateFallbackDenylist: [/^\/api\//],
              },
              devOptions: {
                enabled: true,
                type: 'module',
              },
            }),
          ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

function singleFileOfflinePlugin(rootDir: string, outDir: string): Plugin {
  const iconSvgPath = path.resolve(rootDir, 'public/icon.svg');
  const iconDataUri = fs.existsSync(iconSvgPath)
    ? `data:image/svg+xml;base64,${fs.readFileSync(iconSvgPath).toString('base64')}`
    : '';

  return {
    name: 'ilab-single-file-offline',
    apply: 'build',
    transformIndexHtml(html) {
      let nextHtml = html.replace(
        /<link\s+rel="apple-touch-icon"[^>]*>\s*/gi,
        ''
      );
      if (iconDataUri) {
        nextHtml = nextHtml.replace(
          /<link\s+rel="icon"[^>]*href="[^"]*icon\.svg"[^>]*>/gi,
          `<link rel="icon" type="image/svg+xml" href="${iconDataUri}" />`
        );
      }
      return nextHtml;
    },
    closeBundle() {
      const builtIndex = path.resolve(outDir, 'index.html');
      const targetFile = path.resolve(outDir, 'compound-naming-guide.html');
      if (fs.existsSync(builtIndex)) {
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }
        fs.renameSync(builtIndex, targetFile);
      }
    },
  };
}

export default defineConfig(() => {
  const rootDir = import.meta.dirname || '.';
  const envFile = path.resolve(rootDir, '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }

  const pkgPath = path.resolve(rootDir, 'package.json');
  let appVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
    if (pkg.version && pkg.version !== '0.0.0') {
      appVersion = pkg.version;
    }
  } catch {
    // keep default version
  }

  const isSingleFile = process.env.SINGLE_FILE === 'true';
  const isHostedAtRoot = Boolean(
    process.env.CONTROL_PLANE_PORT ||
      process.env.DISABLE_HMR === 'true' ||
      process.env.K_SERVICE ||
      process.env.VERCEL
  );
  const rawBasePath = isSingleFile
    ? './'
    : isHostedAtRoot
      ? '/'
      : process.env.VITE_BASE_PATH || '/';
  const basePath =
    rawBasePath === './'
      ? './'
      : `/${rawBasePath.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
  const assetPrefix = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const singleOutDir = path.resolve(rootDir, 'dist-single');

  return {
    base: basePath,
    define: {
      __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || appVersion),
      __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
      __APP_IS_SINGLE_FILE__: JSON.stringify(isSingleFile),
      __SINGLE_FILE_SIZE_BYTES__: JSON.stringify(
        Number(process.env.SINGLE_FILE_SIZE_BYTES || 0) || 0
      ),
    },
    build: isSingleFile
      ? {
          outDir: 'dist-single',
          emptyOutDir: true,
          copyPublicDir: false,
          minify: 'esbuild' as const,
          cssMinify: true,
          assetsInlineLimit: 100_000_000,
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
          minify: 'esbuild' as const,
          cssMinify: true,
        },
    plugins: [
      react(),
      tailwindcss(),
      ...(isSingleFile
        ? [
            viteSingleFile({ removeViteModuleLoader: false }),
            singleFileOfflinePlugin(rootDir, singleOutDir),
          ]
        : [
            VitePWA({
              registerType: 'prompt',
              injectRegister: 'auto',
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
                    src: `${assetPrefix}/pwa-192x192.png`,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: `${assetPrefix}/pwa-512x512.png`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: `${assetPrefix}/pwa-maskable-512x512.png`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff,woff2,webmanifest}'],
                globIgnores: ['**/compound-naming-guide.html', '**/*.pdf'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                clientsClaim: true,
                cleanupOutdatedCaches: true,
                navigateFallback: 'index.html',
                navigateFallbackDenylist: [/^\/api\//, /compound-naming-guide\.html$/i],
                runtimeCaching: [
                  {
                    urlPattern: ({ url, sameOrigin, request }) =>
                      sameOrigin &&
                      request.method === 'GET' &&
                      !url.pathname.startsWith('/api/') &&
                      !url.pathname.endsWith('/sw.js') &&
                      !url.pathname.endsWith('/dev-sw.js') &&
                      !url.pathname.endsWith('/compound-naming-guide.html'),
                    handler: 'NetworkFirst',
                    options: {
                      cacheName: 'ilab-offline-runtime-v1',
                      networkTimeoutSeconds: 3,
                      matchOptions: {
                        ignoreVary: true,
                      },
                      cacheableResponse: {
                        statuses: [0, 200],
                      },
                      expiration: {
                        maxEntries: 600,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                      },
                    },
                  },
                ],
              },
              devOptions: {
                enabled: true,
                type: 'classic',
                navigateFallback: 'index.html',
                navigateFallbackAllowlist: [/^\/(?!api\/)/],
              },
            }),
          ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
        ...(isSingleFile
          ? {
              'virtual:pwa-register': path.resolve(rootDir, 'src/utils/pwaRegisterStub.ts'),
            }
          : {}),
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

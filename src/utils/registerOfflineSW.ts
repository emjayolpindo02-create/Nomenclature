import { registerSW } from 'virtual:pwa-register';
import { isOfflineFileCopy } from '../config/appInfo';

let warmupStarted = false;

function getNormalizedBasePath(): string {
  const raw = import.meta.env.BASE_URL || '/';
  if (raw === './') return '/';
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

async function warmDevRuntimeCache(basePath: string): Promise<void> {
  if (warmupStarted || typeof window === 'undefined' || !navigator.onLine) {
    return;
  }
  warmupStarted = true;

  try {
    const waitForController = async () => {
      if (navigator.serviceWorker.controller) return;
      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 4000);
        const handleChange = () => {
          window.clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleChange);
      });
    };

    await navigator.serviceWorker.ready;
    await waitForController();

    if (!navigator.serviceWorker.controller) return;

    const origin = window.location.origin;
    const urls = new Set<string>([
      `${origin}${basePath}`,
      `${origin}${basePath}manifest.webmanifest`,
      `${origin}${basePath}icon.svg`,
      `${origin}${basePath}pwa-192x192.png`,
      `${origin}${basePath}pwa-512x512.png`,
    ]);

    const perfEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const entry of perfEntries) {
      const name = entry.name;
      if (
        name.startsWith(origin) &&
        !name.includes('/api/') &&
        !name.includes('sw.js') &&
        !name.includes('workbox-') &&
        !name.toLowerCase().endsWith('.pdf')
      ) {
        urls.add(name);
      }
    }

    const list = Array.from(urls);
    const batchSize = 8;
    for (let i = 0; i < list.length; i += batchSize) {
      if (!navigator.onLine) break;
      const chunk = list.slice(i, i + batchSize);
      await Promise.all(
        chunk.map((u) =>
          fetch(u, { credentials: 'same-origin' }).catch(() => undefined)
        )
      );
    }
  } catch {
    // Ignore dev cache warmup errors
  }
}

export function registerOfflineServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (isOfflineFileCopy()) return;
  if (!('serviceWorker' in navigator)) return;

  const basePath = getNormalizedBasePath();

  if (import.meta.env.DEV) {
    const devSwUrl = `${basePath}dev-sw.js?dev-sw`;
    navigator.serviceWorker
      .register(devSwUrl, { scope: basePath, type: 'classic' })
      .then(() => {
        if (document.readyState === 'complete') {
          void warmDevRuntimeCache(basePath);
        } else {
          window.addEventListener(
            'load',
            () => {
              void warmDevRuntimeCache(basePath);
            },
            { once: true }
          );
        }
      })
      .catch(() => {
        // Ignore service worker registration errors in restricted browsers
      });
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, registration) {
      if (registration && typeof registration.update === 'function') {
        window.addEventListener('online', () => {
          void registration.update().catch(() => undefined);
        });
      }
    },
    onRegisterError() {
      // Fallback direct registration if virtual:pwa-register encounters any issue
      navigator.serviceWorker
        .register(`${basePath}sw.js`, { scope: basePath })
        .catch(() => undefined);
    },
  });
}

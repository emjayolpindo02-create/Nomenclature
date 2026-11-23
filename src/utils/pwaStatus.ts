import { useEffect, useState } from 'react';

export interface PwaStatusSnapshot {
  offlineReady: boolean;
  updateAvailable: boolean;
}

let state: PwaStatusSnapshot = {
  offlineReady: false,
  updateAvailable: false,
};

let applyUpdateFn: (() => Promise<void>) | null = null;
const listeners = new Set<(next: PwaStatusSnapshot) => void>();

function emit() {
  const snapshot = { ...state };
  for (const listener of listeners) {
    try {
      listener(snapshot);
    } catch {
      // ignore listener errors
    }
  }
}

export function setPwaOfflineReady(ready: boolean): void {
  if (state.offlineReady === ready) return;
  state = { ...state, offlineReady: ready };
  emit();
}

export function setPwaUpdateAvailable(
  available: boolean,
  updater?: (() => Promise<void>) | null
): void {
  if (updater !== undefined) {
    applyUpdateFn = updater;
  }
  if (state.updateAvailable === available) return;
  state = { ...state, updateAvailable: available };
  emit();
}

export function dismissPwaUpdateBanner(): void {
  if (!state.updateAvailable) return;
  state = { ...state, updateAvailable: false };
  emit();
}

export async function applyPwaUpdate(): Promise<void> {
  if (applyUpdateFn) {
    await applyUpdateFn();
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function usePwaStatus(): PwaStatusSnapshot {
  const [snapshot, setSnapshot] = useState<PwaStatusSnapshot>(() => ({ ...state }));

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot({ ...state });
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  return snapshot;
}

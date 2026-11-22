const memoryStore = new Map<string, string>();
let storageFailed = false;
let probeCompleted = false;
const listeners = new Set<(failed: boolean) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(storageFailed);
    } catch {
      // ignore subscriber errors
    }
  }
}

function markStorageFailed() {
  if (!storageFailed) {
    storageFailed = true;
    notifyListeners();
  }
}

function getNativeLocalStorage(
  customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  if (customStorage !== undefined) return customStorage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    markStorageFailed();
  }
  return null;
}

export function probeStorageAvailability(
  customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): boolean {
  const storage = getNativeLocalStorage(customStorage);
  if (!storage) {
    markStorageFailed();
    probeCompleted = true;
    return false;
  }
  try {
    const probeKey = '__ilab_storage_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    probeCompleted = true;
    return true;
  } catch {
    markStorageFailed();
    probeCompleted = true;
    return false;
  }
}

export function hasStorageFailure(): boolean {
  if (!probeCompleted && typeof window !== 'undefined') {
    probeStorageAvailability();
  }
  return storageFailed;
}

export function subscribeStorageFailure(listener: (failed: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function safeGetItem(
  key: string,
  customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): string | null {
  const storage = getNativeLocalStorage(customStorage);
  if (storage) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        memoryStore.set(key, value);
        return value;
      }
    } catch {
      markStorageFailed();
    }
  } else if (typeof window !== 'undefined') {
    markStorageFailed();
  }
  return memoryStore.get(key) ?? null;
}

export function safeSetItem(
  key: string,
  value: string,
  customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): boolean {
  memoryStore.set(key, value);
  const storage = getNativeLocalStorage(customStorage);
  if (!storage) {
    if (typeof window !== 'undefined' || customStorage === null) {
      markStorageFailed();
    }
    return false;
  }
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    markStorageFailed();
    return false;
  }
}

export function safeRemoveItem(
  key: string,
  customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): void {
  memoryStore.delete(key);
  const storage = getNativeLocalStorage(customStorage);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    markStorageFailed();
  }
}

export function resetStorageFallbackForTests(): void {
  memoryStore.clear();
  storageFailed = false;
  probeCompleted = false;
}

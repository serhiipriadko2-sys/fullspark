/**
 * storageCompat — безопасный доступ к localStorage
 *
 * Цель:
 * - Не падать в Node/Vitest (где localStorage отсутствует)
 * - Не спамить stderr "localStorage is not defined"
 * - Сохранить поведение в браузере без изменений
 */
const memory = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (!hasLocalStorage()) return memory.get(key) ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    if (!hasLocalStorage()) {
      memory.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // if browser storage is unavailable (quota/private mode), keep a best-effort fallback
      memory.set(key, value);
    }
  },

  removeItem(key: string): void {
    if (!hasLocalStorage()) {
      memory.delete(key);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },

  /** For tests only */
  _clearMemoryFallback(): void {
    memory.clear();
  },
};


export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageService implements StorageService {
  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isBrowser()) return null;
    try {
      const data = window.localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`[StorageService] Error reading key "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[StorageService] Error writing key "${key}":`, error);
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`[StorageService] Error removing key "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error("[StorageService] Error clearing storage:", error);
    }
  }
}

export const storageService = new LocalStorageService();

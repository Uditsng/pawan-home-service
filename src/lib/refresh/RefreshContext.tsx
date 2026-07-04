"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react";
import { storageService } from "../storage/StorageService";
import { processOfflineQueue, getOfflineQueue } from "../offline/offlineQueue";
import { createClient } from "@/utils/supabase/client";

// Cache Envelope Structure
export interface CacheEnvelope<T> {
  data: T;
  updatedAt: number; // timestamp in ms
  expiresAt: number; // timestamp in ms
  version: string;   // client version
}

// Priorities
export type RefreshPriority = "high" | "medium" | "low";

// Registry for key priorities
const KEY_PRIORITIES: Record<string, RefreshPriority> = {
  booking_active: "high",
  current_job: "high",
  notifications: "high",
  otp: "high",
  payment_status: "high",
  wallet: "medium",
  user_profile: "medium",
  addresses: "medium",
  services: "low",
  categories: "low",
  faqs: "low",
  banners: "low",
};

export interface Diagnostics {
  cacheHits: number;
  cacheMisses: number;
  dedupCount: number;
  latencyLog: Array<{ key: string; ms: number; timestamp: number }>;
}

export interface RefreshContextType {
  getData: <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: { cachePolicy?: "long" | "medium" | "none"; forceRefresh?: boolean }
  ) => Promise<T>;
  refresh: (key: string) => Promise<void>;
  invalidate: (key: string) => Promise<void>;
  isOffline: boolean;
  offlineQueueSize: number;
  triggerSync: () => Promise<void>;
  subscribe: (key: string, callback: () => void) => () => void;
  getCacheValue: <T>(key: string) => T | null;
  diagnostics: Diagnostics;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

const CACHE_PREFIX = "phs_cache_";
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

const subscribeOnlineStatus = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getOnlineSnapshot = () => {
  if (typeof window === "undefined") return true;
  return window.navigator.onLine;
};

const getServerOnlineSnapshot = () => true;

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Record<string, CacheEnvelope<unknown>>>({});
  const activePromisesRef = useRef<Record<string, Promise<unknown> | undefined>>({});
  const listenersRef = useRef<Record<string, Set<() => void>>>({});
  const fetchFunctionsRef = useRef<Record<string, { fetchFn: () => Promise<unknown>; policy: "long" | "medium" | "none" }>>({});
  
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const isOffline = !isOnline;
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  const diagnosticsRef = useRef<Diagnostics>({
    cacheHits: 0,
    cacheMisses: 0,
    dedupCount: 0,
    latencyLog: [],
  });

  // Track app inactivity for resume check
  const lastBackgroundTimeRef = useRef<number>(0);

  // Subscription manager
  const subscribe = useCallback((key: string, callback: () => void) => {
    if (!listenersRef.current[key]) {
      listenersRef.current[key] = new Set();
    }
    listenersRef.current[key].add(callback);
    return () => {
      listenersRef.current[key].delete(callback);
    };
  }, []);

  const notify = useCallback((key: string) => {
    const listeners = listenersRef.current[key];
    if (listeners) {
      listeners.forEach((cb) => cb());
    }
  }, []);

  // Update offline queue size info
  const updateQueueSize = useCallback(async () => {
    const queue = await getOfflineQueue();
    setOfflineQueueSize(queue.length);
  }, []);

  // Helper to read initial persistent cache
  const loadPersistentCache = useCallback(async (key: string) => {
    if (cacheRef.current[key]) return cacheRef.current[key];
    const stored = await storageService.get<CacheEnvelope<unknown>>(`${CACHE_PREFIX}${key}`);
    if (stored && stored.version === APP_VERSION) {
      cacheRef.current[key] = stored;
      return stored;
    }
    return null;
  }, []);

  // Get data with stale-while-revalidate and request deduplication
  const getData = useCallback(async <T,>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: { cachePolicy?: "long" | "medium" | "none"; forceRefresh?: boolean }
  ): Promise<T> => {
    const policy = options?.cachePolicy || "medium";
    const force = options?.forceRefresh;

    // Save fetch function for background revalidation
    fetchFunctionsRef.current[key] = { fetchFn, policy };

    // Request Deduplication
    if (activePromisesRef.current[key]) {
      diagnosticsRef.current.dedupCount++;
      return activePromisesRef.current[key] as Promise<T>;
    }

    // Try reading memory cache
    let cached = cacheRef.current[key];
    
    // If not in memory, try persistent storage
    if (!cached && (policy === "long" || policy === "medium")) {
      const persisted = await loadPersistentCache(key);
      if (persisted) {
        cached = persisted;
      }
    }

    const now = Date.now();
    const isExpired = cached ? now >= cached.expiresAt : true;

    // Return valid cache immediately
    if (cached && !force && !isExpired) {
      diagnosticsRef.current.cacheHits++;
      return cached.data as T;
    }

    diagnosticsRef.current.cacheMisses++;

    // Fetch fresh data
    const promise = (async () => {
      const startTime = Date.now();
      try {
        const data = await fetchFn();
        
        let duration = 5000; // default 5s (none) to avoid double fetching during route changes
        if (policy === "long") {
          duration = 24 * 60 * 60 * 1000; // 24 hours
        } else if (policy === "medium") {
          duration = 5 * 60 * 1000; // 5 minutes
        }

        const envelope: CacheEnvelope<T> = {
          data,
          updatedAt: Date.now(),
          expiresAt: Date.now() + duration,
          version: APP_VERSION,
        };

        // Cache in memory
        cacheRef.current[key] = envelope;
        notify(key);

        // Persistent write
        if (policy === "long" || policy === "medium") {
          void storageService.set(`${CACHE_PREFIX}${key}`, envelope);
        }

        // Log diagnostics
        const latency = Date.now() - startTime;
        diagnosticsRef.current.latencyLog.push({ key, ms: latency, timestamp: Date.now() });
        if (process.env.NODE_ENV === "development") {
          console.log(`[RefreshManager] Fetched "${key}" in ${latency}ms`);
        }

        return data;
      } catch (err) {
        console.error(`[RefreshManager] Fetch failed for "${key}":`, err);
        // If fetch fails but we have stale cache, return stale cache as fallback
        if (cached) {
          console.warn(`[RefreshManager] Returning stale cache fallback for "${key}"`);
          return cached.data as T;
        }
        throw err;
      } finally {
        delete activePromisesRef.current[key];
      }
    })();

    activePromisesRef.current[key] = promise;
    return promise as Promise<T>;
  }, [loadPersistentCache, notify]);

  // Refresh (invalidate cache + force run fetchFn)
  const refresh = useCallback(async (key: string): Promise<void> => {
    const reg = fetchFunctionsRef.current[key];
    if (!reg) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`[RefreshManager] Force refreshing "${key}"`);
    }

    try {
      await getData(key, reg.fetchFn, { cachePolicy: reg.policy, forceRefresh: true });
    } catch (err) {
      console.error(`[RefreshManager] Background refresh failed for "${key}":`, err);
    }
  }, [getData]);

  // Invalidate
  const invalidate = useCallback(async (key: string): Promise<void> => {
    delete cacheRef.current[key];
    await storageService.remove(`${CACHE_PREFIX}${key}`);
    notify(key);
  }, [notify]);

  // Get cache value directly
  const getCacheValue = useCallback(<T,>(key: string): T | null => {
    const cached = cacheRef.current[key];
    return cached ? (cached.data as T) : null;
  }, []);

  // Trigger offline sync queue processing
  const triggerSync = useCallback(async () => {
    await processOfflineQueue();
    await updateQueueSize();
  }, [updateQueueSize]);

  // Perform background refresh on resume (for mounted/active items only)
  const triggerResumeRefresh = useCallback(async () => {
    const activeKeys = Object.keys(listenersRef.current).filter(
      (k) => listenersRef.current[k] && listenersRef.current[k].size > 0
    );

    if (activeKeys.length === 0) return;

    console.log(`[RefreshManager] App resumed. Revalidating active components: ${activeKeys.join(", ")}`);

    // Sort by priority (High priority items first)
    activeKeys.sort((a, b) => {
      const pA = KEY_PRIORITIES[a] || "low";
      const pB = KEY_PRIORITIES[b] || "low";
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[pB] - weight[pA];
    });

    // Run refreshes
    await Promise.all(activeKeys.map((key) => refresh(key)));
  }, [refresh]);

  // Track initial mount for network events
  const isInitialMountRef = useRef(true);

  // Handle network side effects (Sync / Revalidation)
  useEffect(() => {
    // Defer the queue size update to prevent synchronous setState warning during effect execution
    const timer = setTimeout(() => {
      void updateQueueSize();
    }, 0);

    if (isOnline) {
      if (!isInitialMountRef.current) {
        console.log("[RefreshManager] Device is back online. Syncing...");
        void triggerSync();
        void triggerResumeRefresh();
      } else {
        // Initial sync on mount if online
        void triggerSync();
      }
    } else {
      if (!isInitialMountRef.current) {
        console.warn("[RefreshManager] Device went offline.");
      }
    }
    isInitialMountRef.current = false;

    return () => {
      clearTimeout(timer);
    };
  }, [isOnline, triggerSync, triggerResumeRefresh, updateQueueSize]);

  // Integrate Capacitor App state changes (Pause/Resume)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let appStateListener: { remove: () => Promise<void> | void } | null = null;

    const initCapacitorLifecycle = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");

        // Initialize baseline background time
        lastBackgroundTimeRef.current = Date.now();

        appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            const now = Date.now();
            const elapsed = now - lastBackgroundTimeRef.current;
            // 5 minutes threshold
            if (elapsed > 5 * 60 * 1000) {
              void triggerResumeRefresh();
            }
          } else {
            lastBackgroundTimeRef.current = Date.now();
          }
        });
      } catch (err) {
        console.error("[RefreshManager] Failed to bind Capacitor App State listener:", err);
      }
    };

    void initCapacitorLifecycle();

    return () => {
      if (appStateListener) {
        void appStateListener.remove();
      }
    };
  }, [triggerResumeRefresh]);

  // Expose context
  const contextValue: RefreshContextType = {
    getData,
    refresh,
    invalidate,
    isOffline,
    offlineQueueSize,
    triggerSync,
    subscribe,
    getCacheValue,
    get diagnostics() {
      return diagnosticsRef.current;
    },
  };

  return (
    <RefreshContext.Provider value={contextValue}>
      {children}
    </RefreshContext.Provider>
  );
}

// Hook to use Refresh Manager context
export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh must be used within a RefreshProvider");
  }
  return context;
}

// Hook to subscribe to a specific refreshable data key
export function useRefreshableData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    cachePolicy?: "long" | "medium" | "none";
    initialData?: T;
    realtimeConfig?: {
      table: string;
      filter?: string;
      event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    };
    pollingInterval?: number; // ms, optional
  }
) {
  const { getData, subscribe, getCacheValue, refresh } = useRefresh();
  const [data, setData] = useState<T | null>(() => {
    // 1. Initial Cache Load
    const cached = getCacheValue<T>(key);
    if (cached) return cached;
    return options?.initialData || null;
  });
  const [error, setError] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(!data);

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const cachePolicy = options?.cachePolicy;

  // Sync execution
  const doFetch = useCallback(
    async (force = false) => {
      try {
        const fresh = await getData(key, fetchFnRef.current, {
          cachePolicy,
          forceRefresh: force,
        });
        setData(fresh);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [getData, key, cachePolicy]
  );

  // Subscribe to changes in cache for this key
  useEffect(() => {
    const handleCacheUpdate = () => {
      const fresh = getCacheValue<T>(key);
      if (fresh) {
        setData(fresh);
      }
    };

    // Trigger initial fetch
    void doFetch();

    // Subscribe to Cache notified updates (changes made by other pages/realtime)
    const unsubscribe = subscribe(key, handleCacheUpdate);

    // Listen to custom cache-invalidation event from push notification events
    const handleInvalidationEvent = () => {
      void doFetch(true);
    };
    window.addEventListener("phs-cache-invalidated", handleInvalidationEvent);

    return () => {
      unsubscribe();
      window.removeEventListener("phs-cache-invalidated", handleInvalidationEvent);
    };
  }, [key, subscribe, getCacheValue, doFetch]);

  // Supabase Realtime integration
  useEffect(() => {
    if (!options?.realtimeConfig) return;

    const supabase = createClient();
    const config = options.realtimeConfig;
    const channelName = `rt-${key}-${Math.random().toString(36).substring(2, 7)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: config.event || "*",
          schema: "public",
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log(`[Realtime Trigger] Table "${config.table}" changed. Refreshing key "${key}"`, payload);
          }
          void refresh(key);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [key, options?.realtimeConfig, refresh]);

  // Polling Integration
  useEffect(() => {
    if (!options?.pollingInterval) return;

    const intervalId = setInterval(() => {
      // Pause polling if browser tab is hidden or offline
      const tabVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const online = typeof window !== "undefined" && window.navigator.onLine;
      
      if (tabVisible && online) {
        void refresh(key);
      }
    }, options.pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [key, options?.pollingInterval, refresh]);

  return {
    data,
    error,
    isLoading,
    refresh: () => doFetch(true),
  };
}

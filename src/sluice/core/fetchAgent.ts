import { getNamespace } from '../util/requestLocal';

export interface CacheEntry {
  data: unknown;
  status: number;
  loaded: boolean;
  requesters: number;
}

let _baseUrl = '';

export function setBaseUrl(url: string): void {
  _baseUrl = url;
}

// --- Request-scoped state (per-request on server, singleton on client) ---

const RLS = getNamespace<{
  cache: Map<string, CacheEntry>;
  pending: Map<string, Promise<unknown>>;
}>();

function cache(): Map<string, CacheEntry> {
  if (!RLS().cache) RLS().cache = new Map();
  return RLS().cache;
}

function pending(): Map<string, Promise<unknown>> {
  if (!RLS().pending) RLS().pending = new Map();
  return RLS().pending;
}

export function getCache(): Map<string, CacheEntry> {
  return cache();
}

export function getPendingRequests(): Array<{ url: string; promise: Promise<unknown> }> {
  return [...pending().entries()].map(([url, promise]) => ({ url, promise }));
}

// --- Client-side: deferred resolution for late arrivals ---

const _clientPending = new Map<string, { promise: Promise<unknown>; resolve: (data: unknown) => void }>();

export function receiveLateDataArrival(url: string, entry: CacheEntry): void {
  const c = cache();
  const existing = c.get(url);
  const requesters = existing?.requesters ?? entry.requesters;
  c.set(url, { ...entry, loaded: true, requesters });
  const p = _clientPending.get(url);
  if (p) {
    p.resolve(entry.data);
    _clientPending.delete(url);
  }
}

// --- Shared ---

export function dehydrateCache(): Record<string, CacheEntry> {
  const obj: Record<string, CacheEntry> = {};
  for (const [key, entry] of cache()) {
    obj[key] = entry;
  }
  for (const url of pending().keys()) {
    if (!obj[url]) {
      obj[url] = { data: null, status: 0, loaded: false, requesters: 0 };
    }
  }
  return obj;
}

export function rehydrateCache(data: Record<string, CacheEntry>): void {
  const c = cache();
  for (const [key, entry] of Object.entries(data)) {
    c.set(key, entry);
    if (!entry.loaded) {
      let resolve!: (data: unknown) => void;
      const promise = new Promise<unknown>(r => { resolve = r; });
      _clientPending.set(key, { promise, resolve });
    }
  }
}

function consume(url: string): void {
  const c = cache();
  const entry = c.get(url);
  if (!entry) return;
  entry.requesters--;
  if (entry.requesters <= 0) c.delete(url);
}

export function get(url: string): Promise<unknown> {
  const c = cache();
  const existing = c.get(url);
  if (existing) {
    if (existing.loaded) {
      const data = existing.data;
      consume(url);
      return Promise.resolve(data);
    }
    // Entry exists but not loaded — waiting for dataArrival
    const deferred = _clientPending.get(url);
    if (deferred) {
      return deferred.promise.then((data) => {
        consume(url);
        return data;
      });
    }
  }

  const p = pending();
  if (p.has(url)) {
    // Server-side: another caller already initiated this fetch
    const entry = c.get(url);
    if (entry) entry.requesters++;
    return p.get(url)!;
  }

  const promise = (async () => {
    const res = await fetch(_baseUrl ? _baseUrl + url : url);
    const data = await res.json();
    c.set(url, { data, status: res.status, loaded: true, requesters: 1 });
    p.delete(url);
    return data;
  })();

  p.set(url, promise);
  return promise;
}

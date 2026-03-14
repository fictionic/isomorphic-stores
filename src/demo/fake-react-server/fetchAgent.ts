export interface CacheEntry {
  data: unknown;
  status: number;
}

let _getCache: () => Map<string, CacheEntry> | null = () => null;
let _baseUrl = '';

export function setCacheProvider(fn: () => Map<string, CacheEntry> | null): void {
  _getCache = fn;
}

export function setBaseUrl(url: string): void {
  _baseUrl = url;
}

export function dehydrateCache(cache: Map<string, CacheEntry>): Record<string, CacheEntry> {
  const obj: Record<string, CacheEntry> = {};
  for (const [key, entry] of cache) {
    obj[key] = entry;
  }
  return obj;
}

export function rehydrateCache(data: Record<string, unknown>): Map<string, CacheEntry> {
  const cache = new Map<string, CacheEntry>();
  for (const [key, value] of Object.entries(data)) {
    cache.set(key, value as CacheEntry);
  }
  return cache;
}

export async function get(url: string): Promise<unknown> {
  const cache = _getCache();
  if (cache?.has(url)) return cache.get(url)!.data;
  const res = await fetch(_baseUrl ? _baseUrl + url : url);
  const data = await res.json();
  cache?.set(url, { data, status: res.status });
  return data;
}

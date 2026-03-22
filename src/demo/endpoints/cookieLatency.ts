import { getCookie } from '@/sluice/util/cookies';

export function cookieLatency(key: string, fallback: number): number {
  const val = getCookie(`latency_${key}`);
  return val ? Number(val) || fallback : fallback;
}

import { getRLS } from '../core/RequestLocalStorage';

const RLS = getRLS<{ requestStart: number }>();

export function startRequestClock(): void {
  RLS().requestStart = now();
}

export function getElapsedRequestTime(): number {
  return now() - RLS().requestStart;
}

function now(): number {
  return new Date().getTime();
}

import { getRLS } from '../common/RequestLocalStorage';

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

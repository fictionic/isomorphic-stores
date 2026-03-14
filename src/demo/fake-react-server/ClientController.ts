import React from 'react';
import { hydrateRoot } from 'react-dom/client';

export function initClientController(
  roots: Record<number, React.ReactElement>,
): void {
  const stub = (window as any).__reactServerController;
  const pending: [number, number][] = stub?._arrivals ?? [];

  function wake(start: number, end: number) {
    for (let i = start; i <= end; i++) {
      const element = roots[i];
      if (!element) continue;
      const node = document.querySelector(`[data-react-server-root-id="${i}"]`);
      if (node) hydrateRoot(node, element);
    }
  }

  (window as any).__reactServerController = {
    nodeArrival(start: number, end: number) { wake(start, end); },
  };

  for (const [start, end] of pending) wake(start, end);
}

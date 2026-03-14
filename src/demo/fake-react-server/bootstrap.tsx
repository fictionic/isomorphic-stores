import React from 'react';
import { rehydrateCache, setCacheProvider } from './fetchAgent';
import { initClientController } from './ClientController';
import { isTheFold } from './TheFold';
import RootContainer, { isContainerOpen, isContainerClose, type PageElement } from './RootContainer';
import type { Page } from './Page';

export async function bootstrap(PageClass: new () => Page): Promise<void> {
  const cache = rehydrateCache((window as any).__FETCH_CACHE__ ?? {});
  setCacheProvider(() => cache);

  const page = new PageClass();
  page.createStores();
  const rawElements = page.getElements();

  const elements: PageElement[] = rawElements.flatMap((el) =>
    RootContainer.isRootContainer(el) ? RootContainer.flattenForRender(el) : [el],
  );

  const reactElements = elements.filter(
    (el): el is React.ReactElement => !isContainerOpen(el) && !isContainerClose(el),
  );

  await Promise.all(
    reactElements
      .filter((el) => !isTheFold(el))
      .map((el) => (el.props as any).when as Promise<unknown> | undefined)
      .filter(Boolean),
  );

  const roots: Record<number, React.ReactElement> = {};
  elements.forEach((el, i) => {
    if (!isContainerOpen(el) && !isContainerClose(el) && !isTheFold(el as React.ReactElement)) {
      roots[i] = el as React.ReactElement;
    }
  });

  initClientController(roots);
}

import React from 'react';
import { makeRootComponent } from '@/sluice/core/components/Root';
import { IsoStoreProvider } from '@/stores/provider';
import type { IsoStoreInstance } from '@/stores/core';

interface Props {
  stores: Array<IsoStoreInstance<any>>;
  children: React.ReactNode;
}

const StoreRoot = makeRootComponent<Props>(
  ({ stores, children }) => (
    <IsoStoreProvider stores={stores}>{children}</IsoStoreProvider>
  ),
  ({ stores }) => ({
    when: Promise.all(stores.map((store) => store.whenReady)).then(() => null),
  }),
);

export default StoreRoot;

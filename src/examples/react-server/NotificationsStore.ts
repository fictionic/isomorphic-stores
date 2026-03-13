import {defineZustandIsoStore} from "./stores";

interface NotificationsState {
  count: number;
  increment: () => void;
}

// Client-only store: no waitFor, no onMessage, no SSR dependency.
// Created on the client via useCreateClientStore.
export default defineZustandIsoStore<{}, NotificationsState>(
  () => (
    (set, get) => ({
      count: 0,
      increment: () => set({ count: get().count + 1 }),
    })
  )
);

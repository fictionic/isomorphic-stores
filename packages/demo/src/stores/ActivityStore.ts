import { defineZustandIsoStore } from './define';
import { asSingleton } from '@verso-js/stores';

interface ActivityState {
  recentItems: string[];
  liveCount: number;
  increment: () => void;
}

export const ActivityStore = asSingleton(defineZustandIsoStore<Record<string, never>, ActivityState>(
  (_opts, { clientOnly }) =>
    (set, get) => ({
      ...clientOnly('recentItems', fetchActivity(), [] as string[]),
      liveCount: 0,
      increment: () => set({ liveCount: get().liveCount + 1 }),
    }),
));

function fetchActivity(): Promise<string[]> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve([
          'Edited profile settings',
          'Uploaded a photo',
          'Sent a message to Bob',
          'Updated notification preferences',
          'Joined #general channel',
        ]),
      1500,
    ),
  );
}

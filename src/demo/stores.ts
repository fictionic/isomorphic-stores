import { defineZustandIsoStore } from '../examples/stores';
import { get } from './fake-react-server/fetchAgent';

// ---------------------------------------------------------------------------
// ProfileStore
// Demonstrates: waitFor (blocks SSR), onMessage (cross-root messaging)
// ---------------------------------------------------------------------------

interface ProfileState {
  username: string;
  email: string;
  rename: (name: string) => void;
}

export type ProfileMessage =
  | { type: 'rename'; name: string }
  | { type: 'reset' };

export const ProfileStore = defineZustandIsoStore<
  { userId: number },
  ProfileState,
  ProfileMessage
>(
  ({ userId }, { waitFor, onMessage }) =>
    (set) => {
      let initialUsername = '';
      let initialEmail = '';

      onMessage((msg) => {
        if (msg.type === 'rename') set({ username: msg.name });
        if (msg.type === 'reset') set({ username: initialUsername, email: initialEmail });
      });

      const userPromise = (get(`/api/users/${userId}`) as Promise<{ username: string; email: string }>).then((d) => {
        initialUsername = d.username;
        initialEmail = d.email;
        return d;
      });

      return {
        ...waitFor('username', userPromise.then((d) => d.username), ''),
        ...waitFor('email', userPromise.then((d) => d.email), ''),
        rename: (name) => set({ username: name }),
      };
    },
  { onError: (err) => console.error('[ProfileStore]', err) },
);

// ---------------------------------------------------------------------------
// ThemeStore
// Demonstrates: waitFor alongside another store in one IsoStoreProvider
// ---------------------------------------------------------------------------

interface ThemeState {
  theme: 'light' | 'dark';
  accent: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccent: (accent: string) => void;
}

export const ThemeStore = defineZustandIsoStore<{ userId: number }, ThemeState>(
  ({ userId }, { waitFor }) =>
    (set) => {
      const themePromise = get(`/api/theme/${userId}`) as Promise<{ theme: 'light' | 'dark'; accent: string }>;
      return {
        ...waitFor('theme', themePromise.then((d) => d.theme), 'light' as 'light' | 'dark'),
        ...waitFor('accent', themePromise.then((d) => d.accent), '#6366f1'),
        setTheme: (theme) => set({ theme }),
        setAccent: (accent) => set({ accent }),
      };
    },
  { onError: (err) => console.error('[ThemeStore]', err) },
);

// ---------------------------------------------------------------------------
// ActivityStore
// Demonstrates: clientOnly (loads after mount, never blocks whenReady)
// Uses setTimeout — NOT fetchAgent.get — so data is never cached server-side
// ---------------------------------------------------------------------------

interface ActivityState {
  recentItems: string[];
  liveCount: number;
  increment: () => void;
}

export const ActivityStore = defineZustandIsoStore<Record<string, never>, ActivityState>(
  (_opts, { clientOnly }) =>
    (set, get) => ({
      ...clientOnly('recentItems', fetchActivity(), [] as string[]),
      liveCount: 0,
      increment: () => set({ liveCount: get().liveCount + 1 }),
    }),
);

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

import { defineZustandIsoStore } from './define';
import { get } from '@/sluice/core/fetchAgent';

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

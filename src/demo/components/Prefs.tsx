import React from 'react';
import { ThemeStore } from '../stores';
import { Card, Panel, Label } from './ui';

const ACCENTS = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#38bdf8'];

export function Prefs() {
  const theme = ThemeStore.useStore((s) => s.theme);
  const accent = ThemeStore.useStore((s) => s.accent);
  const setTheme = ThemeStore.useStore((s) => s.setTheme);
  const setAccent = ThemeStore.useStore((s) => s.setAccent);

  return (
    <Card
      title="Preferences"
      tag="ThemeStore · waitFor"
      description={
        <>
          Theme and accent are fetched server-side via <code>waitFor</code> and arrive in the first
          streaming batch alongside the user profile.
        </>
      }
    >
      <Panel style={{ borderColor: accent }}>
        <Label>themeInstance (userId: 1)</Label>
        <p style={{ margin: '0 0 14px' }}>
          <span style={{ color: '#6c7086' }}>Theme: </span>
          <span style={{ color: '#cdd6f4' }}>{theme}</span>
          {'  |  '}
          <span style={{ color: '#6c7086' }}>Accent: </span>
          <span style={{ color: accent }}>{accent}</span>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setTheme('light')}>Light</button>
          <button onClick={() => setTheme('dark')}>Dark</button>
          <span style={{ color: '#45475a', margin: '0 4px' }}>|</span>
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              style={{
                background: c,
                border: c === accent ? '2px solid #cdd6f4' : '2px solid transparent',
                width: 26,
                height: 26,
                borderRadius: 6,
                padding: 0,
              }}
            />
          ))}
        </div>
      </Panel>
    </Card>
  );
}

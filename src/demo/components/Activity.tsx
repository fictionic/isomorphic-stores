import React from 'react';
import { ActivityStore } from '../stores';
import { Card, Panel, Label } from './ui';

export function Activity() {
  const recentItems = ActivityStore.useStore((s) => s.recentItems);
  const liveCount = ActivityStore.useStore((s) => s.liveCount);
  const increment = ActivityStore.useStore((s) => s.increment);

  return (
    <Card
      title="Activity"
      tag="ActivityStore · clientOnly"
      description={
        <>
          <code>clientOnly</code> doesn't contribute to <code>whenReady</code> — this root streams
          immediately. The recent items list is triggered after mount and loads ~1.5s later. The live
          counter is always available.
        </>
      }
    >
      <Panel>
        <Label>activityInstance</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div>
            <Label>Live counter (available immediately)</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 'bold', color: '#a6e3a1' }}>{liveCount}</span>
              <button onClick={increment}>+1</button>
            </div>
          </div>
        </div>
        <Label>Recent activity (clientOnly — loads ~1.5s after mount)</Label>
        {recentItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#f9e2af',
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
            <span style={{ color: '#6c7086', fontSize: 13 }}>Fetching after mount...</span>
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recentItems.map((item, i) => (
              <li key={i} style={{ color: '#cdd6f4', marginBottom: 4, fontSize: 13 }}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Card>
  );
}

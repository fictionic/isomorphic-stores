import React from 'react';
import { ProfileStore } from '../stores';
import { Card, Panel, Label } from './ui';

export function Broadcast() {
  const username = ProfileStore.useStore((s) => s.username);

  return (
    <Card
      title="Broadcast / onMessage"
      tag="ProfileStore · broadcast"
      description={
        <>
          <code>broadcast</code> delivers a message to all mounted instances of a store — even across
          separate React roots. The buttons below update <em>all</em> ProfileStore instances
          simultaneously (userId:1 in Root 0 and userId:3 here).
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Panel style={{ flex: 1, minWidth: 220 }}>
          <Label>broadcastInstance (userId: 3) — receives broadcasts</Label>
          <div>
            <span style={{ color: '#6c7086', fontSize: 13 }}>Username: </span>
            <b style={{ color: '#a6e3a1', fontSize: 16 }}>{username}</b>
          </div>
          <p style={{ color: '#585b70', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            This root arrives after <code>TheFold</code> — client bundle is already loaded when it
            streams in.
          </p>
        </Panel>

        <Panel style={{ flex: 1, minWidth: 220 }}>
          <Label>Send broadcast</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => ProfileStore.broadcast({ type: 'rename', name: 'Zara' })}>
              Broadcast: rename → "Zara"
            </button>
            <button onClick={() => ProfileStore.broadcast({ type: 'rename', name: 'Marcus' })}>
              Broadcast: rename → "Marcus"
            </button>
            <button onClick={() => ProfileStore.broadcast({ type: 'reset' })}>
              Broadcast: reset all
            </button>
          </div>
          <p style={{ color: '#585b70', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
            <code>ProfileStore.broadcast()</code> — no store context needed. Root 0 (Alice/userId:1)
            also updates.
          </p>
        </Panel>
      </div>
    </Card>
  );
}

import React from 'react';
import { ProfileStore, ThemeStore, ActivityStore } from './stores';
import { IsoStoreProvider } from '../provider';
import RootElement from './fake-react-server/RootElement';
import RootContainer from './fake-react-server/RootContainer';
import TheFold from './fake-react-server/TheFold';
import type { Page } from './fake-react-server/Page';
import { User } from './components/User';
import { Prefs } from './components/Prefs';
import { Activity } from './components/Activity';
import { Broadcast } from './components/Broadcast';
import { LatencyControls } from './components/LatencyControls';

export default class DemoPage implements Page {
  profile1!: ReturnType<typeof ProfileStore.createStore>;
  theme1!: ReturnType<typeof ThemeStore.createStore>;
  activity!: ReturnType<typeof ActivityStore.createStore>;
  broadcast!: ReturnType<typeof ProfileStore.createStore>;
  latencies = { users: 500, theme: 500, activity: 1000 };

  createStores(): void {
    this.profile1 = ProfileStore.createStore({ userId: 1 });
    this.theme1 = ThemeStore.createStore({ userId: 1 });
    this.activity = ActivityStore.createStore({});
    this.broadcast = ProfileStore.createStore({ userId: 3 });
  }

  getElements(): React.ReactElement[] {
    const { profile1, theme1, activity, broadcast, latencies } = this;
    return [
      <RootContainer style="display:grid;grid-template-columns:1fr 280px;gap:32px;align-items:start">
        <RootContainer>
          <RootElement when={profile1.whenReady}>
            <IsoStoreProvider instances={[profile1]}>
              <User />
            </IsoStoreProvider>
          </RootElement>
          <RootElement when={theme1.whenReady}>
            <IsoStoreProvider instances={[theme1]}>
              <Prefs />
            </IsoStoreProvider>
          </RootElement>
          <RootElement when={activity.whenReady}>
            <IsoStoreProvider instances={[activity]}>
              <Activity />
            </IsoStoreProvider>
          </RootElement>
          <TheFold />
          <RootElement when={broadcast.whenReady}>
            <IsoStoreProvider instances={[broadcast]}>
              <Broadcast />
            </IsoStoreProvider>
          </RootElement>
        </RootContainer>
        <RootContainer style="position:sticky;top:24px">
          <LatencyControls {...latencies} />
        </RootContainer>
      </RootContainer>,
    ];
  }
}

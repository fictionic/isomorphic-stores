import {
  createStore as createNativeZustandStore,
  type StoreApi as NativeZustandStore,
  type StateCreator as NativeZustandStoreInit,
} from "zustand/vanilla";
import { useStore as useNativeZustandStore } from "zustand/react";
import { type Adapter } from "../../adapter";

type ZustandHook<State> = <U>(selector: (s: State) => U) => U;
type ZustandClientHook<State> = <U>(selector: (s: State) => U) => U | undefined;

const emptyZStore = createNativeZustandStore<Record<string, never>>(() => ({}));

export type { NativeZustandStoreInit };

export const getAdapter: <State extends object>() => Adapter<
  State,
  NativeZustandStore<State>,
  NativeZustandStoreInit<State>,
  ZustandHook<State>,
  ZustandClientHook<State>
> = <State>() => {

  const getHook = (getNativeStore: () => NativeZustandStore<State>) => <U>(selector: (s: State) => U): U => useNativeZustandStore(getNativeStore(), selector);

  return {
    createNativeStore: (zInit) => createNativeZustandStore(zInit),
    getSetState: (nativeStore: NativeZustandStore<State>) => (
      (state: Partial<State>) => nativeStore.setState(state)
    ),
    getHook: getHook,
    getClientHook: (getNativeStore: () => NativeZustandStore<State>, ready: boolean) => (
      <U>(selector: (s: State) => U): U | undefined => {
        const hook = getHook(getNativeStore);
        const value = hook(selector);
        return ready ? value : undefined;
      }
    ),
    getEmpty: () => emptyZStore as unknown as NativeZustandStore<State>,
  };
};

import {defineIsoStore, type Adapter, type IsoStoreInit} from "@verso-js/stores/adapter";
import {proxy as valtioProxy, useSnapshot, type Snapshot} from "valtio";

export interface ValtioHooks<State> {
  useProxy: () => State;
  useSnapshot: () => Snapshot<State>;
};

export interface ValtioClientHooks<State> {
  useProxy: () => State | undefined;
  useSnapshot: () => Snapshot<State> | undefined;
};

export type ValtioInit<State> = (getProxy: () => State) => State;

const empty = valtioProxy({});

/**
 * Valtio doesn't fit as cleanly into this machinery. Instead of talking directly to the proxy by
 * importing it, components access it via a useProxy hook that the store definition provides, alongside
 * useSnapshot. Maybe a little weird, but basically the same.
 * Note that the first two type parameters are the same because the store instance _is_ the store state--it's
 * a proxy. And the store structor is a function only to allow consumers to call onMessage: there needs to
 * be a way to access the proxy within the constructor because that's the only way to mutate the state,
 * but the constructor is what creates the proxy, so there's a chicken-and-egg problem. The only solution
 * is to provide a getter that is wired up after the fact.
 */
export const getAdapter: <State extends object>() => Adapter<
  State,
  State,
  ValtioInit<State>,
  ValtioHooks<State>,
  ValtioClientHooks<State>
> = <State extends object>() => {
  return {
    createNativeStore: (init: ValtioInit<State>) => {
      let proxy: State | null = null;
      const getProxy = () => {
        if (!proxy) {
          throw new Error("proxy not yet created!");
        }
        return proxy;
      };
      const initialState = init(getProxy);
      proxy = valtioProxy(initialState);
      return proxy;
    },
    getSetState: (proxy) => (
      (state) => Object.assign(proxy, state)
    ),
    useHooks: (useNativeStore) => {
      return {
        useProxy: () => useNativeStore(),
        useSnapshot: () => useSnapshot(useNativeStore()),
      };
    },
    useClientHooks: (useNativeStore, ready) => {
      return {
        useProxy: () => {
          const proxy = useNativeStore();
          return ready ? proxy : undefined;
        },
        useSnapshot: () => {
          const snapshot = useSnapshot(useNativeStore());
          return ready ? snapshot : undefined;
        },
      };
    },
    empty: empty as State,
  };
};

export const defineValtioIsoStore = <Opts, State extends object, Message = never>(
  isoInit: IsoStoreInit<Opts, State, Message, ValtioInit<State>>,
  options?: { onError?: (error: unknown) => void },
) => defineIsoStore(isoInit, getAdapter<State>(), options);

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

export const STORE_INSTANCE_INTERNALS: unique symbol = Symbol();
export const STORE_DEFINITION_INTERNALS: unique symbol = Symbol();

export type DefinitionID = symbol & { _definitionId: true };
export type ProviderID   = symbol & { _providerId: true };
export type InstanceID   = symbol & { _instanceId: true };

// ---------------------------------------------------------------------------
// Public store API
// ---------------------------------------------------------------------------

export type MessageHandler<Message> = (message: Message) => void;

export interface IsoStoreInstance<NativeStore> {
  whenReady: Promise<void>;
  nativeStore: NativeStore;
  [STORE_INSTANCE_INTERNALS]: {
    identifier: InstanceID;
    definition: IsoStoreDefinition<any, any, any, any, any>;
    messageHandlers: Array<MessageHandler<any>>;
    onMount: () => void;
  };
}

export type StoreProvider<NativeStore> = React.FC<{
  instance: IsoStoreInstance<NativeStore>;
  children: ReactNode;
}>;

export type UseCreateClientStore<Opts, NativeClientHook> = (opts: Opts) => {
  ready: boolean;
  useClientStore: NativeClientHook;
};

export type Broadcast<Message> = (message: Message) => void;

export interface IsoStoreDefinition<Opts, Message, NativeStore, NativeHook, NativeClientHook> {
  createStore: (opts: Opts) => IsoStoreInstance<NativeStore>;
  useStore: NativeHook;
  useCreateClientStore: UseCreateClientStore<Opts, NativeClientHook>;
  broadcast: Broadcast<Message>;
  [STORE_DEFINITION_INTERNALS]: {
    instancesByProvider: Map<ProviderID, IsoStoreInstance<NativeStore>>;
    StoreProvider: StoreProvider<NativeStore>;
  };
}

// ---------------------------------------------------------------------------
// Adapter author API
// ---------------------------------------------------------------------------

export type SetAsyncState<State> = <K extends keyof State, V extends State[K]>(
  name: K,
  promise: Promise<V>,
  initialValue: V,
) => { [_ in K]: V };

export type OnMessage<Message> = (handler: MessageHandler<Message>) => void;

// Functions passed to the outer factory when defining a store.
export interface IsoInitFns<State, Message> {
  waitFor: SetAsyncState<State>;
  clientOnly: SetAsyncState<State>;
  onMessage: OnMessage<Message>;
}

// The outer layer of the two-layer factory pattern: receives opts and fns,
// returns the framework's native inner creator (e.g. Zustand's StateCreator).
export type IsoStoreInit<Opts, State, Message, NativeStoreInit> =
  (opts: Opts, fns: IsoInitFns<State, Message>) => NativeStoreInit;

export interface Adapter<State, NativeStore, NativeStoreInit, NativeHook, NativeClientHook> {
  createNativeStore: (nativeStoreInit: NativeStoreInit) => NativeStore;
  getSetState: (nativeStore: NativeStore) => (state: Partial<State>) => void;
  getHook: (getNativeStore: () => NativeStore) => NativeHook;
  getClientHook: (getNativeStore: () => NativeStore, ready: boolean) => NativeClientHook;
  empty: NativeStore;
}

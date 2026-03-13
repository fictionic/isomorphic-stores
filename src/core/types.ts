import type {ReactNode} from "react";

export const STORE_INSTANCE_INTERNALS: unique symbol = Symbol();

export type SetAsyncState<State> = <K extends keyof State, V extends State[K]>(name: K, promise: Promise<V>, initialValue: V) => { [key in K]: V };
export type MessageHandler<Message> = (message: Message) => void;
export type OnMessage<Message> = (handler: MessageHandler<Message>) => void;

export interface IsoStoreInstance<NativeStore> {
  whenReady: Promise<void>;
  [STORE_INSTANCE_INTERNALS]: {
    identifier: InstanceID;
    definition: IsoStoreDefinition<any, any, any, any, any>;
    nativeStore: NativeStore;
    messageHandlers: Array<MessageHandler<any>>;
    onMount: () => void;
  },
}

export type StoreProvider<NativeStore> = React.FC<{ instance: IsoStoreInstance<NativeStore>, children: ReactNode }>;
export type UseCreateClientStore<Opts, NativeClientHook> = (opts: Opts) => {
  ready: boolean;
  useClientStore: NativeClientHook;
};
export type Broadcast<Message> = (message: Message) => void;

export const STORE_DEFINITION_INTERNALS: unique symbol = Symbol();

export type DefinitionID = symbol & { _definitionId: true };
export type ProviderID = symbol & { _providerId: true };
export type InstanceID = symbol & { _instanceId: true };

export interface IsoStoreDefinition<Opts, Message, NativeStore, NativeHook, NativeClientHook> {
  // use this to create a new instance of a store
  createStore: (opts: Opts) => IsoStoreInstance<NativeStore>
  // use this to select from a wired-up store from a component anywhere underneath
  useStore: NativeHook;
  // use this to create and select from a store after the first client render
  useCreateClientStore: UseCreateClientStore<Opts, NativeClientHook>;
  // use this to send messages to all instances of a store
  broadcast: Broadcast<Message>;
  // don't use this (you can't)
  [STORE_DEFINITION_INTERNALS]: {
    instancesByProvider: Map<ProviderID, IsoStoreInstance<NativeStore>>;
    StoreProvider: StoreProvider<NativeStore>;
  };
}

// functions made available to consumers defining stores
export interface IsoInitFns<State, Message> {
  waitFor: SetAsyncState<State>;
  onMessage: OnMessage<Message>;
  clientOnly: SetAsyncState<State>;
};

// The outer layer of the two-layer factory pattern -- what the user writes when defining a store.
// Receives opts and fns; returns the framework's native inner creator
// (e.g. Zustand's StateCreator, Redux's reducer factory).
export type IsoStoreInit<Opts, State, Message, NativeStoreInit> = (opts: Opts, fns: IsoInitFns<State, Message>) => NativeStoreInit;

// adapts a native store format into a format that the library can use
export interface Adapter<State, NativeStore, NativeStoreInit, NativeHook, NativeClientHook> {
  createNativeStore: (nativeStoreInit: NativeStoreInit) => NativeStore;
  getSetState: (nativeStore: NativeStore) => ((state: Partial<State>) => void);
  getHook: (getNativeStore: () => NativeStore) => NativeHook;
  getClientHook: (getNativeStore: () => NativeStore, ready: boolean) => NativeClientHook;
  getEmpty: () => NativeStore;
};


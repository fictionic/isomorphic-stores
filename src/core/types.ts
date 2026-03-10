import type {ReactNode} from "react";

export interface AdaptedStore<State> {
  getState: () => State;
  setState: (state: Partial<State>) => void;
  subscribe: (listener: (() => void)) => (() => void);
}

export const STORE_INSTANCE_INTERNALS: unique symbol = Symbol();

export type WaitFor<State> = <K extends keyof State, V extends State[K]>(name: K, promise: Promise<V>, initialValue: V) => { [key in K]: V };
export type MessageHandler<Message> = (message: Message) => void;
export type OnMessage<Message> = (handler: MessageHandler<Message>) => void;

export interface IsoStoreInstance<State, Message = never> {
  adaptedStore: AdaptedStore<State>;
  whenReady: Promise<void>;
  [STORE_INSTANCE_INTERNALS]: {
    definition: IsoStoreDefinition<unknown, State, Message>;
    identifier: symbol;
    messageHandlers: Array<MessageHandler<Message>>;
  },
}

export type StoreProvider<State, Message = never> = React.FC<{ instance: IsoStoreInstance<State, Message>, children: ReactNode }>;
export type UseStore<State> = <T>(selector: (state: State) => T) => T;
export type UseClientStore<State> = <T>(selector: (state: State) => T) => T | null;
export type UseCreateClientStore<Opts, State> = (opts: Opts) => {
  ready: boolean;
  useClientStore: UseClientStore<State>;
};
export type Broadcast<Message> = (message: Message) => void;

export const STORE_DEFINITION_INTERNALS: unique symbol = Symbol();

export interface IsoStoreDefinition<Opts, State, Message = never> {
  // use this to create a new instance of a store
  createStore: (opts: Opts) => IsoStoreInstance<State, Message>
  // use this to select from a wired-up store from a component anywhere underneath
  useStore: UseStore<State>;
  // use this to create and select from a store after the first client render
  useCreateClientStore: UseCreateClientStore<Opts, State>;
  // use this to send messages to all instances of a store
  broadcast: Broadcast<Message>;
  // don't use this (you can't)
  [STORE_DEFINITION_INTERNALS]: {
    StoreProvider: StoreProvider<State, Message>;
  };
}


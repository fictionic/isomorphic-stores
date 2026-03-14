import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {getStoreProvider} from "./StoreProvider";
import {
  STORE_DEFINITION_INTERNALS,
  STORE_INSTANCE_INTERNALS,
  type Adapter,
  type Broadcast,
  type DefinitionID,
  type InstanceID,
  type IsoStoreDefinition,
  type IsoStoreInit,
  type IsoStoreInstance,
  type MessageHandler,
  type OnMessage,
  type ProviderID,
  type UseCreateClientStore,
  type SetAsyncState
} from "./types";
import {useIsoStoreLifecycle} from "./lifecycle";

function makeAsyncStateSetter<State>(
  pending: Array<{name: keyof State, promise: Promise<unknown>}>,
  keys: Set<keyof State>,
): SetAsyncState<State> {
  // defined via function because otherwise I'd have to write the types on the next line twice
  return <K extends keyof State, V extends State[K]>(name: K, promise: Promise<V>, initialValue: V) => {
    if (keys.has(name)) {
      throw new Error(`isomorphic-stores: encountered duplicate async key '${String(name)}'; aborting`);
    }
    keys.add(name);
    pending.push({ name, promise });
    return { [name]: initialValue } as { [key in K]: V };
  };
}

// currently, stores should not be defined dynamically, as this will lead to memory leaks
const definitions: Map<DefinitionID, IsoStoreDefinition<any, any, any, any, any>> = new Map();

type BaseNativeHook = <S>(...args: any) => S;
type BaseNativeClientHook = <S>(...args: any) => S | undefined;

export const defineIsoStore = <Opts, State extends Object, Message, NativeStore, NativeStoreInit, NativeHook extends BaseNativeHook, NativeClientHook extends BaseNativeClientHook> (
  isoInit: IsoStoreInit<Opts, State, Message, NativeStoreInit>,
  adapter: Adapter<State, NativeStore, NativeStoreInit, NativeHook, NativeClientHook>,
  options?: { onError?: (error: unknown) => void },
): IsoStoreDefinition<Opts, Message, NativeStore, NativeHook, NativeClientHook> => {
  const definitionId = Symbol() as DefinitionID;

  const instancesByProvider: Map<ProviderID, IsoStoreInstance<NativeStore>> = new Map();

  const createStore = (opts: Opts): IsoStoreInstance<NativeStore> => {
    type PendingValue = { name: keyof State, promise: Promise<unknown> };
    const asyncKeys: Set<keyof State> = new Set();
    const pending: Array<PendingValue> = [];
    const waitFor = makeAsyncStateSetter<State>(pending, asyncKeys);

    const clientPending: Array<PendingValue> = [];
    const clientOnly = makeAsyncStateSetter<State>(clientPending, asyncKeys);

    const messageHandlers: Array<MessageHandler<Message>> = [];
    const onMessage: OnMessage<Message> = (handler) => {
      messageHandlers.push(handler);
    };

    const nativeStoreInit = isoInit(opts, { waitFor, onMessage, clientOnly });
    const nativeStore = adapter.createNativeStore(nativeStoreInit);

    const resolvePending = (items: Array<PendingValue>) =>
      Promise.all(items.map(async ({ name, promise }) => {
        try {
          const value = await promise;
          const setState = adapter.getSetState(nativeStore);
          setState({ [name]: value } as Partial<State>);
        } catch(e) {
          options?.onError?.(new Error(`isomorphic-stores: waitFor promise rejected; refusing to set key '${String(name)}'`, { cause: e }));
        }
      })).then(() => {});

    const whenReady = resolvePending(pending);

    const didMountDfd = Promise.withResolvers();
    didMountDfd.promise.then(() => resolvePending(clientPending));

    return {
      whenReady,
      nativeStore,
      [STORE_INSTANCE_INTERNALS]: {
        identifier: Symbol() as InstanceID,
        definition: definitions.get(definitionId)!,
        messageHandlers,
        onMount: didMountDfd.resolve,
      },
    };
  };

  type IsoContext = IsoStoreInstance<NativeStore> | null;
  const context = createContext<IsoContext>(null);

  const useStore: NativeHook = adapter.getHook(() => {
    const instance = useContext<IsoContext>(context);
    if (!instance) {
      throw new Error("isomorphic-stores: cannot call useStore outside a provider");
    }
    return instance.nativeStore;
  });

  const useCreateClientStore: UseCreateClientStore<Opts, NativeClientHook> = (opts) => {
    const [ready, setReady] = useState<boolean>(false);
    const readyRef = useRef<boolean>(ready);
    readyRef.current = ready;
    const instanceRef = useRef<IsoStoreInstance<NativeStore> | null>(null);

    const providerId = useMemo(() => Symbol() as ProviderID, []);

    useEffect(() => {
      const instance = createStore(opts); // ideally we'd support rerendering based on changes to opts
      instance.whenReady.then(() => {
        setReady(true);
      });
      instanceRef.current = instance;
      return () => {
        instanceRef.current = null;
      };
    }, [providerId]);

    useIsoStoreLifecycle(providerId, instanceRef.current);

    const useClientStore = useCallback((...args: any) => {
      const getNativeStore = () => (
        readyRef.current ? instanceRef.current!.nativeStore : adapter.empty
      );
      const hook = adapter.getClientHook(getNativeStore, readyRef.current);
      return hook(...args);
    }, []) as NativeClientHook;

    return {
      ready,
      useClientStore,
    };
  };

  const broadcast: Broadcast<Message> = (message: Message) => {
    const seen = new Set<InstanceID>();
    for (const instance of instancesByProvider.values()) {
      const instanceId = instance[STORE_INSTANCE_INTERNALS].identifier;
      if (seen.has(instanceId)) return;
      seen.add(instanceId);
      instance[STORE_INSTANCE_INTERNALS].messageHandlers.forEach(h => h(message));
    }
  };

  const definition = {
    createStore,
    useStore,
    useCreateClientStore,
    broadcast,
    [STORE_DEFINITION_INTERNALS]: {
      instancesByProvider,
      StoreProvider: getStoreProvider(context),
    },
  };

  definitions.set(definitionId, definition);

  return definition;

}

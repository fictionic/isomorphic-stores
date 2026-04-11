import { produce } from 'immer';

export type Selector<State, T> = (state: State) => T;
export type Updater<State> = (state: State) => void;
export type Consumer<T> = (value: T) => void;

type Unsub = () => void;

export type Equals<T> = (a: T, b: T) => boolean;

type Select<State> = <T>(selector: Selector<State, T>) => T;
type Update<State> = (updater: Updater<State>) => void;
type Subscribe<State> = <T>(selector: Selector<State, T>, consumer: Consumer<T>, equals?: Equals<T>) => Unsub

export type StoryStore<State> = {
  select: Select<State>;
  update: Update<State>;
  subscribe: Subscribe<State>;
};

export type Listen = <S, T>(store: StoryStore<S>, selector: Selector<S, T>, consumer: Consumer<T>, equals?: Equals<T>) => Unsub;

export type StoryInit<State> = (fns: ({select: Select<State>, update: Update<State>, listen: Listen})) => State;

// cross-store, module-level state. should not be used during server rendering.
let batchDepth = 0;
let pendingEmits = new Set<() => void>();
export type Batch = <T>(action: () => T) => T;
export const batch: Batch = (action) => {
  try {
    batchDepth++;
    return action();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      pendingEmits.forEach((emit) => {
        emit();
      });
      pendingEmits.clear();
    }
  }
}

type Listener<State, T> = {
  selector: Selector<State, T>;
  consumer: Consumer<T>;
  last: T;
  equals: Equals<T>;
};

export const createStoryStore = <State extends object>(init: StoryInit<State>): StoryStore<State> => {
  let state: State = new Proxy<State>({} as State, {
    get: () => { throw new Error("not ready"); },
    set: () => { throw new Error("not ready"); },
  });
  const listeners = new Set<Listener<State, any>>();

  const subscribe: Subscribe<State> = (selector, consumer, equals = Object.is) => {
    const listener = { selector, consumer, last: selector(state), equals };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getState = () => state;

  const emit = () => {
    for (const l of listeners) {
      const { selector, consumer, last, equals } = l;
      const selected = selector(getState());
      // ^fetch state fresh each time because consumers
      // might update it
      if (!equals(selected, last)) {
        consumer(selected);
        l.last = selected;
      }
    }
  };

  const select = <T>(selector: Selector<State, T>) => selector(state);

  const update: Update<State> = (recipe) => {
    state = produce(getState(), recipe); // pre-frozen
    if (batchDepth > 0) {
      pendingEmits.add(emit); // will dedupe if the same store is already pending an emit
    } else {
      emit();
    }
  };

  const didInitRef = { current: false };
  const listenerConsumers: Array<() => void> = []; // TODO better name

  const listen: Listen = <S, T>(store: StoryStore<S>, selector: Selector<S, T>, consumer: Consumer<T>, equals?: Equals<T>) => {
    if (didInitRef.current) {
      throw new Error("cannot listen after init");
    }
    listenerConsumers.push(() => consumer(store.select(selector)));
    return store.subscribe(selector, consumer, equals);
  };

  state = init({ select, update, listen });
  Object.freeze(state);

  didInitRef.current = true;
  batch(() => listenerConsumers.forEach((fn) => fn()));

  return {
    select,
    update,
    subscribe,
  };
}

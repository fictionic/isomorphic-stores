import {useSyncExternalStore} from 'react';
import {createStoryStore, type StoryInit, type Selector, type StoryStore, type Equals} from "./vanilla";

type UseStoryStore = <State, T>(store: StoryStore<State>, selector: Selector<State, T>, equals?: Equals<T>) => T;

export const useStoryStore: UseStoryStore = (store, selector, equals = Object.is) => {
  return useSyncExternalStore(
    (cb) => store.subscribe(selector, cb, equals),
    () => store.select(selector),
  );
};

export type UseStory<State> = <T>(selector: Selector<State, T>, equals?: Equals<T>) => T;

type CreateStory<State> = UseStory<State> & StoryStore<State>;

const createStory = <State extends object>(init: StoryInit<State>): CreateStory<State> => {
  const store = createStoryStore(init);
  const useStory: UseStory<State> = <T>(selector: Selector<State, T>, equals = Object.is) => useStoryStore(store, selector, equals);
  Object.assign(useStory, store);
  return useStory as CreateStory<State>;
};


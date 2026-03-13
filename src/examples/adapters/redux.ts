import {
  createStore as createReduxStore,
  type Store as ReduxStore,
  type Reducer,
  type Dispatch,
  type AnyAction,
} from "redux";
import { useSyncExternalStore } from "react";
import { type Adapter } from "../../adapter";

const ISO_SET_STATE = '@@isostores/SET_STATE';

const emptyReduxStore = createReduxStore((state = {}) => state);

export type ReduxStoreInit<State> = (dispatch: Dispatch, getState: () => State) => Reducer<State>;
type ReduxHook<State> = <U>(selector: (s: State) => U) => U;
type ReduxClientHook<State> = <U>(selector: (s: State) => U) => U | undefined;

export const getAdapter = <State extends object>(): Adapter<State, ReduxStore<State>, ReduxStoreInit<State>, ReduxHook<State>, ReduxClientHook<State>> => {
  const getHook = (getStore: () => ReduxStore<State>) =>
    <U>(selector: (s: State) => U): U =>
      useSyncExternalStore(
        (callback) => getStore().subscribe(callback),
        () => selector(getStore().getState()),
      );

  return {
    createNativeStore: (makeReducer) => {
      let storeRef: ReduxStore<State>;
      const realReducer = makeReducer(
        (action) => storeRef.dispatch(action),
        () => storeRef.getState(),
      );
      const wrappedReducer: Reducer<State, AnyAction> = (state, action) => {
        if (action.type === ISO_SET_STATE) return { ...state, ...action.payload };
        return realReducer(state, action);
      };
      storeRef = createReduxStore<State, AnyAction>(wrappedReducer);
      return storeRef;
    },
    getSetState: (store) => (partial) => store.dispatch({ type: ISO_SET_STATE, payload: partial }),
    getHook,
    getClientHook: (getNativeStore, ready) => <U>(selector: (s: State) => U): U | undefined => {
      const value = getHook(getNativeStore)(selector);
      return ready ? value : undefined;
    },
    getEmpty: () => emptyReduxStore as unknown as ReduxStore<State>,
  };
};

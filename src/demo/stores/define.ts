import {defineIsoStore, type IsoStoreInit} from "@/stores/core";
import {getAdapter as getReduxAdapter, type ReduxStoreInit} from "../adapters/redux";
import {getAdapter as getZustandAdapter, type NativeZustandStoreInit} from "../adapters/zustand";

export const defineZustandIsoStore = <Opts, State extends object, Message = never>(
  isoInit: IsoStoreInit<Opts, State, Message, NativeZustandStoreInit<State>>,
  options?: { onError?: (error: unknown) => void },
) => defineIsoStore(isoInit, getZustandAdapter<State>(), options);

export const defineReduxIsoStore = <Opts, State extends object, Message = never>(
  isoInit: IsoStoreInit<Opts, State, Message, ReduxStoreInit<State>>,
  options?: { onError?: (error: unknown) => void },
) => defineIsoStore(isoInit, getReduxAdapter<State>(), options);

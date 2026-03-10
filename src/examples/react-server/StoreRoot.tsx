import { type ReactNode } from "react";
import type {IsoStoreInstance} from "../../core";
import RootElement from "./RootElement";
import {IsoStoreProvider} from "../../provider";

// react-server projects could use something like this to wrap RootElement for use with isostores
interface Props<State, Message> {
  instance: IsoStoreInstance<State, Message>
  children: ReactNode;
}
export function StoreRoot<State, Message>({
  instance,
  children,
}: Props<State, Message>) {
  return (
    <RootElement when={instance.whenReady}>
      <IsoStoreProvider instances={[instance]}>
        { children }
      </IsoStoreProvider>
    </RootElement>
  );
}


## Project Overview

A framework-agnostic SSR state management library with an adapter system. The core idea: stores are created server-side before render (e.g. in `handleRoute`), async data is declared via `waitFor`, and the SSR framework (e.g. react-server's `RootElement`) blocks rendering until the store is ready. Client-side components can also create stores independently via `useCreateClientStore`.

Originally conceived as a Zustand+react-server bridge, now being generalized to support any store-based framework. Atom-based frameworks (Jotai, Recoil) are out of scope.

A secondary goal: replace the pattern of bubbling all UI updates up through a root element (which triggers full-tree re-renders) with granular per-component subscriptions via selectors. This library is intended to power both server and client rendering — not just be an SSR adapter that hands off to a singleton store on the client.

### Key files
- `src/core/types.ts` — all public types (`IsoStoreDefinition`, `IsoStoreInstance`, `SetAsyncState`, `OnMessage`, etc.)
- `src/core/define.ts` — `defineIsoStore`, internal logic
- `src/core/StoreProvider.tsx` — internal context Provider (handles instance register/teardown in useEffect); not part of public API
- `src/provider.tsx` — `IsoStoreProvider`, the public multi-store provider component
- `src/index.ts` — types-only entry point (`isomorphic-stores`)
- `src/adapter.ts` — adapter author entry point (`isomorphic-stores/adapter`)
- `src/examples/adapters/` — reference adapter implementations (Zustand, Redux)
- `src/examples/react-server/stores.ts` — application-layer wrappers (`defineZustandIsoStore`, `defineReduxIsoStore`) combining adapter + `defineIsoStore`
- `src/examples/react-server/` — example stores and components

### Package exports
- `isomorphic-stores` → `src/index.ts` — types only
- `isomorphic-stores/adapter` → `src/adapter.ts` — adapter author API
- `isomorphic-stores/provider` → `src/provider.tsx` — `IsoStoreProvider`

### Architecture

Two-layer factory pattern:
- **Outer layer** (user-written `IsoStoreInit`): `(opts, { waitFor, onMessage, clientOnly }) => NativeStoreInit` — receives opts and a `fns` object, returns a native store initializer
- **Inner layer** (framework): e.g. `(set, get) => State` for Zustand — the native store creator

The `Adapter` bridges the two: `createNativeStore(nativeStoreInit)` turns the inner-layer result into an actual store instance. This separates the user's store logic from the framework-specific construction.

Three levels of abstraction:
1. **`defineIsoStore(isoInit, adapter, options?)`** — core library function; framework-agnostic
2. **`getAdapter<State>()`** — adapter module (e.g. `adapters/zustand.ts`); encapsulates framework-specific types (`NativeStore`, `NativeStoreInit`, hook types). Must be called as `getAdapter<State>()` (not as an object literal) to ensure TypeScript infers `State` from the adapter rather than from `SetAsyncState<State>` in `IsoStoreInit`.
3. **`defineZustandIsoStore(isoInit, options?)`** — application-layer wrapper in `stores.ts`; combines adapter + `defineIsoStore`. Both wrapper functions require `State extends object` to prevent primitive state types.

```ts
// Zustand example
defineZustandIsoStore<MyOpts, MyState, MyMessage>(
  ({ userId }, { waitFor, onMessage, clientOnly }) => (  // outer: opts + fns
    (set, get) => {                                      // inner: Zustand StateCreator (block body required for onMessage)
      onMessage((msg) => {                               // called as a statement — registers handler, returns void
        if (msg.type === 'reset') set({ name: '' });
      });
      return {
        ...waitFor('name', fetchName(userId), ''),       // blocks SSR render until resolved
        ...clientOnly('recs', fetchRecs(userId), []),    // resolves after client mount; never blocks render
        setName: (name) => set({ name }),
      };
    }
  )
);

// Server-side usage
const store = MyStore.createStore({ userId: 1 });
// <RootElement when={store.whenReady}>
//   <IsoStoreProvider instances={[store]}>
//     <Widget />
//   </IsoStoreProvider>
// </RootElement>

// In server-rendered components
const name = MyStore.useStore(s => s.name);

// Client-only components
const { ready, useClientStore } = MyStore.useCreateClientStore({ userId: 1 });
const name = useClientStore(s => s.name); // undefined until ready

// Cross-root communication
MyStore.broadcast(message);
```

### Design decisions
- `waitFor(key, promise, initialValue)` — returns `{ key: initialValue }` to spread into state, registers promise; `setState` is called after native store is created (avoids chicken-and-egg). If a promise rejects, the key keeps its `initialValue` and `onError` is called if provided; `whenReady` still resolves.
- `clientOnly(key, promise, initialValue)` — same API as `waitFor` but doesn't contribute to `whenReady`; the promise is awaited after the component mounts (triggered via `onMount` in `STORE_INSTANCE_INTERNALS`, called from `useIsoStoreLifecycle`). Designed for late-arriving data (e.g. react-server "late arrivals") that shouldn't block the initial render. The promise may never resolve server-side; that's fine.
- `whenReady: Promise<void>` always resolves (never rejects), even if `waitFor` promises fail
- Core has no dependency on any SSR or store framework — integration is at the call site
- `Adapter<State, NativeStore, NativeStoreInit, NativeHook, NativeClientHook>` is an interface with five methods: `createNativeStore(nativeStoreInit)`, `getSetState(nativeStore)`, `getHook(getNativeStore)`, `getClientHook(getNativeStore, ready)`, and `getEmpty()`. Adapters explicitly declare `NativeHook` and `NativeClientHook` as type aliases (e.g. `ZustandHook<State>`) rather than using `typeof useNativeZustandStore`, since the actual hook signature (selector-only) differs from the underlying framework hook (api + selector).
- `useStore` on `IsoStoreDefinition` is typed as `NativeHook` — fully transparent, delegates directly to the native framework hook. Consumers get the native hook's type (including selector inference) with no wrapper visible.
- `onMessage(handler)` — registers a message handler on the store instance, returns `void`; called as a statement in the inner factory before returning state
- `broadcast(message)` — delivers a message to all currently-mounted instances of a store type (fire-and-forget). Is a no-op server-side.
- `options?: { onError?: (error: unknown) => void }` — third argument to `defineIsoStore`; called with a wrapped error when a `waitFor` promise rejects. Intended to be wired to an application-level error reporter. Not a general-purpose logger interface.
- Instance registration: `defineIsoStore` maintains `instancesByProvider: Map<ProviderID, IsoStoreInstance>` per definition. `StoreProvider` (internal) and `useCreateClientStore` each register/unregister independently under their own `ProviderID` (stable `useMemo` symbol). This supports sharing one instance across multiple provider trees — each provider manages its own entry, so the first to unmount doesn't evict the instance for others.
- `STORE_INSTANCE_INTERNALS` symbol key on `IsoStoreInstance` holds `{ definition, identifier, nativeStore, messageHandlers, onMount }` — private to the library. `nativeStore` is used by `useStore` to call `adapter.getHook` at render time. `onMount` is a resolver called by `useIsoStoreLifecycle` on mount to trigger `clientOnly` promises.
- `STORE_DEFINITION_INTERNALS` symbol key on `IsoStoreDefinition` holds `{ instancesByProvider, StoreProvider }` — keeps internals off the public API; consumers use `IsoStoreProvider` from `isomorphic-stores/provider` instead

### Cross-root communication
Stores are scoped to React context trees, so components in different roots can't access each other's stores. `broadcast` is a minimal escape hatch: send a message to all mounted instances of a store type from anywhere. It's fire-and-forget with no request/response semantics. How cross-root communication should work more generally in an instance-based architecture is an open design question.

### Demo site (`src/demo/`)

A self-contained demo server that exercises the library against a minimal fake-react-server implementation. Run with `bun src/demo/server.tsx`.

**`server.tsx`** — `Bun.serve` handler. At startup, builds the client bundle via `buildClientBundle`. On each request, creates a per-request fetch cache in an `AsyncLocalStorage` slot, instantiates `DemoPage`, and streams the response from `renderPage`.

**`DemoPage.tsx`** — implements the `Page` interface (`createStores()` + `getElements()`). Creates store instances and returns an array of `<RootElement when={...}>` elements interleaved with a `<TheFold />` marker.

**`fake-react-server/`** — minimal SSR streaming pipeline modelling react-server's behaviour:
- `renderPage.tsx` — streams HTML as roots become ready. Writes the shell immediately, then for each element awaits `element.props.when` before calling `renderToString`. Flushes roots in order as their slots resolve. When `TheFold` resolves, injects the dehydrated fetch cache and client bundle `<script>` tags and calls `nodeArrival(0, lastRootBeforeFold)` to hydrate already-arrived roots. Roots arriving after the fold get an inline `nodeArrival` call as they stream in.
- `RootElement.tsx` — pass-through component; `when` is read directly from props by `renderPage`, not by the component itself.
- `TheFold.tsx` — null-rendering sentinel component; `isTheFold()` identifies it by component type.
- `fetchAgent.ts` — isomorphic fetch wrapper. Server-side: caches responses in the ALS-backed `Map` and dehydrates it to `window.__FETCH_CACHE__`. Client-side: rehydrates from `window.__FETCH_CACHE__` so stores resolve instantly from cache instead of re-fetching.
- `bootstrap.tsx` — client entry point. Rehydrates the fetch cache, creates a fresh `Page` instance (stores resolve from cache), awaits all `when` promises, then calls `initClientController` with the hydrated roots.
- `ClientController.ts` — calls `hydrateRoot` for each root as `nodeArrival` events arrive (either replaying buffered arrivals or handling live ones after bootstrap completes).
- `buildClientBundle.ts` — writes a temporary entry file that imports `PageClass` and calls `bootstrap(PageClass)`, then uses `Bun.build` to bundle it for the browser.

**SSR correctness note:** Zustand's `useStore` uses `useSyncExternalStore` with `getInitialState()` as the server snapshot, which returns state at construction time — before `waitFor` resolves. The Zustand adapter overrides `store.getInitialState = store.getState` so `renderToString` (called after `whenReady`) sees the resolved async values.

### TODOs
- Add a mechanism for adapters to integrate the isomorphic-stores `StoreProvider` with a framework-native provider — e.g. so the Redux adapter can render a react-redux `<Provider store={store}>` alongside the isomorphic-stores context, enabling `useDispatch`, devtools, and the rest of the react-redux ecosystem within the same subtree
- Add a demo of `nativeStore` access in `DemoPage`: a component that takes the instance as a prop (not via context, no `IsoStoreProvider` needed) and reads state imperatively via `instance.nativeStore.getState()` on button click — contrasting with the surrounding `useStore`-via-context components

### Open questions
- Client-side re-fetching / "going pending again" — not yet designed
- Cross-root communication: request/response pattern not yet designed; subscriptions addressed via shared instances
- `useCreateClientStore` should return a `StoreProvider` so descendants can read from the store via `useStore` rather than threading `useClientStore` through the tree
- stores that depend on other stores? like a childStore declaration next to waitFor

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

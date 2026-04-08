# Verso Architecture

## Package exports

### verso
- `@verso-js/verso` → `src/index.ts` — `definePage`, `defineMiddleware`, `defineEndpoint`, `Root`, `RootContainer`, `TheFold`, `makeRootComponent`, `navigateTo`, types (`RouteHandlerCtx`, `RouteDirective`, `LinkTag`, `RootAPI`, `RootElementType`, `SiteConfig`, `Scope`), `isServer`, `getCookie`, `setCookie`, `getNamespace`
- `@verso-js/verso/fetch` → `src/core/fetch/index.ts` — isomorphic `fetch`
- `@verso-js/verso/cookies` → `src/cookies.ts` — `getCookie`, `setCookie`
- `@verso-js/verso/config` → `src/VersoConfig.ts` — `VersoConfig` type (plugin options: `routes`, `server?`)
- `@verso-js/verso/env` → `src/env.ts` — `isServer()`
- `@verso-js/verso/request-local` → `src/RequestLocalStorage.ts` — `getNamespace`
- `@verso-js/verso/plugin` → `dist/plugin.js` — pre-built Vite plugin (built via tsup)
- `@verso-js/verso/globals` → `globals.d.ts` — ambient type declarations (`IS_SERVER`, `IS_DEV`)

### stores
- `@verso-js/stores` → `src/index.ts` — `defineIsoStore`, `IsoStoreProvider`, store types
- `@verso-js/stores/adapter` → `src/adapter.ts` — adapter author API: `Adapter` type + `defineIsoStore`

### store adapters
- `@verso-js/store-adapter-zustand` → `src/zustand.ts` — Zustand adapter + `defineZustandIsoStore`
- `@verso-js/store-adapter-redux` → `src/redux.ts` — Redux adapter + `defineReduxIsoStore`
- `@verso-js/store-adapter-valtio` → `src/valtio.ts` — Valtio adapter + `defineValtioIsoStore`

## vite.config.ts

User projects configure verso via the Vite plugin:

```ts
import { defineConfig } from 'vite';
import verso from '@verso-js/verso/plugin';

export default defineConfig({
  plugins: [
    verso({
      routes: './src/routes.ts',
      server: {
        urlPrefix: 'http://localhost:3000',  // optional
        renderTimeout: 20_000,               // optional
      },
    }),
  ],
});
```

There is no separate `verso.config.ts`.

## isomorphic-stores

Two-layer factory pattern:
- **Outer layer** (user-written `IsoStoreInit`): `(opts, { waitFor, onMessage, clientOnly }) => NativeStoreInit`
- **Inner layer** (framework): e.g. `(set, get) => State` for Zustand

The `Adapter` bridges the two: `createNativeStore(nativeStoreInit)` turns the inner-layer result into an actual store instance.

Three levels of abstraction:
1. **`defineIsoStore(isoInit, adapter, options?)`** — core library function; framework-agnostic
2. **`getAdapter<State>()`** — adapter module; encapsulates framework-specific types
3. **`defineZustandIsoStore(isoInit, options?)`** — convenience wrapper combining adapter + `defineIsoStore`

### Design decisions
- `waitFor(key, promise, initialValue)` — returns `{ key: initialValue }` to spread into state, registers promise; `setState` is called after native store is created (avoids chicken-and-egg). If a promise rejects, the key keeps its `initialValue` and `onError` is called if provided; `whenReady` still resolves.
- `clientOnly(key, promise, initialValue)` — same API as `waitFor` but doesn't contribute to `whenReady`; resolves after client mount.
- `whenReady: Promise<void>` always resolves (never rejects), even if `waitFor` promises fail.
- `broadcast(message)` — delivers a message to all mounted instances of a store type. Fire-and-forget, no-op server-side.
- Instance registration: `defineIsoStore` maintains `instancesByProvider: Map<ProviderID, IsoStoreInstance>` per definition.
- `STORE_INSTANCE_INTERNALS` / `STORE_DEFINITION_INTERNALS` symbol keys keep internals off the public API.

### Middleware

Middleware methods are wrapped in `Chained<T>` — each method receives `next` as its first argument. The type system uses `ForbiddenMethodsMap` (mapped `?: never` keys) to prohibit implementing methods that belong to other scopes, because TypeScript's excess property checking does not fire on `Partial<intersection>` types.

## Request architecture

Three layers:
- **`VersoRequest`** — isomorphic request facade. `VersoRequest.server(req)` or `VersoRequest.client()`. Exposes `getURL()`, `getQuery()`, `getParams()`.
- **`RouteHandlerCtx`** — context object passed to handler `init` functions. Exposes `getConfig()`, `getRequest()`, `getRoute()`. Primary API for handler authors.
- **`RequestContext`** — server-side escape hatch, RLS-backed. Holds raw `Request` and `cookies`. For framework internals and advanced use cases.

## SSR pipeline

- `createVersoServer.ts` — wires routing, bundle serving, and SSR handler together from a `SiteConfig` + `BundleResult`.
- `handleRoute.ts` — initializes RLS, creates `VersoRequest`/`RouteHandlerCtx`, builds handler chain, delegates to `handlePage` or `handleEndpoint`.
- `stream.ts` — streaming HTML writer. Streams root elements in document order, injects dehydrated fetch cache at `TheFold`, handles late data arrivals.
- `router.ts` — route matching via `path-to-regexp`. `SiteConfig` maps route names to `{ path, handler, method? }`.

## Client-side transitions

`ClientController` (`client/controller.ts`) orchestrates hydration and client-side navigation. Public API: `navigateTo(url)`.

**Lifecycle:**
1. `bootstrap.ts` creates a `ClientController` and calls `hydrate()`.
2. `hydrate()` reads pipe data, re-runs the handler chain client-side, hydrates React roots as DOM nodes stream in. `CLIENT_READY_DFD` resolves when all roots are hydrated.
3. `navigate(url)` handles subsequent navigations: re-runs handler chain, updates `<head>`, transitions styles/scripts, replaces React roots.

**Style transitions** (`styles.ts`): Tracks loaded stylesheets, waits for `<link>` onload to prevent FOUC, reorders for CSS specificity. In dev, adopts Vite-injected `<style>` nodes; route stylesheets come from `/__verso/route-css`. In prod, from `BundleManifest`.

**Script transitions** (`scripts.ts`): Additive only (never removed). Tracks by composite key (type + src/content).

## Fetch subsystem

Two-audience design:
- **Consumer** (`fetch/index.ts`): drop-in `fetch` replacement.
- **Framework** (`fetch/Fetch.ts`): `serverInit(urlPrefix)` / `clientInit()`, `fetch()`, `getCache()`.

`FetchCache` uses a server/client accessor pattern. GETs are cached, deduplicated, and dehydrated. Non-GETs pass through. Network failures are serialized as `errorMessage` for hydration consistency.

## Dev server architecture

`verso dev` is a thin wrapper around `vite.createServer()`. All SSR handling is wired up by the plugin's `configureServer` hook.

### Module loading strategies

- **jiti** (`importModule.ts`): CLI bootstrap and build-time route loading. Not used in the request path.
- **Vite `ssrLoadModule`** (dev): Everything in the request path. All request-path code must share one module loader for singleton correctness.
- **Pre-built server bundle** (prod): `verso build` bundles framework + routes into `dist/server/entry.js`. `verso start` loads via native `import()`.

### Singleton problem

Five modules hold per-request state via RLS, rooted in one `AsyncLocalStorage` in `RequestLocalStorage.ts`. If loaded twice (different module graphs), per-request state breaks silently.

- **Dev**: `ssr.noExternal: ['@verso-js/verso', '@verso-js/stores', ...]` forces Vite to process framework code in its module graph.
- **Prod**: Self-contained server bundle — one module graph for everything.

### Vite plugin structure

Three sub-plugins in `build/plugin.ts`:
- `@verso-js/verso:config` — `define` constants, `ssr.noExternal`, build options.
- `@verso-js/verso:virtual-modules` — `virtual:verso/entry` (client) and `virtual:verso/server-entry` (server). `writeBundle` produces the `BundleManifest`.
- `@verso-js/verso:dev-server` — `configureServer` hook. Loads routes, handles `/__verso/route-css`, delegates requests to `handleRoute` via `ssrLoadModule`.

### Environment detection

`IS_SERVER` and `IS_DEV` are compile-time constants defined by the plugin's `config` hook. `IS_SERVER` is also set in `bin/verso.js` via `globalThis.IS_SERVER = true` for the CLI path.

### SSR correctness note

Zustand's `useSyncExternalStore` uses `getInitialState()` as the server snapshot (state at construction time, before `waitFor`). The adapter overrides `store.getInitialState = store.getState` so `renderToString` sees resolved values.

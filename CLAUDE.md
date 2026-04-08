
## Project Overview

**Verso** is a streaming SSR framework, and **isomorphic-stores** is its state management layer — a framework-agnostic adapter system for plugging Zustand, Redux, etc. into Verso's SSR model.

Verso owns the server and the bundler. It ships as a Vite plugin (`build/plugin.ts`). Configuration lives in `vite.config.ts` via the plugin options — there is no separate `verso.config.ts`. The user does not own a server file.

For detailed architecture docs, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Workspace layout

Bun workspace monorepo:

```
packages/
├── verso/                 # SSR framework — "@verso-js/verso"
├── stores/                # isomorphic-stores core — "@verso-js/stores"
├── store-adapter-zustand/ # "@verso-js/store-adapter-zustand"
├── store-adapter-redux/   # "@verso-js/store-adapter-redux"
├── store-adapter-valtio/  # "@verso-js/store-adapter-valtio"
└── demo/                  # demo app
```

### Key conventions

- The demo package uses `@/*` as a path alias to its own `src/`. Non-demo packages use relative imports.
- `IS_SERVER` and `IS_DEV` are compile-time constants (declared in `globals.d.ts`, defined by the Vite plugin). Use them for dead code elimination.
- Five modules hold per-request state via a single `AsyncLocalStorage` in `RequestLocalStorage.ts`. All request-path code must go through the same module loader or singletons break silently. See ARCHITECTURE.md "Singleton problem" for details.
- `stores/` has no dependency on any SSR or store framework — integration is at the call site.
- Middleware scope defaults to `'page'`. Pass `'all'` or `'endpoint'` explicitly for other scopes.

### TODOs
TODOs are tracked in ./TODO

---

## Dev runtime

Bun is used for running/building/installing during development, but framework code must avoid Bun-specific APIs (the framework targets Node's standard HTTP APIs).

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install`, `bun run <script>`, `bunx <package>`
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

Use `vitest` to run tests from within `packages/verso/`. Config is in `packages/verso/vitest.config.ts`.

Tests that need DOM globals use a per-file annotation:
```ts
// @vitest-environment jsdom
```

### E2E tests

E2E tests use Playwright in `packages/demo/e2e/`. Three suites: `smoke.spec.ts`, `stores.spec.ts`, `transitions.spec.ts`.

Run with:
- `cd packages/demo && bunx playwright test -c playwright.dev.config.ts` (or `bun run test:e2e`)
- `cd packages/demo && bunx playwright test -c playwright.prod.config.ts` (or `bun run test:e2e:prod`)

Fixtures (`e2e/helpers/fixtures.ts`):
- Patches `page.goto` to wait for verso client hydration (`CLIENT_READY_DFD`). Import `test` and `expect` from `./helpers/fixtures`.
- `consoleErrors` fixture auto-asserts no console errors after each test.
- Card components use `data-card` attribute for stable test locators.

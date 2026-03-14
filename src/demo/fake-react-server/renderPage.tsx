import React from 'react';
import { renderToString } from 'react-dom/server';
import { isTheFold } from './TheFold';
import { dehydrateCache } from './fetchAgent';
import RootContainer, {
  isContainerOpen,
  isContainerClose,
  flattenForRender,
  type PageElement,
} from './RootContainer';
import RootElement from './RootElement';

const encoder = new TextEncoder();

const ELEMENT_PENDING = Symbol('ELEMENT_PENDING');
const ELEMENT_ALREADY_WRITTEN = Symbol('ELEMENT_ALREADY_WRITTEN');
type Slot = typeof ELEMENT_PENDING | typeof ELEMENT_ALREADY_WRITTEN | string;

function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildOpenTag(props: { id?: string; class?: string; style?: string }): string {
  let attrs = '';
  if (props.id) attrs += ` id="${props.id}"`;
  if (props.class) attrs += ` class="${props.class}"`;
  if (props.style) attrs += ` style="${props.style}"`;
  return `<div${attrs}>\n`;
}

function standardizeElements(elements: React.ReactElement[]): PageElement[] {
  return elements
    .flatMap((el) => (RootContainer.isRootContainer(el) ? flattenForRender(el) : [el]))
    .map((el) => RootElement.ensureRootElement(el));
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: #11111b; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #cdd6f4; }
  code {
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    background: #313244; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; color: #cba6f7;
  }
  button {
    background: #313244; color: #cdd6f4; border: 1px solid #45475a;
    border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer;
    transition: background 0.15s; white-space: nowrap;
  }
  button:hover { background: #45475a; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  input {
    background: #313244; border: 1px solid #45475a; color: #cdd6f4;
    border-radius: 6px; padding: 6px 10px; font-size: 13px; outline: none;
  }
  input:focus { border-color: #6c7086; }
  input::placeholder { color: #585b70; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
`;

const SHELL_SCRIPT = `
  window.__reactServerController = {
    _arrivals: [],
    nodeArrival(s, e) { this._arrivals.push([s, e]); }
  };
`;

export function renderPage(
  elements: React.ReactElement[],
  cache: Map<string, { data: unknown; status: number }>,
  clientBundleUrl: string,
): ReadableStream<Uint8Array> {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      run().catch((err) => {
        console.error('[renderPage]', err);
        ctrl.error(err);
      });
    },
  });

  async function run() {
    const flatElements = standardizeElements(elements);
    const slots: Slot[] = flatElements.map(() => ELEMENT_PENDING);
    let nextElement = 0;
    let haveBootstrapped = false;
    let allDone = false;

    const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>isomorphic-stores demo</title>
<style>${CSS}</style>
<script>${SHELL_SCRIPT}</script>
</head>
<body>
<div style="max-width:960px;margin:0 auto;padding:40px 20px">
<h1 style="color:#cba6f7;margin:0 0 6px;font-size:28px">isomorphic-stores</h1>
<p style="color:#6c7086;margin:0 0 40px;font-size:15px;line-height:1.6">
  Framework-agnostic SSR state management. Stores are created server-side,
  async data is declared via <code>waitFor</code>, and the SSR framework blocks
  rendering until the store is ready. Roots stream in progressively; <code>TheFold</code>
  triggers client bootstrap before all roots have arrived.
</p>
`;
    write(shell);

    // Pre-fill control object slots synchronously
    flatElements.forEach((el, i) => {
      if (isContainerOpen(el)) {
        slots[i] = buildOpenTag(el.containerOpen);
      } else if (isContainerClose(el)) {
        slots[i] = '</div>\n';
      }
    });

    // Resolve each React element slot when its `when` promise settles
    const resolutions = flatElements.map((element, i) => {
      if (isContainerOpen(element) || isContainerClose(element)) {
        return Promise.resolve();
      }

      const reactEl = element as React.ReactElement;
      const when: Promise<unknown> = isTheFold(reactEl)
        ? Promise.resolve()
        : ((reactEl.props as any).when ?? Promise.resolve());

      return when.then(() => {
        if (isTheFold(reactEl)) {
          slots[i] = '__fold__';
        } else {
          try {
            slots[i] = renderToString(reactEl);
          } catch (err) {
            console.error(`[renderPage] renderToString failed for element ${i}`, err);
            slots[i] = `<div style="color:#f38ba8">Render error: ${err}</div>`;
          }
        }
        writeElements();
      });
    });

    function writeElements() {
      while (nextElement < flatElements.length) {
        const slot = slots[nextElement];
        if (slot === ELEMENT_PENDING) break;
        if (slot === ELEMENT_ALREADY_WRITTEN) {
          nextElement++;
          continue;
        }

        const i = nextElement;
        slots[i] = ELEMENT_ALREADY_WRITTEN;
        nextElement++;

        const el = flatElements[i]!;

        if (isContainerOpen(el) || isContainerClose(el)) {
          write(slot as string);
        } else if (isTheFold(el as React.ReactElement)) {
          let lastRoot = -1;
          for (let j = 0; j < i; j++) {
            const e = flatElements[j]!;
            if (!isContainerOpen(e) && !isContainerClose(e) && !isTheFold(e as React.ReactElement)) {
              lastRoot = j;
            }
          }
          bootstrapClient(lastRoot);
          haveBootstrapped = true;
        } else {
          const html = slot as string;
          write(`<div data-react-server-root-id="${i}">${html}</div>\n`);
          if (haveBootstrapped) {
            write(`<script>__reactServerController.nodeArrival(${i}, ${i});</script>\n`);
          }
        }
      }

      if (nextElement >= flatElements.length && !allDone) {
        if (!haveBootstrapped) {
          let lastRoot = -1;
          for (let j = 0; j < flatElements.length; j++) {
            const e = flatElements[j]!;
            if (!isContainerOpen(e) && !isContainerClose(e) && !isTheFold(e as React.ReactElement)) {
              lastRoot = j;
            }
          }
          bootstrapClient(lastRoot);
          haveBootstrapped = true;
        }
        allDone = true;
        write('</div>\n</body></html>');
        ctrl.close();
      }
    }

    function bootstrapClient(lastRootBeforeFold: number) {
      const dehydrated = dehydrateCache(cache);
      write(
        `<script>window.__FETCH_CACHE__ = ${escapeJson(dehydrated)}; window.__foldIndex = ${lastRootBeforeFold};</script>\n`,
      );
      write(`<script type="module" src="${clientBundleUrl}"></script>\n`);
      write(`<script>__reactServerController.nodeArrival(0, ${lastRootBeforeFold});</script>\n`);
    }

    function write(chunk: string) {
      ctrl.enqueue(encoder.encode(chunk));
    }

    await Promise.allSettled(resolutions);
  }

  return stream;
}

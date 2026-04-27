// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://localhost" }
import { test, expect, describe, beforeEach } from 'vitest';
import { PAGE_HEADER_SCRIPT_ELEMENT_ATTR } from '../core/common/constants';
import { ScriptTransitioner } from '../core/client/scripts';

const BASE = 'http://localhost';
const extScript = (src: string, type?: string) => ({ src, ...(type ? { type } : {}) });
const inlineScript = (content: string, type?: string) => ({ content, ...(type ? { type } : {}) });

function addServerScript(attrs: { src?: string; content?: string; type?: string }) {
  const node = document.createElement('script');
  if (attrs.src) node.src = BASE + attrs.src;
  if (attrs.content) node.innerHTML = attrs.content;
  if (attrs.type) node.type = attrs.type;
  node.setAttribute(PAGE_HEADER_SCRIPT_ELEMENT_ATTR, '');
  document.head.appendChild(node);
  return node;
}

function getScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>('script')];
}

describe('ScriptTransitioner', () => {
  let st: ScriptTransitioner;

  beforeEach(() => {
    document.head.innerHTML = '';
    st = new ScriptTransitioner();
  });

  describe('readServerScripts', () => {
    test('picks up server-rendered external scripts', () => {
      addServerScript({ src: '/app.js' });
      st.readServerScripts();

      st.transitionScripts([extScript('/app.js')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('picks up server-rendered inline scripts', () => {
      addServerScript({ content: 'console.log(1)' });
      st.readServerScripts();

      st.transitionScripts([inlineScript('console.log(1)')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('ignores elements without the verso attribute', () => {
      const node = document.createElement('script');
      node.src = BASE + '/unrelated.js';
      document.head.appendChild(node);

      st.readServerScripts();

      st.transitionScripts([]);
      expect(getScripts()).toHaveLength(1); // unrelated script still present
    });
  });

  describe('transitionScripts', () => {
    test('adds new external scripts', () => {
      st.readServerScripts();
      st.transitionScripts([extScript('/new.js')]);

      const scripts = getScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.src).toContain('/new.js');
    });

    test('adds new inline scripts', () => {
      st.readServerScripts();
      st.transitionScripts([inlineScript('window.x = 1')]);

      const scripts = getScripts();
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.innerHTML).toBe('window.x = 1');
    });

    test('does not re-add already-loaded external scripts', () => {
      addServerScript({ src: '/app.js' });
      st.readServerScripts();

      st.transitionScripts([extScript('/app.js')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('does not re-add already-loaded inline scripts', () => {
      addServerScript({ content: 'window.y = 2' });
      st.readServerScripts();

      st.transitionScripts([inlineScript('window.y = 2')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('does not re-add scripts across multiple transitions', () => {
      st.readServerScripts();
      st.transitionScripts([extScript('/app.js')]);
      st.transitionScripts([extScript('/app.js')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('sets type attribute on external scripts', () => {
      st.readServerScripts();
      st.transitionScripts([extScript('/mod.js', 'module')]);

      const node = getScripts()[0]!;
      expect(node.type).toBe('module');
      expect(node.src).toContain('/mod.js');
    });

    test('sets type attribute on inline scripts', () => {
      st.readServerScripts();
      st.transitionScripts([inlineScript('export const x = 1', 'module')]);

      const node = getScripts()[0]!;
      expect(node.type).toBe('module');
      expect(node.innerHTML).toBe('export const x = 1');
    });

    test('handles mixed new and already-loaded scripts', () => {
      addServerScript({ src: '/existing.js' });
      st.readServerScripts();

      st.transitionScripts([extScript('/existing.js'), extScript('/new.js')]);
      expect(getScripts()).toHaveLength(2);
    });
  });

  describe('URL normalization', () => {
    test('matches relative src against absolute server-rendered src', () => {
      addServerScript({ src: '/app.js' });
      st.readServerScripts();

      st.transitionScripts([extScript('/app.js')]);
      expect(getScripts()).toHaveLength(1);
    });

    test('deduplicates same-origin URLs with different forms', () => {
      addServerScript({ src: '/app.js' });
      st.readServerScripts();

      st.transitionScripts([extScript(BASE + '/app.js')]);
      expect(getScripts()).toHaveLength(1);
    });
  });
});

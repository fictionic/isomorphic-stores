import {PAGE_HEADER_SCRIPT_ELEMENT_ATTR} from "../core/constants";
import {getScriptAttrs, setNodeAttrs, type Script} from "../core/handler/Page";
import {normalizeUrl} from "./url";

export class ScriptTransitioner {
  private loaded: Set<string>;

  constructor() {
    this.loaded = new Set<string>();
  }

  readServerScripts() {
    document.querySelectorAll<HTMLScriptElement>(`script[${PAGE_HEADER_SCRIPT_ELEMENT_ATTR}]`).forEach((node) => {
      this.loaded.add(this.keyForNode(node));
    });
  }

  transitionScripts(newScripts: Script[]) {
    newScripts.forEach((script) => {
      const key = this.keyFor(script);
      if (!this.loaded.has(key)) {
        const node = this.createScriptNode(script);
        document.head.appendChild(node);
        this.loaded.add(key);
      }
    });
  }

  // helpers

  keyFor(script: Script): string {
    const scriptType = script.type ?? '';
    const scriptContent = 'src' in script ?
      'src|' + normalizeUrl(script.src) :
      'text|' + script.content;
    return `type:${scriptType}|${scriptContent}`;
  }

  keyForNode(node: HTMLScriptElement): string {
    const script = {
      type: node.type,
      ...(!!node.src ? {
        src: node.src,
      } : {
        content: node.innerHTML,
      }),
    };
    return this.keyFor(script);
  }


  createScriptNode(script: Script): HTMLScriptElement {
    const node = document.createElement('script');
    setNodeAttrs(node, getScriptAttrs(script));
    if ('content' in script) {
      node.innerHTML = script.content;
    }
    return node;
  }

};

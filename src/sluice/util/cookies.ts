import { parse } from 'cookie';
import { RequestContext } from '../server/RequestContext';

declare const SERVER_SIDE: boolean;

export function getCookie(name: string): string | undefined {
  if (SERVER_SIDE) {
    return RequestContext.getCurrentContext()?.cookies[name];
  }
  return parse(document.cookie)[name];
}

export function setCookie(name: string, value: string, path = '/'): void {
  // TODO: make isomorphic (blocked by sluice needing to own the http response)
  document.cookie = `${name}=${value}; path=${path}`;
}

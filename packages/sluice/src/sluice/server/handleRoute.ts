import type {ParamData} from "path-to-regexp";
import type {RouteHandlerDefinition, RouteHandlerType} from "../core/handler/RouteHandler";
import type {MiddlewareDefinition} from "../core/handler/Middleware";
import type {RouteAssets} from "../bundle";
import {startRequest} from "../util/requestLocal";
import {ServerCookies} from "./ServerCookies";
import {Fetch} from "../core/fetch/Fetch";
import {ResponderConfig} from "../core/handler/ResponderConfig";
import {createHandlerChain} from "../core/handler/chain";
import {handlePage} from "./handlePage";
import {handleEndpoint} from "./handleEndpoint";
import {SluiceRequest} from "../core/SluiceRequest";
import {createCtx} from "../core/handler/RouteHandlerCtx";

interface Options {
  routeAssets: RouteAssets;
  urlPrefix?: string;
  renderTimeout?: number;
};

export async function handleRoute<T extends RouteHandlerType>(
  type: T,
  nativeRequest: Request,
  def: RouteHandlerDefinition<T, any, any>,
  routeParams: ParamData,
  globalMiddleware: MiddlewareDefinition[],
  options: Options,
) {
  const response = await startRequest(async () => {
    const req = SluiceRequest.server(nativeRequest, routeParams);
    const cookies = new ServerCookies(nativeRequest);
    Fetch.serverInit(options.urlPrefix ?? new URL(nativeRequest.url).origin);
    const config = new ResponderConfig();
    const ctx = createCtx(config, req);
    const handler = createHandlerChain(type, def, globalMiddleware, config, ctx);
    let statusCode: number;
    try {
      const directive = await handler.getRouteDirective();
      statusCode = directive.status;
    } catch (err) {
      console.error('[sluice] error during getRouteDirective', err);
      return new Response(null, {
        status: 500,
      });
    }
    const headers = new Headers();
    headers.append('Content-Type', 'text/html; charset=utf-8');
    cookies.consumeHeaders().forEach((value, name) => {
      // idk why Headers has ^these args flipped...
      headers.append(name, value);
    });
    let streamable;
    // TODO: respect hasDocument / location from RouteDirective
    switch(type) {
      case 'page':
        streamable = await handlePage(handler, options);
        break;
      case 'endpoint':
        streamable = await handleEndpoint(handler);
        break;
      default:
        throw new Error(`invalid route handler type ${type satisfies never}`);
    }
    return new Response(streamable, {
      status: statusCode,
      headers,
    });
  });
  return response;
}

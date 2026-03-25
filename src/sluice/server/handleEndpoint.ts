import { startRequest } from '../util/requestLocal';
import { RequestContext } from '../core/RequestContext';
import { ResponseCookies } from './ResponseCookies';
import type {ParamData} from 'path-to-regexp';
import {Fetch} from '../core/fetch/Fetch';
import type {EndpointDefinition} from '../Endpoint';
import {ResponderConfig} from '../core/ResponderConfig';
import {createHandlerChain} from '../core/chain';
import type {MiddlewareDefinition} from '../Middleware';

interface Options {
  urlPrefix?: string;
};

export async function handleEndpoint(
  req: Request,
  def: EndpointDefinition,
  routeParams: ParamData,
  globalMiddleware: MiddlewareDefinition[],
  { urlPrefix }: Options,
): Promise<Response> {
  const response = await startRequest(async () => {
    RequestContext.serverInit(req, routeParams);
    const cookies = new ResponseCookies();
    Fetch.init({ urlPrefix: urlPrefix ?? null });
    const config = new ResponderConfig();
    const fns = { getConfig: config.getValue };
    const endpoint = createHandlerChain('endpoint', def, globalMiddleware, config, fns);
    let statusCode: number;
    try {
      const { status } = await endpoint.handleRoute();
      statusCode = status;
    } catch (err) {
      console.error('[sluice] error during handleRoute', err);
      return new Response(null, {
        status: 500,
      });
    }
    const headers = cookies.consumeHeaders();
    headers.set('Content-Type', endpoint.getContentType());

    const body = await endpoint.getResponseData();

    return new Response(body, {
      status: statusCode,
      headers,
    });
  });
  return response;
}



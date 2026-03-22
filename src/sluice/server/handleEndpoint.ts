import type { Endpoint } from '../Page';
import { startRequest } from '../util/requestLocal';
import { RequestContext } from '../core/RequestContext';
import { ResponseCookies } from './ResponseCookies';
import type {ParamData} from 'path-to-regexp';
import {Fetch} from '../core/fetch/Fetch';

interface Options {
  urlPrefix?: string;
};

export async function handleEndpoint(
  req: Request,
  EndpointClass: new () => Endpoint,
  routeParams: ParamData,
  { urlPrefix }: Options,
): Promise<Response> {
  const response = await startRequest(async () => {
    RequestContext.serverInit(req, routeParams);
    const cookies = new ResponseCookies();
    Fetch.init({ urlPrefix: urlPrefix ?? null });
    const endpoint = new EndpointClass();
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



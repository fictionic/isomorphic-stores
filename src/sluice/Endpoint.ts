import {defineRouteHandler, type MaybePromise, type RouteHandler, type RouteHandlerDefinition, type RouteHandlerInit} from "./Responder";

export interface EndpointRequiredMethods {
  getContentType(): string;
  getResponseData(): MaybePromise<string | ArrayBuffer | ReadableStream>;
};

export type Endpoint = RouteHandler<'endpoint', {}, EndpointRequiredMethods>;

export type EndpointInit = RouteHandlerInit<'endpoint', Endpoint>;

export type EndpointDefinition = RouteHandlerDefinition<'endpoint', {}, EndpointRequiredMethods>;

const ENDPOINT_REQUIRED_METHOD_NAMES: (keyof EndpointRequiredMethods)[] = ['getContentType', 'getResponseData'];

export function defineEndpoint(init: EndpointInit): EndpointDefinition {
  return defineRouteHandler('endpoint', init, {}, ENDPOINT_REQUIRED_METHOD_NAMES);
}

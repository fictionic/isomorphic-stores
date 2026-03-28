import type {ResponderConfig} from "./ResponderConfig";
import type {SluiceRequest} from "../SluiceRequest";
import type {ParamData} from "path-to-regexp";
import type {RouteMatch} from "../../server/router";

export interface RouteInfo {
  getName(): string;
  getParams(): ParamData;
}

export interface RouteHandlerCtx {
  getConfig: ResponderConfig['getValue'];
  getRoute(): RouteInfo;
  getRequest(): SluiceRequest;
}

export function createCtx(config: ResponderConfig, sluiceRequest: SluiceRequest, route: RouteMatch): RouteHandlerCtx {
  const routeInfo = {
    getName: () => route.routeName,
    getParams: () => route.params,
  };
  return {
    getConfig: config.getValue,
    getRequest: () => sluiceRequest,
    getRoute: () => routeInfo,
  };
}

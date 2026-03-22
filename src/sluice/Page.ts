import React from 'react';

export type Stylesheet = { href: string } | { text: string; type?: string; media?: string };

export interface HandleRouteResult {
  status: number;
};

type MaybePromise<T> = T | Promise<T>;

export interface BaseResponse {
  handleRoute(): MaybePromise<HandleRouteResult>;
}

export interface Page extends BaseResponse {
  getTitle(): string;
  getHeadStylesheets(): Stylesheet[];
  getElements(): React.ReactElement[];
}

export interface Endpoint extends BaseResponse {
  getContentType(): string;
  getResponseData(): MaybePromise<string | ArrayBuffer | ReadableStream>;
}

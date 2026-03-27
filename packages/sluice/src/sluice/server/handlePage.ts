import {makeStreamer} from './stream';
import type {RouteAssets} from '../bundle';
import type {StandardizedPage} from '../core/handler/Page';

const RENDER_TIMEOUT_MS = 20_000;

interface Options {
  routeAssets: RouteAssets;
  renderTimeout?: number;
  urlPrefix?: string;
};

export async function handlePage(
  page: StandardizedPage,
  {
    routeAssets,
    renderTimeout = RENDER_TIMEOUT_MS,
  }: Options,
): Promise<ReadableStream> {
  const streamer = makeStreamer(page, { renderTimeout, routeAssets } );
  const readable = streamer.stream();
  return readable;
}


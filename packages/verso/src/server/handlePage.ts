import {makeStreamer} from './stream';
import type {StandardizedPage} from '../core/handler/Page';
import type {ServerSettings} from '../build/config';

export async function handlePage(
  page: StandardizedPage,
  settings: ServerSettings,
): Promise<ReadableStream> {
  const streamer = makeStreamer(page, settings);
  const readable = streamer.stream();
  return readable;
}


import type { Endpoint, HandleRouteResult } from '@/sluice/Page';
import { getCurrentRequestContext } from '@/sluice/core/RequestContext';
import { delay } from '../delay';
import { cookieLatency } from './cookieLatency';

export default class ThemeEndpoint implements Endpoint {
  private userId!: number;

  async handleRoute(): Promise<HandleRouteResult> {
    const ctx = getCurrentRequestContext();
    this.userId = Number(ctx.routeParams['userId']);
    await delay(cookieLatency('theme', 400));
    return { status: 200 };
  }

  getContentType() {
    return 'application/json';
  }

  getResponseData() {
    return JSON.stringify({
      theme: this.userId % 2 === 0 ? 'light' : 'dark',
      accent: '#6366f1',
    });
  }
}

import type { Endpoint, HandleRouteResult } from '@/sluice/Page';
import { getCurrentRequestContext } from '@/sluice/core/RequestContext';
import { delay } from '../delay';
import { cookieLatency } from './cookieLatency';

const NAMES: Record<number, string> = {
  1: 'Alice',
  2: 'Bob',
  3: 'Charlie',
  4: 'Dana',
  5: 'Eve',
};

export default class UsersEndpoint implements Endpoint {
  private id!: number;

  async handleRoute(): Promise<HandleRouteResult> {
    const ctx = getCurrentRequestContext();
    this.id = Number(ctx.routeParams['id']);
    await delay(cookieLatency('users', 500));
    return { status: 200 };
  }

  getContentType() {
    return 'application/json';
  }

  getResponseData() {
    return JSON.stringify({
      username: NAMES[this.id] ?? `User${this.id}`,
      email: `user${this.id}@example.com`,
    });
  }
}

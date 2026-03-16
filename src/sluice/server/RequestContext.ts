import { parse } from 'cookie';
import { getNamespace } from '../util/requestLocal';

const RLS = getNamespace<{ requestContext: RequestContext }>();

export class RequestContext {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  private _cookies: Record<string, string> | null = null;

  constructor(req: Request) {
    this.url = req.url;
    this.method = req.method;
    this.headers = req.headers;
  }

  get cookies(): Record<string, string> {
    if (!this._cookies) {
      this._cookies = parse(this.headers.get('cookie') ?? '');
    }
    return this._cookies;
  }

  static getCurrentContext(): RequestContext {
    return RLS().requestContext;
  }

  /** Called by the framework to register this context in RLS. */
  register(): void {
    RLS().requestContext = this;
  }
}

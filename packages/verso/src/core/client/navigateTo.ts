import type {NavigateOptions} from './controller';

type GetClientController = typeof import('./controller').getClientController;

let getController: GetClientController | null = null;

if (!globalThis.IS_SERVER) {
  import('./controller').then(({ getClientController }) => {
    getController = getClientController;
  });
}

export function navigateTo(url: string, options?: NavigateOptions) {
  if (!getController) {
    throw new Error('cannot navigate on the server!');
  }
  getController().navigate(url, 'PUSH', options);
}

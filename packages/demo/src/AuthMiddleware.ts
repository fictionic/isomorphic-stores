import { defineMiddleware } from '@verso-js/verso';

export default defineMiddleware('all', () => ({
  getRouteDirective: (next) => {
    console.log("authenticating...");
    return next();
  },
}));

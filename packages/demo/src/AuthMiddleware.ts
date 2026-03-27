import { defineMiddleware } from 'sluice/middleware';

export default defineMiddleware('all', (fns) => ({
  getRouteDirective: (next) => {
    console.log("authenticating...");
    return next();
  },
}));

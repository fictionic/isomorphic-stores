import { defineMiddleware } from 'sluice';

export default defineMiddleware('all', (fns) => ({
  getRouteDirective: (next) => {
    console.log("authenticating...");
    return next();
  },
}));

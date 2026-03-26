import {defineMiddleware} from "@/sluice/Middleware";

export default defineMiddleware('all', (fns) => ({
  getRouteDirective: (next) => {
    console.log("authenticating...");
    return next();
  },
}));

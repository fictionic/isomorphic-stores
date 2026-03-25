import {defineMiddleware} from "@/sluice/Middleware";

export default defineMiddleware('all', (fns) => ({
  handleRoute: (next) => {
    console.log("authenticating...");
    return next();
  },
}));

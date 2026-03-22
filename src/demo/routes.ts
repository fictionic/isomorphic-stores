import type {SluiceRoutes} from "@/sluice/server/router";

export default {
  DemoPage: {
    path: '/',
    page: './DemoPage',
  },
  LinkPage: {
    path: '/link',
    page: './LinkPage',
  },
  Users: {
    path: '/api/users/:id',
    endpoint: './endpoints/UsersEndpoint',
  },
  Theme: {
    path: '/api/theme/:userId',
    endpoint: './endpoints/ThemeEndpoint',
  },
  Activity: {
    path: '/api/activity',
    endpoint: './endpoints/ActivityEndpoint',
  },
} satisfies SluiceRoutes;

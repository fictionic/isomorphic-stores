import { Root } from 'sluice/components';
import { defineMiddleware } from 'sluice/middleware';

interface HeaderConfig {
  showHeader: boolean;
};

export default defineMiddleware('page', () => {
  return {
    addConfigValues() {
      return {
        showHeader: true,
      };
    },

    getRouteDirective(next) {
      return next();
    },

    getElements(next) {
      return [
        <Root>
          <header>
            my cool header
          </header>
        </Root>,
        ...next(),
      ];
    }
  };
});

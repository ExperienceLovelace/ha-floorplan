/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { fireEvent } from './dom/fire_event';

export interface NavigateOptions {
  replace?: boolean;
  data?: any;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    'location-changed': NavigateOptions;
  }
}

export const navigate = (path: string, options?: NavigateOptions) => {
  const replace = options?.replace ?? false;

  if (typeof __DEMO__ !== 'undefined' && __DEMO__) {
    if (replace) {
      history.replaceState(null, '', `${location.pathname}#${path}`);
    } else {
      window.location.hash = path;
    }
  } else if (replace) {
    history.replaceState(options?.data ?? null, '', path);
  } else {
    history.pushState(options?.data ?? null, '', path);
  }
  fireEvent(window, 'location-changed', {
    replace,
  });
};

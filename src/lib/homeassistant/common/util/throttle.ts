// Port of home-assistant/frontend src/common/util/throttle.ts (20220802.0)

/* eslint-disable @typescript-eslint/no-explicit-any */

// From: https://davidwalsh.name/javascript-debounce-function

// Returns a function, that, as long as it continues to be invoked, will only
// trigger every N milliseconds. If `leading` is passed, trigger the
// function on the leading edge, instead of the trailing.
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  wait: number,
  leading = true,
  trailing = true
): T & { cancel: () => void } => {
  let timeout: number | undefined;
  let previous = 0;
  const throttledFunc = (...args: Parameters<T>): void => {
    const later = () => {
      previous = leading === false ? 0 : Date.now();
      timeout = undefined;
      func(...args);
    };
    const now = Date.now();
    if (!previous && leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      previous = now;
      func(...args);
    } else if (!timeout && trailing !== false) {
      timeout = window.setTimeout(later, remaining);
    }
  };
  (throttledFunc as any).cancel = () => {
    clearTimeout(timeout);
    timeout = undefined;
    previous = 0;
  };
  return throttledFunc as T & { cancel: () => void };
};

interface EventTarget {
  addEventListenerBase: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => void;
  removeEventListeners(targetType: any): void;
}

const _listeners = new Map<any, Array<any>>();

EventTarget.prototype.addEventListenerBase = EventTarget.prototype.addEventListener;

EventTarget.prototype.addEventListener = function (type, listener) {
  let listeners = new Array<any>();
  if (!_listeners.has(this)) _listeners.set(this, new Array<any>());
  listeners = _listeners.get(this) as Array<any>;

  listeners.push({ target: this, type: type, listener: listener });
  this.addEventListenerBase(type, listener);
};

EventTarget.prototype.removeEventListeners = function (targetType: any) {
  if (!_listeners.has(this)) return;

  const listeners = _listeners.get(this) as Array<any>;

  for (let i = (listeners.length - 1); i >= 0; i--) {
    const item = listeners[i];

    if (item.type == targetType) {
      this.removeEventListener(item.type, item.listener);
      listeners.pop();
    }
  }
}

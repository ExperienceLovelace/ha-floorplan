// IE10+ Support
// inspired by zepto event https://github.com/madrobby/zepto/blob/master/src/event.js

const handlers = {};

const specialEvents = {};
specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

// every element and callback function will have an unique dtId
let _dtId = 1;

/**
 * Get dtId of Element or callback function
 * @param  {Object|Function} obj Element or callback function
 * @return {Number} unique dtId
 */
function getDtId(obj) {
  return obj._dtId || (obj._dtId = _dtId++);
}

/**
 * Get event object of event string, the first `.` is used to split event and namespace
 *
 * @param  {String} event Event type string with namespace or not
 * @return {Object} An Object with `e` and `ns` key
 */
function parse(event) {
  const dotIndex = event.indexOf('.');
  if (dotIndex > 0) {
    return {
      e: event.substring(0, event.indexOf('.')),
      ns: event.substring(dotIndex + 1, event.length)
    };
  }

  return { e: event };
}

/**
 * Find matched event handlers
 * @param  {Element} el the element to find
 * @param  {String} selector Used by event delegation, null if not
 * @param  {String} event Event string may with namespace
 * @param  {Function} callback the callback to find, optional
 * @return {Array} Array of handlers bind to el
 */
function findHandlers(el, selector, event, callback) {
  event = parse(event);
  return (handlers[getDtId(el)] || []).filter(handler => {
    return handler
      && (!event.e || handler.e === event.e)
      && (!event.ns || handler.ns === event.ns)
      && (!callback || handler.callback === callback)
      && (!selector || handler.selector === selector);
  });
}

function removeEvent(el, selector, event, callback) {
  const eventName = parse(event).e;

  if (!el._dtId) return false;
  const elHandlers = handlers[getDtId(el)];
  const matchedHandlers = findHandlers(el, selector, event, callback);
  matchedHandlers.forEach(handler => {
    if (el.removeEventListener) {
      el.removeEventListener(eventName, handler.delegator || handler.callback);
    } else if (el.detachEvent) {
      el.detachEvent('on' + eventName, handler.delegator || handler.callback);
    }
    elHandlers.splice(elHandlers.indexOf(handler), 1);
  });
}

// delegator 只用于 delegate 时有用。
function bindEvent(el, selector, event, callback, delegator, options) {
  const eventName = parse(event).e;
  const ns = parse(event).ns;

  if (el.addEventListener) {
    el.addEventListener(eventName, delegator || callback, options);
  } else if (el.attachEvent) {
    el.attachEvent('on' + eventName, delegator || callback);
  }

  // push events to handlers
  const id = getDtId(el);
  const elHandlers = (handlers[id] || (handlers[id] = []));
  elHandlers.push({
    delegator: delegator,
    callback: callback,
    e: eventName,
    ns: ns,
    selector: selector
  });
}

const Events = {
  /**
   * Register a callback
   *
   * @param  {Element} el the element to bind event to
   * @param  {String} eventType event type, can with namesapce
   * @param  {Function} callback callback to invoke
   * @param  {Object} options options
   * @return {Null} return null
   */
  on(el, eventType, callback, options = null) {
    bindEvent(el, null, eventType, callback, null, options);
  },

  /**
   * Unregister a callback
   *
   * @param  {Element} el the element to bind event to
   * @param  {String} eventType event type, can with namesapce
   * @param  {Function} callback optional, callback to invoke
   * @return {Null} return null
   */
  off(el, eventType, callback = null) {
    // find callbacks
    removeEvent(el, null, eventType, callback);
  },

  /**
   * Register a callback that will execute exactly once
   *
   * @param  {Element} el the element to bind event to
   * @param  {String} eventType event type, can with namesapce
   * @param  {Function} callback callback to invoke
   * @return {Null} return null
   */
  once(el, eventType, callback) {
    const recursiveFunction = e => {
      Events.off(e.currentTarget, e.type, recursiveFunction);
      return callback(e);
    };

    this.on(el, eventType, recursiveFunction);
  },

  // Delegate a callback to selector under el
  delegate(el, selector, eventType, callback, options = null) {
    // bind event to el. and check if selector match
    const delegator = function (e) {
      const els = el.querySelectorAll(selector);
      let matched = false;
      for (let i = 0; i < els.length; i++) {
        const _el = els[i];
        if (_el === e.target || _el.contains(e.target)) {
          matched = _el;
          break;
        }
      }
      if (matched) {
        callback.apply(matched, [].slice.call(arguments));
      }
    };

    bindEvent(el, selector, eventType, callback, delegator, options);
  },

  // Undelegate a callback to selector under el
  undelegate(el, selector, eventType, callback) {
    removeEvent(el, selector, eventType, callback);
  },

  // Dispatch an event with props to el
  trigger(el, eventType, props) {
    // eslint-disable-next-line no-undef
    const event = document.createEvent(specialEvents[eventType] || 'Events');
    let bubbles = true;
    if (props) {
      for (const name in props) {
        if ({}.hasOwnProperty.call(props, name)) {
          (name === 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name]);
        }
      }
    }
    event.initEvent(eventType, bubbles, true);
    el.dispatchEvent(event);
  }
};

export default Events;
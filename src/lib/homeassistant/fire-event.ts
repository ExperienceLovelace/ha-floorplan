export interface MoreInfoDialogParams {
  entityId: string | null;
}

export interface HASSDomEvents {
  "hass-more-info": MoreInfoDialogParams;
}

export type ValidHassDomEvent = keyof HASSDomEvents;

export interface HASSDomEvent<T> extends Event {
  detail: T;
}

export function fireEvent<HassEvent extends ValidHassDomEvent>(
  node: HTMLElement | Window,
  type: HassEvent,
  detail?: HASSDomEvents[HassEvent] | unknown,
  options?: {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
  }
): Event {
  options = options || {};
  detail = (detail === null) || (detail === undefined) ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  (event as unknown as Record<string, unknown>).detail = detail;
  node.dispatchEvent(event);
  return event;
}

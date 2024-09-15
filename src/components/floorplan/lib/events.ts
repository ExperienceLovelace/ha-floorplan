// src/lib/events.ts
export const HA_FLOORPLAN_ACTION_CALL_EVENT = 'ha-floorplan-service-call';

export function dispatchFloorplanActionCallEvent(el: SVGGraphicsElement, detail: any) {
  const event = new CustomEvent(HA_FLOORPLAN_ACTION_CALL_EVENT, {
    detail,
    bubbles: true,
    composed: true,
  });
  el.dispatchEvent(event);
}
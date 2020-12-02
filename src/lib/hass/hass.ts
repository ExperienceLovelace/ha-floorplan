import { HomeAssistant, ServiceCallRequest, ServiceCallResponse } from './frontend-types';
import { HassEntityAttributeBase, HassEntityBase } from "./types";

export class HassObject implements HomeAssistant {
  states: Record<string, HassEntityBase> = {};
  dockedSidebar!: "docked" | "always_hidden" | "auto";

  callService(
    domain: ServiceCallRequest["domain"],
    service: ServiceCallRequest["service"],
    serviceData?: ServiceCallRequest["serviceData"]
  ): Promise<ServiceCallResponse> {
    if (domain && service && serviceData) {
      // placeholder
    }

    const response = {
      context: {
        id: '',
        parent_id: undefined,
        user_id: undefined,
      }
    } as ServiceCallResponse;

    return Promise.resolve(response);
  }

  clone(): HassObject {
    const hass = new HassObject();
    hass.callService = this.callService;
    hass.states = JSON.parse(JSON.stringify(this.states));
    return hass;
  }
}

export class HassEntity implements HassEntityBase {
  entity_id!: string;
  state!: string;
  last_changed!: string;
  last_updated!: string;
  attributes!: HassEntityAttributeBase;
  context!: { id: string; user_id: string | null };
}
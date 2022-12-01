/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessageBase } from 'home-assistant-js-websocket';
import {
  HomeAssistant as IHomeAssistant,
  ServiceCallRequest,
  ServiceCallResponse,
} from '../../lib/homeassistant/types';
import {
  HassEntityAttributeBase,
  HassEntityBase as IHassEntityBase,
} from 'home-assistant-js-websocket';

export class HomeAssistant implements IHomeAssistant {
  states: Record<string, IHassEntityBase> = {};
  dockedSidebar!: 'docked' | 'always_hidden' | 'auto';

  callWS<T>(msg: MessageBase): Promise<T> {
    console.log(msg);
    return Promise.resolve<T>(null as any);
  }

  callService(
    domain: ServiceCallRequest['domain'],
    service: ServiceCallRequest['service'],
    serviceData?: ServiceCallRequest['serviceData']
  ): Promise<ServiceCallResponse> {
    if (domain && service && serviceData) {
      // placeholder
    }

    const response = {
      context: {
        id: '',
        parent_id: undefined,
        user_id: undefined,
      },
    } as ServiceCallResponse;

    return Promise.resolve(response);
  }

  clone(): HomeAssistant {
    const hass = new HomeAssistant();
    hass.callService = this.callService;
    hass.states = JSON.parse(JSON.stringify(this.states));
    return hass;
  }
}

export class HassEntity implements IHassEntityBase {
  entity_id!: string;
  state!: string;
  last_changed!: string;
  last_updated!: string;
  attributes!: HassEntityAttributeBase;
  context!: { id: string; user_id: string | null; parent_id: string | null };
}

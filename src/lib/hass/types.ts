// This file has no imports on purpose
// So it can easily be consumed by other TS projects

export type Error = 1 | 2 | 3 | 4;

export type UnsubscribeFunc = () => void;

export type MessageBase = {
  id?: number;
  type: string;
  [key: string]: unknown;
};

export type HassEventBase = {
  origin: string;
  time_fired: string;
  context: {
    id: string;
    user_id: string;
  };
};

export type HassEvent = HassEventBase & {
  event_type: string;
  data: { [key: string]: unknown };
};

export type StateChangedEvent = HassEventBase & {
  event_type: "state_changed";
  data: {
    entity_id: string;
    new_state: HassEntity | null;
    old_state: HassEntity | null;
  };
};

export type HassConfig = {
  latitude: number;
  longitude: number;
  elevation: number;
  unit_system: {
    length: string;
    mass: string;
    volume: string;
    temperature: string;
  };
  location_name: string;
  time_zone: string;
  components: string[];
  config_dir: string;
  allowlist_external_dirs: string[];
  allowlist_external_urls: string[];
  version: string;
  config_source: string;
  safe_mode: boolean;
  state: "NOT_RUNNING" | "STARTING" | "RUNNING" | "STOPPING" | "FINAL_WRITE";
  external_url: string | null;
  internal_url: string | null;
};

export type HassEntityBase = {
  entity_id: string;
  state: string;
  last_changed: string;
  last_updated: string;
  attributes: HassEntityAttributeBase;
  context: { id: string; user_id: string | null };
};

export type HassEntityAttributeBase = {
  friendly_name?: string;
  unit_of_measurement?: string;
  icon?: string;
  entity_picture?: string;
  supported_features?: number;
  hidden?: boolean;
  assumed_state?: boolean;
  device_class?: string;
};

export type HassEntity = HassEntityBase & {
  attributes: { [key: string]: unknown };
};

export type HassEntities = { [entity_id: string]: HassEntity };

export type HassService = {
  description: string;
  fields: {
    [field_name: string]: {
      description: string;
      example: string | boolean | number;
    };
  };
};

export type HassDomainServices = {
  [service_name: string]: HassService;
};

export type HassServices = {
  [domain: string]: HassDomainServices;
};

export type HassUser = {
  id: string;
  is_owner: boolean;
  name: string;
};





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

import { BaseActionConfig } from '../../../lib/homeassistant/lovelace/types';

import {
  ToggleActionConfig,
  CallServiceActionConfig,
  NavigateActionConfig,
  UrlActionConfig,
  MoreInfoActionConfig,
  NoActionConfig,
  CustomActionConfig
} from '../../../lib/homeassistant/lovelace/types';

export class FloorplanConfig {
  // Core features
  image!: FloorplanImageConfig | string;
  stylesheet!: string;
  log_level!: string;
  console_log_level!: string;
  rules!: FloorplanRuleConfig[];

  // Optional features
  startup_action!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
  defaults!: FloorplanRuleConfig;
  image_mobile!: FloorplanImageConfig | string;

  // Experimental features
  pages!: string[];
  variables!: FloorplanVariableConfig[];
  pan_zoom: unknown;
}

export interface FloorplanCallServiceActionConfig extends CallServiceActionConfig {
  value: unknown;
}

export interface HoverInfoActionConfig extends BaseActionConfig {
  action: "hover-info";
}

export type FloorplanActionConfig =
  | ToggleActionConfig
  | FloorplanCallServiceActionConfig
  | NavigateActionConfig
  | UrlActionConfig
  | MoreInfoActionConfig
  | NoActionConfig
  | CustomActionConfig
  | HoverInfoActionConfig;

export class FloorplanPageConfig extends FloorplanConfig {
  page_id!: string;
  master_page!: FloorplanMasterPageConfig;
}

export class FloorplanMasterPageConfig extends FloorplanPageConfig {
  content_element!: string;
}

export class FloorplanImageConfig {
  sizes!: FloorplanImageSize[];
}

export class FloorplanImageSize {
  min_width = 0;
  location!: string;
}

export class FloorplanRuleConfig {
  entity!: string;
  entities!: (string | FloorplanRuleEntityElementConfig)[];
  groups!: string[];
  element!: string;
  elements!: string[];

  // action_name?: string;
  service?: string;
  service_data?: Record<string, unknown>;
  // url?: string;
  state_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
  tap_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
  hold_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
  double_tap_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
  hover_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
}

export class FloorplanRuleEntityElementConfig {
  entity!: string;
  element!: string;
}

export class FloorplanVariableConfig {
  name!: string;
  value!: unknown;
}

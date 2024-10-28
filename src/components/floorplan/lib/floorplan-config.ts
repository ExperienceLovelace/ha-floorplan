import {
  ActionConfig,
  BaseActionConfig,
} from '../../../lib/homeassistant/lovelace/types';

import {
  ToggleActionConfig,
  CallServiceActionConfig,
  NavigateActionConfig,
  UrlActionConfig,
  MoreInfoActionConfig,
  NoActionConfig,
  CustomActionConfig,
} from '../../../lib/homeassistant/lovelace/types';

import {
  FloorplanSvgElementInfo,
  FloorplanRuleInfo
} from './floorplan-info';

export class FloorplanConfig {
  // Core features
  image!: FloorplanImageConfig | string;
  stylesheet!: FloorplanStylesheetConfig | string;
  log_level!: string;
  console_log_level!: string;
  rules!: FloorplanRuleConfig[];

  // Optional features
  startup_action!:
    | FloorplanActionConfig[]
    | FloorplanActionConfig
    | string
    | false;
  defaults!: FloorplanRuleConfig;
  image_mobile!: FloorplanImageConfig | string;
  functions!: string;

  // Experimental features
  pages!: string[];
  variables!: FloorplanVariableConfig[];
  pan_zoom: unknown;
}

declare global {
  interface HASSDomEvents {
    'll-custom': ActionConfig;
  }
}

export interface FloorplanCallServiceActionConfig
  extends CallServiceActionConfig {
  value: unknown;
}

export interface HoverInfoActionConfig extends BaseActionConfig {
  action: 'hover-info';
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
  location!: string;
  cache!: boolean;
  sizes!: FloorplanImageSize[];
  use_screen_width?: boolean;
}

export class FloorplanImageSize {
  min_width = 0;
  location!: string;
  cache!: boolean;
}

export class FloorplanStylesheetConfig {
  location!: string;
  cache!: boolean;
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
  state_action!:
    | FloorplanActionConfig
    | FloorplanActionConfig[]
    | string
    | false;
  tap_action!: FloorplanActionConfig | FloorplanActionConfig[] | string | false;
  hold_action!:
    | FloorplanActionConfig
    | FloorplanActionConfig[]
    | string
    | false;
  double_tap_action!:
    | FloorplanActionConfig
    | FloorplanActionConfig[]
    | string
    | false;
  hover_action!:
    | FloorplanActionConfig
    | FloorplanActionConfig[]
    | string
    | false;
  hover_info_filter!: string[];
}

export class FloorplanRuleEntityElementConfig {
  entity!: string;
  element!: string;
}

export class FloorplanVariableConfig {
  name!: string;
  value!: unknown;
}

export interface FloorplanEventActionCallDetail {
  actionConfig: FloorplanCallServiceActionConfig;
  entityId?: string;
  svgElementInfo?: FloorplanSvgElementInfo;
  ruleInfo?: FloorplanRuleInfo;
}
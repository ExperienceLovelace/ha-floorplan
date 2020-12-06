
export class FloorplanConfig {
  // Core features
  image!: FloorplanImageConfig | string;
  stylesheet!: string;
  log_level!: string;
  console_log_level!: string;
  rules!: FloorplanRuleConfig[];

  // Optional features
  startup!: FloorplanStartupConfig;
  defaults!: FloorplanRuleConfig;
  image_mobile!: FloorplanImageConfig | string;
  last_motion!: FloorplanLastMotionConfig;

  // Experimental features
  pages!: string[];
  variables!: FloorplanVariableConfig[];
  pan_zoom: unknown;
}

export class FloorplanStartupConfig {
  action!: FloorplanActionConfig;
}

export class FloorplanActionConfig {
  service!: string;
  value: unknown;
  data!: Record<string, unknown>;
  no_entity_id = false;
}

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
  image!: string;
  image_refresh_interval!: string;
  text!: string;
  class!: string;
  style!: string;
  propagate = true;
  entity!: string;
  entities!: (string | FloorplanRuleEntityElementConfig)[];
  element!: string;
  elements!: string[];
  on_state!: FloorplanRuleStateConfig[] | FloorplanActionConfig;
  on_hover!: FloorplanActionConfig| false;
  on_click!: FloorplanActionConfig | false;
  on_long_click!: FloorplanActionConfig| false;
  groups!: string[];
}

export class FloorplanRuleStateConfig {
  state!: string;
  class!: string | string[];
  classes!: string | string[];
}

export class FloorplanRuleEntityElementConfig {
  entity!: string;
  element!: string;
}

export class FloorplanLastMotionConfig extends FloorplanRuleStateConfig {
  entity!: string;
}

export class FloorplanVariableConfig {
  name!: string;
  value!: unknown;
}

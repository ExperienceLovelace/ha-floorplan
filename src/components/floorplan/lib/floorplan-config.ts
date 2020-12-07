
export class FloorplanConfig {
  // Core features
  image!: FloorplanImageConfig | string;
  stylesheet!: string;
  log_level!: string;
  console_log_level!: string;
  rules!: FloorplanRuleConfig[];

  // Optional features
  on_startup!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
  defaults!: FloorplanRuleConfig;
  image_mobile!: FloorplanImageConfig | string;
  last_motion!: FloorplanLastMotionConfig;

  // Experimental features
  pages!: string[];
  variables!: FloorplanVariableConfig[];
  pan_zoom: unknown;
}

export class FloorplanActionConfig {
  service!: string;
  value: unknown;
  data!: string | Record<string, unknown>;
  no_entity_id!: boolean;
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
  entity!: string;
  entities!: (string | FloorplanRuleEntityElementConfig)[];
  groups!: string[];
  element!: string;
  elements!: string[];
  propagate = true;
  on_state!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
  on_hover!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
  on_click!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
  on_long_click!: FloorplanActionConfig[] | FloorplanActionConfig | string | false;
}

export class FloorplanRuleEntityElementConfig {
  entity!: string;
  element!: string;
}

export class FloorplanLastMotionConfig extends FloorplanActionConfig {
  entity!: string;
}

export class FloorplanVariableConfig {
  name!: string;
  value!: unknown;
}

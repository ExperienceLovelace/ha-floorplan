
export class FloorplanConfig {
  image!: FloorplanImageConfig | string;
  image_mobile!: FloorplanImageConfig | string;
  stylesheet!: string;
  debug_level!: string;
  log_level!: string;
  last_motion!: FloorplanLastMotionConfig;
  pan_zoom: unknown;
  pages = new Array<string>();
  rules!: Array<FloorplanRuleConfig>;

  variables = new Array<FloorplanVariableConfig>();
  startup!: FloorplanStartupConfig;
  defaults!: FloorplanConfigDefaults | undefined;
}

export class FloorplanConfigDefaults {
  hover_over!: boolean;
  more_info!: boolean;
  propagate = true;
}

export class FloorplanStartupConfig {
  action!: FloorplanActionConfig;
}

export class FloorplanActionConfig {
  service!: string;
  service_template!: string;
  value: unknown;
  value_template!: string;
  data!: string;
  data_template!: string;
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
  sizes = new Array<FloorplanImageSize>();
}

export class FloorplanImageSize {
  min_width = 0;
  location!: string;
}

export class FloorplanRuleConfig {
  image!: string;
  image_template!: string;
  image_refresh_interval!: string;
  text_template!: string;
  class_template!: string;
  hover_over!: boolean;
  more_info!: boolean;
  propagate = true;
  entity!: string;
  entities!: Array<string | FloorplanRuleEntityElementConfig>;
  element!: string;
  elements!: Array<string>;
  on_click!: FloorplanActionConfig;
  on_long_click!: FloorplanActionConfig;
  groups!: Array<string>;
  states = new Array<FloorplanRuleStateConfig>();
}

export class FloorplanRuleStateConfig {
  state!: string;
  class!: string | Array<string>;
  classes!: string | Array<string>;
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
  value_template!: string;
}

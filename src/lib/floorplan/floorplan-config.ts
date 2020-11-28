
export class FloorplanConfigBase {
  image?: FloorplanImageConfig | string;
  image_mobile?: FloorplanImageConfig | string;
  stylesheet: string = "";
  debug_level?: string;
  log_level?: string;
  last_motion?: FloorplanLastMotionConfig;
  pan_zoom: any;
  fully_kiosk: any;
  pages = new Array<any>();
  rules = new Array<FloorplanRuleConfig>();

  svg?: SVGGraphicsElement;
  variables = new Array<any>();
  startup?: FloorplanStartupConfig;
  defaults: any;
}

export class FloorplanConfig extends FloorplanConfigBase {
}

export class FloorplanStartupConfig {
  action?: FloorplanActionConfig;
}

export class FloorplanActionConfig {
  service?: string;
  service_template?: string;
  value: any;
  value_template?: string;
  data?: string;
  data_template?: string;
  no_entity_id: boolean = false;
}

export class FloorplanPageConfig extends FloorplanConfigBase {
  page_id: string = "";
  master_page!: string;
}

export class FloorplanImageConfig {
  sizes = new Array<FloorplanImageSize>();
}

export class FloorplanImageSize {
  min_width = 0;
  location: string = "";
}

export class FloorplanRuleConfig {
  image?: string;
  image_template?: string;
  image_refresh_interval?: string;
  text_template?: string;
  class_template?: string;
  hover_over: boolean = false;
  more_info: boolean = false;
  propagate: boolean = true;
  entity?: string;
  entities?: Array<string | FloorplanRuleEntityElementConfig>;
  element?: string;
  elements?: Array<string>;
  on_click?: FloorplanActionConfig;
  on_long_click?: FloorplanActionConfig;
  groups?: Array<string>;
  states = new Array<FloorplanRuleStateConfig>();
}

export class FloorplanRuleStateConfig {
  state?: string;
  class?: string | Array<string>;
  classes?: string | Array<string>;
}

export class FloorplanRuleEntityElementConfig {
  entity?: string;
  element?: string;
}

export class FloorplanLastMotionConfig extends FloorplanRuleStateConfig {
  entity?: string;
}

export class FloorplanVariableConfig {
  name?: string;
  value?: any;
  value_template?: string;
}

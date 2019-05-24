export namespace Floorplan {

  export class ConfigBase {
    image?: ImageConfig | string;
    stylesheet: string = "";
    debug_level?: string;
    log_level?: string;
    last_motion?: LastMotionConfig;
    pan_zoom: any;
    fully_kiosk: any;
    pages = new Array<any>();
    rules = new Array<RuleConfig>();

    svg?: SVGGraphicsElement;
    variables = new Array<any>();
    startup?: StartupConfig;
    defaults: any;
  }

  export class FloorplanConfig extends ConfigBase {
  }

  export class StartupConfig {
    action?: ActionConfig;
  }

  export class ActionConfig {
    service?: string;
    service_template?: string;
    value: any;
    value_template?: string;
    data?: string;
    data_template?: string;
  }

  export class PageConfig extends ConfigBase {
    page_id: string = "";
    master_page!: string;
  }

  export class ImageConfig {
    sizes = new Array<ImageSize>();
  }

  export class ImageSize {
    min_width = 0;
    location: string = "";
  }

  export class RuleConfig {
    image?: string;
    image_template?: string;
    image_refresh_interval?: string;
    text_template?: string;
    class_template?: string;
    hover_over: boolean = false;
    more_info: boolean = false;
    propagate: boolean = true;
    entity?: string;
    entities?: Array<string | RuleEntityElementConfig>;
    element?: string;
    elements?: Array<string>;
    action?: ActionConfig;
    groups?: Array<string>;
    states = new Array<RuleStateConfig>();
  }

  export class RuleStateConfig {
    state?: string;
    class?: string | Array<string>;
    classes?: string | Array<string>;
  }

  export class RuleEntityElementConfig {
    entity?: string;
    element?: string;
  }

  export class LastMotionConfig extends RuleStateConfig {
    entity?: string;
  }

  export class VariableConfig {
    name?: string;
    value?: any;
    value_template?: string;
  }
}
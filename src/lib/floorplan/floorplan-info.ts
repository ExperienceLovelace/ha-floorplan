import { Hass } from '../hass/hass';
import { Floorplan as Config } from './floorplan-config';

export namespace FloorplanInfo {

  export class PageInfo {
    index?: number;
    config?: Config.PageConfig;
    svg?: SVGGraphicsElement;
    isMaster: boolean = false;
    isDefault: boolean = false;
  }

  export class ElementInfo {
    ruleInfos = new Array<RuleInfo>();
  }

  export class SvgElementInfo {
    constructor(
      public entityId: string,
      public svg: SVGGraphicsElement | undefined,
      public svgElement: SVGGraphicsElement,
      public originalSvgElement: SVGGraphicsElement,
      public originalClasses: Array<string>,
      public originalBBox: DOMRect,
      public originalClientRect: ClientRect | DOMRect) {
    }
  }

  export class RuleInfo {
    svgElementInfos = new Map<string, SvgElementInfo>();
    imageUrl?: string;
    imageLoader: any;
    propagate: boolean = false;

    constructor(public rule: Config.RuleConfig) {
      this.rule = rule;
    }
  }

  export class EntityInfo {
    lastState?: Hass.HassEntityState;
    entityId?: string;
    ruleInfos = new Array<RuleInfo>();
  }
}
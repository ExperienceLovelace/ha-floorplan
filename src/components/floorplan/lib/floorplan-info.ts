import { HassEntityState } from '../../../lib/hass/hass';
import { FloorplanPageConfig, FloorplanRuleConfig } from './floorplan-config';

export class FloorplanPageInfo {
  index!: number;
  config!: FloorplanPageConfig;
  svg!: SVGGraphicsElement;
  isMaster: boolean = false;
  isDefault: boolean = false;
}

export class FloorplanElementInfo {
  ruleInfos = new Array<FloorplanRuleInfo>();
}

export class FloorplanSvgElementInfo {
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

export class FloorplanRuleInfo {
  svgElementInfos = new Map<string, FloorplanSvgElementInfo>();
  imageUrl!: string;
  imageLoader: any;
  propagate: boolean = false;

  constructor(public rule: FloorplanRuleConfig) {
  }
}

export class FloorplanEntityInfo {
  lastState!: HassEntityState;
  entityId!: string;
  ruleInfos = new Array<FloorplanRuleInfo>();
}

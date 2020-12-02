import { HassEntity } from '../../../lib/homeassistant/core-types';
import { FloorplanPageConfig, FloorplanRuleConfig } from './floorplan-config';

export class FloorplanPageInfo {
  index!: number;
  config!: FloorplanPageConfig;
  svg!: SVGGraphicsElement;
  isMaster!: boolean;
  isDefault!: boolean;
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
  imageLoader!: number | undefined;
  propagate!: boolean;

  constructor(public rule: FloorplanRuleConfig) {
  }
}

export class FloorplanEntityInfo {
  lastState!: HassEntity | undefined;
  entityId!: string;
  ruleInfos = new Array<FloorplanRuleInfo>();
}

export class FloorplanClickContext {
  constructor(
    public instance: HTMLElement,
    public svgElementInfo: FloorplanSvgElementInfo,
    public entityId: string | undefined,
    public elementId: string | undefined,
    public rule: FloorplanRuleConfig,
  ) {
  }
}

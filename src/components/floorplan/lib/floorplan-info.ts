import { HassEntity } from '../../../lib/homeassistant/core-types';
import { FloorplanPageConfig, FloorplanRuleConfig, FloorplanActionConfig } from './floorplan-config';

export class FloorplanPageInfo {
  index!: number;
  config!: FloorplanPageConfig;
  svg!: SVGGraphicsElement;
  isMaster!: boolean;
  isDefault!: boolean;
}

export class FloorplanElementInfo {
  ruleInfos!: FloorplanRuleInfo[];
}

export class FloorplanSvgElementInfo {
  constructor(
    public entityId: string,
    public svgElement: SVGGraphicsElement,
    public originalSvgElement: SVGGraphicsElement,
    public originalClasses: Set<string>,
    public originalStyles: Record<string, unknown>,
    public originalBBox: DOMRect,
    public originalClientRect: ClientRect | DOMRect) {
  }
}

export class FloorplanRuleInfo {
  svgElementInfos: { [key: string]: FloorplanSvgElementInfo } = {};
  imageUrl!: string;
  imageLoader!: number | undefined;
  propagate!: boolean;

  constructor(public rule: FloorplanRuleConfig) {
  }
}

export class FloorplanEntityInfo {
  lastState!: HassEntity | undefined;
  entityId!: string;
  ruleInfos!: FloorplanRuleInfo[];
}

export class FloorplanClickContext {
  constructor(
    public instance: HTMLElement,
    public entityId: string | undefined,
    public elementId: string | undefined,
    public svgElementInfo: FloorplanSvgElementInfo,
    public ruleInfo: FloorplanRuleInfo,
    public actions?: Array<FloorplanActionConfig>,
  ) {
  }
}

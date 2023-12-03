import { HassEntity } from 'home-assistant-js-websocket';
import {
  FloorplanPageConfig,
  FloorplanRuleConfig,
  FloorplanActionConfig,
} from './floorplan-config';

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
    public originalBBox: DOMRect | null
  ) {}
}

export class FloorplanRuleInfo {
  svgElementInfos: { [key: string]: FloorplanSvgElementInfo } = {};
  imageUrl!: string;
  imageLoader!: number | undefined;

  constructor(public rule: FloorplanRuleConfig) {}
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
    public actions: Array<FloorplanActionConfig>
  ) {}
}
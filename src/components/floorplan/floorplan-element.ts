import { HomeAssistant, CurrentUser } from '../../lib/homeassistant/types';
import { HassEntityBase } from 'home-assistant-js-websocket';
import { fireEvent } from '../../lib/homeassistant/common/dom/fire_event';
import { navigate } from '../../lib/homeassistant/common/navigate';
import { MoreInfoDialogParams } from '../../lib/homeassistant/dialogs/more-info/ha-more-info-dialog';
import {
  FloorplanConfig,
  FloorplanPageConfig,
  FloorplanActionConfig,
  FloorplanCallServiceActionConfig,
  FloorplanEventActionCallDetail
} from './lib/floorplan-config';
import {
  FloorplanRuleConfig,
  FloorplanVariableConfig,
  FloorplanImageConfig,
} from './lib/floorplan-config';
import {
  FloorplanRuleEntityElementConfig,
  FloorplanStylesheetConfig,
} from './lib/floorplan-config';
import {
  FloorplanClickContext,
  FloorplanPageInfo,
  FloorplanRuleInfo,
  FloorplanSvgElementInfo,
} from './lib/floorplan-info';
import {
  FloorplanElementInfo,
  FloorplanEntityInfo,
} from './lib/floorplan-info';
import { LongClicks } from './lib/long-clicks';
import { ManyClicks } from './lib/many-clicks';
import { EvalHelper } from './lib/eval-helper';
import yaml from 'js-yaml';
import { Utils } from '../../lib/utils';
import { DateUtil } from './lib/date-util';
import { Logger } from './lib/logger';
import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { HA_FLOORPLAN_ACTION_CALL_EVENT } from './lib/events';
import { customElement, property } from 'lit/decorators.js';
import OuiDomEvents from './lib/oui-dom-events';
const E = OuiDomEvents;

declare const NAME: string;
declare const DESCRIPTION: string;
declare const VERSION: string;

// Display version in console
console.info(
  `%c${DESCRIPTION} (${NAME})%c\nVersion ${VERSION}`,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: rgb(71, 170, 238)'
);

@customElement('floorplan-element')
export class FloorplanElement extends LitElement {
  @property({ type: String }) public examplespath!: string;
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: String || Object }) public _config!:
    | string
    | FloorplanConfig;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Boolean }) public isShowLog!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  config!: FloorplanConfig;
  pageInfos: { [key: string]: FloorplanPageInfo } = {};
  entityInfos: { [key: string]: FloorplanEntityInfo } = {};
  elementInfos: { [key: string]: FloorplanElementInfo } = {};
  cssRules: unknown[] = [];
  functions: unknown = {};
  variables: { [key: string]: unknown } = {};
  logger!: Logger;
  svgElements: { [elementId: string]: SVGGraphicsElement } = {};

  isRulesLoaded = false;
  svg!: SVGGraphicsElement;

  constructor() {
    super();
    window.onerror = this.handleWindowError.bind(this);
  }

  render(): TemplateResult {
    return html`
      <div id="floorplan-container">
        <div id="floorplan"></div>
        
        <div id="log" style="display: ${this.isShowLog ? 'block' : 'none'};">
          <a href="#" onclick="return false;" @click=${
            this.clearLog
          }>Clear log<a/>
          <ul></ul>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host #floorplan-container {
        display: flex;
        flex-flow: column;
        flex: 1;
        min-height: 0;
      }

      :host #floorplan {
        display: flex;
        flex-flow: column;
        flex: 1;
        min-height: 0;
      }

      :host #log {
        max-height: 150px;
        overflow: auto;
        background-color: #eee;
        padding: 10px;
      }

      :host #log ul {
        list-style-type: none;
        padding-left: 0px;
        text-align: left;
      }

      :host svg,
      :host svg * {
        /* vector-effect: non-scaling-stroke !important; */
        pointer-events: all !important;
      }

      ha-circular-progress {
        margin: auto;
      }

      #log {
        min-height: 100px;
        max-height: 100px;
        overflow: auto;
        background-color: #eee;
        display: none;
        padding: 10px;
      }

      #log ul {
        list-style-type: none;
        padding-left: 0px;
        text-align: left;
      }

      .error {
        color: #ff0000;
      }

      .warning {
        color: #ff851b;
      }

      .info {
        color: #0000ff;
      }

      .debug {
        color: #000000;
      }
    `;
  }

  clearLog(): void {
    (this.logElement.querySelector('#log ul') as HTMLUListElement).innerHTML =
      '';
  }

  protected async updated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);

    if (changedProperties.has('_config')) {
      await this._configChanged();
      await this.hassChanged(); // call hassChanged(), since hass may have been while _configChanged() was executing
    }

    if (changedProperties.has('hass')) {
      await this.hassChanged();
    }
  }

  async _configChanged(): Promise<void> {
    if (!this._config) return;

    await this.init();
  }

  async hassChanged(): Promise<void> {
    if (!this.hass || !this.config || !this.svg) return; // wait for SVG to be loaded

    const deviceId = Utils.deviceId();

    // Expose ha-floorplan as a sensor on basis of a random-generated id
    this.hass.states[`sensor.ha_floorplan_${deviceId}`] = {
      entity_id: `sensor.ha_floorplan_${deviceId}`,
      state: 'on',
      last_changed: new Date().toString(),
      last_updated: new Date().toString(),
      attributes: {
        device_class: 'ha-floorplan',
        friendly_name: `ha-floorplan - Floorplan for Home Assistant`,
        icon: 'mdi:floor-plan',
        assumed_state: false,
        hidden: true,
      },
      context: {},
    } as HassEntityBase;

    if (!this.isRulesLoaded) {
      this.initFloorplanRules(this.svg, this.config);
      this.isRulesLoaded = true;
      await this.handleEntities(true);
    } else {
      this.handleEntities();
    }
  }

  private get floorplanElement(): HTMLDivElement {
    return this.shadowRoot?.getElementById('floorplan') as HTMLDivElement;
  }

  private get logElement(): HTMLDivElement {
    return this.shadowRoot?.getElementById('log') as HTMLDivElement;
  }

  /***************************************************************************************************************************/
  /* Startup
  /***************************************************************************************************************************/

  async init(): Promise<void> {
    try {
      const config = await this.loadConfig(this._config, false);

      this.isShowLog = config.log_level !== undefined;

      this.logger = new Logger(
        this.logElement,
        config.log_level,
        config.console_log_level
      );

      this.logInfo('INIT', `${DESCRIPTION} (${NAME}) v${VERSION}`);

      if (!this.validateConfig(config)) return;

      this.config = config; // set resolved config as effective config

      //await this.loadLibraries()

      if (this.config.pages) {
        await this.initMultiPage();
      } else {
        await this.initSinglePage();
      }

      // Add listener 
      this.initEventListeners();
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  async initMultiPage(): Promise<void> {
    try {
      await this.loadPages();
      this.initPageDisplay();
      this.initVariables();
      this.initStartupActions();
    } catch (err) {
      this.handleError(err as Error);
    }
  }

  async initSinglePage(): Promise<void> {
    try {
      await this.loadStyleSheet(this.config.stylesheet);
      const imageConfig = this.getBestImage(this.config);
      this.svg = await this.loadFloorplanSvg(imageConfig);
      this.initPageDisplay();
      this.initVariables();
      this.initStartupActions();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /***************************************************************************************************************************/
  /* Loading resources
  /***************************************************************************************************************************/

  async loadConfig(
    config: FloorplanConfig | string,
    useCache: boolean
  ): Promise<FloorplanConfig> {
    if (typeof config === 'string') {
      let targetConfig: string;

      try {
        targetConfig = await Utils.fetchText(
          config,
          this.isDemo,
          this.examplespath,
          useCache
        );
      } catch (err) {
        this.logError('CONFIG', `Error loading config: ${config}`);
        throw err;
      }

      const configYaml = yaml.load(targetConfig);
      return configYaml as FloorplanConfig;
    } else {
      return JSON.parse(JSON.stringify(config)); // clone the config!!!
    }
  }

  /*
  async loadLibraries(): Promise<void> {
    if (this.isOptionEnabled(this.config.pan_zoom)) {
      await this.loadScript('/local/floorplan/lib/svg-pan-zoom.min.js', true);
    }

    if (this.isOptionEnabled(this.config.fully_kiosk)) {
      await this.loadScript('/local/floorplan/lib/fully-kiosk.js', false);
    }
  }
  */

  loadScript(scriptUrl: string, useCache: boolean): Promise<void> {
    if (!scriptUrl) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = useCache ? scriptUrl : Utils.cacheBuster(scriptUrl);
      script.onload = () => resolve();
      script.onerror = (err) => {
        reject(
          new URIError(
            `${
              (err as unknown as Record<string, Record<string, unknown>>).target
                .src
            }`
          )
        );
      };

      this.shadowRoot?.appendChild(script);
    });
  }

  async loadPages(): Promise<void> {
    for (const pageConfigUrl of this.config.pages) {
      await this.loadPageConfig(
        pageConfigUrl,
        this.config.pages.indexOf(pageConfigUrl)
      );
    }

    const pageInfos = Object.keys(this.pageInfos).map(
      (key) => this.pageInfos[key]
    );
    pageInfos.sort((a, b) => a.index - b.index); // sort ascending

    const masterPageInfo = pageInfos.find(
      (pageInfo) => pageInfo.config.master_page !== undefined
    );
    if (masterPageInfo) {
      masterPageInfo.isMaster = true;
    } else {
      throw new Error('A master page is required');
    }

    const defaultPageInfo = pageInfos.find(
      (pageInfo) => pageInfo.config.master_page === undefined
    );
    if (defaultPageInfo) {
      defaultPageInfo.isDefault = true;
    }

    await this.loadPageFloorplanSvg(masterPageInfo, masterPageInfo); // load master page first

    const nonMasterPages = pageInfos.filter(
      (pageInfo) => pageInfo !== masterPageInfo
    );
    for (const pageInfo of nonMasterPages) {
      await this.loadPageFloorplanSvg(pageInfo, masterPageInfo);
    }

    this.svg = masterPageInfo.svg;
  }

  async loadPageConfig(
    pageConfigUrl: string,
    index: number
  ): Promise<FloorplanPageInfo> {
    const pageConfig = (await this.loadConfig(
      pageConfigUrl,
      false
    )) as FloorplanPageConfig;
    const pageInfo = this.createPageInfo(pageConfig);
    pageInfo.index = index;
    return pageInfo;
  }

  async loadPageFloorplanSvg(
    pageInfo: FloorplanPageInfo,
    masterPageInfo: FloorplanPageInfo
  ): Promise<void> {
    const imageConfig = this.getBestImage(pageInfo.config);
    const svg = await this.loadFloorplanSvg(
      imageConfig,
      pageInfo,
      masterPageInfo
    );
    svg.id = pageInfo.config.page_id; // give the SVG an ID so it can be styled (i.e. background color)
    pageInfo.svg = svg;
    await this.loadStyleSheet(pageInfo.config.stylesheet);
    this.initFloorplanRules(pageInfo.svg, pageInfo.config);
  }

  getBestImage(config: FloorplanConfig): { location: string; cache: boolean } {
    let imageUrl = '';
    let cache = true;

    if (typeof config.image === 'string') {
      // Device detection
      if (Utils.isMobile && typeof config.image_mobile === 'string') {
        imageUrl = config.image_mobile;
      } else {
        imageUrl = config.image;
      }
    } else {
      if (config.image?.sizes) {
        // Legacy: Previously we always used screen.width. This logic are here, to support the old way of doing it.
        const target_width = config?.image?.use_screen_width === true ? screen.width : window.innerWidth;
        config.image.sizes.sort((a, b) => b.min_width - a.min_width); // sort descending
        for (const pageSize of config.image.sizes) {
          if (target_width >= pageSize.min_width) {
            imageUrl = pageSize.location;
            cache = pageSize.cache === true;
            break;
          }
        }
      } else {
        // Device detection
        if (Utils.isMobile && config.image_mobile) {
          imageUrl = (config.image_mobile as FloorplanImageConfig).location;
          cache = (config.image_mobile as FloorplanImageConfig).cache === true;
        } else {
          imageUrl = config.image.location;
          cache = config.image.cache === true;
        }
      }
    }

    return { location: imageUrl, cache: cache };
  }

  createPageInfo(pageConfig: FloorplanPageConfig): FloorplanPageInfo {
    const pageInfo = { config: pageConfig } as FloorplanPageInfo;

    // Merge the page's rules with the main config's rules
    if (pageInfo.config.rules && this.config.rules) {
      pageInfo.config.rules = pageInfo.config.rules.concat(this.config.rules);
    }

    this.pageInfos[pageInfo.config.page_id] = pageInfo;

    return pageInfo;
  }

  async loadStyleSheet(
    stylesheetConfig: FloorplanStylesheetConfig | string
  ): Promise<void> {
    const stylesheetUrl =
      typeof stylesheetConfig === 'string'
        ? stylesheetConfig
        : stylesheetConfig.location;
    const useCache =
      typeof stylesheetConfig === 'string'
        ? false
        : stylesheetConfig.cache === true;

    if (!stylesheetUrl) return;

    let stylesheet: string;

    try {
      stylesheet = await Utils.fetchText(
        stylesheetUrl,
        this.isDemo,
        this.examplespath,
        useCache
      );
    } catch (err) {
      this.logError('STYLESHEET', `Error loading stylesheet: ${stylesheetUrl}`);
      throw err;
    }

    const style = document.createElement('style');

    const initializeNode = () => {
      style.innerHTML = stylesheet;
      this.shadowRoot?.appendChild(style);
    };

    try {
      await Utils.waitForChildNodes(style, initializeNode, 10000);
    } catch (err) {
      this.logError('STYLESHEET', `Error loading stylesheet`);
    }

    const cssRules = this.getCssRules(style);

    this.cssRules = this.cssRules.concat(cssRules);
  }

  getCssRules(style: HTMLStyleElement): unknown[] {
    let cssRules;

    if (style.sheet) {
      cssRules = style.sheet?.cssRules ?? style.sheet?.rules;
    } else {
      const otherStyle = style as unknown as Record<
        string,
        Record<string, unknown>
      >;

      if (otherStyle.styleSheet) {
        cssRules =
          otherStyle.styleSheet?.cssRules ?? otherStyle.styleSheet?.rules;
      }
    }

    return cssRules ? Utils.getArray<unknown>(cssRules) : [];
  }

  async loadFloorplanSvg(
    imageConfig: { location: string; cache: boolean },
    pageInfo?: FloorplanPageInfo,
    masterPageInfo?: FloorplanPageInfo
  ): Promise<SVGGraphicsElement> {
    let svgText: string;

    try {
      svgText = await Utils.fetchText(
        imageConfig.location,
        this.isDemo,
        this.examplespath,
        imageConfig.cache
      );
    } catch (err) {
      this.logError('IMAGE', `Error loading image: ${imageConfig.location}`);
      throw err;
    }

    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg') as SVGGraphicsElement;

    if (pageInfo) {
      svg.setAttribute('id', pageInfo.config.page_id);
    }

    svg.setAttribute('height', '100%');
    svg.setAttribute('width', '100%');
    svg.style.height = '100%';
    svg.style.width = '100%';
    svg.style.margin = 'auto'; // center
    svg.style.cursor = 'default';
    svg.style.opacity = '0';
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    if (pageInfo && masterPageInfo) {
      const masterPageId = masterPageInfo.config.page_id;
      const contentElementId =
        masterPageInfo.config.master_page.content_element;

      if (pageInfo.config.page_id === masterPageId) {
        if (this.floorplanElement) this.replaceChildrenUtil(this.floorplanElement, svg);
      } else {
        // const masterPageElement = this.floorplanElement.querySelector('#' + masterPageId);
        const contentElement = this.floorplanElement.querySelector(
          '#' + contentElementId
        ) as Element;

        const height = Number.parseFloat(svg.getAttribute('height') as string);
        const width = Number.parseFloat(svg.getAttribute('width') as string);
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        svg.setAttribute(
          'height',
          contentElement.getAttribute('height') as string
        );
        svg.setAttribute(
          'width',
          contentElement.getAttribute('width') as string
        );
        svg.setAttribute('x', contentElement.getAttribute('x') as string);
        svg.setAttribute('y', contentElement.getAttribute('y') as string); 

        if (contentElement?.parentElement) this.replaceChildrenUtil(contentElement.parentElement, svg);
      }
    } else {
      if (this.floorplanElement) this.replaceChildrenUtil(this.floorplanElement, svg);
    }

    // TODO: Re-enable???
    // Enable pan / zoom if enabled in config
    /*
    if (this.isOptionEnabled(this.config.pan_zoom)) {
      svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: true,
        fit: true,
        center: true,
      });
    }
    */

    return svg;
  }

  /**
   * Handle browsers that do not support replaceChildren
   * 
   * @param parent Element to replace children
   * @param newChild New child to replace the existing children
   * @returns 
   */
  async replaceChildrenUtil(parent: Element, newChild: Element): Promise<void> {
    // If the parent has the replaceChildren function, use it
    if (parent?.replaceChildren) {
      parent.replaceChildren(newChild);
      return;
    }

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    parent.appendChild(newChild);
  }

  async loadImage(
    imageUrl: string,
    svgElementInfo: FloorplanSvgElementInfo,
    entityId: string,
    ruleInfo: FloorplanRuleInfo,
    useCache: boolean
  ): Promise<SVGGraphicsElement> {
    const isSvg =
      imageUrl.toLowerCase().includes('.svg') ||
      svgElementInfo.svgElement.nodeName === 'svg' ||
      svgElementInfo.svgElement.querySelector('svg');

    if (isSvg) {
      return await this.loadSvgImage(
        imageUrl,
        svgElementInfo,
        entityId,
        ruleInfo,
        useCache
      );
    } else {
      return await this.loadBitmapImage(
        imageUrl,
        svgElementInfo,
        entityId,
        ruleInfo,
        useCache
      );
    }
  }

  async loadBitmapImage(
    imageUrl: string,
    svgElementInfo: FloorplanSvgElementInfo,
    entityId: string,
    ruleInfo: FloorplanRuleInfo,
    useCache: boolean
  ): Promise<SVGGraphicsElement> {
    imageUrl = useCache ? imageUrl : Utils.cacheBuster(imageUrl);

    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    let svgElement = svgElementInfo.svgElement; // assume the target element already exists

    if (svgElement.nodeName !== 'image') {
      svgElement = this.createImageElement(
        svgElementInfo.originalSvgElement
      ) as SVGGraphicsElement;

      svgElementInfo.svgElement = this.replaceElement(
        svgElementInfo.svgElement,
        svgElement
      );

      this.attachClickHandlers(
        svgElement,
        svgElementInfo,
        entityId,
        undefined,
        ruleInfo
      );

      svgElement.onmouseover = () => {
        this.handleEntityIdSetHoverOver(entityId, svgElementInfo);
      };
    }

    svgElement.setAttributeNS(
      'http://www.w3.org/1999/xlink',
      'xlink:href',
      imageUrl
    );

    return svgElement;
  }

  async loadSvgImage(
    imageUrl: string,
    svgElementInfo: FloorplanSvgElementInfo,
    entityId: string,
    ruleInfo: FloorplanRuleInfo,
    useCache: boolean
  ): Promise<SVGGraphicsElement> {
    let svgText: string;

    if (!imageUrl?.trim().length) {
      const emptySvg = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      );
      emptySvg.setAttribute('viewBox', '0 0 0 0');
      svgText = emptySvg.outerHTML;
    } else {
      try {
        svgText = await Utils.fetchText(
          imageUrl,
          this.isDemo,
          this.examplespath,
          useCache
        );
      } catch (err) {
        this.logError('IMAGE', `Error loading image: ${imageUrl}`);
        throw err;
      }
    }

    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    const svgContainer =
      svgElementInfo.svgElement.nodeName === 'g'
        ? svgElementInfo.svgElement
        : document.createElement('div');

    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg') as SVGGraphicsElement;

    const height = Number.parseFloat(svg.getAttribute('height') as string);
    const width = Number.parseFloat(svg.getAttribute('width') as string);
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    svg.id = svgElementInfo.svgElement.id;
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

    // A clipPath does not have the clipPath function on the element, therefore originalBBox can be null in some cases
    if (svgElementInfo.originalBBox !== null) {
      svg.setAttribute('height', svgElementInfo.originalBBox.height.toString());
      svg.setAttribute('width', svgElementInfo.originalBBox.width.toString());
      svg.setAttribute('x', svgElementInfo.originalBBox.x.toString());
      svg.setAttribute('y', svgElementInfo.originalBBox.y.toString());
    }

    if (svgElementInfo.svgElement.nodeName !== 'g') {
      const originalTransform =
        svgElementInfo.svgElement.getAttribute('transform');
      if (originalTransform) {
        svg.setAttribute('transform', originalTransform);
      }

      svgElementInfo.svgElement = this.replaceElement(
        svgElementInfo.svgElement,
        svg
      );
    }

    this.attachClickHandlers(
      svg,
      svgElementInfo,
      entityId,
      undefined,
      ruleInfo
    );

    svgElementInfo.svgElement.onmouseover = () => {
      this.handleEntityIdSetHoverOver(entityId, svgElementInfo);
    };

    return svg;
  }

  _querySelectorAll(
    element: Element,
    selector: string | undefined = undefined,
    includeSelf: boolean
  ): Element[] {
    let elements = selector
      ? Array.from(element.querySelectorAll(selector).values())
      : [];
    elements = includeSelf ? [element].concat(elements) : elements;
    return elements;
  }

  replaceElement(
    previousSvgElement: SVGGraphicsElement,
    svgElement: SVGGraphicsElement
  ): SVGGraphicsElement {
    const parentElement = previousSvgElement.parentElement;

    // Retain any classes from the original element
    for (const className of Array.from(previousSvgElement.classList)) {
      svgElement.classList.add(className);
    }

    this._querySelectorAll(previousSvgElement, '*', true).forEach(
      (element: Element) => {
        E.off(element, 'click');
        E.off(element, 'longClick');
        element.remove();
      }
    );
    previousSvgElement.remove();

    parentElement?.appendChild(svgElement);

    return svgElement;
  }

  /***************************************************************************************************************************/
  /* Initialization
  /***************************************************************************************************************************/

  /*
  initFullyKiosk(): void {
    if (this.isOptionEnabled(this.config.fully_kiosk)) {
      this.fullyKiosk = new FullyKiosk(this);
      this.fullyKiosk.init();
    }
  }
  */

  initPageDisplay(): void {
    if (this.config.pages) {
      for (const pageInfo of Object.values(this.pageInfos)) {
        pageInfo.svg.style.opacity = '1';
        pageInfo.svg.style.display =
          pageInfo.isMaster || pageInfo.isDefault ? 'initial' : 'none'; // Show the first page
      }
    } else {
      // Show the SVG
      this.svg.style.opacity = '1';
      this.svg.style.display = 'block';
    }
  }

  initVariables(): void {
    if (this.config.variables) {
      for (const variable of this.config.variables) {
        this.initVariable(variable);
      }
    }

    if (this.config.pages) {
      for (const pageInfo of Object.values(this.pageInfos)) {
        if (pageInfo.config.variables) {
          for (const variable of pageInfo.config.variables) {
            this.initVariable(variable);
          }
        }
      }
    }
  }

  initVariable(variable: FloorplanVariableConfig): void {
    let variableName: string;
    let value: unknown;

    if (typeof variable === 'string') {
      variableName = variable;
    } else {
      variableName = variable.name;

      value = variable.value;
      if (variable.value) {
        value = this.evaluate(variable.value, variableName, undefined);
      }
    }

    if (!this.entityInfos[variableName]) {
      const entityInfo = {
        entityId: variableName,
        ruleInfos: [],
        lastState: undefined,
      } as FloorplanEntityInfo;
      this.entityInfos[variableName] = entityInfo;
    }

    if (!this.hass.states[variableName]) {
      this.hass.states[variableName] = {
        entity_id: variableName,
        state: value,
        last_changed: new Date().toString(),
        last_updated: new Date().toString(),
        attributes: {},
        context: {},
      } as HassEntityBase;
    }

    this.setVariable(variableName, value, {}, true);
  }

  getActionConfigs(
    actionConfig:
      | FloorplanActionConfig[]
      | FloorplanActionConfig
      | string
      | false
  ): FloorplanActionConfig[] {
    if (actionConfig === undefined || actionConfig === null) {
      return [];
    } else if (Array.isArray(actionConfig)) {
      for (const config of actionConfig as FloorplanActionConfig[]) {
        config.action = config.action ?? 'call-service';
      }

      return actionConfig;
    } else if (typeof actionConfig === 'object') {
      actionConfig.action = actionConfig.action ?? 'call-service';

      return [actionConfig];
    } else if (typeof actionConfig === 'string') {
      if (actionConfig.includes('.')) {
        return [
          {
            action: 'call-service',
            service: actionConfig,
          },
        ] as FloorplanActionConfig[];
      } else {
        return [
          {
            action: actionConfig,
          },
        ] as FloorplanActionConfig[];
      }
    } else {
      return [];
    }
  }

  initEventListeners(): void {
    // Add our custom event listener
    this.addEventListener(HA_FLOORPLAN_ACTION_CALL_EVENT, this.handleEventActionCall as EventListener);
  }

  initStartupActions(): void {
    this.handleActions(
      this.config.startup_action,
      undefined,
      undefined,
      undefined
    );

    if (this.config.pages) {
      for (const pageInfo of Object.values(this.pageInfos)) {
        this.handleActions(
          pageInfo.config.startup_action,
          undefined,
          undefined,
          undefined
        );
      }
    }
  }

  /***************************************************************************************************************************/
  /* SVG initialization
  /***************************************************************************************************************************/

  initFloorplanRules(svg: SVGGraphicsElement, config: FloorplanConfig): void {
    if (!config.rules) return;

    const svgElements = this._querySelectorAll(
      svg,
      '*',
      true
    ) as SVGGraphicsElement[];

    for (const svgElement of svgElements) {
      if (svgElement.id) {
        this.svgElements[svgElement.id] = svgElement;
      }
    }

    this.initRules(config, svg, svgElements);
  }

  initRules(
    config: FloorplanConfig,
    svg: SVGGraphicsElement,
    svgElements: SVGGraphicsElement[]
  ): void {
    if (config.functions) {
      this.functions = this.evaluate(config.functions);
    }

    // Apply default options to rules that don't override the options explictly
    if (config.defaults) {
      const defaultRule = config.defaults;

      for (const rule of config.rules) {
        rule.hover_action =
          rule.hover_action === undefined
            ? defaultRule.hover_action
            : rule.hover_action;

        rule.tap_action =
          rule.tap_action === undefined
            ? defaultRule.tap_action
            : rule.tap_action;

        rule.hold_action =
          rule.hold_action === undefined
            ? defaultRule.hold_action
            : rule.hold_action;

        rule.hover_info_filter =
          rule.hover_info_filter === undefined
            ? defaultRule.hover_info_filter
            : rule.hover_info_filter;

        rule.double_tap_action =
          rule.double_tap_action === undefined
            ? defaultRule.double_tap_action
            : rule.double_tap_action;
      }
    }

    for (const rule of config.rules) {
      if (rule.entity || rule.entities) {
        this.initEntityRule(rule, svg, svgElements);
      } else if (rule.element || rule.elements) {
        this.initElementRule(rule, svg, svgElements);
      }
    }
  }

  initEntityRule(
    rule: FloorplanRuleConfig,
    svg: SVGGraphicsElement,
    svgElements: SVGGraphicsElement[]
  ): void {
    const entities = this.initGetEntityRuleEntities(rule);
    for (const entity of entities) {
      const entityId = entity.entityId;

      let entityInfo = this.entityInfos[entityId];
      if (!entityInfo) {
        entityInfo = {
          entityId: entityId,
          ruleInfos: [],
          lastState: undefined,
        };
        this.entityInfos[entityId] = entityInfo;
      }

      const ruleInfo = new FloorplanRuleInfo(rule);
      entityInfo.ruleInfos.push(ruleInfo);

      for (const elementId of entity.elementIds) {
        const svgElement = svgElements.find(
          (svgElement) => svgElement.id === elementId
        );
        if (!svgElement) {
          this.logWarning(
            'CONFIG',
            `Cannot find element '${elementId}' in SVG file`
          );
          continue;
        }

        const svgElementInfo = this.addSvgElementToRule(
          svg,
          svgElement,
          ruleInfo
        );

        svgElementInfo.svgElement = svgElement;

        // Create a title element (to support hover over text)
        if (!svgElement.querySelector('title')) {
          svgElement.appendChild(
            document.createElementNS('http://www.w3.org/2000/svg', 'title')
          );
        }

        svgElement.onmouseenter = () => {
          this.handleEntitySetHoverOver(entityInfo, svgElementInfo);
        };

        svgElement.onmouseleave = () => {
          this.handleEntitySetHoverOver(entityInfo, svgElementInfo);
        };

        this.attachClickHandlers(
          svgElement,
          svgElementInfo,
          entityId,
          undefined,
          ruleInfo
        );
      }
    }
  }

  initGetEntityRuleEntities(
    rule: FloorplanRuleConfig
  ): { entityId: string; elementIds: string[] }[] {
    const targetEntities: { entityId: string; elementIds: string[] }[] = [];

    rule.groups = rule.groups ? rule.groups : [];

    // Split out HA entity groups into separate entities
    for (const entityId of rule.groups) {
      const group = this.hass.states[entityId];
      // TODO: check groups
      if (group) {
        for (const entityId of (group.attributes as Record<string, unknown>)
          .entity_id as string[]) {
          this.addTargetEntity(entityId, [entityId], targetEntities);
        }
      } else {
        this.logWarning(
          'CONFIG',
          `Cannot find '${entityId}' in Home Assistant groups`
        );
      }
    }

    // Combine single entity and list of entities into combined list
    rule.entities = rule.entities ? rule.entities : [];
    rule.entities = rule.entity
      ? rule.entities.concat(rule.entity)
      : rule.entities;

    // Entities as a list of strings
    const entityIds = rule.entities.filter(
      (x) => typeof x === 'string'
    ) as string[];
    for (const entityId of entityIds) {
      let elementIds = [] as string[];
      if (rule.elements) elementIds = elementIds.concat(rule.elements);
      else if (rule.element)
        elementIds = elementIds.concat(
          this.evaluate(rule.element, entityId, undefined) as string
        );
      else if (rule.element !== null) elementIds = elementIds.concat(entityId);
      
      // Do not add target entity "*"
      if (entityId && entityId === "*") continue;

      this.addTargetEntity(entityId, elementIds, targetEntities);
    }

    // Entities as a list of objects
    const entityObjects = rule.entities.filter((x) => typeof x !== 'string');
    for (const entityObject of entityObjects) {
      const ruleEntityElement =
        entityObject as FloorplanRuleEntityElementConfig;
      this.addTargetEntity(
        ruleEntityElement.entity,
        [ruleEntityElement.element],
        targetEntities
      );
    }

    return targetEntities;
  }

  addTargetEntity(
    entityId: string,
    elementIds: string[],
    targetEntities: { entityId: string; elementIds: string[] }[]
  ): void {
    const hassEntity = this.hass.states[entityId];
    const isFloorplanVariable = entityId.split('.')[0] === 'floorplan';

    if (hassEntity || isFloorplanVariable) {
      targetEntities.push({ entityId: entityId, elementIds: elementIds });
    } else {
      this.logWarning(
        'CONFIG',
        `Cannot find '${entityId}' in Home Assistant entities`
      );
    }
  }

  initElementRule(
    rule: FloorplanRuleConfig,
    svg: SVGGraphicsElement,
    svgElements: SVGGraphicsElement[]
  ): void {
    if (!rule.element && !rule.elements) return;

    rule.elements = rule.elements ? rule.elements : [];
    rule.elements = rule.element
      ? rule.elements.concat(rule.element)
      : rule.elements;

    for (const elementId of rule.elements) {
      const svgElement = svgElements.find(
        (svgElement) => svgElement.id === elementId
      );
      if (svgElement) {
        let elementInfo = this.elementInfos[elementId];
        if (!elementInfo) {
          elementInfo = {
            ruleInfos: [],
            lastState: undefined,
          } as FloorplanElementInfo;
          this.elementInfos[elementId] = elementInfo;
        }

        const ruleInfo = new FloorplanRuleInfo(rule);
        elementInfo.ruleInfos.push(ruleInfo);

        const svgElementInfo = this.addSvgElementToRule(
          svg,
          svgElement,
          ruleInfo
        );

        this.attachClickHandlers(
          svgElement,
          svgElementInfo,
          undefined,
          elementId,
          ruleInfo
        );
      } else {
        this.logWarning('CONFIG', `Cannot find '${elementId}' in SVG file`);
      }
    }
  }

  attachClickHandlers(
    targetSvgElement: SVGGraphicsElement,
    svgElementInfo: FloorplanSvgElementInfo,
    entityId: string | undefined,
    elementId: string | undefined,
    ruleInfo: FloorplanRuleInfo
  ): void {
    const propagate = false;

    this._querySelectorAll(
      targetSvgElement,
      propagate ? '*' : undefined,
      true
    ).forEach((elem: Element) => {
      const element = elem as SVGGraphicsElement | HTMLElement;
      const isParent = elem === targetSvgElement;

      // Create a title element (to support hover over text)
      if (!element.querySelector('title')) {
        element.appendChild(
          document.createElementNS('http://www.w3.org/2000/svg', 'title')
        );
      }

      if (ruleInfo.rule.tap_action || ruleInfo.rule.double_tap_action) {
        const singleTapAction = ruleInfo.rule.tap_action
          ? this.getActionConfigs(ruleInfo.rule.tap_action)
          : false;
        const doubleTapAction = ruleInfo.rule.double_tap_action
          ? this.getActionConfigs(ruleInfo.rule.double_tap_action)
          : false;

        const singleTapContext = singleTapAction
          ? new FloorplanClickContext(
              this,
              entityId,
              elementId,
              svgElementInfo,
              ruleInfo,
              singleTapAction
            )
          : false;

        // Use simple function without delay, if doubleTap is not in use
        if (singleTapAction && !doubleTapAction)
          E.on(element, 'click', this.onClick.bind(singleTapContext));

        if (doubleTapAction) {
          const doubleTapContext = doubleTapAction
            ? new FloorplanClickContext(
                this,
                entityId,
                elementId,
                svgElementInfo,
                ruleInfo,
                doubleTapAction
              )
            : false;

          ManyClicks.observe(element as HTMLElement | SVGElement);

          // Use advanced function with delay, if doubleTap is in use
          if (singleTapAction)
            E.on(element, 'singleClick', this.onClick.bind(singleTapContext));

          // Use advanced function with delay, if doubleTab is in use
          E.on(element, 'doubleClick', this.onLongClick.bind(doubleTapContext));
        }

        if (element.style) element.style.cursor = 'pointer';
        Utils.addClass(element, `floorplan-click${isParent ? '' : '-child'}`); // mark the element as being processed by floorplan
      }

      if (ruleInfo.rule.hold_action) {
        const actions = this.getActionConfigs(ruleInfo.rule.hold_action);
        const context = new FloorplanClickContext(
          this,
          entityId,
          elementId,
          svgElementInfo,
          ruleInfo,
          actions
        );
        LongClicks.observe(element as HTMLElement | SVGElement);
        E.on(element, 'longClick', this.onLongClick.bind(context));
        if (element.style) element.style.cursor = 'pointer';
        Utils.addClass(
          element,
          `floorplan-long-click${isParent ? '' : '-child'}`
        ); // mark the element as being processed by floorplan
      }
    });
  }

  addSvgElementToRule(
    svg: SVGGraphicsElement,
    svgElement: SVGGraphicsElement,
    ruleInfo: FloorplanRuleInfo
  ): FloorplanSvgElementInfo {
    const svgBBox = svgElement.getBBox ? svgElement.getBBox() : null;
    const svgElementInfo = new FloorplanSvgElementInfo(
      svgElement.id,
      svgElement,
      svgElement,
      svgBBox
    );
    ruleInfo.svgElementInfos[svgElement.id] = svgElementInfo;

    return svgElementInfo;
  }

  createImageElement(svgElement: SVGGraphicsElement): SVGGraphicsElement {
    const image = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'image'
    );
    image.setAttribute('id', svgElement.getAttribute('id') as string);
    image.setAttribute('x', svgElement.getAttribute('x') as string);
    image.setAttribute('y', svgElement.getAttribute('y') as string);
    image.setAttribute('height', svgElement.getAttribute('height') as string);
    image.setAttribute('width', svgElement.getAttribute('width') as string);
    return image;
  }

  /***************************************************************************************************************************/
  /* Entity handling (when states change)
  /***************************************************************************************************************************/

  async handleEntities(isInitialLoad = false): Promise<void> {
    this.handleElements();

    const changedEntityIds = this.getChangedEntities(isInitialLoad);

    for (const variableName of Object.keys(this.variables)) {
      changedEntityIds.add(variableName); // always assume variables need updating
    }

    if (changedEntityIds.size) {
      for (const entityId of changedEntityIds) {
        await this.handleEntity(entityId);
      }
    }
  }

  getChangedEntities(isInitialLoad: boolean): Set<string> {
    const changedEntityIds = new Set<string>();

    const entityIds = Object.keys(this.hass.states);

    const deviceId = Utils.deviceId();

    for (const entityId of entityIds) {
      if (
        entityId === `sensor.ha_floorplan_${deviceId}` &&
        !changedEntityIds.has(entityId)
      ) {
        changedEntityIds.add(entityId);
      } else {
        const entityInfo = this.entityInfos[entityId];
        if (entityInfo) {
          const entityState = this.hass.states[entityId];

          if (isInitialLoad) {
            this.logDebug(
              'STATE',
              `${entityId}: ${entityState.state} (initial load)`
            );
            if (!changedEntityIds.has(entityId)) {
              changedEntityIds.add(entityId);
            }
          } else if (entityInfo.lastState) {
            const newState = entityState.state;

            if (
              entityState.last_changed !== entityInfo.lastState.last_changed
            ) {
              this.logDebug(
                'STATE',
                `${entityId}: ${newState} (last changed ${Utils.formatDate(
                  entityInfo.lastState.last_changed
                )})`
              );
              if (!changedEntityIds.has(entityId)) {
                changedEntityIds.add(entityId);
              }
            } else {
              if (
                !Utils.equal(
                  entityInfo.lastState.attributes,
                  entityState.attributes
                )
              ) {
                this.logDebug(
                  'STATE',
                  `${entityId}: attributes (last updated ${Utils.formatDate(
                    entityInfo.lastState.last_changed
                  )})`
                );
                if (!changedEntityIds.has(entityId)) {
                  changedEntityIds.add(entityId);
                }
              }
            }
          }
        }
      }
    }

    return changedEntityIds;
  }

  async handleEntity(entityId: string): Promise<void> {
    const entityState = this.hass.states[entityId];
    const entityInfo = this.entityInfos[entityId];

    if (!entityInfo) return;

    entityInfo.lastState = Object.assign({}, entityState);

    for (const ruleInfo of entityInfo.ruleInfos) {
      const svgElementInfos = Object.values(ruleInfo.svgElementInfos);
      // rule with one or more elements specified
      if (svgElementInfos.length) {
        for (const svgElementInfo of svgElementInfos) {
          if (svgElementInfo.svgElement) {
            // images may not have been updated yet
            this.handleActions(
              ruleInfo.rule.state_action,
              entityInfo.entityId,
              svgElementInfo,
              ruleInfo
            );
          }
        }
      } else {
        // rule with element set to null
        this.handleActions(
          ruleInfo.rule.state_action,
          entityInfo.entityId,
          undefined,
          ruleInfo
        );
      }
    }
  }

  async handleElements(): Promise<void> {
    for (const elementInfo of Object.values(this.elementInfos)) {
      for (const ruleInfo of elementInfo.ruleInfos) {
        for (const svgElementInfo of Object.values(ruleInfo.svgElementInfos)) {
          this.handleActions(
            ruleInfo.rule.state_action,
            undefined,
            svgElementInfo,
            ruleInfo
          );
        }
      }
    }
  }

  handleEntityIdSetHoverOver(
    entityId: string,
    svgElementInfo: FloorplanSvgElementInfo
  ): void {
    const entityInfo = this.entityInfos[entityId];
    if (entityInfo) this.handleEntitySetHoverOver(entityInfo, svgElementInfo);
  }

  handleEntitySetHoverOver(
    entityInfo: FloorplanEntityInfo,
    svgElementInfo: FloorplanSvgElementInfo
  ): void {
    const entityId = entityInfo.entityId as string;
    const entityState = this.hass.states[entityId];

    for (const ruleInfo of entityInfo.ruleInfos) {
      if (ruleInfo.rule.hover_action) {
        let isHoverInfo =
          typeof ruleInfo.rule.hover_action === 'string' &&
          ruleInfo.rule.hover_action === 'hover-info';
        isHoverInfo =
          isHoverInfo ||
          (typeof ruleInfo.rule.hover_action === 'object' &&
            (ruleInfo.rule.hover_action as FloorplanActionConfig).action ===
              'hover-info');
        isHoverInfo =
          isHoverInfo ||
          (Array.isArray(ruleInfo.rule.hover_action) &&
            (ruleInfo.rule.hover_action as FloorplanActionConfig[]).some(
              (x) => x.action === 'hover-info'
            ));

        if (isHoverInfo) {
          const hoverInfoFilter = new Set<string>(
            ruleInfo.rule.hover_info_filter
          );

          for (const svgElementInfo of Object.values(
            ruleInfo.svgElementInfos
          )) {
            Utils.addClass(svgElementInfo.svgElement, 'floorplan-hover'); // mark the element as being processed by floorplan

            svgElementInfo.svgElement.style.cursor = 'pointer';

            svgElementInfo.svgElement
              .querySelectorAll('title')
              .forEach((titleElement) => {
                let titleText = `${entityState.attributes.friendly_name}\n`;
                titleText += `State: ${entityState.state}\n\n`;

                Object.keys(entityState.attributes).map((key) => {
                  if (!hoverInfoFilter.has(key)) {
                    titleText += `${key}: ${
                      (entityState.attributes as Record<string, unknown>)[key]
                    }\n`;
                  }
                });
                titleText += '\n';

                titleText += `Last changed: ${DateUtil.timeago(
                  entityState.last_changed
                )}\n`;
                titleText += `Last updated: ${DateUtil.timeago(
                  entityState.last_updated
                )}`;

                titleElement.textContent = titleText;
              });
          }
        } else if (ruleInfo.rule.hover_action) {
          this.handleActions(
            ruleInfo.rule.hover_action,
            entityInfo.entityId,
            svgElementInfo,
            ruleInfo
          );
        }
      }
    }
  }

  /***************************************************************************************************************************/
  /* Floorplan helper functions
  /***************************************************************************************************************************/

  isOptionEnabled(option: unknown): boolean {
    return option === null || option !== undefined;
  }

  validateConfig(config: FloorplanConfig): boolean {
    let isValid = true;

    if (!config.pages && !config.rules) {
      this.logWarning(
        'CONFIG',
        `Cannot find 'pages' nor 'rules' in floorplan configuration`
      );
      //isValid = false;
    } else {
      if (config.pages) {
        if (!config.pages.length) {
          this.logWarning(
            'CONFIG',
            `The 'pages' section must contain one or more pages in floorplan configuration`
          );
          //isValid = false;
        }
      } else {
        if (!config.rules) {
          this.logWarning(
            'CONFIG',
            `Cannot find 'rules' in floorplan configuration`
          );
          //isValid = false;
        }

        let invalidRules = config.rules.filter((x) => x.entities && x.elements);
        if (invalidRules.length) {
          this.logError(
            'CONFIG',
            `A rule cannot contain both 'entities' and 'elements' in floorplan configuration`
          );
          isValid = false;
        }

        invalidRules = config.rules.filter(
          (x) => !(x.entity || x.entities) && !(x.element || x.elements)
        );
        if (invalidRules.length) {
          this.logError(
            'CONFIG',
            `A rule must contain either 'entities' or 'elements' in floorplan configuration`
          );
          isValid = false;
        }
      }
    }

    return isValid;
  }

  evaluate(
    expression: string | unknown,
    entityId?: string,
    svgElement?: SVGGraphicsElement,
    svgElementInfo?: FloorplanSvgElementInfo,
    ruleInfo?: FloorplanRuleInfo
  ): unknown {
    if (typeof expression === 'string' && EvalHelper.isCode(expression)) {
      try {
        return EvalHelper.evaluate(
          expression,
          this.hass,
          this.config,
          entityId,
          svgElement,
          this.svgElements,
          this.functions,
          svgElementInfo,
          ruleInfo
        );
      } catch (err) {
        return this.handleError(err as Error, {
          expression,
          entityId,
          hass: this.hass,
          svgElement,
        });
      }
    } else {
      return expression;
    }
  }

  /***************************************************************************************************************************/
  /* Event handlers
  /***************************************************************************************************************************/

  onClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as unknown as FloorplanClickContext;
    const floorplan = context.instance as FloorplanElement;

    floorplan.handleActions(
      context.actions,
      context.entityId,
      context.svgElementInfo,
      context.ruleInfo
    );
  }

  onLongClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as unknown as FloorplanClickContext;
    const floorplan = context.instance as FloorplanElement;

    setTimeout(() => {
      floorplan.handleActions(
        context.actions,
        context.entityId,
        context.svgElementInfo,
        context.ruleInfo
      );
    }, 300);
  }

  handleActions(
    actionConfigs:
      | FloorplanActionConfig[]
      | FloorplanActionConfig
      | string
      | false,
    entityId?: string,
    svgElementInfo?: FloorplanSvgElementInfo,
    ruleInfo?: FloorplanRuleInfo
  ): void {
    const allActionConfigs = this.getActionConfigs(actionConfigs);

    for (const actionConfig of allActionConfigs) {
      if (
        actionConfig.confirmation &&
        (!actionConfig.confirmation.exemptions ||
          !actionConfig.confirmation.exemptions.some(
            (e) => e.user === (this.hass.user as CurrentUser).id
          ))
      ) {
        // forwardHaptic("warning");

        if (
          !confirm(
            actionConfig.confirmation.text ||
              `Are you sure you want to ${actionConfig.action}?`
          )
        ) {
          return;
        }
      }

      switch (actionConfig.action) {
        case 'more-info': {
          if (this.isDemo) {
            this.notify(
              `Performing action: ${actionConfig.action} ${entityId}`
            );
          } else {
            fireEvent(this, 'hass-more-info', {
              entityId: entityId,
            } as MoreInfoDialogParams);
          }
          break;
        }

        case 'navigate':
          if (this.isDemo) {
            this.notify(
              `Performing action: ${actionConfig.action} ${actionConfig.navigation_path}`
            );
          } else {
            // Evaluate the navigation path
            const navigationPath = this.evaluate(
              actionConfig.navigation_path,
              entityId,
              svgElementInfo?.svgElement
            ) as string;
            navigate(this, navigationPath, actionConfig.navigation_replace ?? false);
          }
          break;

        case 'url': {
          if (this.isDemo) {
            this.notify(
              `Performing action: ${actionConfig.action} ${actionConfig.url_path}`
            );
          } else {
            const open_type = actionConfig.same_tab ? '_self' : '_blank';
            const urlPath = this.evaluate(
              actionConfig.url_path,
              entityId,
              svgElementInfo?.svgElement
            ) as string;
            window.open(urlPath, open_type);
          }
          break;
        }

        case 'toggle': {
          if (entityId) {
            const toggleActionConfig = {
              action: 'call-service',
              service: 'homeassistant.toggle',
              service_data: {
                entity_id: entityId,
              },
            } as FloorplanCallServiceActionConfig;

            // toggleEntity(hass, config.entity!);
            this.callService(
              toggleActionConfig,
              entityId,
              svgElementInfo,
              ruleInfo
            );

            // forwardHaptic("light");
          }
          break;
        }

        case 'call-service': {
          if (!actionConfig.service) {
            // forwardHaptic("failure");
            return;
          }
          // const [domain, service] = actionConfig.service.split(".", 2);
          // this.hass.callService(domain, service, actionConfig.service_data);
          this.callService(
            actionConfig as FloorplanCallServiceActionConfig,
            entityId,
            svgElementInfo,
            ruleInfo
          );
          // forwardHaptic("light");
          break;
        }

        case 'fire-dom-event': {
          fireEvent(this, 'll-custom', actionConfig);
        }
      }
    }
  }

  getSvgElementsFromServiceData(
    serviceData: Record<string, unknown>,
    svgElement?: SVGGraphicsElement
  ): SVGGraphicsElement[] {
    let targetSvgElements: SVGGraphicsElement[] = [];

    let targetSvgElementIds: string[] = [];

    if (Array.isArray(serviceData?.elements)) {
      targetSvgElementIds = targetSvgElementIds.concat(
        serviceData?.elements as string[]
      );
    }
    if (typeof serviceData?.element === 'string') {
      targetSvgElementIds = targetSvgElementIds.concat([
        serviceData?.element as string,
      ]);
    }

    if (targetSvgElementIds.length) {
      for (const targetSvgElementId of targetSvgElementIds) {
        targetSvgElements = targetSvgElements.concat(
          this._querySelectorAll(
            this.svg,
            `#${targetSvgElementId.replace(/\./g, '\\.')}`,
            false
          ) as SVGGraphicsElement[]
        );
      }
    } else if (svgElement) {
      // might be null (i.e. element: null in rule)
      targetSvgElements = [svgElement];
    }

    return targetSvgElements;
  }

  getServiceData(
    actionConfig: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElement?: SVGGraphicsElement
  ): Record<string, unknown> {
    let serviceData = {} as Record<string, unknown>;

    if (typeof actionConfig.service_data === 'object') {
      for (const key of Object.keys(actionConfig.service_data)) {
        serviceData[key] = this.evaluate(
          actionConfig.service_data[key],
          entityId,
          svgElement
        ) as string;
      }
    } else if (typeof actionConfig.service_data === 'string') {
      const result = this.evaluate(
        actionConfig.service_data,
        entityId,
        svgElement
      );
      serviceData =
        typeof result === 'string' && result.trim().startsWith('{')
          ? JSON.parse(result)
          : result;
    } else if (actionConfig.service_data !== undefined) {
      serviceData = actionConfig.service_data;
    }

    return serviceData;
  }

  executeServiceData(
    actionConfig: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElement?: SVGGraphicsElement,
    svgElementInfo?: FloorplanSvgElementInfo,
    ruleInfo?: FloorplanRuleInfo
  ): boolean {
    try {
      if (typeof actionConfig.service_data === 'object') {
        for (const key of Object.keys(actionConfig.service_data)) {
          this.evaluate(
            actionConfig.service_data[key],
            entityId,
            svgElement,
            svgElementInfo,
            ruleInfo
          ) as string;
        }
      } else if (typeof actionConfig.service_data === 'string') {
        this.evaluate(actionConfig.service_data, entityId, svgElement, svgElementInfo, ruleInfo);
      } else if (actionConfig.service_data !== undefined) {
        this.logWarning('CONFIG', `Invalid execution data`);
      }
      return true;
    } catch (e) {
      this.logWarning('CONFIG', `Error thrown while executing service`);
      return false;
    }
  }

  callService(
    actionConfig: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElementInfo?: FloorplanSvgElementInfo,
    ruleInfo?: FloorplanRuleInfo
  ): void {
    const fullServiceName = this.evaluate(
      actionConfig.service,
      entityId,
      svgElementInfo?.svgElement
    ) as string;

    const [domain, service] = fullServiceName.split('.', 2);

    switch (domain) {
      case 'floorplan':
        this.callFloorplanService(
          domain,
          service,
          actionConfig,
          entityId,
          svgElementInfo,
          ruleInfo
        );
        break;

      default:
        this.callHomeAssistantService(
          domain,
          service,
          actionConfig,
          entityId,
          svgElementInfo
        );
        break;
    }
  }

  callFloorplanService(
    domain: string,
    service: string,
    actionConfig: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElementInfo?: FloorplanSvgElementInfo,
    ruleInfo?: FloorplanRuleInfo
  ): void {
    const svgElement = (svgElementInfo?.svgElement ??
      undefined) as SVGGraphicsElement;

    let page_id: string;
    let targetPageInfo: FloorplanPageInfo | undefined;
    let className: string;
    let styleName: string;
    let imageUrl: string;
    let imageRefreshInterval: number;
    let useCache: boolean;
    let text: string;
    let targetSvgElements: SVGGraphicsElement[] = [];
    let isSameTargetElement: boolean;
    let serviceData = null;

    // Evaluate service data, in order to determine 'target' elements
    const servicesWithoutPreparation: string[] = ['execute'];
    const prepareServiceData = !servicesWithoutPreparation.includes(service);

    if (prepareServiceData) {
      serviceData = this.getServiceData(actionConfig, entityId, svgElement);
    } else {
      serviceData = {};
    }

    switch (service) {
      case 'class_toggle':
        targetSvgElements = this.getSvgElementsFromServiceData(
          serviceData,
          svgElementInfo?.svgElement
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            serviceData = this.getServiceData(
              actionConfig,
              entityId,
              targetSvgElement
            );
          }
          className =
            typeof serviceData === 'string'
              ? serviceData
              : (serviceData.class as string);
          Utils.toggleClass(targetSvgElement, className);
        }
        break;

      case 'class_set':
        targetSvgElements = this.getSvgElementsFromServiceData(
          serviceData,
          svgElementInfo?.svgElement
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            serviceData = this.getServiceData(
              actionConfig,
              entityId,
              targetSvgElement
            );
          }
          className =
            typeof serviceData === 'string'
              ? serviceData
              : (serviceData.class as string);
          Utils.setClass(targetSvgElement, className);
        }
        break;

      case 'dataset_set': {
        let value: string;
        let key: string;
        if (typeof serviceData === 'string') {
          const split = (serviceData as string).split(':');
          if (split.length < 2) {
            this.logError(
              'FLOORPLAN_ACTION',
              `Service data "${serviceData}" is not a valid dataset key value pair.`
            );
            break;
          }
          value = split[1];
          key = split[0];
        } else {
          value = serviceData.value as string;
          key = serviceData.key as string;
        }
        targetSvgElements = this.getSvgElementsFromServiceData(
          serviceData,
          svgElementInfo?.svgElement
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            serviceData = this.getServiceData(
              actionConfig,
              entityId,
              targetSvgElement
            );
          }
          Utils.datasetSet(targetSvgElement, key, value);
        }
        break;
      }
      case 'style_set':
        targetSvgElements = this.getSvgElementsFromServiceData(
          serviceData,
          svgElementInfo?.svgElement
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            serviceData = this.getServiceData(
              actionConfig,
              entityId,
              targetSvgElement
            );
          }
          styleName =
            typeof serviceData === 'string'
              ? serviceData
              : (serviceData.style as string);
          Utils.setStyle(targetSvgElement, styleName);
        }
        break;

      case 'text_set':
        targetSvgElements = this.getSvgElementsFromServiceData(
          serviceData,
          svgElementInfo?.svgElement
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            serviceData = this.getServiceData(
              actionConfig,
              entityId,
              targetSvgElement
            );
          }
          text =
            typeof serviceData === 'string'
              ? serviceData
              : (serviceData.text as string);

          // If the text has linebreakes, setText will split them up, into more than a single tspan element. Each tspan will use the shift y axis as a offset (except for the first element)
          const shiftYAxis = actionConfig.service_data?.shift_y_axis
            ? actionConfig.service_data?.shift_y_axis
            : '1em';
          Utils.setText(targetSvgElement, text, shiftYAxis);
        }
        break;

      case 'image_set':
        if (svgElementInfo && ruleInfo) {
          serviceData = this.getServiceData(
            actionConfig,
            entityId,
            svgElementInfo?.svgElement
          );

          imageUrl =
            typeof serviceData === 'string'
              ? serviceData
              : (serviceData.image as string);

          imageRefreshInterval =
            typeof serviceData === 'object'
              ? (serviceData.image_refresh_interval as number)
              : 0;

          if (imageRefreshInterval > 0) {
            useCache = false; // don't use cache for refreshing images
          } else {
            useCache =
              typeof serviceData === 'object'
                ? (serviceData.cache as boolean) === true
                : true; // use cache by default
          }

          if (ruleInfo.imageLoader) {
            clearInterval(ruleInfo.imageLoader); // cancel any previous image loading for this rule
          }

          if (imageRefreshInterval) {
            ruleInfo.imageLoader = setInterval(
              this.loadImage.bind(this),
              imageRefreshInterval * 1000,
              imageUrl,
              svgElementInfo,
              entityId,
              ruleInfo,
              useCache
            );
          }

          this.loadImage(
            imageUrl,
            svgElementInfo,
            entityId as string,
            ruleInfo as FloorplanRuleInfo,
            useCache
          );
        }
        break;

      case 'page_navigate':
        serviceData = this.getServiceData(
          actionConfig,
          entityId,
          svgElementInfo?.svgElement
        );
        page_id = serviceData.page_id as string;
        targetPageInfo = page_id ? this.pageInfos[page_id] : undefined;

        if (targetPageInfo) {
          Object.keys(this.pageInfos).map((key) => {
            const pageInfo = this.pageInfos[key] as FloorplanPageInfo;

            if (!pageInfo.isMaster && pageInfo.svg.style.display !== 'none') {
              pageInfo.svg.style.display = 'none';
            }
          });

          targetPageInfo.svg.style.display = 'block';
        }
        break;

      case 'variable_set':
        serviceData = this.getServiceData(
          actionConfig,
          entityId,
          svgElementInfo?.svgElement
        );
        if (serviceData.variable) {
          const attributes = {} as Record<string, unknown>;

          if (serviceData.attributes) {
            const actionDataAttributes = serviceData.attributes as Record<
              string,
              FloorplanCallServiceActionConfig
            >;

            for (const key of Object.keys(actionDataAttributes)) {
              attributes[key] = this.getActionValue(
                actionDataAttributes[key],
                entityId,
                svgElement
              );
            }
          }

          const variableActionData =
            serviceData as unknown as FloorplanCallServiceActionConfig;
          const value = this.getActionValue(
            variableActionData,
            entityId,
            svgElement
          );
          this.setVariable(
            serviceData.variable as string,
            value,
            attributes,
            false
          );
        }
        break;

      case 'execute':
        this.executeServiceData(
          actionConfig,
          entityId,
          svgElementInfo?.svgElement,
          svgElementInfo,
          ruleInfo
        );
        for (const targetSvgElement of targetSvgElements) {
          isSameTargetElement =
            targetSvgElements.length === 1 &&
            targetSvgElements[0] === svgElementInfo?.svgElement;
          if (!isSameTargetElement) {
            // Evaluate service data again, this time supplying 'target' element
            this.executeServiceData(actionConfig, entityId, targetSvgElement, svgElementInfo, ruleInfo);
          }
        }
        break;

      default:
        // Unknown floorplan service
        break;
    }
  }

  getActionValue(
    action: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElement?: SVGGraphicsElement
  ): unknown {
    let value = action.value;
    if (action.value) {
      value = this.evaluate(action.value, entityId, svgElement);
    }
    return value;
  }

  setVariable(
    variableName: string,
    value: unknown,
    attributes: Record<string, unknown>,
    isInitialLoad: boolean
  ): void {
    this.variables[variableName] = value;

    if (this.hass.states[variableName]) {
      this.hass.states[variableName].state = (
        value as Record<string, unknown>
      ).toString();

      for (const key of Object.keys(attributes)) {
        (this.hass.states[variableName].attributes as Record<string, unknown>)[
          key
        ] = attributes[key];
      }
    }

    for (const otherVariableName of Object.keys(this.variables)) {
      const otherVariable = this.hass.states[otherVariableName];
      if (otherVariable) {
        otherVariable.last_changed = new Date().toString(); // mark all variables as changed
      }
    }

    // Simulate an event change to all entities
    if (!isInitialLoad) {
      this.handleEntities();
    }
  }

  /***************************************************************************************************************************/
  /* Home Assisant helper functions
  /***************************************************************************************************************************/

  callHomeAssistantService(
    domain: string,
    service: string,
    actionConfig: FloorplanCallServiceActionConfig,
    entityId?: string,
    svgElementInfo?: FloorplanSvgElementInfo
  ): void {
    const data = this.getServiceData(
      actionConfig,
      entityId,
      svgElementInfo?.svgElement
    );

    if (typeof data === 'object') {
      if (
        data.entity_id === null ||
        (Array.isArray(data.entity_id) && !data.entity_id.length)
      ) {
        // do not use entity_id in service call
      } else if (!data.entity_id && entityId) {
        // automatically include entity_id in service call
        data.entity_id = entityId;
      }
    }

    this.hass.callService(domain, service, data);

    if (this.isDemo) {
      this.notify(`Calling service: ${domain}.${service} (${data.entity_id})`);
    }
  }

  handleEventActionCall(event: Event) {
    const customEvent = event as CustomEvent<FloorplanEventActionCallDetail>;
    const { actionConfig, entityId, svgElementInfo, ruleInfo  } = customEvent.detail;

    this.handleActions(actionConfig, entityId, svgElementInfo, ruleInfo);

    //this.callService(actionConfig, entityId, svgElementInfo, ruleInfo);
  }

  /***************************************************************************************************************************/
  /* Logging / error handling functions
  /***************************************************************************************************************************/

  handleWindowError(
    event: Event | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    if ((event as string).toLowerCase().includes('script error')) {
      this.logError('SCRIPT', 'Script error: See browser console for detail');
    } else {
      const message = [
        event as string,
        'URL: ' + source,
        'Line: ' + lineno + ', column: ' + colno,
        'Error: ' + JSON.stringify(error),
      ].join('<br>');

      this.logError('ERROR', message);
    }

    return false;
  }

  handleError(err: Error, data?: unknown): void {
    console.error(err, data);

    let message = 'Error';
    if (typeof err === 'string') {
      message = err;
    }
    if (err.message) {
      message = `${err.message} (See console for more info)`;
    } else if (err.stack) {
      message = `${err.stack}`;
    }

    this.logger.log('error', message);
  }

  logError(area: string, message: string): void {
    this.logger.log('error', `${area} ${message}`);
  }

  logWarning(area: string, message: string): void {
    this.logger.log('warning', `${area} ${message}`);
  }

  logInfo(area: string, message: string): void {
    this.logger.log('info', `${area} ${message}`);
  }

  logDebug(area: string, message: string): void {
    this.logger.log('debug', `${area} ${message}`);
  }
}
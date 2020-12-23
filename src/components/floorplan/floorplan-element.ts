import { HomeAssistant } from '../../lib/homeassistant/types';
import { NavigateActionConfig } from '../../lib/homeassistant/lovelace/types';
import { HassEntityBase } from 'home-assistant-js-websocket';
import { fireEvent } from '../../lib/homeassistant/common/dom/fire_event';
import { MoreInfoDialogParams } from '../../lib/homeassistant/dialogs/more-info/ha-more-info-dialog';
import { FloorplanConfig, FloorplanPageConfig, FloorplanActionConfig, FloorplanCallServiceActionConfig } from './lib/floorplan-config';
import { FloorplanRuleConfig, FloorplanVariableConfig } from './lib/floorplan-config';
import { FloorplanRuleEntityElementConfig } from './lib/floorplan-config';
import { FloorplanClickContext, FloorplanPageInfo, FloorplanRuleInfo, FloorplanSvgElementInfo } from './lib/floorplan-info';
import { FloorplanElementInfo, FloorplanEntityInfo } from './lib/floorplan-info';
import { LongClicks } from './lib/long-clicks';
import { EvalHelper } from './lib/eval-helper';
import { debounce } from 'debounce';
import * as yaml from 'js-yaml';
import { Utils } from '../../lib/utils';
import { Logger } from './lib/logger';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from 'lit-element';
import * as packageInfo from '../../../package.json';
import * as OuiDomEvents from 'oui-dom-events';
const E = OuiDomEvents.default;

// Display version in console
console.info(
  `%c${packageInfo.description} (${packageInfo.name})%c\nVersion ${packageInfo.version}`,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: rgb(71, 170, 238)"
);

export class FloorplanElement extends LitElement {
  @property({ type: String }) public examplespath!: string;
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: (String || Object) }) public _config!: string | FloorplanConfig;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Boolean }) public isShowLog!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  config!: FloorplanConfig;
  pageInfos: { [key: string]: FloorplanPageInfo } = {};
  entityInfos: { [key: string]: FloorplanEntityInfo } = {};
  elementInfos: { [key: string]: FloorplanElementInfo } = {};
  cssRules: unknown[] = [];
  variables: { [key: string]: unknown } = {};
  logger!: Logger;

  isRulesLoaded = false;
  svg!: SVGGraphicsElement;

  handleEntitiesDebounced = debounce(this.handleEntities.bind(this), 100, true);

  constructor() {
    super();

    window.onerror = this.handleWindowError.bind(this);
  }

  render(): TemplateResult {
    return html`
      <div id="floorplan-container">
        <div id="floorplan"></div>
        
        <div id="log" style="display: ${this.isShowLog ? 'block' : 'none'};">
          <a href="#" onclick="return false;" @click=${this.clearLog}>Clear log<a/>
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

      :host svg, :host svg * {
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
        color: #FF0000;
      }

      .warning {
        color: #FF851B;
      }

      .info {
        color: #0000FF;
      }

      .debug {
        color: #000000;
      }
      `;
  }

  clearLog(): void {
    (this.logElement.querySelector('#log ul') as HTMLUListElement).innerHTML = '';
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

    if (!this.isRulesLoaded) {
      this.isRulesLoaded = true;
      this.initFloorplanRules(this.svg, this.config)
      await this.handleEntities(true);
    }
    else {
      this.handleEntitiesDebounced(); // use debounced wrapper
    }
  }

  private get floorplanElement(): HTMLDivElement {
    return this.shadowRoot?.getElementById("floorplan") as HTMLDivElement;
  }

  private get logElement(): HTMLDivElement {
    return this.shadowRoot?.getElementById("log") as HTMLDivElement;
  }

  /***************************************************************************************************************************/
  /* Startup
  /***************************************************************************************************************************/

  async init(): Promise<void> {
    try {
      const config = await this.loadConfig(this._config);

      this.isShowLog = (config.log_level !== undefined);

      this.logger = new Logger(this.logElement, config.log_level, config.console_log_level);

      this.logInfo('INIT', `Floorplan initialized`);

      if (!this.validateConfig(config)) return;

      this.config = config; // set resolved config as effective config

      //await this.loadLibraries()

      if (this.config.pages) {
        await this.initMultiPage();
      }
      else {
        await this.initSinglePage();
      }
    }
    catch (err) {
      this.handleError(err);
    }
  }

  async initMultiPage(): Promise<void> {
    try {
      await this.loadPages();
      this.initPageDisplay();
      this.initVariables();
      this.initStartupActions();
      //await this.handleEntities(true);
    }
    catch (err) {
      this.handleError(err);
    }
  }

  async initSinglePage(): Promise<void> {
    try {
      await this.loadStyleSheet(this.config.stylesheet)
      const imageUrl = this.getBestImage(this.config);
      this.svg = await await this.loadFloorplanSvg(imageUrl);
      //this.initFloorplanRules(svg, this.config!)
      this.initPageDisplay();
      this.initVariables();
      this.initStartupActions();
      //await this.handleEntities(true);
    }
    catch (error) {
      this.handleError(error);
    }
  }

  /***************************************************************************************************************************/
  /* Loading resources
  /***************************************************************************************************************************/

  async loadConfig(config: FloorplanConfig | string): Promise<FloorplanConfig> {
    if (typeof config === 'string') {
      const targetConfig = await Utils.fetchText(config, this.isDemo, this.examplespath)
      const configYaml = yaml.safeLoad(targetConfig);
      return configYaml as FloorplanConfig;
    }
    else {
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
        reject(new URIError(`${(err as unknown as Record<string, Record<string, unknown>>).target.src}`));
      };

      this.shadowRoot?.appendChild(script);
    });
  }

  async loadPages(): Promise<void> {
    for (const pageConfigUrl of this.config.pages) {
      await this.loadPageConfig(pageConfigUrl, this.config.pages.indexOf(pageConfigUrl));
    }

    const pageInfos = Object.keys(this.pageInfos).map(key => this.pageInfos[key]);
    pageInfos.sort((a, b) => a.index - b.index); // sort ascending

    const masterPageInfo = pageInfos.find(pageInfo => (pageInfo.config.master_page !== undefined));
    if (masterPageInfo) {
      masterPageInfo.isMaster = true;
    }
    else {
      throw new Error('A master page is required');
    }

    const defaultPageInfo = pageInfos.find(pageInfo => (pageInfo.config.master_page === undefined));
    if (defaultPageInfo) {
      defaultPageInfo.isDefault = true;
    }

    await this.loadPageFloorplanSvg(masterPageInfo, masterPageInfo) // load master page first

    const nonMasterPages = pageInfos.filter(pageInfo => pageInfo !== masterPageInfo);
    for (const pageInfo of nonMasterPages) {
      await this.loadPageFloorplanSvg(pageInfo, masterPageInfo);
    }
  }

  async loadPageConfig(pageConfigUrl: string, index: number): Promise<FloorplanPageInfo> {
    const pageConfig = await this.loadConfig(pageConfigUrl) as FloorplanPageConfig;
    const pageInfo = this.createPageInfo(pageConfig);
    pageInfo.index = index;
    return pageInfo;
  }

  async loadPageFloorplanSvg(pageInfo: FloorplanPageInfo, masterPageInfo: FloorplanPageInfo): Promise<void> {
    const imageUrl = this.getBestImage(pageInfo.config);
    const svg = await this.loadFloorplanSvg(imageUrl, pageInfo, masterPageInfo)
    svg.id = pageInfo.config.page_id; // give the SVG an ID so it can be styled (i.e. background color)
    pageInfo.svg = svg;
    await this.loadStyleSheet(pageInfo.config.stylesheet)
    this.initFloorplanRules(pageInfo.svg, pageInfo.config);
  }

  getBestImage(config: FloorplanConfig): string {
    let imageUrl = '';

    if (typeof config.image === "string") {
      // Device detection
      if (Utils.isMobile && (typeof config.image_mobile === "string")) {
        imageUrl = config.image_mobile;
      } else {
        imageUrl = config.image;
      }
    } else {
      if (config.image?.sizes) {
        config.image.sizes.sort((a, b) => b.min_width - a.min_width); // sort descending
        for (const pageSize of config.image.sizes) {
          if (screen.width >= pageSize.min_width) {
            imageUrl = pageSize.location;
            break;
          }
        }
      }
    }

    return imageUrl;
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

  async loadStyleSheet(stylesheetUrl: string): Promise<void> {
    if (!stylesheetUrl) return;

    const stylesheet = await Utils.fetchText(stylesheetUrl, this.isDemo, this.examplespath);
    const style = document.createElement('style');

    const initializeNode = () => {
      style.innerHTML = stylesheet;
      this.shadowRoot?.appendChild(style);
    }

    try {
      await Utils.waitForChildNodes(style, initializeNode, 10000);
    }
    catch (err) {
      console.error(err);
      this.logError('STYLESHEET', `Error loading stylesheet`);
    }

    const cssRules = this.getCssRules(style);

    this.cssRules = this.cssRules.concat(cssRules);
  }

  getCssRules(style: HTMLStyleElement): unknown[] {
    let cssRules;

    if (style.sheet) {
      cssRules = style.sheet?.cssRules ?? style.sheet?.rules;
    }
    else {
      const otherStyle = style as unknown as Record<string, Record<string, unknown>>;

      if (otherStyle.styleSheet) {
        cssRules = otherStyle.styleSheet?.cssRules ?? otherStyle.styleSheet?.rules;
      }
    }

    return cssRules ? Utils.getArray<unknown>(cssRules) : [];
  }

  async loadFloorplanSvg(imageUrl: string, pageInfo?: FloorplanPageInfo, masterPageInfo?: FloorplanPageInfo): Promise<SVGGraphicsElement> {
    const svgText = await Utils.fetchText(imageUrl, this.isDemo, this.examplespath);
    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector("svg") as SVGGraphicsElement;

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
      const contentElementId = masterPageInfo.config.master_page.content_element;

      if (pageInfo.config.page_id === masterPageId) {
        this.floorplanElement.appendChild(svg);
      }
      else {
        // const masterPageElement = this.floorplanElement.querySelector('#' + masterPageId);
        const contentElement = this.floorplanElement.querySelector('#' + contentElementId) as Element;

        const height = Number.parseFloat(svg.getAttribute('height') as string);
        const width = Number.parseFloat(svg.getAttribute('width') as string);
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        svg.setAttribute('height', contentElement.getAttribute('height') as string);
        svg.setAttribute('width', contentElement.getAttribute('width') as string);
        svg.setAttribute('x', contentElement.getAttribute('x') as string);
        svg.setAttribute('y', contentElement.getAttribute('y') as string);

        contentElement.parentElement?.appendChild(svg);
      }
    }
    else {
      this.floorplanElement.appendChild(svg);
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

  async loadImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, ruleInfo: FloorplanRuleInfo): Promise<SVGGraphicsElement> {
    if (imageUrl.toLowerCase().indexOf('.svg') >= 0) {
      return await this.loadSvgImage(imageUrl, svgElementInfo, entityId, ruleInfo);
    }
    else {
      return await this.loadBitmapImage(imageUrl, svgElementInfo, entityId, ruleInfo);
    }
  }

  async loadBitmapImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, ruleInfo: FloorplanRuleInfo): Promise<SVGGraphicsElement> {
    const imageData = await Utils.fetchImage(imageUrl, this.isDemo, this.examplespath);
    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    let svgElement = svgElementInfo.svgElement; // assume the target element already exists

    if (svgElement.nodeName !== 'image') {
      svgElement = this.createImageElement(svgElementInfo.originalSvgElement) as SVGGraphicsElement;

      svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svgElement);

      this.attachClickHandlers(svgElement, svgElementInfo, entityId, undefined, ruleInfo);
      this.handleEntityIdSetHoverOver(entityId);
    }

    const existingHref = svgElement.getAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
    if (existingHref !== imageData) {
      svgElement.removeAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
      svgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageUrl);
    }

    return svgElement;
  }

  async loadSvgImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, ruleInfo: FloorplanRuleInfo): Promise<SVGGraphicsElement> {
    const svgText = await Utils.fetchText(imageUrl, this.isDemo, this.examplespath);
    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector("svg") as SVGGraphicsElement;

    const height = Number.parseFloat(svg.getAttribute('height') as string);
    const width = Number.parseFloat(svg.getAttribute('width') as string);
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    svg.id = svgElementInfo.svgElement.id;
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    svg.setAttribute('height', svgElementInfo.originalBBox.height.toString());
    svg.setAttribute('width', svgElementInfo.originalBBox.width.toString());
    svg.setAttribute('x', svgElementInfo.originalBBox.x.toString());
    svg.setAttribute('y', svgElementInfo.originalBBox.y.toString());

    svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svg);

    this.attachClickHandlers(svg, svgElementInfo, entityId, undefined, ruleInfo);
    this.handleEntityIdSetHoverOver(entityId);

    return svg;
  }

  _querySelectorAll(element: Element, selector: string | undefined = undefined, includeSelf: boolean): Element[] {
    let elements = selector ? Array.from(element.querySelectorAll(selector).values()) : [];
    elements = includeSelf ? [element].concat(elements) : elements;
    return elements;
  }

  replaceElement(previousSvgElement: SVGGraphicsElement, svgElement: SVGGraphicsElement): SVGGraphicsElement {
    const parentElement = previousSvgElement.parentElement;

    this._querySelectorAll(previousSvgElement, '*', true).forEach((element: Element) => {
      E.off(element, 'click');
      E.off(element, 'longClick');
      element.remove();
    });
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
        pageInfo.svg.style.display = pageInfo.isMaster || pageInfo.isDefault ? 'initial' : 'none'; // Show the first page
      }
    }
    else {
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
    }
    else {
      variableName = variable.name;

      value = variable.value;
      if (variable.value) {
        value = this.evaluate(variable.value, variableName, undefined);
      }
    }

    if (!this.entityInfos[variableName]) {
      const entityInfo = { entityId: variableName, ruleInfos: [], lastState: undefined } as FloorplanEntityInfo;
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

  getActionConfigs(actionConfig: FloorplanActionConfig[] | FloorplanActionConfig | string | false): FloorplanActionConfig[] {
    if ((actionConfig === undefined) || (actionConfig === null)) {
      return [];
    }
    else if (Array.isArray(actionConfig)) {
      return actionConfig;
    }
    else if (typeof actionConfig === 'object') {
      return [actionConfig];
    }
    else if (typeof actionConfig === 'string') {
      return [{
        service: actionConfig
      }] as FloorplanActionConfig[];
    }
    else {
      return [];
    }
  }

  initStartupActions(): void {
    this.performActions(this.config.on_startup, undefined, undefined, undefined);

    if (this.config.pages) {
      for (const pageInfo of Object.values(this.pageInfos)) {
        this.performActions(pageInfo.config.on_startup, undefined, undefined, undefined);
      }
    }
  }

  /***************************************************************************************************************************/
  /* SVG initialization
  /***************************************************************************************************************************/

  initFloorplanRules(svg: SVGGraphicsElement, config: FloorplanConfig): void {
    if (!config.rules) return;

    const svgElements = this._querySelectorAll(svg, '*', true) as SVGGraphicsElement[];

    this.initRules(config, svg, svgElements);
  }

  initRules(config: FloorplanConfig, svg: SVGGraphicsElement, svgElements: SVGGraphicsElement[]): void {
    // Apply default options to rules that don't override the options explictly
    if (config.defaults) {
      const defaultRule = config.defaults;

      for (const rule of config.rules) {
        rule.hover_action = (rule.hover_action === undefined) ? defaultRule.hover_action : rule.hover_action;
        rule.tap_action = (rule.tap_action === undefined) ? defaultRule.tap_action : rule.tap_action;
        rule.hold_action = (rule.hold_action === undefined) ? defaultRule.hold_action : rule.hold_action;
      }
    }

    for (const rule of config.rules) {
      if (rule.entity || rule.entities) {
        this.initEntityRule(rule, svg, svgElements);
      }
      else if (rule.element || rule.elements) {
        this.initElementRule(rule, svg, svgElements);
      }
    }
  }

  initEntityRule(rule: FloorplanRuleConfig, svg: SVGGraphicsElement, svgElements: SVGGraphicsElement[]): void {
    const entities = this.initGetEntityRuleEntities(rule);
    for (const entity of entities) {
      const entityId = entity.entityId;
      const elementId = entity.elementId;

      let entityInfo = this.entityInfos[entityId];
      if (!entityInfo) {
        entityInfo = { entityId: entityId, ruleInfos: [], lastState: undefined };
        this.entityInfos[entityId] = entityInfo;
      }

      const ruleInfo = new FloorplanRuleInfo(rule);
      entityInfo.ruleInfos.push(ruleInfo);

      const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
      if (!svgElement) {
        this.logWarning('CONFIG', `Cannot find element '${elementId}' in SVG file`);
        continue;
      }

      const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

      svgElementInfo.svgElement = svgElement;

      // Create a title element (to support hover over text)
      svgElement.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'title'));

      this.attachClickHandlers(svgElement, svgElementInfo, entityId, undefined, ruleInfo);
    }
  }

  initGetEntityRuleEntities(rule: FloorplanRuleConfig): { entityId: string, elementId: string }[] {
    const targetEntities: { entityId: string, elementId: string }[] = [];

    rule.groups = rule.groups ? rule.groups : [];

    // Split out HA entity groups into separate entities
    for (const entityId of rule.groups) {
      const group = this.hass.states[entityId];
      // TODO: check groups
      if (group) {
        for (const entityId of ((group.attributes as Record<string, unknown>).entity_id as string[])) {
          this.addTargetEntity(entityId, entityId, targetEntities);
        }
      }
      else {
        this.logWarning('CONFIG', `Cannot find '${entityId}' in Home Assistant groups`);
      }
    }

    // Combine single entity and list of entities into combined list
    rule.entities = rule.entities ? rule.entities : [];
    rule.entities = rule.entity ? rule.entities.concat(rule.entity) : rule.entities;

    // Entities as a list of strings
    const entityIds = rule.entities.filter(x => (typeof x === 'string')) as string[];
    for (const entityId of entityIds) {
      const elementId = rule.element ? rule.element : entityId;
      this.addTargetEntity(entityId, elementId, targetEntities);
    }

    // Entities as a list of objects
    const entityObjects = rule.entities.filter(x => (typeof x !== 'string'));
    for (const entityObject of entityObjects) {
      const ruleEntityElement = entityObject as FloorplanRuleEntityElementConfig;
      this.addTargetEntity(ruleEntityElement.entity, ruleEntityElement.element, targetEntities);
    }

    return targetEntities;
  }

  addTargetEntity(entiyId: string, elementId: string, targetEntities: { entityId: string, elementId: string }[]): void {
    const hassEntity = this.hass.states[entiyId];
    const isFloorplanVariable = (entiyId.split('.')[0] === 'floorplan');

    if (hassEntity || isFloorplanVariable) {
      targetEntities.push({ entityId: entiyId, elementId: elementId });
    }
    else {
      this.logWarning('CONFIG', `Cannot find '${entiyId}' in Home Assistant entities`);
    }
  }

  initElementRule(rule: FloorplanRuleConfig, svg: SVGGraphicsElement, svgElements: SVGGraphicsElement[]): void {
    if (!rule.element && !rule.elements) return;

    rule.elements = rule.elements ? rule.elements : [];
    rule.elements = rule.element ? rule.elements.concat(rule.element) : rule.elements;

    for (const elementId of rule.elements) {
      const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
      if (svgElement) {
        let elementInfo = this.elementInfos[elementId];
        if (!elementInfo) {
          elementInfo = { ruleInfos: [], lastState: undefined } as FloorplanElementInfo;
          this.elementInfos[elementId] = elementInfo;
        }

        const ruleInfo = new FloorplanRuleInfo(rule);
        elementInfo.ruleInfos.push(ruleInfo);

        const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

        this.attachClickHandlers(svgElement, svgElementInfo, undefined, elementId, ruleInfo);
      }
      else {
        this.logWarning('CONFIG', `Cannot find '${elementId}' in SVG file`);
      }
    }
  }

  attachClickHandlers(targetSvgElement: SVGGraphicsElement, svgElementInfo: FloorplanSvgElementInfo, entityId: string | undefined, elementId: string | undefined, ruleInfo: FloorplanRuleInfo): void {
    const propagate = false;

    this._querySelectorAll(targetSvgElement, propagate ? '*' : undefined, true).forEach((elem: Element) => {
      const element = elem as SVGGraphicsElement | HTMLElement;
      const isParent = (elem === targetSvgElement);

      element.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'title')); // add a title for hover-over text

      if (ruleInfo.rule.tap_action) {
        const actions = this.getActionConfigs(ruleInfo.rule.tap_action);
        const context = new FloorplanClickContext(this, entityId, elementId, svgElementInfo, ruleInfo, actions);
        E.on(element, 'click', this.onClick.bind(context));
        if (element.style) element.style.cursor = 'pointer';
        Utils.addClass(element, `floorplan-click${isParent ? '' : '-child'}`); // mark the element as being processed by floorplan
      }

      if (ruleInfo.rule.hold_action) {
        const actions = this.getActionConfigs(ruleInfo.rule.hold_action);
        const context = new FloorplanClickContext(this, entityId, elementId, svgElementInfo, ruleInfo, actions);
        LongClicks.observe(element as HTMLElement | SVGElement);
        E.on(element, 'longClick', this.onLongClick.bind(context));
        if (element.style) element.style.cursor = 'pointer';
        Utils.addClass(element, `floorplan-long-click${isParent ? '' : '-child'}`); // mark the element as being processed by floorplan
      }
    });
  }

  addSvgElementToRule(svg: SVGGraphicsElement, svgElement: SVGGraphicsElement, ruleInfo: FloorplanRuleInfo): FloorplanSvgElementInfo {
    const svgElementInfo = new FloorplanSvgElementInfo(
      svgElement.id,
      svgElement,
      svgElement,
      Utils.getSet<string>(svgElement.classList),
      Utils.getStyles(svgElement),
      svgElement.getBBox(),
      svgElement.getBoundingClientRect()
    );
    ruleInfo.svgElementInfos[svgElement.id] = svgElementInfo;

    return svgElementInfo;
  }

  createImageElement(svgElement: SVGGraphicsElement): SVGGraphicsElement {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('id', svgElement.getAttribute('id') as string)
    image.setAttribute('x', svgElement.getAttribute('x') as string)
    image.setAttribute('y', svgElement.getAttribute('y') as string)
    image.setAttribute('height', svgElement.getAttribute('height') as string)
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

    for (const entityId of entityIds) {
      const entityInfo = this.entityInfos[entityId];
      if (entityInfo) {
        const entityState = this.hass.states[entityId];

        if (isInitialLoad) {
          this.logDebug('STATE', `${entityId}: ${entityState.state} (initial load)`);
          if (!changedEntityIds.has(entityId)) {
            changedEntityIds.add(entityId);
          }
        }
        else if (entityInfo.lastState) {
          const newState = entityState.state;

          if (entityState.last_changed !== entityInfo.lastState.last_changed) {
            this.logDebug('STATE', `${entityId}: ${newState} (last changed ${Utils.formatDate(entityInfo.lastState.last_changed)})`);
            if (!changedEntityIds.has(entityId)) {
              changedEntityIds.add(entityId);
            }
          }
          else {
            if (!Utils.equal(entityInfo.lastState.attributes, entityState.attributes)) {
              this.logDebug('STATE', `${entityId}: attributes (last updated ${Utils.formatDate(entityInfo.lastState.last_changed)})`);
              if (!changedEntityIds.has(entityId)) {
                changedEntityIds.add(entityId);
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
      for (const svgElementInfo of Object.values(ruleInfo.svgElementInfos)) {
        if (svgElementInfo.svgElement) { // images may not have been updated yet
          this.performActions(ruleInfo.rule.state_action, entityInfo.entityId, svgElementInfo, ruleInfo);
        }
      }
    }

    this.handleEntitySetHoverOver(entityInfo);
  }

  async handleElements(): Promise<void> {
    for (const elementInfo of Object.values(this.elementInfos)) {
      for (const ruleInfo of elementInfo.ruleInfos) {
        for (const svgElementInfo of Object.values(ruleInfo.svgElementInfos)) {
          this.performActions(ruleInfo.rule.state_action, undefined, svgElementInfo, ruleInfo);
        }
      }
    }
  }

  handleEntityIdSetHoverOver(entityId: string): void {
    const entityInfo = this.entityInfos[entityId];
    if (entityInfo) this.handleEntitySetHoverOver(entityInfo);
  }

  handleEntitySetHoverOver(entityInfo: FloorplanEntityInfo): void {
    const entityId = entityInfo.entityId as string;
    const entityState = this.hass.states[entityId];

    for (const ruleInfo of entityInfo.ruleInfos) {
      if (ruleInfo.rule.hover_action) {
        if ((typeof ruleInfo.rule.hover_action === 'string') && (ruleInfo.rule.hover_action === 'floorplan.hover_info')) {
          for (const svgElementInfo of Object.values(ruleInfo.svgElementInfos)) {
            Utils.addClass(svgElementInfo.svgElement, 'floorplan-hover'); // mark the element as being processed by floorplan

            svgElementInfo.svgElement.style.cursor = 'pointer';

            svgElementInfo.svgElement.querySelectorAll('title').forEach((titleElement) => {
              const lastChangedDate = Utils.formatDate(entityState.last_changed);
              const lastUpdatedDate = Utils.formatDate(entityState.last_updated);

              let titleText = `${entityState.attributes.friendly_name}\n`;
              titleText += `State: ${entityState.state}\n\n`;

              Object.keys(entityState.attributes).map(key => {
                titleText += `${key}: ${(entityState.attributes as Record<string, unknown>)[key]}\n`;
              });
              titleText += '\n';

              titleText += `Last changed: ${lastChangedDate}\n`;
              titleText += `Last updated: ${lastUpdatedDate}`;

              titleElement.textContent = titleText;
            });
          }
        }
      }
    }
  }

  /***************************************************************************************************************************/
  /* Floorplan helper functions
  /***************************************************************************************************************************/

  isOptionEnabled(option: unknown): boolean {
    return ((option === null) || (option !== undefined));
  }

  validateConfig(config: FloorplanConfig): boolean {
    let isValid = true;

    if (!config.pages && !config.rules) {
      this.logWarning('CONFIG', `Cannot find 'pages' nor 'rules' in floorplan configuration`);
      //isValid = false;
    }
    else {
      if (config.pages) {
        if (!config.pages.length) {
          this.logWarning('CONFIG', `The 'pages' section must contain one or more pages in floorplan configuration`);
          //isValid = false;
        }
      }
      else {
        if (!config.rules) {
          this.logWarning('CONFIG', `Cannot find 'rules' in floorplan configuration`);
          //isValid = false;
        }

        let invalidRules = config.rules.filter(x => x.entities && x.elements);
        if (invalidRules.length) {
          this.logError('CONFIG', `A rule cannot contain both 'entities' and 'elements' in floorplan configuration`);
          isValid = false;
        }

        invalidRules = config.rules.filter(x => !(x.entity || x.entities) && !(x.element || x.elements));
        if (invalidRules.length) {
          this.logError('CONFIG', `A rule must contain either 'entities' or 'elements' in floorplan configuration`);
          isValid = false;
        }
      }
    }

    return isValid;
  }

  isTemplate(expression: string): boolean {
    if (expression.trim().startsWith(">")) return true;
    if ((expression.indexOf("${") >= 0) && (expression.indexOf("}") >= 0)) return true;
    return false;
  }

  evaluate(expression: string | unknown, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    if ((typeof expression === 'string') && this.isTemplate(expression)) {
      try {
        return EvalHelper.evaluate(expression, this.hass, this.config, entityId, svgElement);
      }
      catch (err) {
        return this.handleError(err, { expression, entityId, hass: this.hass, svgElement });
      }
    }
    else {
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
    const floorplan = (context.instance as FloorplanElement);

    floorplan.performActions(context.actions, context.entityId, context.svgElementInfo, context.ruleInfo);
  }

  onLongClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as unknown as FloorplanClickContext;
    const floorplan = (context.instance as FloorplanElement);

    setTimeout(() => {
      floorplan.performActions(context.actions, context.entityId, context.svgElementInfo, context.ruleInfo);
    }, 300);
  }

  performActions(actionConfigs: FloorplanActionConfig[] | FloorplanActionConfig | string | false, entityId?: string, svgElementInfo?: FloorplanSvgElementInfo, ruleInfo?: FloorplanRuleInfo): void {
    const targetActionConfigs = this.getActionConfigs(actionConfigs);

    for (const targetActionConfig of targetActionConfigs) {
      switch (targetActionConfig.action) {
        case 'call-service':
          this.callService(targetActionConfig as FloorplanCallServiceActionConfig, entityId, svgElementInfo, ruleInfo);
          break;

        case 'toggle':
          console.log('performActions', targetActionConfig.action);
          break;

        case 'more-info':
          console.log('performActions', targetActionConfig.action);
          break;

        case 'fire-dom-event':
          console.log('performActions', targetActionConfig.action);
          break;

        case 'navigate':
          this.performActionNavigate(targetActionConfig as NavigateActionConfig);
          break;

        case 'url':
          console.log('performActions', targetActionConfig.action);
          break;

        case 'none':
          break;

        default:
          this.callService((targetActionConfig as FloorplanCallServiceActionConfig), entityId, svgElementInfo, ruleInfo);
      }
    }
  }

  performActionNavigate(actionConfig: NavigateActionConfig): void {
    if (this.isDemo) {
      this.notify(`Performing action: ${actionConfig.action} ${actionConfig.navigation_path}`)
    }
    else {
      window.location.href = actionConfig.navigation_path;
    }
  }

  callService(actionConfig: FloorplanCallServiceActionConfig, entityId?: string, svgElementInfo?: FloorplanSvgElementInfo, ruleInfo?: FloorplanRuleInfo): ServiceContext {
    const fullServiceName = this.evaluate(actionConfig.service, entityId, (svgElementInfo as FloorplanSvgElementInfo).svgElement) as string;

    let data = {} as Record<string, unknown>;

    if (typeof actionConfig.service_data === 'object') {
      for (const key of Object.keys(actionConfig.service_data)) {
        data[key] = this.evaluate(actionConfig.service_data[key], entityId, (svgElementInfo as FloorplanSvgElementInfo).svgElement) as string;
      }
    }
    else if (typeof actionConfig.service_data === 'string') {
      const result = this.evaluate(actionConfig.service_data, entityId, (svgElementInfo as FloorplanSvgElementInfo).svgElement);
      data = (typeof result === 'string') && (result.trim().startsWith("{")) ? JSON.parse(result) : result;
    }
    else if (actionConfig.service_data !== undefined) {
      data = actionConfig.service_data;
    }

    const domain = fullServiceName.split(".")[0];
    const serviceName = fullServiceName.split(".")[1];

    if (domain !== 'floorplan') {
      if (typeof data === 'object') {
        if ((data.entity_id === null) || (Array.isArray(data.entity_id) && !data.entity_id.length)) {
          // do not use entity_id in service call
        }
        else if (!data.entity_id && entityId) {
          // automatically include entity_id in service call
          data.entity_id = entityId;
        }
      }
    }

    const serviceContext = {
      domain: domain,
      service: serviceName,
      data: data,
      entityId: entityId as string,
      svgElementInfo: svgElementInfo,
      ruleInfo: ruleInfo,
    } as ServiceContext;

    switch (serviceContext.domain) {
      case 'floorplan':
        this.callFloorplanService(serviceContext);
        break;

      default:
        this.callHomeAssistantService(serviceContext);
        break;
    }

    return serviceContext;
  }

  callFloorplanService(serviceContext: ServiceContext): void {
    const entityId = serviceContext.entityId as string;
    const svgElementInfo = serviceContext.svgElementInfo as FloorplanSvgElementInfo;
    const svgElement = (svgElementInfo?.svgElement ?? undefined) as SVGGraphicsElement;
    const ruleInfo = serviceContext.ruleInfo as FloorplanRuleInfo;

    let page_id: string;
    let targetPageInfo: FloorplanPageInfo | undefined;
    let className: string;
    let styleName: string;
    let classes: Set<string>;
    let imageUrl: string;
    let imageRefreshInterval: number;
    let textElement: HTMLElement | SVGGraphicsElement;
    let tspanElement: SVGTSpanElement | null;
    let text: string;
    let url: string;
    let targetSvgElementIds: string[] = [];

    switch (serviceContext.service) {
      case 'window_navigate':
        if (this.isDemo) {
          this.notify(`Calling service: ${serviceContext.domain}.${serviceContext.service}`)
        }
        else {
          url = (typeof serviceContext.data === 'string') ? serviceContext.data : serviceContext.data.url as string;
          window.location.href = url;
        }
        break;

      case 'class_set':
        className = (typeof serviceContext.data === 'string') ? serviceContext.data : serviceContext.data.class as string;
        classes = new Set(svgElementInfo.originalClasses);
        classes.add(className);

        if (Array.isArray(serviceContext.data?.elements)) {
          targetSvgElementIds = targetSvgElementIds.concat(serviceContext.data?.elements as string[]);
        }
        if (typeof serviceContext.data?.element === 'string') {
          targetSvgElementIds = targetSvgElementIds.concat([serviceContext.data?.element as string]);
        }

        if (targetSvgElementIds.length) {
          for (const targetSvgElementId of targetSvgElementIds) {
            const targetSvgElements = this._querySelectorAll(this.svg, `#${targetSvgElementId.replace(/\./g, '\\.')}`, false) as SVGGraphicsElement[];
            for (const targetSvgElement of targetSvgElements) {
              Utils.setClass(targetSvgElement, className);
            }
          }
        }
        else {
          Utils.setClass(svgElement, className);
        }
        break;

      case 'style_set':
        styleName = (typeof serviceContext.data === 'string') ? serviceContext.data : serviceContext.data.style as string;

        if (Array.isArray(serviceContext.data?.elements)) {
          targetSvgElementIds = targetSvgElementIds.concat(serviceContext.data?.elements as string[]);
        }
        if (typeof serviceContext.data?.element === 'string') {
          targetSvgElementIds = targetSvgElementIds.concat([serviceContext.data?.element as string]);
        }

        if (targetSvgElementIds.length) {
          for (const targetSvgElementId of targetSvgElementIds) {
            const targetSvgElements = this._querySelectorAll(this.svg, `#${targetSvgElementId.replace(/\./g, '\\.')}`, false) as SVGGraphicsElement[];
            for (const targetSvgElement of targetSvgElements) {
              Utils.setStyle(targetSvgElement, styleName);
            }
          }
        }
        else {
          Utils.setStyle((svgElementInfo as FloorplanSvgElementInfo).svgElement, styleName);
        }

        break;

      case 'text_set':
        text = (typeof serviceContext.data === 'string') ? serviceContext.data : serviceContext.data.text as string;

        textElement = svgElementInfo.svgElement;

        tspanElement = textElement.querySelector('tspan');
        if (tspanElement) {
          tspanElement.textContent = text;
        }
        else {
          let titleElement = textElement.querySelector('title') as Element;
          if (!titleElement) {
            titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            textElement.appendChild(titleElement);
          }
          titleElement.textContent = text;
        }
        break;

      case 'image_set':
        imageUrl = (typeof serviceContext.data === 'string') ? serviceContext.data : serviceContext.data.image as string;
        imageRefreshInterval = (typeof serviceContext.data === 'object') ? (serviceContext.data.image_refresh_interval as number) : 0;

        if (ruleInfo.imageLoader) {
          clearInterval(ruleInfo.imageLoader); // cancel any previous image loading for this rule
        }

        if (imageRefreshInterval) {
          ruleInfo.imageLoader = setInterval(this.loadImage.bind(this), imageRefreshInterval * 1000, imageUrl, svgElementInfo, entityId, ruleInfo);
        }

        this.loadImage(imageUrl, svgElementInfo, entityId, ruleInfo);
        break;

      case 'page_navigate':
        page_id = serviceContext.data.page_id as string;
        targetPageInfo = page_id ? this.pageInfos[page_id] : undefined;

        if (targetPageInfo) {
          Object.keys(this.pageInfos).map((key) => {
            const pageInfo = this.pageInfos[key] as FloorplanPageInfo;

            if (!pageInfo.isMaster && (pageInfo.svg.style.display !== 'none')) {
              pageInfo.svg.style.display = 'none';
            }
          });

          targetPageInfo.svg.style.display = 'block';
        }
        break;

      case 'variable_set':
        if (serviceContext.data.variable) {
          const attributes = {} as Record<string, unknown>;

          if (serviceContext.data.attributes) {
            const actionDataAttributes = serviceContext.data.attributes as Record<string, FloorplanCallServiceActionConfig>;

            for (const key of Object.keys(actionDataAttributes)) {
              attributes[key] = this.getActionValue(actionDataAttributes[key], entityId, svgElement);
            }
          }

          const variableActionData = serviceContext.data as unknown as FloorplanCallServiceActionConfig;
          const value = this.getActionValue(variableActionData, entityId, svgElement);
          this.setVariable(serviceContext.data.variable as string, value, attributes, false);
        }
        break;

      default:
        // Unknown floorplan service
        break;
    }
  }

  getActionValue(action: FloorplanCallServiceActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    let value = action.value;
    if (action.value) {
      value = this.evaluate(action.value, entityId, svgElement);
    }
    return value;
  }

  setVariable(variableName: string, value: unknown, attributes: Record<string, unknown>, isInitialLoad: boolean): void {
    this.variables[variableName] = value;

    if (this.hass.states[variableName]) {
      this.hass.states[variableName].state = (value as Record<string, unknown>).toString();

      for (const key of Object.keys(attributes)) {
        (this.hass.states[variableName].attributes as Record<string, unknown>)[key] = attributes[key];
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
      this.handleEntitiesDebounced(); // use debounced wrapper
    }
  }

  /***************************************************************************************************************************/
  /* Home Assisant helper functions
  /***************************************************************************************************************************/

  callHomeAssistantService(serviceContext: ServiceContext): void {
    if (serviceContext.service?.toLocaleLowerCase() === 'more_info') {
      fireEvent(this, 'hass-more-info', { entityId: serviceContext.data.entity_id } as MoreInfoDialogParams);
    }
    else {
      this.hass.callService(serviceContext.domain, serviceContext.service, serviceContext.data);
    }

    if (this.isDemo) {
      this.notify(`Calling service: ${serviceContext.domain}.${serviceContext.service} (${serviceContext.data.entity_id})`);
    }
  }

  /***************************************************************************************************************************/
  /* Logging / error handling functions
  /***************************************************************************************************************************/

  handleWindowError(event: Event | string, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    if ((event as string).toLowerCase().indexOf("script error") >= 0) {
      this.logError('SCRIPT', 'Script error: See browser console for detail');
    }
    else {
      const message = [
        event as string,
        'URL: ' + source,
        'Line: ' + lineno + ', column: ' + colno,
        'Error: ' + JSON.stringify(error)
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
    if (err.stack) {
      message = `${err.stack}`;
    }
    else if (err.message) {
      message = `${err.message}`;
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

if (!customElements.get('floorplan-element')) {
  customElements.define('floorplan-element', FloorplanElement);
}

export class ServiceContext {
  domain!: string;
  service!: string;
  data!: Record<string, unknown>;

  entityId!: string;
  svgElementInfo!: FloorplanSvgElementInfo;
  ruleInfo!: FloorplanRuleInfo;
}
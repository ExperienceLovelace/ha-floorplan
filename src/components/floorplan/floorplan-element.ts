import { HomeAssistant } from '../../lib/homeassistant/frontend-types';
import { HassEntity, HassEntityBase, HassEntities } from '../../lib/homeassistant/core-types';
import { fireEvent } from '../../lib/homeassistant/fire-event';
import { FloorplanConfig, FloorplanLastMotionConfig, FloorplanPageConfig } from './lib/floorplan-config';
import { FloorplanRuleConfig, FloorplanVariableConfig, FloorplanActionConfig, FloorplanRuleStateConfig } from './lib/floorplan-config';
import { FloorplanRuleEntityElementConfig } from './lib/floorplan-config';
import { FloorplanPageInfo, FloorplanRuleInfo, FloorplanSvgElementInfo } from './lib/floorplan-info';
import { FloorplanElementInfo, FloorplanEntityInfo } from './lib/floorplan-info';
import { debounce } from 'debounce';
import * as yaml from 'js-yaml';
import { Utils } from '../../lib/utils';
import { Logger } from './lib/logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const E = require('oui-dom-events').default;
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from 'lit-element';

type EvaluateFunction =
  (
    entityState: HassEntity,
    states: HassEntities,
    hass: HomeAssistant,
    config: FloorplanConfig,
    svgElement: SVGGraphicsElement | undefined
  ) => unknown;

export class FloorplanElement extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: string | FloorplanConfig;
  @property({ type: Boolean }) public isDemo!: boolean;

  version = '1.0.0';
  config!: FloorplanConfig;
  pageInfos = new Map<string, FloorplanPageInfo>();
  entityInfos = new Map<string, FloorplanEntityInfo>();
  elementInfos = new Map<string, FloorplanElementInfo>();
  cssRules = new Array<unknown>();
  lastMotionConfig!: FloorplanLastMotionConfig;
  variables = new Map<string, unknown>();
  logger!: Logger;

  isRulesLoaded = false;
  svg!: SVGGraphicsElement;

  evaluateFunctionCache = new Map<string, EvaluateFunction>();

  handleEntitiesDebounced = debounce(this.handleEntities.bind(this), 100, true);

  constructor() {
    super();

    window.onerror = this.handleWindowError.bind(this);
  }

  render(): TemplateResult {
    return html`
      <div id="floorplan"></div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host #floorplan {
        display: flex;
        flex: 1;
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

  protected async updated(_changedProperties: PropertyValues): Promise<void> {
    super.updated(_changedProperties);

    if (_changedProperties.has('_config')) {
      await this._configChanged();
    }

    if (_changedProperties.has('hass')) {
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

  openMoreInfo(entityId: string): void {
    if (this.isDemo) {
      alert(`Displaying more info for entity: ${entityId}`);
    }
    else {
      fireEvent(this, 'hass-more-info', { entityId: entityId });
    }
  }

  /***************************************************************************************************************************/
  /* Startup
  /***************************************************************************************************************************/

  async init(): Promise<void> {
    try {
      const config = await this.loadConfig(this._config);

      this.logger = new Logger(this.logElement, config.log_level, config.debug_level);

      this.logInfo('VERSION', `Floorplan v${this.version}`);

      if (!this.validateConfig(config)) {
        //this.options.setIsLoading(false);
        return;
      }

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
      //this.options.setIsLoading(false);
      this.handleError(err);
    }
  }

  async initMultiPage(): Promise<void> {
    try {
      await this.loadPages();
      //this.options.setIsLoading(false);
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
      //this.options.setIsLoading(false);
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
      const targetConfig = await Utils.fetchText(config, this.isDemo)
      const configYaml = yaml.safeLoad(targetConfig);
      return configYaml as FloorplanConfig;
    }
    else {
      return JSON.parse(JSON.stringify(config)); // clone the config!!!
    }
  }

  async loadLibraries(): Promise<void> {
    if (this.isOptionEnabled(this.config.pan_zoom)) {
      await this.loadScript('/local/floorplan/lib/svg-pan-zoom.min.js', true);
    }

    /*
    if (this.isOptionEnabled(this.config.fully_kiosk)) {
      await this.loadScript('/local/floorplan/lib/fully-kiosk.js', false);
    }
    */
  }

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

    const pageInfos = Array.from(this.pageInfos.keys()).map(key => this.pageInfos.get(key) as FloorplanPageInfo);
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

    this.pageInfos.set(pageInfo.config.page_id, pageInfo);

    return pageInfo;
  }

  async loadStyleSheet(stylesheetUrl: string): Promise<void> {
    if (!stylesheetUrl) return;

    const stylesheet = await Utils.fetchText(stylesheetUrl, this.isDemo);
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

  getCssRules(style: HTMLStyleElement): Array<unknown> {
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
    const svgText = await Utils.fetchText(imageUrl, this.isDemo);
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

  async loadImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, rule: FloorplanRuleConfig): Promise<SVGGraphicsElement> {
    if (imageUrl.toLowerCase().indexOf('.svg') >= 0) {
      return await this.loadSvgImage(imageUrl, svgElementInfo, entityId, rule);
    }
    else {
      return await this.loadBitmapImage(imageUrl, svgElementInfo, entityId, rule);
    }
  }

  async loadBitmapImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, rule: FloorplanRuleConfig): Promise<SVGGraphicsElement> {
    const imageData = await Utils.fetchImage(imageUrl, this.isDemo);
    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    let svgElement = svgElementInfo.svgElement; // assume the target element already exists

    if (svgElement.nodeName !== 'image') {
      svgElement = this.createImageElement(svgElementInfo.originalSvgElement) as SVGGraphicsElement;

      this.processElementAndDescendents(svgElement, svgElementInfo, entityId, undefined, rule);

      svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svgElement);
    }

    const existingHref = svgElement.getAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
    if (existingHref !== imageData) {
      svgElement.removeAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
      svgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageUrl);
    }

    return svgElement;
  }

  async loadSvgImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, rule: FloorplanRuleConfig): Promise<SVGGraphicsElement> {
    const svgText = await Utils.fetchText(imageUrl, this.isDemo);
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

    this.processElementAndDescendents(svg, svgElementInfo, entityId, undefined, rule);

    svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement, svg);

    return svg;
  }

  _querySelectorAll(element: Element, selector: string, includeSelf: boolean): Array<Element> {
    let elements = Array.from(element.querySelectorAll(selector).values());
    elements = includeSelf ? elements.concat(element) : elements;
    return elements;
  }

  replaceElement(previousSvgElement: SVGGraphicsElement, svgElement: SVGGraphicsElement): SVGGraphicsElement {
    const parentElement = previousSvgElement.parentElement;

    this._querySelectorAll(previousSvgElement, '*', true).forEach((element: Element) => {
      E.off(element, 'click');
      E.off(element, 'shortClick');
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
      for (const key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

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
      for (const key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

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
      if (variable.value_template) {
        value = this.evaluate(variable.value_template, variableName, undefined);
      }
    }

    if (!this.entityInfos.has(variableName)) {
      const entityInfo = { entityId: variableName, ruleInfos: [], lastState: undefined } as FloorplanEntityInfo;
      this.entityInfos.set(variableName, entityInfo);
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

  initStartupActions(): void {
    let actions = new Array<FloorplanActionConfig>();

    const startup = this.config.startup;
    if (startup?.action) {
      actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
    }

    if (this.config.pages) {
      for (const key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

        const startup = pageInfo.config && pageInfo.config.startup;
        if (startup?.action) {
          actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
        }
      }
    }

    for (const action of actions) {
      if (action.service || action.service_template) {
        const actionService = this.getActionService(action, undefined, undefined) as string;

        switch (this.getDomain(actionService)) {
          case 'floorplan':
            this.callFloorplanService(action, undefined, undefined);
            break;

          default:
            this.callHomeAssistantService(action, undefined, undefined);
            break;
        }
      }
    }
  }

  /***************************************************************************************************************************/
  /* SVG initialization
  /***************************************************************************************************************************/

  initFloorplanRules(svg: SVGGraphicsElement, config: FloorplanConfig): void {
    if (!config.rules) return;

    const svgElements = this._querySelectorAll(svg, '*', true) as Array<SVGGraphicsElement>;

    this.initLastMotion(config);
    this.initRules(config, svg, svgElements);
  }

  initLastMotion(config: FloorplanConfig): void {
    // Add the last motion entity if required
    if (config.last_motion?.entity && config.last_motion.class) {
      this.lastMotionConfig = config.last_motion;

      const entityInfo = { entityId: config.last_motion.entity, ruleInfos: [], lastState: undefined };
      this.entityInfos.set(config.last_motion.entity, entityInfo);
    }
  }

  initRules(config: FloorplanConfig, svg: SVGGraphicsElement, svgElements: Array<SVGGraphicsElement>): void {
    // Apply default options to rules that don't override the options explictly
    if (config.defaults) {
      for (const rule of config.rules) {
        rule.hover_over = (rule.hover_over === undefined) ? config.defaults.hover_over : rule.hover_over;
        rule.more_info = (rule.more_info === undefined) ? config.defaults.more_info : rule.more_info;
        rule.propagate = (rule.propagate === undefined) ? config.defaults.propagate : rule.propagate;
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

  initEntityRule(rule: FloorplanRuleConfig, svg: SVGGraphicsElement, svgElements: Array<SVGGraphicsElement>): void {
    const entities = this.initGetEntityRuleEntities(rule);
    for (const entity of entities) {
      const entityId = entity.entityId;
      const elementId = entity.elementId;

      let entityInfo = this.entityInfos.get(entityId);
      if (!entityInfo) {
        entityInfo = { entityId: entityId, ruleInfos: [], lastState: undefined };
        this.entityInfos.set(entityId, entityInfo);
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

      this.processElementAndDescendents(svgElement, svgElementInfo, entityId, undefined, rule);

      /*
      if ($svgElement.is('text') && ($svgElement[0].id === elementId)) {
        const backgroundSvgElement = svgElements.find(svgElement => svgElement.id === ($svgElement[0].id + '.background'));
        if (!backgroundSvgElement) {
          this.addBackgroundRectToText(svgElementInfo);
        }
        else {
          svgElementInfo.alreadyHadBackground = true;
          backgroundSvgElement.style.fillOpacity = '0';
        }
      }
      */
    }
  }

  initGetEntityRuleEntities(rule: FloorplanRuleConfig): Array<{ entityId: string, elementId: string }> {
    const targetEntities = new Array<{ entityId: string, elementId: string }>();

    rule.groups = rule.groups ? rule.groups : new Array<string>();

    // Split out HA entity groups into separate entities
    for (const entityId of rule.groups) {
      const group = this.hass.states[entityId];
      // TODO: check groups
      if (group) {
        for (const entityId of ((group.attributes as Record<string, unknown>).entity_id as Array<string>)) {
          this.addTargetEntity(entityId, entityId, targetEntities);
        }
      }
      else {
        this.logWarning('CONFIG', `Cannot find '${entityId}' in Home Assistant groups`);
      }
    }

    // Combine single entity and list of entities into combined list
    rule.entities = rule.entities ? rule.entities : new Array<string>();
    rule.entities = rule.entity ? rule.entities.concat(rule.entity) : rule.entities;

    // Entities as a list of strings
    const entityIds = rule.entities.filter(x => (typeof x === 'string')) as Array<string>;
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

  addTargetEntity(entiyId: string, elementId: string, targetEntities: Array<{ entityId: string, elementId: string }>): void {
    const hassEntity = this.hass.states[entiyId];
    const isFloorplanVariable = (entiyId.split('.')[0] === 'floorplan');

    if (hassEntity || isFloorplanVariable) {
      targetEntities.push({ entityId: entiyId, elementId: elementId });
    }
    else {
      this.logWarning('CONFIG', `Cannot find '${entiyId}' in Home Assistant entities`);
    }
  }

  initElementRule(rule: FloorplanRuleConfig, svg: SVGGraphicsElement, svgElements: Array<SVGGraphicsElement>): void {
    if (!rule.element && !rule.elements) return;

    rule.elements = rule.elements ? rule.elements : new Array<string>();
    rule.elements = rule.element ? rule.elements.concat(rule.element) : rule.elements;

    for (const elementId of rule.elements) {
      const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
      if (svgElement) {
        let elementInfo = this.elementInfos.get(elementId);
        if (!elementInfo) {
          elementInfo = { ruleInfos: [], lastState: undefined } as FloorplanElementInfo;
          this.elementInfos.set(elementId, elementInfo);
        }

        const ruleInfo = new FloorplanRuleInfo(rule);
        elementInfo.ruleInfos.push(ruleInfo);

        const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

        this.processElementAndDescendents(svgElement, svgElementInfo, undefined, elementId, rule);

        /*
        if (svgElement.nodeName === 'text') && (svgElement.id === elementId)) {
          const backgroundSvgElement = svgElements.find(svgElement => svgElement.id === (svgElement.id + '.background'));
          if (!backgroundSvgElement) {
            this.addBackgroundRectToText(svgElementInfo);
          }
          else {
            svgElementInfo.alreadyHadBackground = true;
            backgroundSvgElement.style.fillOpacity = '0';
          }
        }
        */

        const clickActions = Array.isArray(rule.on_click) ? rule.on_click : [rule.on_click];
        for (const clickAction of clickActions.filter(x => x !== undefined)) {
          switch (clickAction.service) {
            case 'toggle':
              for (const otherElementId of clickAction.data.elements) {
                const otherSvgElement = svgElements.find(svgElement => svgElement.id === otherElementId);
                if (otherSvgElement) {
                  Utils.addClass(otherSvgElement, clickAction.data.default_class);
                }
              }
              break;

            default:
              break;
          }
        }
      }
      else {
        this.logWarning('CONFIG', `Cannot find '${elementId}' in SVG file`);
      }
    }
  }

  processElementAndDescendents(targetSvgElement: SVGGraphicsElement, svgElementInfo: FloorplanSvgElementInfo, entityId: string | undefined, elementId: string | undefined, rule: FloorplanRuleConfig): void {
    this._querySelectorAll(targetSvgElement, '*', true)
      .forEach((elem: Element) => {
        const element = elem as SVGGraphicsElement | HTMLElement;

        element.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'title')); // add a title for hover-over text

        const context = new ClickEventContext(this, svgElementInfo, entityId, elementId, rule);

        if (rule.on_click || (rule.more_info !== false)) {
          E.on(element, 'click', this.onClick.bind(context));
          //E.on(element, 'shortClick', this.onClick.bind(context));
          if (element.style) element.style.cursor = 'pointer';
        }

        if (rule.on_long_click) {
          this.observeLongClicks(element as HTMLElement | SVGElement);
          E.on(element, 'longClick', this.onLongClick.bind(context));
          if (element.style) element.style.cursor = 'pointer';
        }

        Utils.addClass(element, 'floorplan-item'); // mark the element as being processed by floorplan
      });
  }

  addBackgroundRectToText(svgElementInfo: FloorplanSvgElementInfo): void {
    const svgElement = svgElementInfo.svgElement;

    const bbox = svgElement.getBBox();

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', svgElement.id + '.background');
    rect.setAttribute('height', (bbox.height + 1).toString());
    rect.setAttribute('width', (bbox.width + 2).toString());
    rect.setAttribute('x', (bbox.x - 1).toString());
    rect.setAttribute('y', (bbox.y - 0.5).toString());
    rect.style.fillOpacity = '0';

    svgElement.parentElement?.insertBefore(rect, svgElement);
  }

  addSvgElementToRule(svg: SVGGraphicsElement, svgElement: SVGGraphicsElement, ruleInfo: FloorplanRuleInfo): FloorplanSvgElementInfo {
    const svgElementInfo = new FloorplanSvgElementInfo(
      svgElement.id,
      svg,
      svgElement,
      svgElement,
      Utils.getArray<string>(svgElement.classList),
      svgElement.getBBox(),
      svgElement.getBoundingClientRect()
    );
    ruleInfo.svgElementInfos.set(svgElement.id, svgElementInfo);

    //this.addNestedSvgElementsToRule(svgElement, ruleInfo);

    return svgElementInfo;
  }

  addNestedSvgElementsToRule(svgElement: SVGGraphicsElement, ruleInfo: FloorplanRuleInfo): void {
    this._querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
      const svgElementInfo = new FloorplanSvgElementInfo(
        svgElement.id,
        undefined,
        svgNestedElement as SVGGraphicsElement,
        svgNestedElement as SVGGraphicsElement,
        Utils.getArray<string>(svgNestedElement.classList),
        (svgNestedElement as SVGGraphicsElement).getBBox(),
        svgNestedElement.getBoundingClientRect()
      );
      ruleInfo.svgElementInfos.set(svgElement.id, svgElementInfo);
    });
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

  addClasses(entityId: string, svgElement: SVGGraphicsElement, classes: Array<string>, propagate: boolean): void {
    if (!classes || !classes.length) return;

    for (const className of classes) {
      if (Utils.hasClass(svgElement, 'ha-leave-me-alone')) return;

      if (!Utils.hasClass(svgElement, className)) {
        this.logDebug('CLASS', `${entityId} (adding class: ${className})`);
        Utils.addClass(svgElement, className);

        if (svgElement.nodeName === 'text') {
          /*
          svgElement.parentElement.querySelectorAll(`[id="${entityId}.background"]`).forEach((rectElement) => {
            if (!this.hasClass(rectElement, className + '-background')) {
              this.addClass(rectElement, className + '-background');
            }
          });
          */
        }
      }

      if (propagate || (propagate === undefined)) {
        this._querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
          if (!Utils.hasClass(svgNestedElement, 'ha-leave-me-alone')) {
            if (!Utils.hasClass(svgNestedElement, className)) {
              Utils.addClass(svgNestedElement, className);
            }
          }
        });
      }
    }
  }

  removeClasses(entityId: string, svgElement: SVGGraphicsElement, classes: Array<string>, propagate: boolean): void {
    if (!classes || !classes.length) return;

    for (const className of classes) {
      if (Utils.hasClass(svgElement, className)) {
        this.logDebug('CLASS', `${entityId} (removing class: ${className})`);
        Utils.removeClass(svgElement, className);

        /*
        if (svgElement.nodeName === 'text') {
          svgElement.parentElement.querySelectorAll(`[id="${entityId}.background"]`).forEach((rectElement) => {
            if (this.hasClass(rectElement, className + '-background')) {
              this.removeClass(rectElement, className + '-background');
            }
          });
        }
        */

        if (propagate || (propagate === undefined)) {
          this._querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
            if (Utils.hasClass(svgNestedElement, className)) {
              Utils.removeClass(svgNestedElement, className);
            }
          });
        }
      }
    }
  }

  /***************************************************************************************************************************/
  /* Entity handling (when states change)
  /***************************************************************************************************************************/

  async handleEntities(isInitialLoad = false): Promise<void> {
    this.handleElements();

    let changedEntityIds = this.getChangedEntities(isInitialLoad);
    changedEntityIds = changedEntityIds.concat(Array.from(this.variables.keys())); // always assume variables need updating

    if (changedEntityIds?.length) {
      for (const entityId of changedEntityIds) {
        await this.handleEntity(entityId);
      }
    }
  }

  getChangedEntities(isInitialLoad: boolean): Array<string> {
    const changedEntityIds = new Array<string>();

    const entityIds = Object.keys(this.hass.states);

    let lastMotionEntityInfo, oldLastMotionState, newLastMotionState;

    if (this.lastMotionConfig) {
      lastMotionEntityInfo = this.entityInfos.get(this.lastMotionConfig.entity);
      if (lastMotionEntityInfo?.lastState) {
        oldLastMotionState = lastMotionEntityInfo.lastState.state;
        newLastMotionState = this.hass.states[this.lastMotionConfig.entity].state;
      }
    }

    for (const entityId of entityIds) {
      const entityInfo = this.entityInfos.get(entityId);
      if (entityInfo) {
        const entityState = this.hass.states[entityId];

        if (isInitialLoad) {
          this.logDebug('STATE', `${entityId}: ${entityState.state} (initial load)`);
          if (changedEntityIds.indexOf(entityId) < 0) {
            changedEntityIds.push(entityId);
          }
        }
        else if (entityInfo.lastState) {
          const newState = entityState.state;

          if (entityState.last_changed !== entityInfo.lastState.last_changed) {
            this.logDebug('STATE', `${entityId}: ${newState} (last changed ${Utils.formatDate(entityInfo.lastState.last_changed)})`);
            if (changedEntityIds.indexOf(entityId) < 0) {
              changedEntityIds.push(entityId);
            }
          }
          else {
            if (!Utils.equal(entityInfo.lastState.attributes, entityState.attributes)) {
              this.logDebug('STATE', `${entityId}: attributes (last updated ${Utils.formatDate(entityInfo.lastState.last_changed)})`);
              if (changedEntityIds.indexOf(entityId) < 0) {
                changedEntityIds.push(entityId);
              }
            }
          }

          if (this.lastMotionConfig) {
            if ((newLastMotionState !== oldLastMotionState) && (entityId.indexOf('binary_sensor') >= 0)) {
              const friendlyName = entityState.attributes.friendly_name;

              if (friendlyName === newLastMotionState) {
                this.logDebug('LAST_MOTION', `${entityId} (new)`);
                if (changedEntityIds.indexOf(entityId) < 0) {
                  changedEntityIds.push(entityId);
                }
              }
              else if (friendlyName === oldLastMotionState) {
                this.logDebug('LAST_MOTION', `${entityId} (old)`);
                if (changedEntityIds.indexOf(entityId) < 0) {
                  changedEntityIds.push(entityId);
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
    const entityInfo = this.entityInfos.get(entityId);

    if (!entityInfo) return;

    entityInfo.lastState = Object.assign({}, entityState);

    await this.handleEntityUpdateDom(entityInfo)
    this.handleEntityUpdateCss(entityInfo);
    this.handleEntityUpdateLastMotionCss(entityInfo);
    this.handleEntitySetHoverOver(entityInfo);
  }

  async handleEntityUpdateDom(entityInfo: FloorplanEntityInfo): Promise<void> {
    const entityId = entityInfo.entityId as string;

    for (const ruleInfo of entityInfo.ruleInfos) {
      for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

        if (svgElementInfo.svgElement.nodeName === 'text') {
          this.handleEntityUpdateText(entityId, ruleInfo, svgElementInfo);
        }
        else if (ruleInfo.rule.image || ruleInfo.rule.image_template) {
          await this.handleEntityUpdateImage(entityId, ruleInfo, svgElementInfo);
        }
      }
    }
  }

  async handleElements(): Promise<void> {
    for (const key of this.elementInfos.keys()) {
      const elementInfo = this.elementInfos.get(key) as FloorplanElementInfo;
      await this.handleElementUpdateDom(elementInfo)
      this.handleElementUpdateCss(elementInfo);
    }
  }

  async handleElementUpdateDom(elementInfo: FloorplanElementInfo): Promise<void> {
    for (const ruleInfo of elementInfo.ruleInfos) {
      for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

        if (svgElementInfo.svgElement.nodeName === 'text') {
          this.handleEntityUpdateText(svgElementId, ruleInfo, svgElementInfo);
        }
        else if (ruleInfo.rule.image || ruleInfo.rule.image_template) {
          await this.handleEntityUpdateImage(svgElementId, ruleInfo, svgElementInfo);
        }
      }
    }
  }

  handleEntityUpdateText(entityId: string, ruleInfo: FloorplanRuleInfo, svgElementInfo: FloorplanSvgElementInfo): void {
    const textElement = svgElementInfo.svgElement;
    const state = this.hass.states[entityId] ? this.hass.states[entityId].state : undefined;

    const text = (ruleInfo.rule.text_template ? this.evaluate(ruleInfo.rule.text_template, entityId, textElement) : state) as string;

    const tspanElement = textElement.querySelector('tspan');
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

    /*
    if (!svgElementInfo.alreadyHadBackground) {
      const rect = svgElement.parentElement.querySelectorAll(`[id="${entityId}.background"]`);
      if (rect) {
        if (svgElementstyle.display !== 'none') {
          const parentSvg = this.getParent(svgElement, document.querySelector('svg'));
          if (parentSvg.style.display !== 'none') {
            const bbox = svgElement.getBBox();
            rect.setAttribute('x', bbox.x - 1);
            rect.setAttribute('y', bbox.y - 0.5);
            rect.setAttribute('height', bbox.height + 1);
            rect.setAttribute('width', bbox.width + 2);
            rect.style.height = bbox.height + 1;
            rect.style.width = bbox.width + 2;
          }
        }
      }
    }
    */
  }

  async handleEntityUpdateImage(entityId: string, ruleInfo: FloorplanRuleInfo, svgElementInfo: FloorplanSvgElementInfo): Promise<void> {
    const svgElement = svgElementInfo.svgElement;

    const imageUrl = (ruleInfo.rule.image ? ruleInfo.rule.image : this.evaluate(ruleInfo.rule.image_template, entityId, svgElement)) as string;

    if (imageUrl && (ruleInfo.imageUrl !== imageUrl)) {
      ruleInfo.imageUrl = imageUrl;

      if (ruleInfo.imageLoader) {
        clearInterval(ruleInfo.imageLoader); // cancel any previous image loading for this rule
      }

      if (ruleInfo.rule.image_refresh_interval) {
        const refreshInterval = parseInt(ruleInfo.rule.image_refresh_interval);

        ruleInfo.imageLoader = setInterval(this.loadImage.bind(this), refreshInterval * 1000, imageUrl, svgElementInfo, entityId, ruleInfo.rule);
      }

      try {
        await this.loadImage(imageUrl, svgElementInfo, entityId, ruleInfo.rule);
      }
      catch (err) {
        this.handleError(err);
      }
    }
  }

  handleEntitySetHoverOver(entityInfo: FloorplanEntityInfo): void {
    const entityId = entityInfo.entityId as string;
    const entityState = this.hass.states[entityId];

    for (const ruleInfo of entityInfo.ruleInfos) {
      if (ruleInfo.rule.hover_over !== false) {
        for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
          const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

          this.handlEntitySetHoverOverText(svgElementInfo.svgElement, entityState);
        }
      }
    }
  }

  handlEntitySetHoverOverText(svgElement: SVGGraphicsElement, entityState: HassEntityBase): void {
    svgElement.querySelectorAll('title').forEach((titleElement) => {
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

  handleElementUpdateCss(elementInfo: FloorplanElementInfo): void {
    if (!this.cssRules || !this.cssRules.length) return;

    for (const ruleInfo of elementInfo.ruleInfos) {
      for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

        this.handleUpdateElementCss(svgElementInfo, ruleInfo);
      }
    }
  }

  handleEntityUpdateCss(entityInfo: FloorplanEntityInfo): void {
    if (!this.cssRules || !this.cssRules.length) return;

    for (const ruleInfo of entityInfo.ruleInfos) {
      for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

        if (svgElementInfo.svgElement) { // images may not have been updated yet
          this.handleUpdateCss(entityInfo, svgElementInfo, ruleInfo);
        }
      }
    }
  }

  getStateConfigClasses(stateConfig: FloorplanRuleStateConfig): Array<string> { // support class: or classes:
    let classes = new Array<string>();

    if (!stateConfig) return [];
    else if (Array.isArray(stateConfig.class)) classes = stateConfig.class;
    else if (typeof stateConfig.class === "string") classes = stateConfig.class.split(" ").map(x => x.trim());
    else if (Array.isArray(stateConfig.classes)) classes = stateConfig.classes;
    else if (typeof stateConfig.classes === "string") classes = stateConfig.classes.split(" ").map(x => x.trim());

    return classes;
  }

  handleUpdateCss(entityInfo: FloorplanEntityInfo, svgElementInfo: FloorplanSvgElementInfo, ruleInfo: FloorplanRuleInfo): void {
    const entityId = entityInfo.entityId as string;
    const svgElement = svgElementInfo.svgElement;

    let targetClasses = new Array<string>();
    if (ruleInfo.rule.class_template) {
      const targetClasslist = this.evaluate(ruleInfo.rule.class_template, entityId, svgElement) as string;
      targetClasses = targetClasslist ? targetClasslist.split(" ") : [];
    }

    // Get the config for the current state
    const obsoleteClasses = new Array<string>();
    if (ruleInfo.rule.states) {
      const entityState = this.hass.states[entityId];

      const stateConfig = ruleInfo.rule.states.find(stateConfig => (stateConfig.state === entityState.state)) as FloorplanRuleStateConfig;
      targetClasses = this.getStateConfigClasses(stateConfig);

      // Remove any other previously-added state classes
      for (const otherStateConfig of ruleInfo.rule.states) {
        if (!stateConfig || (otherStateConfig.state !== stateConfig.state)) {
          const otherStateClasses = this.getStateConfigClasses(otherStateConfig);
          for (const otherStateClass of otherStateClasses) {
            if (otherStateClass && (targetClasses.indexOf(otherStateClass) < 0) && (otherStateClass !== 'floorplan-item') && Utils.hasClass(svgElement, otherStateClass) && (svgElementInfo.originalClasses.indexOf(otherStateClass) < 0)) {
              obsoleteClasses.push(otherStateClass);
            }
          }
        }
      }
    }
    else {
      if (svgElement.classList) {
        for (const otherClass of Utils.getArray<string>(svgElement.classList)) {
          if ((targetClasses.indexOf(otherClass) < 0) && (otherClass !== 'floorplan-item') && Utils.hasClass(svgElement, otherClass) && (svgElementInfo.originalClasses.indexOf(otherClass) < 0)) {
            obsoleteClasses.push(otherClass);
          }
        }
      }
    }

    // Remove any obsolete classes from the entity
    //this.logDebug(`${entityId}: Removing obsolete classes: ${obsoleteClasses.join(', ')}`);
    this.removeClasses(entityId, svgElement, obsoleteClasses, ruleInfo.rule.propagate);

    // Add the target classes to the entity
    this.addClasses(entityId, svgElement, targetClasses, ruleInfo.rule.propagate);
  }

  handleUpdateElementCss(svgElementInfo: FloorplanSvgElementInfo, ruleInfo: FloorplanRuleInfo): void {
    const entityId = svgElementInfo.entityId;
    const svgElement = svgElementInfo.svgElement;

    let targetClasses = new Array<string>();
    if (ruleInfo.rule.class_template) {
      const targetClassList = this.evaluate(ruleInfo.rule.class_template, entityId, svgElement) as string;
      targetClasses = targetClassList ? targetClassList.split(" ") : [];
    }

    const obsoleteClasses = new Array<string>();
    for (const otherClass of Utils.getArray<string>(svgElement.classList)) {
      if ((targetClasses.indexOf(otherClass) < 0) && (otherClass !== 'floorplan-item') && Utils.hasClass(svgElement, otherClass) && (svgElementInfo.originalClasses.indexOf(otherClass) < 0)) {
        obsoleteClasses.push(otherClass);
      }
    }

    // Remove any obsolete classes from the entity
    this.removeClasses(entityId, svgElement, obsoleteClasses, ruleInfo.rule.propagate);

    // Add the target class to the entity
    this.addClasses(entityId, svgElement, targetClasses, ruleInfo.rule.propagate);
  }

  handleEntityUpdateLastMotionCss(entityInfo: FloorplanEntityInfo): void {
    if (!this.lastMotionConfig || !this.cssRules || !this.cssRules.length) return;

    const entityId = entityInfo.entityId as string;
    const entityState = this.hass.states[entityId];

    if (!entityState) return;

    for (const ruleInfo of entityInfo.ruleInfos) {
      for (const svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;
        const svgElement = svgElementInfo.svgElement;

        const stateConfigClasses = this.getStateConfigClasses(this.lastMotionConfig);

        if (this.hass.states[this.lastMotionConfig.entity] &&
          (entityState.attributes.friendly_name === this.hass.states[this.lastMotionConfig.entity].state)) {
          //this.logDebug(`${entityId}: Adding last motion class '${this.lastMotionConfig.class}'`);
          this.addClasses(entityId, svgElement, stateConfigClasses, ruleInfo.propagate);
        }
        else {
          //this.logDebug(`${entityId}: Removing last motion class '${this.lastMotionConfig.class}'`);
          this.removeClasses(entityId, svgElement, stateConfigClasses, ruleInfo.propagate);
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

  isLastMotionEnabled(): boolean {
    return (this.lastMotionConfig && this.config.last_motion.entity && this.config.last_motion.class) !== undefined;
  }

  validateConfig(config: FloorplanConfig): boolean {
    let isValid = true;

    if (!config.pages && !config.rules) {
      //this.options.setIsLoading(false);
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

  evaluate(code: string, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    try {
      const entityState = entityId ? this.hass.states[entityId] : undefined;

      let functionBody = (code.indexOf('${') >= 0) ? `\`${code}\`;` : code;
      functionBody = (functionBody.indexOf('return') >= 0) ? functionBody : `return ${functionBody}`;

      let targetFunc: EvaluateFunction | undefined;

      if (this.evaluateFunctionCache.has(functionBody)) {
        //console.log('Getting function from cache:', functionBody);
        targetFunc = this.evaluateFunctionCache.get(functionBody);
      }
      else {
        console.log('Adding function to cache:', functionBody);
        const func = new Function('entity', 'entities', 'hass', 'config', 'element', functionBody) as EvaluateFunction;
        this.evaluateFunctionCache.set(functionBody, func);
        targetFunc = func;
      }

      let result: unknown;

      if (targetFunc) {
        result = targetFunc(entityState as HassEntity, this.hass.states, this.hass, this.config, svgElement);
      }

      return result;
    }
    catch (err) {
      //  this.logError('ERROR', entityId);
      this.logError('ERROR', err);
      throw new Error(err);
    }
  }

  /***************************************************************************************************************************/
  /* Event handlers
  /***************************************************************************************************************************/

  onClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as unknown as ClickEventContext;
    context.instance.performAction(ClickType.ShortClick, context);
  }

  onLongClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as unknown as ClickEventContext;
    setTimeout(() => { context.instance.performAction(ClickType.LongClick, context) }, 300);
  }

  performAction(clickType: ClickType, context: ClickEventContext): void {
    const entityId = context.entityId;
    const svgElementInfo = context.svgElementInfo;
    const rule = context.rule;

    const action = rule ? ((clickType === ClickType.LongClick) ? rule.on_long_click : rule.on_click) : undefined;

    if (!action && entityId && (rule.more_info !== false)) {
      this.openMoreInfo(entityId);
      return;
    }

    if (!action) return;

    let calledServiceCount = 0;

    const svgElement = svgElementInfo.svgElement;

    const actions = Array.isArray(action) ? action : [action];
    for (const action of actions) {
      if (action.service || action.service_template) {
        const actionService = this.getActionService(action, entityId, svgElement) as string;

        if (this.isDemo) {
          const actionServiceText = (typeof actionService === 'object') ? JSON.stringify(actionService) : actionService;
          alert(`Calling service: ${actionServiceText}`)
        }

        switch (this.getDomain(actionService)) {
          case 'floorplan':
            this.callFloorplanService(action, entityId, svgElementInfo);
            break;

          default:
            this.callHomeAssistantService(action, entityId, svgElementInfo);
            break;
        }

        calledServiceCount++;
      }
    }

    if (!calledServiceCount) {
      if (entityId && (rule.more_info !== false)) {
        this.openMoreInfo(entityId);
      }
    }
  }

  callFloorplanService(action: FloorplanActionConfig, entityId?: string, svgElementInfo?: FloorplanSvgElementInfo): void {
    const svgElement = (svgElementInfo ? svgElementInfo.svgElement : undefined) as SVGGraphicsElement;

    const actionService = this.getActionService(action, entityId, svgElement) as string;
    const actionData = this.getActionData(action, entityId, svgElement) as Record<string, unknown>;

    let page_id: string;
    let targetPageInfo: FloorplanPageInfo | undefined;

    switch (this.getService(actionService)) {
      case 'class_toggle':
        if (actionData) {
          const classes = actionData.classes as Array<string>;

          for (const otherElementId of (actionData.elements as Array<string>)) {
            const otherSvgElement = svgElementInfo?.svg?.querySelector(`[id="${otherElementId}"]`);
            if (otherSvgElement) {
              if (Utils.hasClass(otherSvgElement, classes[0])) {
                Utils.removeClass(otherSvgElement, classes[0]);
                Utils.addClass(otherSvgElement, classes[1]);
              }
              else if (Utils.hasClass(otherSvgElement, classes[1])) {
                Utils.removeClass(otherSvgElement, classes[1]);
                Utils.addClass(otherSvgElement, classes[0]);
              }
              else {
                Utils.addClass(otherSvgElement, actionData.default_class as string);
              }
            }
          }
        }
        break;

      case 'page_navigate':
        page_id = actionData.page_id as string;
        targetPageInfo = page_id ? this.pageInfos.get(page_id) : undefined;

        if (targetPageInfo) {
          Array.from(this.pageInfos.keys()).map((key) => {
            const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

            if (!pageInfo.isMaster && (pageInfo.svg.style.display !== 'none')) {
              pageInfo.svg.style.display = 'none';
            }
          });

          targetPageInfo.svg.style.display = 'block';
        }
        break;

      case 'variable_set':
        if (actionData.variable) {
          const attributes = {} as Record<string, unknown>;

          if (actionData.attributes) {
            const actionDataAttributes = actionData.attributes as Record<string, FloorplanActionConfig>;

            for (const key of Object.keys(actionDataAttributes)) {
              attributes[key] = this.getActionValue(actionDataAttributes[key], entityId, svgElement);
            }
          }

          const variableActionData = actionData as unknown as FloorplanActionConfig;
          const value = this.getActionValue(variableActionData, entityId, svgElement);
          this.setVariable(actionData.variable as string, value, attributes, false);
        }
        break;

      default:
        // Unknown floorplan service
        break;
    }
  }

  getActionValue(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    let value = action.value;
    if (action.value_template) {
      value = this.evaluate(action.value_template, entityId, svgElement);
    }
    return value;
  }

  setVariable(variableName: string, value: unknown, attributes: Record<string, unknown>, isInitialLoad: boolean): void {
    this.variables.set(variableName, value);

    if (this.hass.states[variableName]) {
      this.hass.states[variableName].state = (value as Record<string, unknown>).toString();

      for (const key of Object.keys(attributes)) {
        (this.hass.states[variableName].attributes as Record<string, unknown>)[key] = attributes[key];
      }
    }

    for (const otherVariableName of Array.from(this.variables.keys())) {
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

  callHomeAssistantService(action: FloorplanActionConfig, entityId?: string, svgElementInfo?: FloorplanSvgElementInfo): void {
    const svgElement = svgElementInfo ? svgElementInfo.svgElement : undefined;

    const actionService = this.getActionService(action, entityId, svgElement) as string;
    const actionData = this.getActionData(action, entityId, svgElement) as Record<string, unknown>;

    if (!actionData.entity_id && entityId && !action.no_entity_id) {
      actionData.entity_id = entityId;
    }

    this.hass.callService(this.getDomain(actionService), this.getService(actionService), actionData);
  }

  getActionData(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    let data = action.data ? action.data : {};
    if (action.data_template) {
      const result = this.evaluate(action.data_template, entityId, svgElement);
      data = (typeof result === 'string') ? JSON.parse(result) : result;
    }
    return data;
  }

  getActionService(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): unknown {
    let service = action.service;
    if (action.service_template) {
      service = this.evaluate(action.service_template, entityId, svgElement) as string;
    }
    return service;
  }

  getDomain(actionService: string): string {
    return actionService.split(".")[0];
  }

  getService(actionService: string): string {
    return actionService.split(".")[1];
  }

  /***************************************************************************************************************************/
  /* Logging / error handling functions
  /***************************************************************************************************************************/

  handleWindowError(event: Event | string, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    //this.options.setIsLoading(false);

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

  handleError(error: Error): void {
    console.error(error);

    let message = 'Error';
    if (typeof error === 'string') {
      message = error;
    }
    if (error.stack) {
      message = `${error.stack}`;
    }
    else if (error.message) {
      message = `${error.message}`;
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

  /***************************************************************************************************************************/
  /* Long click support
  /***************************************************************************************************************************/

  observeLongClicks(elem: HTMLElement | SVGElement): void {
    const longClickDuration = 400;

    let timer: NodeJS.Timeout;
    let isLongClick = false;

    const onTapStart = () => {
      console.log('onTapStart: isLongClick:', isLongClick);

      isLongClick = false;

      timer = setTimeout(() => {
        isLongClick = true;
        console.log('onTapStart: isLongClick:', isLongClick);
        console.log('onTapStart: dispatching event:', 'longClick');
        elem.dispatchEvent(new Event("longClick"));
      }, longClickDuration);
    };

    const onTapEnd = (evt: Event) => {
      clearTimeout(timer);

      if (isLongClick) {
        console.log('onTapEnd: isLongClick:', isLongClick);
        // have already triggered long click
      } else {
        // trigger shortClick, shortMouseup etc
        console.log('onTapStart: dispatching event:', 'short' + evt.type[0].toUpperCase() + evt.type.slice(1));
        elem.dispatchEvent(new Event('short' + evt.type[0].toUpperCase() + evt.type.slice(1)));
      }
    };

    const onTap = (evt: Event) => {
      if (isLongClick) {
        console.log('onTapEnd: isLongClick:', isLongClick);
        evt.preventDefault();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
      }
    };

    const onClick = (evt: Event) => {
      console.log('onClick: isLongClick:', isLongClick);
      evt.preventDefault();
      if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
    };

    E.on(elem, 'mousedown', onTapStart.bind(this));
    E.on(elem, 'tapstart', onTapStart.bind(this));
    E.on(elem, 'touchstart', onTapStart.bind(this));

    E.on(elem, 'click', onTapEnd.bind(this));
    E.on(elem, 'mouseup', onTapEnd.bind(this));
    E.on(elem, 'tapend', onTapEnd.bind(this));
    E.on(elem, 'touchend', onTapEnd.bind(this));

    E.on(elem, 'tap', onTap.bind(this));
    E.on(elem, 'touch', onTap.bind(this));
    E.on(elem, 'mouseup', onTap.bind(this));
    E.on(elem, 'tapend', onTap.bind(this));
    E.on(elem, 'touchend', onTap.bind(this));

    E.on(elem, 'click', onClick.bind(this));
  }
}

if (!customElements.get('floorplan-element')) {
  customElements.define('floorplan-element', FloorplanElement);
}

class ClickEventContext {
  constructor(
    public instance: FloorplanElement,
    public svgElementInfo: FloorplanSvgElementInfo,
    public entityId: string | undefined,
    public elementId: string | undefined,
    public rule: FloorplanRuleConfig,
  ) {
  }
}

enum ClickType {
  ShortClick,
  LongClick
}

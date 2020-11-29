import { HassObject, HassEntityState } from '../hass/hass';
import { FloorplanOptions } from './floorplan-options';
import { FloorplanConfig, FloorplanConfigBase, FloorplanLastMotionConfig, FloorplanPageConfig } from './floorplan-config';
import { FloorplanRuleConfig, FloorplanVariableConfig, FloorplanActionConfig, FloorplanRuleStateConfig } from './floorplan-config';
import { FloorplanRuleEntityElementConfig } from './floorplan-config';
import { FloorplanPageInfo, FloorplanRuleInfo, FloorplanSvgElementInfo } from './floorplan-info';
import { FloorplanElementInfo, FloorplanEntityInfo } from './floorplan-info';
import { FullyKiosk } from './fully-kiosk';
import { debounce } from 'debounce';
import * as yaml from 'js-yaml';
import { Utils } from '../utils';
import { Logger } from './logger';
const E = require('oui-dom-events').default;

export class Floorplan {
  version = '1.0.0';
  hass?: HassObject;
  pageInfos = new Map<string, FloorplanPageInfo>();
  entityInfos = new Map<string, any>();
  elementInfos = new Map<string, any>();
  lastMotionConfig?: FloorplanLastMotionConfig;
  variables = new Map<string, any>();
  fullyKiosk?: FullyKiosk;
  logger?: Logger;

  handleEntitiesDebounced = debounce(this.handleEntities.bind(this), 100, true);

  constructor(private options: FloorplanOptions) {
    window.onerror = this.handleWindowError.bind(this);
  }

  async hassChanged(hass: HassObject): Promise<void> {
    if (!this.options || !this.options.config!.svg) return; // wait for SVG to be loaded

    if (!this.hass) {
      this.hass = hass;
      this.initFloorplanRules(this.options.config!.svg!, this.options.config!)
      await this.handleEntities(true);
    }
    else {
      this.hass = hass;
      this.handleEntitiesDebounced(); // use debounced wrapper
    }
  }

  /***************************************************************************************************************************/
  /* Startup
  /***************************************************************************************************************************/

  async init(): Promise<void> {
    try {
      const config = await this.loadConfig(this.options.config!);

      const logElement = (this.options.root as Element)!.querySelector('#log') as HTMLElement;
      this.logger = new Logger(logElement, config.log_level, config.debug_level);

      this.logInfo('VERSION', `Floorplan v${this.version}`);

      if (!this.validateConfig(config)) {
        this.options.setIsLoading(false);
        return;
      }

      this.options.config = config; // set resolved config as effective config

      //await this.loadLibraries()
      //this.initFullyKiosk();

      if (this.options.config!.pages) {
        await this.initMultiPage();
      }
      else {
        await this.initSinglePage();
      }
    }
    catch (err) {
      this.options.setIsLoading(false);
      this.handleError(err);
    }
  }

  async initMultiPage(): Promise<void> {
    try {
      await this.loadPages();
      this.options.setIsLoading(false);
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
      await this.loadStyleSheet(this.options.config!.stylesheet)
      const imageUrl = this.getBestImage(this.options.config!);
      this.options.config!.svg = await await this.loadFloorplanSvg(imageUrl);;
      //this.initFloorplanRules(svg, this.options.config!)
      this.options.setIsLoading(false);
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

  async loadConfig(config: FloorplanConfig | string): Promise<FloorplanConfigBase> {
    if (typeof config === 'string') {
      const targetConfig = await Utils.fetchText(config, this.options._isDemo)
      const configYaml = yaml.safeLoad(targetConfig);
      return configYaml as FloorplanConfigBase;
    }
    else {
      return config;
    }
  }

  async loadLibraries(): Promise<void> {
    if (this.isOptionEnabled(this.options.config!.pan_zoom)) {
      await this.loadScript('/local/floorplan/lib/svg-pan-zoom.min.js', true);
    }

    if (this.isOptionEnabled(this.options.config!.fully_kiosk)) {
      await this.loadScript('/local/floorplan/lib/fully-kiosk.js', false);
    }
  }

  loadScript(scriptUrl: string, useCache: boolean): Promise<void> {
    if (!scriptUrl) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = useCache ? scriptUrl : Utils.cacheBuster(scriptUrl);
      script.onload = () => resolve();
      script.onerror = (err) => {
        reject(new URIError(`${(err as any).target.src}`));
      };

      this.options.root!.appendChild(script);
    });
  }

  async loadPages(): Promise<void> {
    for (let pageConfigUrl of this.options.config!.pages) {
      await this.loadPageConfig(pageConfigUrl, this.options.config!.pages.indexOf(pageConfigUrl));
    }

    const pageInfos = Array.from(this.pageInfos.keys()).map(key => this.pageInfos.get(key));
    pageInfos.sort((a, b) => a!.index! - b!.index!); // sort ascending

    const masterPageInfo = pageInfos.find(pageInfo => (pageInfo!.config!.master_page !== undefined));
    if (masterPageInfo) {
      masterPageInfo.isMaster = true;
    }

    const defaultPageInfo = pageInfos.find(pageInfo => (pageInfo!.config!.master_page === undefined));
    if (defaultPageInfo) {
      defaultPageInfo.isDefault = true;
    }

    await this.loadPageFloorplanSvg(masterPageInfo!, masterPageInfo!) // load master page first

    const nonMasterPages = pageInfos.filter(pageInfo => pageInfo !== masterPageInfo);
    for (let pageInfo of nonMasterPages) {
      await this.loadPageFloorplanSvg(pageInfo!, masterPageInfo!);
    }
  }

  async loadPageConfig(pageConfigUrl: string, index: number): Promise<FloorplanPageInfo> {
    const pageConfig = await this.loadConfig(pageConfigUrl) as FloorplanPageConfig;
    const pageInfo = this.createPageInfo(pageConfig);
    pageInfo.index = index;
    return pageInfo;
  }

  async loadPageFloorplanSvg(pageInfo: FloorplanPageInfo, masterPageInfo: FloorplanPageInfo): Promise<void> {
    const imageUrl = this.getBestImage(pageInfo.config!);
    const svg = await this.loadFloorplanSvg(imageUrl, pageInfo, masterPageInfo)
    svg.id = pageInfo.config!.page_id; // give the SVG an ID so it can be styled (i.e. background color)
    pageInfo.svg = svg;
    await this.loadStyleSheet(pageInfo.config!.stylesheet)
    this.initFloorplanRules(pageInfo.svg, pageInfo.config!);
  }

  getBestImage(config: FloorplanConfigBase): string {
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
        for (let pageSize of config.image.sizes) {
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
    if (pageInfo.config!.rules && this.options.config!.rules) {
      pageInfo.config!.rules = pageInfo.config!.rules.concat(this.options.config!.rules);
    }

    this.pageInfos.set(pageInfo.config!.page_id, pageInfo);

    return pageInfo;
  }

  async loadStyleSheet(stylesheetUrl: string): Promise<void> {
    if (!stylesheetUrl) return;

    const stylesheet = await Utils.fetchText(stylesheetUrl, this.options._isDemo);
    const link = document.createElement('style');
    link.type = 'text/css';
    link.innerHTML = stylesheet;
    this.options.root!.appendChild(link);
  }

  async loadFloorplanSvg(imageUrl: string, pageInfo?: FloorplanPageInfo, masterPageInfo?: any): Promise<SVGGraphicsElement> {
    const svgText = await Utils.fetchText(imageUrl, this.options._isDemo);
    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector("svg") as SVGGraphicsElement;

    if (pageInfo) {
      svg.setAttribute('id', pageInfo.config!.page_id);
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
      const masterPageId = masterPageInfo.config!.page_id;
      const contentElementId = masterPageInfo.config!.master_page.content_element;

      if (pageInfo.config!.page_id === masterPageId) {
        this.options.element!.appendChild(svg);
      }
      else {
        const masterPageElement = this.options.element!.querySelector('#' + masterPageId);
        const contentElement = this.options.element!.querySelector('#' + contentElementId);

        const height = Number.parseFloat(svg.getAttribute('height')!);
        const width = Number.parseFloat(svg.getAttribute('width')!);
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        svg.setAttribute('height', contentElement!.getAttribute('height')!);
        svg.setAttribute('width', contentElement!.getAttribute('width')!);
        svg.setAttribute('x', contentElement!.getAttribute('x')!);
        svg.setAttribute('y', contentElement!.getAttribute('y')!);

        contentElement!.parentElement!.appendChild(svg);
      }
    }
    else {
      this.options.element!.appendChild(svg);
    }

    // TODO: Re-enable???
    // Enable pan / zoom if enabled in config
    /*
    if (this.isOptionEnabled(this.options.config!.pan_zoom)) {
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
    const imageData = await Utils.fetchImage(imageUrl, this.options._isDemo);
    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    let svgElement = svgElementInfo.svgElement!; // assume the target element already exists

    if (svgElement.nodeName !== 'image') {
      svgElement = this.createImageElement(svgElementInfo.originalSvgElement) as SVGGraphicsElement;

      this.processChildElements(svgElement, svgElementInfo, entityId, undefined, rule);

      svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement!, svgElement);
    }

    const existingHref = svgElement.getAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
    if (existingHref !== imageData) {
      svgElement.removeAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href');
      svgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imageUrl);
    }

    return svgElement;
  }

  async loadSvgImage(imageUrl: string, svgElementInfo: FloorplanSvgElementInfo, entityId: string, rule: FloorplanRuleConfig): Promise<SVGGraphicsElement> {
    const svgText = await Utils.fetchText(imageUrl, this.options._isDemo);
    this.logDebug('IMAGE', `${entityId} (setting image: ${imageUrl})`);

    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector("svg") as SVGGraphicsElement;

    const height = Number.parseFloat(svg.getAttribute('height')!);
    const width = Number.parseFloat(svg.getAttribute('width')!);
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    svg.id = svgElementInfo.svgElement!.id;
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    svg.setAttribute('height', svgElementInfo.originalBBox!.height.toString());
    svg.setAttribute('width', svgElementInfo.originalBBox!.width.toString());
    svg.setAttribute('x', svgElementInfo.originalBBox!.x.toString());
    svg.setAttribute('y', svgElementInfo.originalBBox!.y.toString());

    this.processChildElements(svg, svgElementInfo, entityId, undefined, rule);

    svgElementInfo.svgElement = this.replaceElement(svgElementInfo.svgElement!, svg);

    return svg;
  }

  querySelectorAll(element: Element, selector: string, includeSelf: boolean): Array<Element> {
    let elements = Array.from(element.querySelectorAll(selector).values());
    elements = includeSelf ? elements.concat(element) : elements;
    return elements;
  }

  replaceElement(previousSvgElement: SVGGraphicsElement, svgElement: SVGGraphicsElement): SVGGraphicsElement {
    const parentElement = previousSvgElement.parentElement!;

    this.querySelectorAll(previousSvgElement, '*', true).forEach((element: Element) => {
      E.off(element, 'click');
      E.off(element, 'shortClick');
      E.off(element, 'longClick');
      element.remove();
    });
    previousSvgElement.remove();

    parentElement.appendChild(svgElement);

    return svgElement;
  }

  /***************************************************************************************************************************/
  /* Initialization
  /***************************************************************************************************************************/

  initFullyKiosk(): void {
    if (this.isOptionEnabled(this.options.config!.fully_kiosk)) {
      this.fullyKiosk = new FullyKiosk(this);
      this.fullyKiosk.init();
    }
  }

  initPageDisplay(): void {
    if (this.options.config!.pages) {
      for (let key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

        pageInfo.svg!.style.opacity = '1';
        pageInfo.svg!.style.display = pageInfo.isMaster || pageInfo.isDefault ? 'initial' : 'none'; // Show the first page
      }
    }
    else {
      // Show the SVG
      this.options.config!.svg!.style.opacity = '1';
      this.options.config!.svg!.style.display = 'block';
    }
  }

  initVariables(): void {
    if (this.options.config!.variables) {
      for (let variable of this.options.config!.variables) {
        this.initVariable(variable);
      }
    }

    if (this.options.config!.pages) {
      for (let key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

        if (pageInfo.config!.variables) {
          for (let variable of pageInfo.config!.variables) {
            this.initVariable(variable);
          }
        }
      }
    }
  }

  initVariable(variable: FloorplanVariableConfig): void {
    let variableName: string;
    let value: any;

    if (typeof variable === 'string') {
      variableName = variable;
    }
    else {
      variableName = variable.name!;

      value = variable.value;
      if (variable.value_template) {
        value = this.evaluate(variable.value_template, variableName, undefined);
      }
    }

    if (!this.entityInfos.has(variableName)) {
      let entityInfo = { entityId: variableName, ruleInfos: [], lastState: undefined };
      this.entityInfos.set(variableName, entityInfo);
    }

    if (!this.hass!.states![variableName]) {
      this.hass!.states![variableName] = {
        entity_id: variableName,
        state: value,
        last_changed: new Date(),
        attributes: {},
      } as HassEntityState;
    }

    this.setVariable(variableName, value, [], true);
  }

  initStartupActions(): void {
    let actions = new Array<FloorplanActionConfig>();

    const startup = this.options.config!.startup;
    if (startup?.action) {
      actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
    }

    if (this.options.config!.pages) {
      for (let key of this.pageInfos.keys()) {
        const pageInfo = this.pageInfos.get(key);

        const startup = pageInfo!.config && pageInfo!.config.startup;
        if (startup?.action) {
          actions = actions.concat(Array.isArray(startup.action) ? startup.action : [startup.action]);
        }
      }
    }

    for (let action of actions) {
      if (action.service || action.service_template) {
        const actionService = this.getActionService(action, undefined, undefined);

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

  initFloorplanRules(svg: SVGGraphicsElement, config: FloorplanConfigBase): void {
    if (!config.rules) return;

    const svgElements = this.querySelectorAll(svg, '*', true) as Array<SVGGraphicsElement>;

    this.initLastMotion(config, svg, svgElements);
    this.initRules(config, svg, svgElements);
  }

  initLastMotion(config: FloorplanConfigBase, svg: SVGGraphicsElement, svgElements: Array<SVGGraphicsElement>): void {
    // Add the last motion entity if required
    if (config.last_motion?.entity && config.last_motion.class) {
      this.lastMotionConfig = config.last_motion;

      const entityInfo = { entityId: config.last_motion.entity, ruleInfos: [], lastState: undefined };
      this.entityInfos.set(config.last_motion.entity, entityInfo);
    }
  }

  initRules(config: FloorplanConfigBase, svg: SVGGraphicsElement, svgElements: Array<SVGGraphicsElement>): void {
    // Apply default options to rules that don't override the options explictly
    if (config.defaults) {
      for (let rule of config.rules) {
        rule.hover_over = (rule.hover_over === undefined) ? config.defaults.hover_over : rule.hover_over;
        rule.more_info = (rule.more_info === undefined) ? config.defaults.more_info : rule.more_info;
        rule.propagate = (rule.propagate === undefined) ? config.defaults.propagate : rule.propagate;
      }
    }

    for (let rule of config.rules) {
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
    for (let entity of entities) {
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

      this.processChildElements(svgElement, svgElementInfo, entityId, undefined, rule);

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
    for (let entityId of rule.groups) {
      const group = this.hass!.states![entityId];
      if (group) {
        for (let entityId of group.attributes!.entity_id!) {
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
    for (let entityId of entityIds) {
      const elementId = rule.element ? rule.element : entityId;
      this.addTargetEntity(entityId, elementId, targetEntities);
    }

    // Entities as a list of objects
    const entityObjects = rule.entities.filter(x => (typeof x !== 'string'));
    for (let entityObject of entityObjects) {
      const ruleEntityElement = entityObject as FloorplanRuleEntityElementConfig;
      this.addTargetEntity(ruleEntityElement.entity!, ruleEntityElement.element!, targetEntities);
    }

    return targetEntities;
  }

  addTargetEntity(entiyId: string, elementId: string, targetEntities: Array<{ entityId: string, elementId: string }>) {
    const hassEntity = this.hass!.states![entiyId];
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

    for (let elementId of rule.elements!) {
      const svgElement = svgElements.find(svgElement => svgElement.id === elementId);
      if (svgElement) {
        let elementInfo = this.elementInfos.get(elementId);
        if (!elementInfo) {
          elementInfo = { ruleInfos: [], lastState: undefined };
          this.elementInfos.set(elementId, elementInfo);
        }

        const ruleInfo = new FloorplanRuleInfo(rule);
        elementInfo.ruleInfos.push(ruleInfo);

        const svgElementInfo = this.addSvgElementToRule(svg, svgElement, ruleInfo);

        this.processChildElements(svgElement, svgElementInfo, undefined, elementId, rule);

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
        for (let clickAction of clickActions.filter(x => x !== undefined)) {
          switch (clickAction.service) {
            case 'toggle':
              for (let otherElementId of clickAction.data.elements) {
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

  processChildElements(parentSvgElement: SVGGraphicsElement, svgElementInfo: FloorplanSvgElementInfo, entityId: string | undefined, elementId: string | undefined, rule: FloorplanRuleConfig) {
    this.querySelectorAll(parentSvgElement, '*', true).forEach((element: Element) => {
      const titleElem = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      element.appendChild(titleElem);

      const context = {
        instance: this,
        svgElementInfo: svgElementInfo,
        entityId: entityId,
        elementId: elementId,
        rule: rule
      } as ClickEventContext;

      E.on(element, 'click', this.onClick.bind(context));
      //E.on(element, 'shortClick', this.onClick.bind(context));

      if (rule.on_long_click) {
        this.observeLongClicks(element as HTMLElement | SVGElement);
        E.on(element, 'longClick', this.onLongClick.bind(context));
      }

      if (rule.on_click || rule.on_long_click || (rule.more_info !== false)) {
        (element as SVGGraphicsElement).style.cursor = 'pointer';
      }

      Utils.addClass(element, 'floorplan-item');
    });
  }

  addBackgroundRectToText(svgElementInfo: FloorplanSvgElementInfo): void {
    const svgElement = svgElementInfo.svgElement!;

    const bbox = svgElement.getBBox();

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', svgElement.id + '.background');
    rect.setAttribute('height', (bbox.height + 1).toString());
    rect.setAttribute('width', (bbox.width + 2).toString());
    rect.setAttribute('x', (bbox.x - 1).toString());
    rect.setAttribute('y', (bbox.y - 0.5).toString());
    rect.style.fillOpacity = '0';

    svgElement.parentElement!.insertBefore(rect, svgElement);
  }

  addSvgElementToRule(svg: SVGGraphicsElement, svgElement: SVGGraphicsElement, ruleInfo: FloorplanRuleInfo): FloorplanSvgElementInfo {
    const svgElementInfo = new FloorplanSvgElementInfo(
      svgElement.id,
      svg,
      svgElement,
      svgElement,
      Utils.getArray(svgElement.classList),
      svgElement.getBBox(),
      svgElement.getBoundingClientRect()
    );
    ruleInfo.svgElementInfos.set(svgElement.id, svgElementInfo);

    //this.addNestedSvgElementsToRule(svgElement, ruleInfo);

    return svgElementInfo;
  }

  addNestedSvgElementsToRule(svgElement: SVGGraphicsElement, ruleInfo: FloorplanRuleInfo): void {
    this.querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
      const svgElementInfo = new FloorplanSvgElementInfo(
        svgElement.id,
        undefined,
        svgNestedElement as SVGGraphicsElement,
        svgNestedElement as SVGGraphicsElement,
        Utils.getArray(svgNestedElement.classList),
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

    for (let className of classes) {
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
        this.querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
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

    for (let className of classes) {
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
          this.querySelectorAll(svgElement, '*', false).forEach((svgNestedElement) => {
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

  async handleEntities(isInitialLoad: boolean = false): Promise<void> {
    this.handleElements(isInitialLoad);

    let changedEntityIds = this.getChangedEntities(isInitialLoad);
    changedEntityIds = changedEntityIds.concat(Array.from(this.variables.keys())); // always assume variables need updating

    if (changedEntityIds?.length) {
      for (let entityId of changedEntityIds) {
        await this.handleEntity(entityId, isInitialLoad);
      }
    }
  }

  getChangedEntities(isInitialLoad: boolean): Array<string> {
    const changedEntityIds = new Array<string>();

    const entityIds = Object.keys(this.hass!.states!);

    let lastMotionEntityInfo, oldLastMotionState, newLastMotionState;

    if (this.lastMotionConfig) {
      lastMotionEntityInfo = this.entityInfos.get(this.lastMotionConfig.entity!);
      if (lastMotionEntityInfo?.lastState) {
        oldLastMotionState = lastMotionEntityInfo.lastState.state;
        newLastMotionState = this.hass!.states![this.lastMotionConfig.entity!].state;
      }
    }

    for (let entityId of entityIds) {
      const entityInfo = this.entityInfos.get(entityId);
      if (entityInfo) {
        const entityState = this.hass!.states![entityId];

        if (isInitialLoad) {
          this.logDebug('STATE', `${entityId}: ${entityState.state} (initial load)`);
          if (changedEntityIds.indexOf(entityId) < 0) {
            changedEntityIds.push(entityId);
          }
        }
        else if (entityInfo.lastState) {
          const oldState = entityInfo.lastState.state;
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
              const friendlyName = entityState.attributes!.friendly_name;

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

  async handleEntity(entityId: string, isInitialLoad: boolean): Promise<void> {
    const entityState = this.hass!.states![entityId];
    const entityInfo = this.entityInfos.get(entityId);

    if (!entityInfo) return;

    entityInfo.lastState = Object.assign({}, entityState);

    await this.handleEntityUpdateDom(entityInfo)
    this.handleEntityUpdateCss(entityInfo, isInitialLoad);
    this.handleEntityUpdateLastMotionCss(entityInfo);
    this.handleEntitySetHoverOver(entityInfo);
  }

  async handleEntityUpdateDom(entityInfo: FloorplanEntityInfo): Promise<void> {
    const entityId = entityInfo.entityId as string;
    const entityState = this.hass!.states![entityId];

    for (let ruleInfo of entityInfo.ruleInfos) {
      for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
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

  async handleElements(isInitialLoad: boolean) {
    for (let key of this.elementInfos.keys()) {
      const elementInfo = this.elementInfos.get(key);
      await this.handleElementUpdateDom(elementInfo)
      this.handleElementUpdateCss(elementInfo, isInitialLoad);
    }
  }

  async handleElementUpdateDom(elementInfo: FloorplanElementInfo) {
    for (let ruleInfo of elementInfo.ruleInfos) {
      for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
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

  getParents(element: Node, parentSelector: Node): Array<Node> {
    var parents = new Array<Node>();
    var currentParent = element.parentNode;

    while (currentParent !== parentSelector) {
      parents.push(currentParent!);
      currentParent = currentParent!.parentNode;
    }
    parents.push(parentSelector); // Push that parentSelector you wanted to stop at

    return parents;
  }

  handleEntityUpdateText(entityId: string, ruleInfo: FloorplanRuleInfo, svgElementInfo: FloorplanSvgElementInfo) {
    const textElement = svgElementInfo.svgElement;
    const state = this.hass!.states![entityId] ? this.hass!.states![entityId].state : undefined;

    const text = ruleInfo.rule.text_template ? this.evaluate(ruleInfo.rule.text_template, entityId, textElement) : state;

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

    const imageUrl = (ruleInfo.rule.image ? ruleInfo.rule.image : this.evaluate(ruleInfo.rule.image_template!, entityId, svgElement)) as string;

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

  handleEntitySetHoverOver(entityInfo: FloorplanEntityInfo) {
    const entityId = entityInfo.entityId as string;
    const entityState = this.hass!.states![entityId];

    for (let ruleInfo of entityInfo.ruleInfos) {
      if (ruleInfo.rule.hover_over !== false) {
        for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
          const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

          this.handlEntitySetHoverOverText(svgElementInfo.svgElement, entityState);
        }
      }
    }
  }

  handlEntitySetHoverOverText(svgElement: SVGGraphicsElement, entityState: HassEntityState) {
    svgElement.querySelectorAll('title').forEach((titleElement) => {
      const lastChangedDate = Utils.formatDate(entityState.last_changed!);
      const lastUpdatedDate = Utils.formatDate(entityState.last_updated!);

      let titleText = `${entityState.attributes!.friendly_name}\n`;
      titleText += `State: ${entityState.state}\n\n`;

      Object.keys(entityState.attributes!).map(key => {
        titleText += `${key}: ${entityState.attributes![key]}\n`;
      });
      titleText += '\n';

      titleText += `Last changed: ${lastChangedDate}\n`;
      titleText += `Last updated: ${lastUpdatedDate}`;

      titleElement.textContent = titleText;
    });
  }

  handleElementUpdateCss(elementInfo: FloorplanElementInfo, isInitialLoad: boolean) {
    for (let ruleInfo of elementInfo.ruleInfos) {
      for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;

        this.handleUpdateElementCss(svgElementInfo, ruleInfo);
      }
    }
  }

  handleEntityUpdateCss(entityInfo: FloorplanEntityInfo, isInitialLoad: boolean) {
    for (let ruleInfo of entityInfo.ruleInfos) {
      for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
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
    let obsoleteClasses = new Array<string>();
    if (ruleInfo.rule.states) {
      const entityState = this.hass!.states![entityId];

      const stateConfig = ruleInfo.rule.states.find(stateConfig => (stateConfig.state === entityState.state)) as FloorplanRuleStateConfig;
      targetClasses = this.getStateConfigClasses(stateConfig);

      // Remove any other previously-added state classes
      for (let otherStateConfig of ruleInfo.rule.states) {
        if (!stateConfig || (otherStateConfig.state !== stateConfig.state)) {
          const otherStateClasses = this.getStateConfigClasses(otherStateConfig);
          for (let otherStateClass of otherStateClasses) {
            if (otherStateClass && (targetClasses.indexOf(otherStateClass) < 0) && (otherStateClass !== 'floorplan-item') && Utils.hasClass(svgElement, otherStateClass) && (svgElementInfo.originalClasses.indexOf(otherStateClass) < 0)) {
              obsoleteClasses.push(otherStateClass);
            }
          }
        }
      }
    }
    else {
      if (svgElement.classList) {
        for (let otherClass of Utils.getArray(svgElement.classList)) {
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
    for (let otherClass of Utils.getArray(svgElement.classList)) {
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
    if (!this.lastMotionConfig) return;

    const entityId = entityInfo.entityId as string;
    const entityState = this.hass!.states![entityId];

    if (!entityState) return;

    for (let ruleInfo of entityInfo.ruleInfos) {
      for (let svgElementId of ruleInfo.svgElementInfos.keys()) {
        const svgElementInfo = ruleInfo.svgElementInfos.get(svgElementId) as FloorplanSvgElementInfo;
        const svgElement = svgElementInfo.svgElement;

        const stateConfigClasses = this.getStateConfigClasses(this.lastMotionConfig);

        if (this.hass!.states![this.lastMotionConfig.entity!] &&
          (entityState.attributes!.friendly_name === this.hass!.states![this.lastMotionConfig.entity!].state)) {
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

  isOptionEnabled(option: any): boolean {
    return ((option === null) || (option !== undefined));
  }

  isLastMotionEnabled(): boolean {
    return (this.lastMotionConfig && this.options.config!.last_motion!.entity && this.options.config!.last_motion!.class) !== undefined;
  }

  validateConfig(config: FloorplanConfig): boolean {
    let isValid = true;

    if (!config.pages && !config.rules) {
      this.options.setIsLoading(false);
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

  evaluate(code: string, entityId?: string, svgElement?: SVGGraphicsElement): any {
    try {
      const entityState = entityId ? this.hass!.states![entityId] : undefined;
      let functionBody = (code.indexOf('${') >= 0) ? `\`${code}\`;` : code;
      functionBody = (functionBody.indexOf('return') >= 0) ? functionBody : `return ${functionBody};`;
      const func = new Function('entity', 'entities', 'hass', 'config', 'element', functionBody);
      const result = func(entityState, this.hass!.states, this.hass, this.options.config!, svgElement);
      return result;
    }
    catch (err) {
      //  this.logError('ERROR', entityId);
      //  this.logError('ERROR', err);
    }
  }

  /***************************************************************************************************************************/
  /* Event handlers
  /***************************************************************************************************************************/

  onClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as any as ClickEventContext;
    context.instance!.performAction(ClickType.ShortClick, context);
  }

  onLongClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    const context = this as any as ClickEventContext;
    setTimeout(() => { context.instance!.performAction(ClickType.LongClick, context) }, 300);
  }

  performAction(clickType: ClickType, context: ClickEventContext): void {
    const entityId = context.entityId!;
    const svgElementInfo = context.svgElementInfo!;
    const rule = context.rule!;

    let action = rule ? ((clickType === ClickType.LongClick) ? rule.on_long_click : rule.on_click) : undefined;

    if (!action && entityId && (rule.more_info !== false)) {
      this.options.openMoreInfo(entityId);
      return;
    }

    if (!action) return;

    let calledServiceCount = 0;

    const svgElement = svgElementInfo.svgElement;

    const actions = Array.isArray(action) ? action : [action];
    for (let action of actions) {
      if (action.service || action.service_template) {
        const actionService = this.getActionService(action, entityId, svgElement);

        if (this.options._isDemo) {
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
        this.options.openMoreInfo(entityId);
      }
    }
  }

  callFloorplanService(action: FloorplanActionConfig, entityId?: string, svgElementInfo?: FloorplanSvgElementInfo): void {
    const svgElement = (svgElementInfo ? svgElementInfo.svgElement : undefined) as SVGGraphicsElement;

    const actionService = this.getActionService(action, entityId, svgElement);
    const actionData = this.getActionData(action, entityId, svgElement);

    switch (this.getService(actionService)) {
      case 'class_toggle':
        if (actionData) {
          const classes = actionData.classes;

          for (let otherElementId of actionData.elements) {
            const otherSvgElement = svgElementInfo!.svg!.querySelector(`[id="${otherElementId}"]`);
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
                Utils.addClass(otherSvgElement, actionData.default_class);
              }
            }
          }
        }
        break;

      case 'page_navigate':
        const page_id = actionData.page_id;
        const targetPageInfo = page_id && this.pageInfos.get(page_id) as FloorplanPageInfo;

        if (targetPageInfo) {
          Array.from(this.pageInfos.keys()).map((key) => {
            const pageInfo = this.pageInfos.get(key) as FloorplanPageInfo;

            if (!pageInfo.isMaster && (pageInfo.svg!.style.display !== 'none')) {
              pageInfo.svg!.style.display = 'none';
            }
          });

          targetPageInfo.svg!.style.display = 'block';
        }
        break;

      case 'variable_set':
        if (actionData.variable) {
          const attributes = [];

          if (actionData.attributes) {
            for (let attribute of actionData.attributes) {
              const attributeValue = this.getActionValue(attribute, entityId, svgElement);
              attributes.push({ name: attribute.attribute, value: attributeValue });
            }
          }

          const value = this.getActionValue(actionData, entityId, svgElement);
          this.setVariable(actionData.variable, value, attributes, false);
        }
        break;

      default:
        // Unknown floorplan service
        break;
    }
  }

  getActionValue(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): any {
    let value = action.value;
    if (action.value_template) {
      value = this.evaluate(action.value_template, entityId, svgElement);
    }
    return value;
  }

  setVariable(variableName: string, value: any, attributes: any, isInitialLoad: boolean): void {
    this.variables.set(variableName, value);

    if (this.hass!.states![variableName]) {
      this.hass!.states![variableName].state = value;

      for (let attribute of attributes) {
        this.hass!.states![variableName].attributes![attribute.name] = attribute.value;
      }
    }

    for (let otherVariableName of Array.from(this.variables.keys())) {
      const otherVariable = this.hass!.states![otherVariableName];
      if (otherVariable) {
        otherVariable.last_changed = new Date(); // mark all variables as changed
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

    const actionService = this.getActionService(action, entityId, svgElement);
    const actionData = this.getActionData(action, entityId, svgElement);

    if (!actionData.entity_id && entityId && !action.no_entity_id) {
      actionData.entity_id = entityId;
    }

    this.hass!.callService(this.getDomain(actionService), this.getService(actionService), actionData);
  }

  getActionData(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): any {
    let data = action.data ? action.data : {};
    if (action.data_template) {
      const result = this.evaluate(action.data_template, entityId, svgElement);
      data = (typeof result === 'string') ? JSON.parse(result) : result;
    }
    return data;
  }

  getActionService(action: FloorplanActionConfig, entityId?: string, svgElement?: SVGGraphicsElement): any {
    let service = action.service;
    if (action.service_template) {
      service = this.evaluate(action.service_template, entityId, svgElement);
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
    this.options.setIsLoading(false);

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

  handleError(error: any): void {
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

    this.logger!.log('error', message);
  }

  logError(area: string, message: string): void {
    this.logger!.log('error', `${area} ${message}`);
  }

  logWarning(area: string, message: string): void {
    this.logger!.log('warning', `${area} ${message}`);
  }

  logInfo(area: string, message: string): void {
    this.logger!.log('info', `${area} ${message}`);
  }

  logDebug(area: string, message: string): void {
    this.logger!.log('debug', `${area} ${message}`);
  }

  /***************************************************************************************************************************/
  /* Long click support
  /***************************************************************************************************************************/

  observeLongClicks(elem: HTMLElement | SVGElement): void {
    const settings = {
      NS: 'jquery.longclick-',
      delay: 400
    };

    let timer: NodeJS.Timeout;
    let isLongClick: boolean;

    const onTapStart = (evt: Event) => {
      console.log('onTapStart: isLongClick:', isLongClick);

      isLongClick = false;

      timer = setTimeout(() => {
        isLongClick = true;
        console.log('onTapStart: isLongClick:', isLongClick);
        console.log('onTapStart: dispatching event:', 'longClick');
        elem.dispatchEvent(new Event("longClick"));
      }, settings.delay);
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

    E.on(elem, 'mousedown', onTapStart);
    E.on(elem, 'tapstart', onTapStart);
    E.on(elem, 'touchstart', onTapStart);

    E.on(elem, 'click', onTapEnd);
    E.on(elem, 'mouseup', onTapEnd);
    E.on(elem, 'tapend', onTapEnd);
    E.on(elem, 'touchend', onTapEnd);

    E.on(elem, 'tap', onTap);
    E.on(elem, 'touch', onTap);
    E.on(elem, 'mouseup', onTap);
    E.on(elem, 'tapend', onTap);
    E.on(elem, 'touchend', onTap);

    E.on(elem, 'click', onClick);
  }
}


class ClickEventContext {
  instance?: Floorplan;
  svgElementInfo?: FloorplanSvgElementInfo;
  entityId?: string;
  elementId?: string;
  rule?: FloorplanRuleConfig;
}

enum ClickType {
  ShortClick,
  LongClick
}

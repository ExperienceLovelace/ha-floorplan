import { HassObject } from '../hass/hass';
import { Floorplan } from './floorplan';
import { FloorplanOptions } from './floorplan-options';
import { FloorplanConfig } from './floorplan-config';
import { CardConfig } from './card-config';

export class FloorplanElement extends HTMLElement {
  isFloorplanLoading = false;
  isFloorplanLoaded = false;
  _config?: FloorplanConfig | CardConfig;
  floorplanElement?: HTMLElement;
  floorplan?: Floorplan;
  log?: HTMLElement;
  spinner?: HTMLElement;
  isLoading: boolean = false;

  constructor() {
    super();

    Object.defineProperties(this, this.properties);

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
  }

  get properties() {
    const that = this;

    return {
      config: {
        set(config: FloorplanConfig | CardConfig) {
          that.setConfig(config);
        }
      },
      hass: {
        set(hass: HassObject) {
          that.setHass(hass);
        }
      },
    };
  }

  setConfig(config: FloorplanConfig | CardConfig) {
    this._config = config;

    this.initDom();

    this.setIsLoading(true);
  }

  setHass(hass: HassObject) {
    if (!this._config || !this.isConnected) return;

    this.loadFloorplanOnce(hass, this._config);

    this.floorplan!.hassChanged(hass);
  }

  loadFloorplanOnce(hass: any, config: FloorplanConfig | CardConfig) {
    if (this.isFloorplanLoading || this.isFloorplanLoaded) return;

    this.isFloorplanLoading = true;

    const options = {
      root: this.shadowRoot!,
      element: this.floorplanElement,
      hass: hass,
      config: ((config as CardConfig)?.config) || config,
      openMoreInfo: this.openMoreInfo.bind(this),
      setIsLoading: this.setIsLoading.bind(this),
    } as FloorplanOptions;

    this.floorplan = new Floorplan(options);

    this.isFloorplanLoading = false;
    this.isFloorplanLoaded = true;
  }

  initDom(): void {
    const root = this.shadowRoot as ShadowRoot;

    if (root.lastChild) root.removeChild(root.lastChild);

    const style = document.createElement('style');
    style.textContent = this.getStyle();
    root.appendChild(style);

    const container = this.createAndAppendContainer();

    const spinner = document.createElement('paper-spinner-lite');
    container.appendChild(spinner);

    const floorplan = document.createElement('div');
    floorplan.id = 'floorplan';
    container.appendChild(floorplan);

    const log = document.createElement('div');
    log.id = 'log';
    container.appendChild(log);

    const list = document.createElement('ul');
    log.appendChild(list);

    const hyperlink = document.createElement('a');
    hyperlink.setAttribute('href', '#');
    hyperlink.text = 'Clear log';
    log.appendChild(hyperlink);
    hyperlink.onclick = () => {
      list.innerHTML = '';
      log.style.display = 'none';
    };

    this.log = log;
    this.spinner = spinner;
    this.floorplanElement = floorplan;
  }

  createAndAppendContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'container';
    this.shadowRoot!.appendChild(container);

    return container;
  }

  getStyle(): string {
    return `
      ha-card #container {
        padding: 0px 10px 10px 10px;
      }
    
      #container {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-content: center;
      }

      #floorplan {
        display: flex;
        flex: 1;
        flex-direction: column;
        flex-flow: row;
        align-content: center;
      }

      svg, svg * {
        /* vector-effect: non-scaling-stroke !important; */
        pointer-events: all !important;
      }
     
      paper-spinner-lite {
        margin-top: 50px;
        margin-bottom: 50px;
        align-self: center;
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

  openMoreInfo(entityId: string) {
    this.fire('hass-more-info', { entityId: entityId });
  }

  setIsLoading(isLoading: boolean) {
    this.isLoading = isLoading;

    if (this.spinner) {
      if (this.isLoading) {
        this.spinner.setAttribute('active', '');
        this.spinner.style.display = 'inline-block';
      }
      else {
        this.spinner.removeAttribute('active');
        this.spinner.style.display = 'none';
      }
    }
  }

  logError(message: string) {
    console.error(message);

    if (this.log) {
      this.log.querySelector('ul')!.prepend(`<li class="error">${message}</li>`)
      this.log.style.display = 'block';
    }
  }

  fire(type: string, detail: any, options?: any) {
    options = options || {};
    detail = (detail === null || detail === undefined) ? {} : detail;
    const event = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    (event as any).detail = detail;
    const node = options.node || this;
    node.dispatchEvent(event);
    return event;
  }
}

if (!customElements.get('floorplan-element')) {
  customElements.define('floorplan-element', FloorplanElement);
}
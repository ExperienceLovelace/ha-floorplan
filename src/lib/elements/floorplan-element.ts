import { HassObject } from '../hass/hass';
import { Floorplan } from '../floorplan/floorplan';
import { FloorplanOptions } from '../floorplan/floorplan-options';
import { FloorplanConfig } from '../floorplan/floorplan-config';
import { CardConfig } from '../floorplan/card-config';

export class FloorplanElement extends HTMLElement {
  _config?: FloorplanConfig | CardConfig;
  floorplan?: Floorplan;
  log?: HTMLElement;
  spinner?: HTMLElement;
  isLoading: boolean = false;
  _hass?: HassObject; // the first HA states received

  _isDemo: boolean = false; // whether running in demo Web page

  _isDomCreated: boolean = false; // whether the floorplan DOM has been created yet

  constructor() {
    super();

    Object.defineProperties(this, this.properties);

    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    console.log('connectedCallback()');
  }

  disconnectedCallback() {
    console.log('disconnectedCallback()');
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

  async setConfig(config: FloorplanConfig | CardConfig) {
    if (this._config) {
      console.warn('WARNING: setConfig() has already been called!!!');
      return;
    }

    this._config = JSON.parse(JSON.stringify(config)); // clone the config

    await this.initDomIfRequired();
  }

  async setHass(hass: HassObject) {
    this._hass = hass;

    if (this.floorplan) {
      await this.floorplan.hassChanged(hass);
    }
    else {
      await this.initDomIfRequired();
    }
  }

  async initDomIfRequired(): Promise<void> {
    if (!this._config || this._isDomCreated) return; // not ready yet, or already been done

    this._isDomCreated = true;

    console.log('initDom()');

    const root = this.shadowRoot as ShadowRoot;

    if (root.lastChild) root.removeChild(root.lastChild);

    const style = document.createElement('style');
    style.textContent = this.getStyle();
    root.appendChild(style);

    const container = this.ensureFloorplanContainer();

    const spinner = document.createElement('ha-circular-progress');
    spinner.setAttribute('active', '');
    container.appendChild(spinner);

    this.setIsLoading(true);

    const floorplanElement = document.createElement('div');
    floorplanElement.id = 'floorplan';
    container.appendChild(floorplanElement);

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

    // Initialize floorplan

    const options = {
      root: this.shadowRoot!,
      element: floorplanElement,
      hass: undefined, // undefined, since hass state has not been set yet by HA
      config: ((this._config as CardConfig)?.config) || this._config,
      openMoreInfo: this._isDemo ? this.openMoreInfoDemo.bind(this) : this.openMoreInfo.bind(this),
      setIsLoading: this.setIsLoading.bind(this),
      _isDemo: this._isDemo,
    } as FloorplanOptions;

    this.floorplan = new Floorplan(options);
    await this.floorplan.init();

    // If HA states were set before the config was, use them now to update the new floorplan!!!
    if (this._hass) {
      await this.floorplan.hassChanged(this._hass);
    }
  }

  ensureFloorplanContainer(): Node {
    return this.shadowRoot!;
  }

  getStyle(): string {
    return `
      #floorplan {
        display: flex;
        flex: 1;
      }

      svg, svg * {
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

  openMoreInfo(entityId: string) {
    this.fire('hass-more-info', { entityId: entityId });
  }

  openMoreInfoDemo(entityId: string) {
    alert(`Displaying more info for entity: ${entityId}`);
  }

  setIsLoading(isLoading: boolean) {
    this.isLoading = isLoading;

    if (!this.spinner) return;

    if (this.isLoading) {
      this.spinner.setAttribute('active', '');
      this.spinner.style.display = 'inline-block';
    }
    else {
      this.spinner.removeAttribute('active');
      this.spinner.style.display = 'none';
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
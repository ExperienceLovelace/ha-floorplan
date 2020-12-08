import { HomeAssistant } from '../../lib/homeassistant/frontend-types';
import { HassSimulator } from './hass-simulator';
import { HassSimulatorConfig, FloorplanExanple } from './types';
import { FloorplanCardConfig } from '../floorplan-card/types';
import { FloorplanPanelConfig } from '../floorplan-panel/types';
import { Utils } from '../../lib/utils';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan-card/floorplan-card';
import '../floorplan-panel/floorplan-panel';

export class FloorplanExanpleElement extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: FloorplanCardConfig | FloorplanPanelConfig;

  @property({ attribute: false }) public example!: FloorplanExanple;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  simulator?: HassSimulator;

  protected render(): TemplateResult {
    return html`
      ${this.example.configFile.endsWith('card.yaml') ?
        html`<floorplan-card .hass=${this.hass} .config=${this.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-card>` :
        html` <floorplan-panel .hass=${this.hass} .panel=${this.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-panel>`
      }`;
  }

  static get styles(): CSSResult {
    return css`
    `;
  }

  async update(changedProperties: PropertyValues): Promise<void> {
    super.update(changedProperties);

    if (changedProperties.has('example') && this.example) {
      const configUrl = `${process.env.ROOT_URL}${process.env.FLOORPLAN_PATH}/${this.example.dir}/${this.example.configFile}`;
      const configYamlText = await Utils.fetchText(configUrl, true);

      this.config = Utils.parseYaml(configYamlText) as FloorplanCardConfig | FloorplanPanelConfig;

      if (this.example.simulationFile) {
        const simulatorUrl = `${process.env.ROOT_URL}${process.env.FLOORPLAN_PATH}/${this.example.dir}/${this.example.simulationFile}`;
        const simulatorYamlText = await Utils.fetchText(simulatorUrl, true);
        const simulatorConfig = Utils.parseYaml(simulatorYamlText) as HassSimulatorConfig;
        this.simulator = new HassSimulator(simulatorConfig, this.setHass.bind(this));
      }
    }
  }

  setHass(hass: HomeAssistant): void {
    this.hass = hass;
  }
}

if (!customElements.get('floorplan-example')) {
  customElements.define('floorplan-example', FloorplanExanpleElement);
}

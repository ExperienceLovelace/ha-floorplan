import { HomeAssistant } from '../../lib/homeassistant/frontend-types';
import { HassSimulator } from './hass-simulator';
import { HassSimulatorConfig, FloorplanExanple } from './types';
import { FloorplanCardConfig } from '../floorplan-card/types';
import { FloorplanPanelConfig } from '../floorplan-panel/types';
import { Utils } from '../../lib/utils';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan-card/floorplan-card';
import '../floorplan-panel/floorplan-panel';
import './code-block';

export class FloorplanExanpleElement extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: FloorplanCardConfig | FloorplanPanelConfig;
  @property({ type: String }) public configYaml!: string;

  @property({ attribute: false }) public example!: FloorplanExanple;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  simulator?: HassSimulator;

  protected render(): TemplateResult {
    return html`
      <div class="d-flex flex-row flex-1">
        <div class="flex-1 width-half">
          ${this.example.configFile.endsWith('card.yaml') ?
            html`<floorplan-card .hass=${this.hass} .config=${this.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-card>` :
            html` <floorplan-panel .hass=${this.hass} .panel=${this.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-panel>`
          }
        </div>

        <div class="flex-1 width-half">
          <code-block lang="yaml" code=${this.configYaml}></code-block>
        </div>
      </div>
      `
      ;
  }

  static get styles(): CSSResult {
    return css`
      .d-flex {
        display: flex;
      }

      .flex-row {
        flex-direction: row;
      }

      .flex-col {
        flex-direction: column;
      }

      .flex-1 {
        flex: 1;
      }

      .width-half {
        width: 50%;
      }
    `;
  }

  async update(changedProperties: PropertyValues): Promise<void> {
    super.update(changedProperties);

    if (changedProperties.has('example') && this.example) {
      const configUrl = `${process.env.ROOT_URL}${process.env.FLOORPLAN_PATH}/${this.example.dir}/${this.example.configFile}`;
      const configYamlText = await Utils.fetchText(configUrl, true);

      this.config = Utils.parseYaml(configYamlText) as FloorplanCardConfig | FloorplanPanelConfig;
      this.configYaml = configYamlText;

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

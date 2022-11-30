import { HomeAssistant } from '../../lib/homeassistant/types';
import { HassSimulator } from './hass-simulator';
import { HassSimulatorConfig, FloorplanExanple } from './types';
import { FloorplanPanelConfig } from '../floorplan-panel/types';
import { LovelaceCardConfig } from '../../lib/homeassistant/data/lovelace';
import { Utils } from '../../lib/utils';
import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../floorplan-card/floorplan-card';
import '../floorplan-panel/floorplan-panel';
import './code-block';

@customElement('floorplan-example')
export class FloorplanExanpleElement extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Object }) public config!:
    | LovelaceCardConfig
    | FloorplanPanelConfig;
  @property({ type: String }) public configYaml!: string;

  @property({ type: String }) public examplespath!: string;
  @property({ type: Object }) public example!: FloorplanExanple;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  simulator?: HassSimulator;

  protected render(): TemplateResult {
    return html`
      <div>
        <div>
          ${this.example.isCard
            ? html`<floorplan-card
                .examplespath=${this.examplespath}
                .hass=${this.hass}
                .config=${this.config}
                .isDemo=${this.isDemo}
                .notify=${this.notify}
              ></floorplan-card>`
            : html` <floorplan-panel
                .examplespath=${this.examplespath}
                .hass=${this.hass}
                .panel=${this.config}
                .isDemo=${this.isDemo}
                .notify=${this.notify}
              ></floorplan-panel>`}
        </div>

        <!--div>
          <code-block lang="yaml" code=${this.configYaml}></code-block>
        </div-->
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css``;
  }

  async update(changedProperties: PropertyValues): Promise<void> {
    super.update(changedProperties);

    if (
      (changedProperties.has('example') ||
        changedProperties.has('examplespath')) &&
      this.example &&
      this.examplespath
    ) {
      const configUrl = `${this.examplespath}/${this.example.dir}/${this.example.configFile}`;
      const configYamlText = await Utils.fetchText(
        configUrl,
        true,
        this.examplespath,
        false
      );

      this.config = Utils.parseYaml(configYamlText) as
        | LovelaceCardConfig
        | FloorplanPanelConfig;
      this.configYaml = configYamlText;

      if (this.example.simulationFile) {
        const simulatorUrl = `${this.examplespath}/${this.example.dir}/${this.example.simulationFile}`;
        const simulatorYamlText = await Utils.fetchText(
          simulatorUrl,
          true,
          this.examplespath,
          false
        );
        const simulatorConfig = Utils.parseYaml(
          simulatorYamlText
        ) as HassSimulatorConfig;
        this.simulator = new HassSimulator(
          simulatorConfig,
          this.setHass.bind(this)
        );
      }
    }
  }

  setHass(hass: HomeAssistant): void {
    this.hass = hass;
  }
}

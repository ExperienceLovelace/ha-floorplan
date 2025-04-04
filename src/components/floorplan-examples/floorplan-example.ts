import { HomeAssistant } from '../../lib/homeassistant/types';
import { HassSimulator } from './hass-simulator';
import { HassSimulatorConfig, FloorplanExample } from './types';
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
import { ifDefined } from 'lit-html/directives/if-defined.js';
import '../floorplan-card/floorplan-card';
import '../floorplan-panel/floorplan-panel';
import './code-block';

@customElement('floorplan-example')
export class FloorplanExampleElement extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Object }) public config!:
    | LovelaceCardConfig
    | FloorplanPanelConfig;
  @property({ type: String }) public configYaml!: string;

  @property({ type: String }) public examplespath!: string;
  @property({ type: Object }) public example!: FloorplanExample;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  simulator?: HassSimulator;

  protected render(): TemplateResult {
    return html`
      <div>
        <div>
          ${typeof this.config?.config === 'undefined'
            ? ''
            : this.example.isCard
            ? html`<floorplan-card
                .examplespath=${this.examplespath}
                .hass=${this.hass}
                .config=${this.config}
                .isDemo=${this.isDemo}
                .notify=${this.notify}
                data-floorplan-ref=${ifDefined('card-' + this.example.name)}
              ></floorplan-card>`
            : html` <floorplan-panel
                .examplespath=${this.examplespath}
                .hass=${this.hass}
                .panel=${this.config}
                .isDemo=${this.isDemo}
                .notify=${this.notify}
                data-floorplan-ref=${ifDefined('panel-' + this.example.name)}
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
      let configYamlText = this.example?.configYaml as string;

      // Inline Yaml does have first priority, but if not set, we need to fetch it
      if (!configYamlText) {
        const configUrl = `${this.examplespath}/${this.example.dir}/${this.example.configFile}`;
        configYamlText = await Utils.fetchText(
          configUrl,
          true,
          this.examplespath,
          false
        );
      }

      const config = await Utils.parseYaml(configYamlText) as
        | LovelaceCardConfig
        | FloorplanPanelConfig;

      this.configYaml = configYamlText;
      this.config = config;

      // Preparing the simulator, which are optional
      if (this.example?.simulationFile || this.example?.simulationYaml) {
        let simulatorYamlText = this.example?.simulationYaml as string;
        if (!simulatorYamlText) {
          const simulatorUrl = `${this.examplespath}/${this.example.dir}/${this.example.simulationFile}`;
          simulatorYamlText = await Utils.fetchText(
            simulatorUrl,
            true,
            this.examplespath,
            false
          );
        }

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

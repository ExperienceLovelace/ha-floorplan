import { HomeAssistant } from '../../lib/hass/frontend-types';
import { Simulator, SimulatorConfig } from '../../lib/hass/simulator';
import { FloorplanCardConfig, FloorplanPanelConfig } from '../../lib/hass/floorplan-frontend';
import { Utils } from '../../lib/utils';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanProjectElement extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: FloorplanCardConfig | FloorplanPanelConfig;

  @property({ attribute: false }) public project!: FloorplanProject;
  @property({ type: Boolean }) public isDemo!: boolean;

  simulator?: Simulator;

  protected render(): TemplateResult {
    return html`
      ${this.project.configFile.endsWith('card.yaml') ?
        html`<floorplan-card .hass=${this.hass} .config=${this.config} .isDemo=${this.isDemo}></floorplan-card>` :
        html` <floorplan-panel .hass=${this.hass} .panel=${this.config} .isDemo=${this.isDemo}></floorplan-panel>`
      }`;
  }

  static get styles(): CSSResult {
    return css`
    `;
  }

  async update(changedProperties: PropertyValues): Promise<void> {
    super.update(changedProperties);

    if (changedProperties.has('project') && this.project) {
      this.isDemo = true; // running in demo Web page

      const configUrl = `${process.env.EXAMPLES_DIR}/${this.project.dir}/${this.project.configFile}`;
      const configYamlText = await Utils.fetchText(configUrl, true);

      this.config = Utils.parseYaml(configYamlText) as FloorplanCardConfig | FloorplanPanelConfig;

      if (this.project.statesFile) {
        const simulatorUrl = `${process.env.EXAMPLES_DIR}/${this.project.dir}/${this.project.statesFile}`;
        const simulatorYamlText = await Utils.fetchText(simulatorUrl, true);
        const simulatorConfig = Utils.parseYaml(simulatorYamlText) as SimulatorConfig;
        this.simulator = new Simulator(simulatorConfig, this.setHass.bind(this));
      }
    }    
  }

  setHass(hass: HomeAssistant): void {
    this.hass = hass;
  }
}

if (!customElements.get('floorplan-project')) {
  customElements.define('floorplan-project', FloorplanProjectElement);
}

export class FloorplanProject {
  dir!: string;
  configFile!: string;
  statesFile!: string
}
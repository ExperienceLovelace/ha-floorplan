import { Simulator, SimulatorConfig } from '../../lib/hass/simulator';
import { HassObject } from '../../lib/hass/hass';
import { CardConfig } from '../../lib/hass/card-config';
import { PanelConfig } from '../../lib/hass/panel-config';
import { Utils } from '../../lib/utils';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanProjectElement extends LitElement {
  @property({ attribute: false }) public hass!: HassObject;
  @property({ attribute: false }) public config!: CardConfig | PanelConfig;

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

  async update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    if (changedProperties.has('project') && this.project) {
      this.isDemo = true; // running in demo Web page

      const configUrl = `${process.env.EXAMPLES_DIR}/${this.project.dir}/${this.project.configFile}`;
      let configYamlText = await Utils.fetchText(configUrl, true);

      this.config = Utils.parseYaml(configYamlText) as CardConfig | PanelConfig;;

      if (this.project.statesFile) {
        const simulatorUrl = `${process.env.EXAMPLES_DIR}/${this.project.dir}/${this.project.statesFile}`;
        let simulatorYamlText = await Utils.fetchText(simulatorUrl, true);
        const simulatorConfig = Utils.parseYaml(simulatorYamlText) as SimulatorConfig;
        this.simulator = new Simulator(simulatorConfig, this.setHass.bind(this));
      }
    }    
  }

  setHass(hass: HassObject) {
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
import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import { FloorplanExanple } from './types';
import './floorplan-example';
import '../lit-toast/lit-toast';
import { LitToast } from '../lit-toast/lit-toast';

export class FloorplanExamples extends LitElement {
  @property({ attribute: false, type: Array }) public examples!: FloorplanExanple[];
  @property({ type: Boolean }) public isDemo!: boolean;

  constructor() {
    super();

    this.isDemo = true; // running in demo Web page

    console.log("process.env.NODE_ENV", process.env.NODE_ENV);
    console.log("process.env.ROOT_URL", process.env.ROOT_URL);
    console.log("process.env.FLOORPLAN_PATH", process.env.FLOORPLAN_PATH);

    this.init();
  }

  async init(): Promise<void> {
    this.examples = [
      // Cards
      { dir: "light", configFile: "light-card.yaml", simulationFile: "simulations.yaml", },
      { dir: "ring", configFile: "ring-card.yaml", simulationFile: "simulations.yaml", },
      // Panels
      { dir: "simple", configFile: "simple-panel.yaml", simulationFile: "simulations.yaml", },
      // TODO
      //{ dir: "simple", configFile: "simple.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "home-multi", configFile: "main.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "ian", configFile: "home.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "home", configFile: "home.yaml", simulationFile: "simulations.yaml", },
    ] as FloorplanExanple[];
  }

  protected render(): TemplateResult {
    return html`
      ${this.examples?.map(example =>
      html` <floorplan-example .example=${example} .isDemo=${this.isDemo} .notify=${this.notify.bind(this)}></floorplan-example>`)
      }

      <lit-toast></lit-toast>
    `;
  }

  static get styles(): CSSResult {
    return css`
    `;
  }

  get litToast(): LitToast {
    return this.shadowRoot?.querySelector('lit-toast') as LitToast;
  }

  notify(message: string): void {
    this.litToast.show(message);
  }
}

if (!customElements.get('floorplan-examples')) {
  customElements.define('floorplan-examples', FloorplanExamples);
}

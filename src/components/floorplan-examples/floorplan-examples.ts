import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import { FloorplanExanple } from './types';
import './floorplan-example';
import '../lit-toast/lit-toast';
import { LitToast } from '../lit-toast/lit-toast';

export class FloorplanExamples extends LitElement {
  @property({ attribute: false, type: Array }) public examples!: FloorplanExanple[];
  @property({ type: Boolean }) public isDemo!: boolean;

  floorplanExamples = [
    // Cards
    { name: 'light', dir: "light", configFile: "light-card.yaml", simulationFile: "simulations.yaml", },
    { name: 'ring', dir: "ring", configFile: "ring-card.yaml", simulationFile: "simulations.yaml", },
    // Panels
    { name: 'simple', dir: "simple", configFile: "simple-panel.yaml", simulationFile: "simulations.yaml", },
    // TODO
    //{ dir: "simple", configFile: "simple.yaml", simulationFile: "simulations.yaml", },
    //{ dir: "home-multi", configFile: "main.yaml", simulationFile: "simulations.yaml", },
    //{ dir: "ian", configFile: "home.yaml", simulationFile: "simulations.yaml", },
    //{ dir: "home", configFile: "home.yaml", simulationFile: "simulations.yaml", },
  ] as FloorplanExanple[];

  constructor() {
    super();

    this.isDemo = true; // running in demo Web page

    if (this.isDemo) {
      console.log("NODE_ENV", process.env.NODE_ENV);
      console.log("ROOT_URL", process.env.ROOT_URL);
      console.log("FLOORPLAN_PATH", process.env.FLOORPLAN_PATH);
    }
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

  connectedCallback(): void {
    super.connectedCallback();

    if (this.dataset.include && !this.examples) {
      const exampleNames = this.dataset.include.split(',').map(x => x.trim());
      this.examples = this.floorplanExamples.filter(x => exampleNames.includes(x.name.toLocaleLowerCase()));
    }
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

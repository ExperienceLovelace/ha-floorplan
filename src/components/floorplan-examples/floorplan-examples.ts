import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import { FloorplanExanple } from './types';
import './floorplan-example';
import '../lit-toast/lit-toast';
import { LitToast } from '../lit-toast/lit-toast';

export class FloorplanExamples extends LitElement {
  @property({ type: String }) public examplespath!: string;
  @property({ type: Array }) public examples!: FloorplanExanple[];

  floorplanExamples = [
    // Cards
    { name: 'light', dir: "light", configFile: "light.yaml", simulationFile: "simulations.yaml", isCard: true },
    { name: 'ring', dir: "ring", configFile: "ring.yaml", simulationFile: "simulations.yaml", isCard: true },
    // Panels
    { name: 'home', dir: "home", configFile: "home.yaml", simulationFile: "simulations.yaml", isCard: false },
    // TODO
    //{ dir: "home-multi", configFile: "main.yaml", simulationFile: "simulations.yaml", },
    //{ dir: "ian", configFile: "home.yaml", simulationFile: "simulations.yaml", },
  ] as FloorplanExanple[];

  constructor() {
    super();

    //console.log("NODE_ENV", process.env.NODE_ENV);
  }

  protected render(): TemplateResult {
    return html`
      ${this.examples?.map(example =>
      html` <floorplan-example .examplespath=${this.examplespath} .example=${example} .isDemo="${true}" .notify=${this.notify.bind(this)}></floorplan-example>`)
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

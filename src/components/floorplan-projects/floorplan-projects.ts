import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import { FloorplanProject } from './types';
import './floorplan-project';

export class FloorplanProjects extends LitElement {
  @property({ attribute: false, type: Array }) public projects!: Array<FloorplanProject>;
  @property({ type: Boolean }) public isDemo!: boolean;

  constructor() {
    super();

    this.init();
  }

  async init(): Promise<void> {
    this.projects = [
      // Panels
      { dir: "simple", configFile: "simple-panel.yaml", simulationFile: "simulations.yaml", },
      // Cards
      { dir: "simple", configFile: "simple-card.yaml", simulationFile: "simulations.yaml", },
      { dir: "ring", configFile: "ring-card.yaml", simulationFile: "simulations.yaml", },
      // TODO
      //{ dir: "simple", configFile: "simple.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "home-multi", configFile: "main.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "ian", configFile: "home.yaml", simulationFile: "simulations.yaml", },
      //{ dir: "home", configFile: "home.yaml", simulationFile: "simulations.yaml", },
    ] as Array<FloorplanProject>;
  }

  protected render(): TemplateResult {
    return html`
      ${this.projects?.map(project =>
      html` <floorplan-project .project=${project} .isDemo=${this.isDemo}></floorplan-project>`)
      }`;
  }

  static get styles(): CSSResult {
    return css`
    `;
  }
}

if (!customElements.get('floorplan-projects')) {
  customElements.define('floorplan-projects', FloorplanProjects);
}

import { HomeAssistant } from '../../lib/homeassistant/frontend-types';
import { FloorplanCardConfig } from './types';
import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: FloorplanCardConfig;

  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      <ha-card>
        <h1 class="card-header">${this.config?.title}</h1>

        <floorplan-element .hass=${this.hass} ._config=${this.config?.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-element>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host .content, :host .content floorplan-element {
        display: flex;
        flex: 1;
      }
    `;
  }

  setConfig(config: FloorplanCardConfig): void {
    this.config = config;
  }

  getCardSize(): number {
    return 1;
  }
}

if (!customElements.get('floorplan-card')) {
  customElements.define('floorplan-card', FloorplanCard);
}

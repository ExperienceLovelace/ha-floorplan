import { HassObject } from '../../lib/hass/hass';
import { CardConfig } from '../../lib/hass/card-config';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanCard extends LitElement {
  @property({ attribute: false }) public hass!: HassObject;
  @property({ attribute: false }) public config!: CardConfig;

  @property({ type: Boolean }) public isDemo!: boolean;

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      <ha-card>
        <h1 class="card-header">${this.config?.title}</h1>

        <floorplan-element .hass=${this.hass} ._config=${this.config?.config} .isDemo=${this.isDemo}></floorplan-element>
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

  setConfig(config: CardConfig) {
    this.config = config;
  }

  getCardSize(): number {
    return 1;
  }
}

if (!customElements.get('floorplan-card')) {
  customElements.define('floorplan-card', FloorplanCard);
}

import { HomeAssistant } from '../../lib/homeassistant/types';
import { LovelaceCard } from '../../lib/homeassistant/panels/lovelace/types';
import { LovelaceCardConfig } from '../../lib/homeassistant/data/lovelace';
import { css, CSSResult, html, LitElement, property, TemplateResult } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanCard extends LitElement implements LovelaceCard {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public isPanel!: boolean;
  @property({ type: Boolean }) public editMode!: boolean;

  @property({ type: Object }) public config!: LovelaceCardConfig;

  @property({ type: String }) public examplespath!: string;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      <ha-card>
        ${this.isDemo ? '' :
        html`
          <h1 class="card-header">${this.config?.title}</h1>
        `}

        <div class="content ${this.isPanel ? ((this.config?.title as string)?.trim().length ? 'with-title-panel-height' : 'without-title-panel-height') : ''}">
          <floorplan-element .examplespath=${this.examplespath} .hass=${this.hass} ._config=${this.config?.config} .isDemo=${this.isDemo} .notify=${this.notify}></floorplan-element>
        </div>

      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host .content, :host .content floorplan-element {
        display: flex;
        flex-flow: column;
        flex: 1;
        min-height: 0;
      }

      :host .content.with-title-panel-height {
        height: calc(100vh - var(--header-height) - 78px);
      }

      :host .content.without-title-panel-height {
        height: calc(100vh - 86px);
      }      
    `;
  }

  getCardSize(): number | Promise<number> {
    return 1;
  }

  setConfig(config: LovelaceCardConfig): void {
    this.config = config;
  }
}

if (!customElements.get('floorplan-card')) {
  customElements.define('floorplan-card', FloorplanCard);
}

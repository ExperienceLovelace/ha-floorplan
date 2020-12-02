import { HomeAssistant } from '../../lib/hass/frontend-types';
import { FloorplanPanel as Panel } from '../../lib/hass/floorplan-frontend';
import { css, CSSResult, html, LitElement, property, TemplateResult, PropertyValues } from "lit-element";
import '../floorplan/floorplan-element';

export class FloorplanPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow!: boolean;
  @property({ attribute: false }) public route!: unknown;
  @property({ attribute: false }) public panel!: Panel;

  @property({ type: Boolean }) public showSideBar!: boolean;
  @property({ type: Boolean }) public showAppHeader!: boolean;

  @property({ type: Boolean }) public isDemo!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>

        <app-header fixed slot="header" ?hidden=${!this.showAppHeader}>
          <app-toolbar>
            <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}"></ha-menu-button>
            <div main-title>${this.panel?.title}</div>
          </app-toolbar>
        </app-header>        

        <div class="content ${this.showAppHeader ? 'regular-height ' : 'full-height'}">
          <floorplan-element .hass=${this.hass} ._config=${this.panel?.config?.config} .isDemo=${this.isDemo}></floorplan-element>
        </div>

      </ha-app-layout>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host .content, :host .content floorplan-element {
        display: flex;
        flex: 1;
      }

      :host .content.regular-height {
        height: calc(100vh - var(--header-height) - 0px);
      }

      :host  .content.full-height {
        height: calc(100vh - 0px);
      }

      [hidden] {
        display: none !important;
      }
    `;
  }

  update(changedProperties: PropertyValues): void {
    super.update(changedProperties);

    if (changedProperties.has('panel')) {
      this.showSideBar = (this.panel?.config.show_side_bar !== false);
      this.showAppHeader = (this.panel?.config.show_app_header !== false);

      if (this.panel.config.show_side_bar === false) {
        this.hass.dockedSidebar = "always_hidden";
      }
    }
  }
}

if (!customElements.get('floorplan-panel')) {
  customElements.define('floorplan-panel', FloorplanPanel);
}

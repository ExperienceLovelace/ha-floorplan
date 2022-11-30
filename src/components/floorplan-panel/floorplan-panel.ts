import { HomeAssistant } from '../../lib/homeassistant/types';
import { FloorplanPanelInfo } from './types';
import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../floorplan/floorplan-element';
import { styleMap, StyleInfo } from 'lit-html/directives/style-map.js';

@customElement('floorplan-panel')
export class FloorplanPanel extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow!: boolean;
  @property({ type: Object }) public panel!: FloorplanPanelInfo;

  @property({ type: Boolean }) public showSideBar!: boolean;
  @property({ type: Boolean }) public showAppHeader!: boolean;

  @property({ type: String }) public examplespath!: string;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  styles: StyleInfo = { height: 'calc(100vh)' };

  static appHeaderHeight = 64;

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>

        <app-header fixed slot="header" ?hidden=${!this.showAppHeader}>
          <app-toolbar>
            <ha-menu-button .hass=${this.hass} .narrow=${
      this.narrow
    }"></ha-menu-button>
            <div main-title>${this.panel?.title}</div>
          </app-toolbar>
        </app-header>        

        <div class="content" style=${styleMap(this.styles)}>
          <floorplan-element .examplespath=${this.examplespath} .hass=${
      this.hass
    }
          ._config=${this.panel?.config?.config} .isDemo=${
      this.isDemo
    } .notify=${this.notify}>
          </floorplan-element>
        </div>

      </ha-app-layout>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host .content,
      :host .content floorplan-element {
        display: flex;
        flex-flow: column;
        flex: 1;
        min-height: 0;
      }

      [hidden] {
        display: none !important;
      }
    `;
  }

  get appHeaderHeight(): number {
    if (this.isDemo) return 0;
    return this.showAppHeader ? FloorplanPanel.appHeaderHeight : 0;
  }

  update(changedProperties: PropertyValues): void {
    if (this.panel) {
      this.showSideBar = this.panel.config.show_side_bar !== false;
      this.showAppHeader =
        this.panel.config.show_app_header !== false && !this.isDemo;

      if (this.hass && this.panel.config.show_side_bar === false) {
        this.hass.dockedSidebar = 'always_hidden';
      }

      this.styles = { height: `calc(100vh - ${this.appHeaderHeight}px)` };
    }

    super.update(changedProperties);
  }
}

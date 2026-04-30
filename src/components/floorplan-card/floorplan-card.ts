import { HomeAssistant } from '../../lib/homeassistant/types';
import {
  LovelaceCard,
  LovelaceCardEditor,
} from '../../lib/homeassistant/panels/lovelace/types';
import { LovelaceCardConfig } from '../../lib/homeassistant/data/lovelace';
import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ShadowDomHelper } from './../floorplan/lib/shadow-dom-helper';
import '../floorplan/floorplan-element';
import './floorplan-card-editor';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { styleMap, StyleInfo } from 'lit-html/directives/style-map.js';

//Register the card in the UI
  let windowWithCards = window as unknown as Window & {
    customCards: unknown[];
  };
  const customCards = windowWithCards.customCards || [];
  customCards.push({
    type: 'floorplan-card',
    name: 'Floorplan Card',
    description: 'Ha-floorplan  allows you to create tons of things. Create an SVG, and map entities to it.',
    documentationURL: "https://experiencelovelace.github.io/ha-floorplan",
    preview: true,
  });
  windowWithCards.customCards = customCards;


@customElement('floorplan-card')
export class FloorplanCard extends LitElement implements LovelaceCard {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public isPanel!: boolean;
  @property({ type: Boolean }) public editMode!: boolean;

  @property({ type: Object }) public config!: LovelaceCardConfig;

  @property({ type: String }) public examplespath!: string;
  @property({ type: Boolean }) public isDemo!: boolean;
  @property({ type: Function }) public notify!: (message: string) => void;

  styles: StyleInfo = {
    dummy: `calc(100vh - ${this.appHeaderHeight}px - ${this.cardHeaderHeight}px)`,
  };

  _view: Element | null | undefined;
  _appHeader: Element | null | undefined;

  static cardHeaderHeight = 76;

  protected render(): TemplateResult {
    if (!this.config) {
      return html``;
    }

    return html`
      <ha-card>
        ${this.isDisplayCardHeader
          ? html` <h1 class="card-header">${this.config?.title}</h1> `
          : ''}

        <div class="content" style=${styleMap(this.styles)}>
          <floorplan-element
            .examplespath=${this.examplespath}
            .hass=${this.hass}
            ._config=${this.config?.config}
            .isDemo=${this.isDemo}
            .notify=${this.notify}
            data-floorplan-ref=${ifDefined(`element-${this.config?.title}`)}
          ></floorplan-element>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      /* header (main toolbar) */
      /* --header-height: 56px; */

      /* card header */
      /* height: 76px; */

      :host .content,
      :host .content floorplan-element {
        display: flex;
        flex-flow: column;
        flex: 1;
        min-height: 0;
      }
    `;
  }

  get isFullHeight(): boolean {
    return this.config?.full_height;
  }

  get view(): Element | null | undefined {
    if (!this._view) {
      this._view = ShadowDomHelper.closestElement('#view', this);
    }
    return this._view;
  }

  get appHeader(): Element | null | undefined {
    if (!this._appHeader) {
      this._appHeader = this.view?.previousElementSibling;
    }
    return this._appHeader;
  }

  get appHeaderHeight(): number {
    if (this.isDemo) return 0;
    const appHeader = this.appHeader;
    return appHeader ? appHeader.clientHeight : 0;
  }

  get cardHeaderHeight(): number {
    if (this.isDemo) return 0;
    return this.isDisplayCardHeader ? FloorplanCard.cardHeaderHeight : 0;
  }

  get isDisplayCardHeader(): boolean {
    if (this.isDemo) return false;
    return (this.config?.title as string)?.trim().length > 0;
  }

  getCardSize(): number | Promise<number> {
    return 1;
  }

  static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): LovelaceCardConfig {
    // This is the config that will be used when a user adds the card to their Lovelace dashboard.
    // It should be a valid config that can be rendered by the card.
    return {
      type: 'custom:floorplan-card',
      title: 'Floorplan',
      full_height: false,
      config: {
        image: 'https://raw.githubusercontent.com/ExperienceLovelace/ha-floorplan/ccbf6a5afeffca6c185f3bf5dffaa2e8a53a5155/docs/_docs/floorplan/examples/floorplanner_home/floorplanner_home.svg',
        stylesheet: '',
        rules: [],
      },
    };
  }

  static getConfigElement(): LovelaceCardEditor {
    return document.createElement('floorplan-card-editor') as LovelaceCardEditor;
  }
  
  setConfig(config: LovelaceCardConfig): void {
    this.config = config;
  }

  update(changedProperties: PropertyValues): void {
    if (this.isFullHeight) {
      this.styles = {
        height: `calc(100vh - ${this.appHeaderHeight}px - ${this.cardHeaderHeight}px)`,
      };
    } else {
      this.styles = { dummy: '' };
    }

    super.update(changedProperties);
  }
}

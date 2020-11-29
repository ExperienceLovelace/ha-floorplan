export class FloorplanPanel extends Polymer.Element {
  static get properties() {
    return {
      hass: { type: Object, observer: 'hassChanged' },
      narrow: { type: Boolean, value: false },
      showSideBar: { type: Boolean, value: true },
      showAppHeader: { type: Boolean, value: true },
      panel: { type: Object, observer: 'panelChanged' },
      isLoading: { type: Boolean, value: true },
    };
  }

  static get template() {
    return Polymer.html
      `
      <style>
        :host .content, :host .content floorplan-element {
          display: flex;
          flex: 1;          
        }

        :host(:not([narrow]), [showAppHeader]) .content {
          height: calc(100vh);
        }

        :host(:not([narrow]), :not([showAppHeader])) .content {
          height: calc(100vh - var(--header-height));
        }

        :host .progress-wrapper {
          margin: auto;
        }

        [hidden] {
          display: none !important;
        }        
      </style>

      <ha-app-layout>

        <app-header fixed slot="header" hidden="[[!showAppHeader]]">
          <app-toolbar>
            <ha-menu-button hass="[[hass]]" narrow="[[narrow]]"></ha-menu-button>
            <div main-title>[[panel.title]]</div>
          </app-toolbar>
        </app-header>        

        <div class="content">
          <div class="progress-wrapper" hidden="[[!isLoading]]">
            <ha-circular-progress active></ha-circular-progress>
          </div>

          <floorplan-element hidden="[[isLoading]]" hass=[[hass]] config=[[panel.config]] is-panel></floorplan-element>
        </div>

      </ha-app-layout>
	`;
  }

  panelChanged() {
    this.showAppHeader = !(this.panel.config.show_app_header === false);
    this.isLoading = false;
  }

  hassChanged() {
    if (this.panel.config.show_side_bar === false) {
      this.hass.dockedSidebar = "always_hidden";
    }
  }
}

if (!customElements.get('floorplan-panel')) {
  customElements.define('floorplan-panel', FloorplanPanel);
}
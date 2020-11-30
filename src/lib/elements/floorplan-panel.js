export class FloorplanPanel extends Polymer.Element {
  static get properties() {
    return {
      hass: { type: Object, observer: 'hassChanged' },
      narrow: { type: Boolean, value: false },
      showSideBar: { type: Boolean, value: true },
      showAppHeader: { type: Boolean, value: true },
      panel: { type: Object, observer: 'panelChanged' },
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

        :host([showAppHeader]) .content {
          height: calc(100vh);
        }

        :host(:not([showAppHeader])) .content {
          height: calc(100vh - var(--header-height));
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
          <floorplan-element hass=[[hass]] config=[[panel.config]] is-panel></floorplan-element>
        </div>

      </ha-app-layout>
	`;
  }

  connectedCallack() {
    console.log('connectedCallack');
 
    super.connectedCallack();
  }

  panelChanged() {
    this.showAppHeader = !(this.panel.config.show_app_header === false);
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
import '/local/floorplan/floorplan.js';

class FloorplanPanel extends Polymer.Element {
  static get template() {
    return Polymer.html
      `
      <style include="ha-style">
        .container-fullscreen, .container-with-toolbar, floorplan-element {
          display: flex;
          flex: 1;
        }
  
        .container-fullscreen, .container-with-toolbar {
          height: calc(100%);
          background-color: var(--primary-background-color);
        }

        .container-with-toolbar {
          height: calc(100% - 64px);
        }

        .container-with-toolbar {
          height: calc(100% - 64px);
        }

        [hidden] {
          display: none !important;
        }
      </style>

      <app-toolbar hidden$='{{!showAppToolbar}}'>
        <ha-menu-button narrow='[[narrow]]' show-menu='[[showMenu]]'></ha-menu-button>
        <div main-title>[[panel.title]]</div>
      </app-toolbar>

      <div class$='[[containerClass]]'>
        <floorplan-element hass=[[hass]] config=[[panel.config]] is-panel></floorplan-element>
      </div>
	`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      narrow: {
        type: Boolean,
        value: false,
      },
      showMenu: {
        type: Boolean,
        value: true,
      },
      showAppToolbar: {
        type: Boolean,
        value: false,
      },
      panel: {
        type: Object,
        observer: 'panelChanged',
      },
      containerClass: {
        type: String,
        value: 'container-fullscreen',
      },
    };
  }

  panelChanged() {
    const hideAppToolbar = ((this.panel.config.hide_app_toolbar === null) || (this.panel.config.hide_app_toolbar !== undefined));
    this.showAppToolbar = !hideAppToolbar;
    this.containerClass = this.showAppToolbar ? 'container-with-toolbar' : 'container-fullscreen';

    console.log(this.panel.config);
  }
}

if (!customElements.get('floorplan-panel')) {
  customElements.define('floorplan-panel', FloorplanPanel);
}